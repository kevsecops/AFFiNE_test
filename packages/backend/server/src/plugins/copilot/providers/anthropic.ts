import {
  AnthropicProvider as AnthropicSDKProvider,
  AnthropicProviderOptions,
  createAnthropic,
} from '@ai-sdk/anthropic';
import { AISDKError, generateText, streamText } from 'ai';

import {
  CopilotProviderSideError,
  metrics,
  UserFriendlyError,
} from '../../../base';
import { createExaTool } from '../tools';
import { CopilotProvider } from './provider';
import {
  CopilotChatOptions,
  CopilotProviderType,
  ModelConditions,
  ModelInputType,
  ModelOutputType,
  PromptMessage,
} from './types';
import { chatToGPTMessage } from './utils';

export type AnthropicConfig = {
  apiKey: string;
  baseUrl?: string;
};

export class AnthropicProvider extends CopilotProvider<AnthropicConfig> {
  override readonly type = CopilotProviderType.Anthropic;
  override readonly models = [
    {
      id: 'claude-3-7-sonnet-20250219',
      capabilities: [
        {
          input: [ModelInputType.Text],
          output: [ModelOutputType.Text, ModelOutputType.Reasoning],
          defaultForOutputType: true,
        },
      ],
    },
  ];

  private readonly MAX_STEPS = 20;

  private toolResults: string[] = [];

  #instance!: AnthropicSDKProvider;

  override configured(): boolean {
    return !!this.config.apiKey;
  }

  protected override setup() {
    super.setup();
    this.#instance = createAnthropic({
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
        message: e?.message || 'Unexpected anthropic response',
      });
    }
  }

  async text(
    cond: ModelConditions,
    messages: PromptMessage[],
    options: CopilotChatOptions = {}
  ): Promise<string> {
    await this.checkParams({ cond, messages });
    const model = this.selectModel(cond);

    try {
      metrics.ai.counter('chat_text_calls').add(1, { model: model.id });

      const [system, msgs] = await chatToGPTMessage(messages);

      const modelInstance = this.#instance(model.id);
      const { text, reasoning } = await generateText({
        model: modelInstance,
        system,
        messages: msgs,
        abortSignal: options.signal,
        providerOptions: {
          anthropic: this.getAnthropicOptions(options),
        },
        tools: this.getTools(options),
        maxSteps: this.MAX_STEPS,
        experimental_continueSteps: true,
      });

      if (!text) throw new Error('Failed to generate text');

      return reasoning ? `${reasoning}\n${text}` : text;
    } catch (e: any) {
      metrics.ai.counter('chat_text_errors').add(1, { model: model.id });
      throw this.handleError(e);
    }
  }

  async *streamText(
    cond: ModelConditions,
    messages: PromptMessage[],
    options: CopilotChatOptions = {}
  ): AsyncIterable<string> {
    await this.checkParams({ cond, messages });
    const model = this.selectModel(cond);

    try {
      metrics.ai.counter('chat_text_stream_calls').add(1, { model: model.id });
      const [system, msgs] = await chatToGPTMessage(messages);
      const { fullStream } = streamText({
        model: this.#instance(model.id),
        system,
        messages: msgs,
        abortSignal: options.signal,
        providerOptions: {
          anthropic: this.getAnthropicOptions(options),
        },
        tools: this.getTools(options),
        maxSteps: this.MAX_STEPS,
        experimental_continueSteps: true,
      });

      for await (const message of fullStream) {
        switch (message.type) {
          case 'reasoning': {
            yield message.textDelta;
            break;
          }
          case 'tool-result': {
            if (message.toolName === 'web_search') {
              this.toolResults.push(this.getWebSearchLinks(message.result));
            }
            break;
          }
          case 'step-finish': {
            if (message.finishReason === 'tool-calls') {
              yield this.toolResults.join('\n');
              this.toolResults = [];
            }
            break;
          }
          case 'text-delta': {
            yield message.textDelta;
            break;
          }
          case 'error': {
            const error = message.error as { type: string; message: string };
            throw new Error(error.message);
          }
        }
        if (options.signal?.aborted) {
          await fullStream.cancel();
          break;
        }
      }
    } catch (e: any) {
      metrics.ai.counter('chat_text_stream_errors').add(1, { model: model.id });
      throw this.handleError(e);
    }
  }

  private getTools(options: CopilotChatOptions) {
    if (options?.webSearch) {
      return {
        web_search: createExaTool(this.AFFiNEConfig),
      };
    }
    return undefined;
  }

  private getAnthropicOptions(
    options: CopilotChatOptions
  ): AnthropicProviderOptions {
    if (options?.reasoning) {
      return {
        thinking: {
          type: 'enabled',
          budgetTokens: 12000,
        },
      };
    }
    return {};
  }

  private getWebSearchLinks(
    list: {
      title: string | null;
      url: string;
    }[]
  ): string {
    const links = list.reduce((acc, result) => {
      return acc + `\n[${result.title ?? result.url}](${result.url})\n`;
    }, '\n');
    return links + '\n';
  }
}
