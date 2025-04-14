import {
  createOpenAI,
  openai,
  type OpenAIProvider as VercelOpenAIProvider,
} from '@ai-sdk/openai';
import {
  AISDKError,
  embedMany,
  experimental_generateImage as generateImage,
  generateObject,
  generateText,
  streamText,
} from 'ai';

import {
  CopilotPromptInvalid,
  CopilotProviderSideError,
  metrics,
  UserFriendlyError,
} from '../../../base';
import { CopilotProvider } from './provider';
import {
  ChatMessageRole,
  CopilotChatOptions,
  CopilotEmbeddingOptions,
  CopilotImageOptions,
  CopilotProviderType,
  ModelConditions,
  ModelInputType,
  ModelOutputType,
  PromptMessage,
} from './types';
import { chatToGPTMessage, CitationParser } from './utils';

export const DEFAULT_DIMENSIONS = 256;

export type OpenAIConfig = {
  apiKey: string;
  baseUrl?: string;
};

export class OpenAIProvider extends CopilotProvider<OpenAIConfig> {
  readonly type = CopilotProviderType.OpenAI;

  readonly models = [
    // Text to Text models
    {
      id: 'gpt-4o',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text],
        },
      ],
    },
    // FIXME(@darkskygit): deprecated
    {
      id: 'gpt-4o-2024-08-06',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text],
        },
      ],
    },
    {
      id: 'gpt-4o-mini',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text],
        },
      ],
    },
    // FIXME(@darkskygit): deprecated
    {
      name: 'GPT-4o-mini-07-17',
      id: 'gpt-4o-mini-2024-07-18',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text],
        },
      ],
    },
    {
      id: 'gpt-4.1',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text],
          defaultForOutputType: true,
        },
      ],
    },
    {
      id: 'gpt-4.1-2025-04-14',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text],
        },
      ],
    },
    {
      name: 'Gpt-4.1-mini',
      id: 'gpt-4.1-mini',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text],
        },
      ],
    },
    {
      id: 'o1',
      capabilities: [
        {
          input: [ModelInputType.Text],
          output: [ModelOutputType.Text, ModelOutputType.Reasoning],
        },
      ],
    },
    {
      id: 'o3-mini',
      capabilities: [
        {
          input: [ModelInputType.Text],
          output: [ModelOutputType.Text, ModelOutputType.Reasoning],
        },
      ],
    },
    // Embedding models
    {
      id: 'text-embedding-3-large',
      capabilities: [
        {
          input: [ModelInputType.Text],
          output: [ModelOutputType.Embedding],
          defaultForOutputType: true,
        },
      ],
    },
    {
      id: 'text-embedding-3-small',
      capabilities: [
        {
          input: [ModelInputType.Text],
          output: [ModelOutputType.Embedding],
        },
      ],
    },
    // Image generation models
    {
      id: 'dall-e-3',
      capabilities: [
        {
          input: [ModelInputType.Text],
          output: [ModelOutputType.Image],
        },
      ],
    },
    {
      id: 'gpt-image-1',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Image],
          defaultForOutputType: true,
        },
      ],
    },
  ];

  #instance!: VercelOpenAIProvider;

  override configured(): boolean {
    return !!this.config.apiKey;
  }

  protected override setup() {
    super.setup();
    this.#instance = createOpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
    });
  }

  protected async checkParams({
    cond,
    messages,
    embeddings,
    options = {},
  }: {
    cond: ModelConditions;
    messages?: PromptMessage[];
    embeddings?: string[];
    options?: CopilotChatOptions;
  }) {
    if (!(await this.isModelAvailable(cond))) {
      throw new CopilotPromptInvalid(
        `Model not available: ${JSON.stringify(cond)}`
      );
    }
    if (Array.isArray(messages) && messages.length > 0) {
      if (
        messages.some(
          m =>
            // check non-object
            typeof m !== 'object' ||
            !m ||
            // check content
            typeof m.content !== 'string' ||
            // content and attachments must exist at least one
            ((!m.content || !m.content.trim()) &&
              (!Array.isArray(m.attachments) || !m.attachments.length))
        )
      ) {
        throw new CopilotPromptInvalid('Empty message content');
      }
      if (
        messages.some(
          m =>
            typeof m.role !== 'string' ||
            !m.role ||
            !ChatMessageRole.includes(m.role)
        )
      ) {
        throw new CopilotPromptInvalid('Invalid message role');
      }
      // json mode need 'json' keyword in content
      // ref: https://platform.openai.com/docs/api-reference/chat/create#chat-create-response_format
      if (
        options?.jsonMode &&
        !messages.some(m => m.content.toLowerCase().includes('json'))
      ) {
        throw new CopilotPromptInvalid('Prompt not support json mode');
      }
    } else if (
      Array.isArray(embeddings) &&
      embeddings.some(e => typeof e !== 'string' || !e || !e.trim())
    ) {
      throw new CopilotPromptInvalid('Invalid embedding');
    }
  }

  private handleError(
    e: any,
    model: string,
    options: CopilotImageOptions = {}
  ) {
    if (e instanceof UserFriendlyError) {
      return e;
    } else if (e instanceof AISDKError) {
      if (e.message.includes('safety') || e.message.includes('risk')) {
        metrics.ai
          .counter('chat_text_risk_errors')
          .add(1, { model, user: options.user || undefined });
      }

      return new CopilotProviderSideError({
        provider: this.type,
        kind: e.name || 'unknown',
        message: e.message,
      });
    } else {
      return new CopilotProviderSideError({
        provider: this.type,
        kind: 'unexpected_response',
        message: e?.message || 'Unexpected openai response',
      });
    }
  }

  private getTools(options: CopilotChatOptions) {
    if (options?.webSearch) {
      return {
        web_search_preview: openai.tools.webSearchPreview(),
      };
    }
    return undefined;
  }

  async text(
    cond: ModelConditions,
    messages: PromptMessage[],
    options:
      | CopilotChatOptions
      | CopilotEmbeddingOptions
      | CopilotImageOptions = {}
  ): Promise<string> {
    await this.checkParams({ messages, cond, options });
    const model = this.selectModel(cond);

    try {
      metrics.ai.counter('chat_text_calls').add(1, { model: model.id });

      const [system, msgs, schema] = await chatToGPTMessage(messages);

      const modelInstance = this.#instance(model.id, {
        structuredOutputs: Boolean(
          'jsonMode' in options ? options.jsonMode : false
        ),
        user: 'user' in options ? options.user : undefined,
      });

      const commonParams = {
        model: modelInstance,
        system,
        messages: msgs,
        temperature: ('temperature' in options && options.temperature) || 0,
        maxTokens: ('maxTokens' in options && options.maxTokens) || 4096,
        abortSignal: options.signal,
      };

      const { text } = schema
        ? await generateObject({
            ...commonParams,
            schema,
          }).then(r => ({ text: JSON.stringify(r.object) }))
        : await generateText({
            ...commonParams,
            providerOptions: {
              openai:
                'user' in options && options.user ? { user: options.user } : {},
            },
            tools: this.getTools(options),
          });

      return text.trim();
    } catch (e: any) {
      metrics.ai.counter('chat_text_errors').add(1, { model: model.id });
      throw this.handleError(e, model.id, options);
    }
  }

  async *streamText(
    cond: ModelConditions,
    messages: PromptMessage[],
    options: CopilotChatOptions | CopilotImageOptions = {}
  ): AsyncIterable<string> {
    await this.checkParams({ messages, cond });
    const model = this.selectModel(cond);

    if (cond.outputType === ModelOutputType.Image) {
      metrics.ai
        .counter('generate_images_stream_calls')
        .add(1, { model: model.id });

      const { content: prompt } = [...messages].pop() || {};
      if (!prompt) throw new CopilotPromptInvalid('Prompt is required');

      try {
        const modelInstance = this.#instance.image(model.id);

        const result = await generateImage({
          model: modelInstance,
          prompt,
        });

        const imageUrls = result.images.map(
          image => `data:image/png;base64,${image.base64}`
        );

        for (const imageUrl of imageUrls) {
          yield imageUrl;
          if (options.signal?.aborted) {
            break;
          }
        }
        return;
      } catch (e: any) {
        metrics.ai
          .counter('generate_images_errors')
          .add(1, { model: model.id });
        throw this.handleError(e, model.id, options);
      }
    }

    try {
      metrics.ai.counter('chat_text_stream_calls').add(1, { model: model.id });
      const [system, msgs] = await chatToGPTMessage(messages);

      const modelInstance = this.#instance(model.id, {
        structuredOutputs: Boolean(options.jsonMode),
        user: options.user,
      });

      const { fullStream } = streamText({
        model: modelInstance,
        system,
        messages: msgs,
        tools: this.getTools(options),
        frequencyPenalty: options.frequencyPenalty || 0,
        presencePenalty: options.presencePenalty || 0,
        temperature: options.temperature || 0,
        maxTokens: options.maxTokens || 4096,
        abortSignal: options.signal,
      });

      const parser = new CitationParser();
      for await (const chunk of fullStream) {
        if (chunk) {
          switch (chunk.type) {
            case 'text-delta': {
              const result = parser.parse(chunk.textDelta);
              yield result;
              break;
            }
            case 'step-finish': {
              const result = parser.end();
              yield result;
              break;
            }
          }

          if (options.signal?.aborted) {
            await fullStream.cancel();
            break;
          }
        }
      }
    } catch (e: any) {
      metrics.ai.counter('chat_text_stream_errors').add(1, { model: model.id });
      throw this.handleError(e, model.id, options);
    }
  }

  // ====== text to embedding ======

  async generateEmbedding(
    cond: ModelConditions,
    messages: string | string[],
    options: CopilotEmbeddingOptions = { dimensions: DEFAULT_DIMENSIONS }
  ): Promise<number[][]> {
    messages = Array.isArray(messages) ? messages : [messages];
    await this.checkParams({ embeddings: messages, cond, options });
    const model = this.selectModel(cond);

    try {
      metrics.ai
        .counter('generate_embedding_calls')
        .add(1, { model: model.id });

      const modelInstance = this.#instance.embedding(model.id, {
        dimensions: options.dimensions || DEFAULT_DIMENSIONS,
        user: options.user,
      });

      const { embeddings } = await embedMany({
        model: modelInstance,
        values: messages,
      });

      return embeddings.filter(v => v && Array.isArray(v));
    } catch (e: any) {
      metrics.ai
        .counter('generate_embedding_errors')
        .add(1, { model: model.id });
      throw this.handleError(e, model.id, options);
    }
  }
}
