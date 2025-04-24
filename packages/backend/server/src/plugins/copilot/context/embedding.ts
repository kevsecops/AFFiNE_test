import {
  createOpenAI,
  type OpenAIProvider as VercelOpenAIProvider,
} from '@ai-sdk/openai';
import { embedMany, generateObject } from 'ai';
import { chunk } from 'lodash-es';

import { ChunkSimilarity, Embedding } from '../../../models';
import { OpenAIConfig } from '../providers/openai';
import { EmbeddingClient, getReRankSchema, ReRankResult } from './types';

export class OpenAIEmbeddingClient extends EmbeddingClient {
  readonly #instance: VercelOpenAIProvider;

  constructor(config: OpenAIConfig) {
    super();
    this.#instance = createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async getEmbeddings(input: string[]): Promise<Embedding[]> {
    const modelInstance = this.#instance.embedding('text-embedding-3-large', {
      dimensions: 1024,
    });

    const { embeddings } = await embedMany({
      model: modelInstance,
      values: input,
    });

    return Array.from(embeddings.entries()).map(([index, embedding]) => ({
      index,
      embedding,
      content: input[index],
    }));
  }

  private async getEmbeddingRelevance<
    Chunk extends ChunkSimilarity = ChunkSimilarity,
  >(query: string, embeddings: Chunk[]): Promise<ReRankResult> {
    const modelInstance = this.#instance('gpt-4.1-mini');
    const results = embeddings.map(e => [
      `
  <result>
    <targetId>${'docId' in e ? e.docId : 'fileId' in e ? e.fileId : ''}</targetId>
    <chunk>${e.chunk}</chunk>
    <content>${e.content}</content>
  </result>`,
    ]);
    const {
      object: { ranks },
    } = await generateObject({
      model: modelInstance,
      prompt: `Generate a score array based on the search results list to measure the likelihood that the information contained in the search results is useful for the report on the following topic: ${query}\n\nHere are the search results:\n<results>${results}\n</results>`,
      schema: getReRankSchema(1),
      maxRetries: 3,
    });
    return ranks;
  }

  override async reRank<Chunk extends ChunkSimilarity = ChunkSimilarity>(
    query: string,
    embeddings: Chunk[],
    topK: number
  ): Promise<Chunk[]> {
    const sortedEmbeddings = embeddings.toSorted(
      (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)
    );

    const chunks = sortedEmbeddings.reduce(
      (acc, e) => {
        const key = `${'docId' in e ? e.docId : 'fileId' in e ? e.fileId : ''}:${e.chunk}`;
        acc[key] = e;
        return acc;
      },
      {} as Record<string, Chunk>
    );

    const ranks = await Promise.all(
      chunk(sortedEmbeddings, topK).map(e =>
        this.getEmbeddingRelevance(query, e)
      )
    );

    const highConfidenceChunks = ranks
      .flat()
      .toSorted((a, b) => b.scores.score - a.scores.score)
      .filter(r => r.scores.score > 5)
      .map(r => chunks[`${r.scores.targetId}:${r.scores.chunk}`]);

    return highConfidenceChunks.slice(0, topK);
  }
}

export class MockEmbeddingClient extends EmbeddingClient {
  async getEmbeddings(input: string[]): Promise<Embedding[]> {
    return input.map((_, i) => ({
      index: i,
      content: input[i],
      embedding: Array.from({ length: 1024 }, () => Math.random()),
    }));
  }
}
