import {
  createGoogleGenerativeAI,
  type GoogleGenerativeAIProvider,
} from '@ai-sdk/google';
import {
  AISDKError,
  generateObject,
  generateText,
  JSONParseError,
  streamText,
} from 'ai';

import {
  CopilotProviderSideError,
  metrics,
  UserFriendlyError,
} from '../../../base';
import { CopilotProvider } from './provider';
import {
  CopilotChatOptions,
  CopilotEmbeddingOptions,
  CopilotImageOptions,
  CopilotProviderType,
  ModelConditions,
  ModelInputType,
  ModelOutputType,
  PromptMessage,
} from './types';
import { chatToGPTMessage } from './utils';

export const DEFAULT_DIMENSIONS = 256;

export type GeminiConfig = {
  apiKey: string;
  baseUrl?: string;
};

export class GeminiProvider extends CopilotProvider<GeminiConfig> {
  override readonly type = CopilotProviderType.Gemini;

  readonly models = [
    {
      name: 'Gemini 2.0 Flash',
      id: 'gemini-2.0-flash-001',
      capabilities: [
        {
          input: [
            ModelInputType.Text,
            ModelInputType.Image,
            ModelInputType.Audio,
          ],
          output: [ModelOutputType.Text],
          defaultForOutputType: true,
        },
      ],
    },
    {
      name: 'Gemini 2.5 Pro',
      id: 'gemini-2.5-pro-preview-03-25',
      capabilities: [
        {
          input: [
            ModelInputType.Text,
            ModelInputType.Image,
            ModelInputType.Audio,
          ],
          output: [ModelOutputType.Text],
        },
      ],
    },
    {
      name: 'Text Embedding 004',
      id: 'text-embedding-004',
      capabilities: [
        {
          input: [ModelInputType.Text],
          output: [ModelOutputType.Embedding],
        },
      ],
    },
  ];

  #instance!: GoogleGenerativeAIProvider;

  override configured(): boolean {
    return !!this.config.apiKey;
  }

  protected override setup() {
    super.setup();
    this.#instance = createGoogleGenerativeAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
    });
  }

  private handleError(e: any) {
    if (e instanceof UserFriendlyError) {
      return e;
    } else if (e instanceof AISDKError) {
      this.logger.error('Throw error from ai sdk:', e);
      return new CopilotProviderSideError({
        provider: this.type,
        kind: e.name || 'unknown',
        message: e.message,
      });
    } else {
      return new CopilotProviderSideError({
        provider: this.type,
        kind: 'unexpected_response',
        message: e?.message || 'Unexpected google response',
      });
    }
  }

  override async text(
    cond: ModelConditions,
    messages: PromptMessage[],
    options:
      | CopilotChatOptions
      | CopilotEmbeddingOptions
      | CopilotImageOptions = {}
  ): Promise<string> {
    await this.checkParams({ cond, messages, options });
    const model = this.selectModel(cond);

    try {
      metrics.ai.counter('chat_text_calls').add(1, { model: model.id });

      const [system, msgs, schema] = await chatToGPTMessage(messages);

      const modelInstance = this.#instance(model.id, {
        structuredOutputs: Boolean(
          'jsonMode' in options ? options.jsonMode : false
        ),
      });
      const { text } = schema
        ? await generateObject({
            model: modelInstance,
            system,
            messages: msgs,
            schema,
            abortSignal: options.signal,
            experimental_repairText: async ({ text, error }) => {
              if (error instanceof JSONParseError) {
                // strange fixed response, temporarily replace it
                const ret = text.replaceAll(/^ny\n/g, ' ').trim();
                if (ret.startsWith('```') || ret.endsWith('```')) {
                  return ret
                    .replace(/```[\w\s]+\n/g, '')
                    .replace(/\n```/g, '')
                    .trim();
                }
                return ret;
              }
              return null;
            },
          }).then(r => ({ text: JSON.stringify(r.object) }))
        : await generateText({
            model: modelInstance,
            system,
            messages: msgs,
            abortSignal: options.signal,
          });

      if (!text) throw new Error('Failed to generate text');
      return text.trim();
    } catch (e: any) {
      metrics.ai.counter('chat_text_errors').add(1, { model: model.id });
      throw this.handleError(e);
    }
  }

  override async *streamText(
    cond: ModelConditions,
    messages: PromptMessage[],
    options: CopilotChatOptions | CopilotImageOptions = {}
  ): AsyncIterable<string> {
    await this.checkParams({ cond, messages });
    const model = this.selectModel(cond);

    try {
      metrics.ai.counter('chat_text_stream_calls').add(1, { model: model.id });
      const [system, msgs] = await chatToGPTMessage(messages);

      const { textStream } = streamText({
        model: this.#instance(model.id),
        system,
        messages: msgs,
        abortSignal: options.signal,
      });

      for await (const message of textStream) {
        if (message) {
          yield message;
          if (options.signal?.aborted) {
            await textStream.cancel();
            break;
          }
        }
      }
    } catch (e: any) {
      metrics.ai.counter('chat_text_stream_errors').add(1, { model: model.id });
      throw this.handleError(e);
    }
  }
}
