import { randomBytes } from 'node:crypto';

import {
  CopilotChatOptions,
  CopilotEmbeddingOptions,
  CopilotImageOptions,
  ModelConditions,
  ModelInputType,
  ModelOutputType,
  PromptMessage,
} from '../../plugins/copilot/providers';
import {
  DEFAULT_DIMENSIONS,
  OpenAIProvider,
} from '../../plugins/copilot/providers/openai';
import { sleep } from '../utils/utils';

export class MockCopilotProvider extends OpenAIProvider {
  override readonly models = [
    {
      name: 'Mock Model',
      id: 'test',
      capabilities: [
        {
          input: [ModelInputType.Text],
          output: [ModelOutputType.Text],
          defaultForOutputType: true,
        },
      ],
    },
    {
      name: 'Mock Image Model',
      id: 'test-image',
      capabilities: [
        {
          input: [ModelInputType.Text],
          output: [ModelOutputType.Image],
          defaultForOutputType: true,
        },
      ],
    },
    {
      name: 'GPT-4o',
      id: 'gpt-4o',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text],
        },
      ],
    },
    {
      name: 'GPT-4o-08-06',
      id: 'gpt-4o-2024-08-06',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text],
        },
      ],
    },
    {
      name: 'Gpt-4.1',
      id: 'gpt-4.1',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text],
        },
      ],
    },
    {
      name: 'Gpt-4.1-04-14',
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
      name: 'lcm-sd15-i2i',
      id: 'lcm-sd15-i2i',
      capabilities: [
        {
          input: [ModelInputType.Image],
          output: [ModelOutputType.Image],
        },
      ],
    },
    {
      name: 'clarity-upscaler',
      id: 'clarity-upscaler',
      capabilities: [
        {
          input: [ModelInputType.Image],
          output: [ModelOutputType.Image],
        },
      ],
    },
    {
      name: 'imageutils/rembg',
      id: 'imageutils/rembg',
      capabilities: [
        {
          input: [ModelInputType.Image],
          output: [ModelOutputType.Image],
        },
      ],
    },
    {
      name: 'Gemini 2.5 Pro',
      id: 'gemini-2.5-pro-preview-03-25',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text],
        },
      ],
    },
  ];

  override async text(
    cond: ModelConditions,
    messages: PromptMessage[],
    options:
      | CopilotChatOptions
      | CopilotEmbeddingOptions
      | CopilotImageOptions = {}
  ): Promise<string> {
    await this.checkParams({ messages, cond, options });
    // make some time gap for history test case
    await sleep(100);
    return 'generate text to text';
  }

  override async *streamText(
    cond: ModelConditions,
    messages: PromptMessage[],
    options: CopilotChatOptions | CopilotImageOptions = {}
  ): AsyncIterable<string> {
    await this.checkParams({ messages, cond, options });

    // make some time gap for history test case
    await sleep(100);

    if (cond.outputType === ModelOutputType.Image) {
      const { content: prompt } = [...messages].pop() || {};
      if (!prompt) throw new Error('Prompt is required');

      const imageUrls = [
        `https://example.com/${cond.modelId || 'test'}.jpg`,
        prompt,
      ];

      for (const imageUrl of imageUrls) {
        yield imageUrl;
        if (options.signal?.aborted) {
          break;
        }
      }
      return;
    }

    const result = 'generate text to text stream';
    for (const message of result) {
      yield message;
      if (options.signal?.aborted) {
        break;
      }
    }
  }

  // ====== text to embedding ======

  override async generateEmbedding(
    cond: ModelConditions,
    messages: string | string[],
    options: CopilotEmbeddingOptions = { dimensions: DEFAULT_DIMENSIONS }
  ): Promise<number[][]> {
    messages = Array.isArray(messages) ? messages : [messages];
    await this.checkParams({ embeddings: messages, cond, options });

    // make some time gap for history test case
    await sleep(100);
    return [Array.from(randomBytes(options.dimensions)).map(v => v % 128)];
  }
}
