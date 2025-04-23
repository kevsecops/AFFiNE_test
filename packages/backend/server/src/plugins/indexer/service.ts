import path from 'node:path';

import { Injectable, Logger } from '@nestjs/common';
import { camelCase, chunk, mapKeys, snakeCase } from 'lodash-es';

import { InvalidIndexerInput, SearchProviderNotFound } from '../../base';
import { Models } from '../../models';
import { SearchProviderName } from './config';
import { SearchProviderFactory } from './factory';
import {
  AggregateQueryDSL,
  BaseQueryDSL,
  HighlightDSL,
  OperationOptions,
  SearchNode,
  SearchProvider,
  SearchQueryDSL,
  TopHitsDSL,
} from './providers';
import { Block, BlockSchema, Doc, DocSchema, SearchTable } from './tables';
import {
  AggregateInput,
  SearchHighlight,
  SearchInput,
  SearchQuery,
  SearchQueryOccur,
  SearchQueryType,
} from './types';

// always return these fields to check permission
const DefaultSourceFields = ['workspace_id', 'doc_id'] as const;

export const SearchTableSorts = {
  [SearchProviderName.Elasticsearch]: {
    [SearchTable.block]: [
      '_score',
      { updated_at: 'desc' },
      'doc_id',
      'block_id',
    ],
    [SearchTable.doc]: ['_score', { updated_at: 'desc' }, 'doc_id'],
  },
  // add id to sort and make sure scroll can work on manticoresearch
  [SearchProviderName.Manticoresearch]: {
    [SearchTable.block]: ['_score', { updated_at: 'desc' }, 'id'],
    [SearchTable.doc]: ['_score', { updated_at: 'desc' }, 'id'],
  },
} as const;

const TableDir = path.join(import.meta.dirname, 'tables');

const SearchTableMappingFiles = {
  [SearchProviderName.Elasticsearch]: {
    [SearchTable.block]: path.join(TableDir, 'block.json'),
    [SearchTable.doc]: path.join(TableDir, 'doc.json'),
  },
  [SearchProviderName.Manticoresearch]: {
    [SearchTable.block]: path.join(TableDir, 'block.sql'),
    [SearchTable.doc]: path.join(TableDir, 'doc.sql'),
  },
};

const SearchTableSchema = {
  [SearchTable.block]: BlockSchema,
  [SearchTable.doc]: DocSchema,
};

const SupportFullTextSearchFields = {
  [SearchTable.block]: ['content'],
  [SearchTable.doc]: ['title'],
};

const AllowAggregateFields = new Set(['docId', 'flavour']);

type SnakeToCamelCase<S extends string> =
  S extends `${infer Head}_${infer Tail}`
    ? `${Head}${Capitalize<SnakeToCamelCase<Tail>>}`
    : S;
type CamelizeKeys<T> = {
  [K in keyof T as SnakeToCamelCase<K & string>]: T[K];
};
type UpsertDoc = CamelizeKeys<Doc>;
type UpsertBlock = CamelizeKeys<Block>;
type UpsertTypeByTable<T extends SearchTable> = T extends SearchTable.block
  ? UpsertBlock
  : UpsertDoc;

export interface SearchNodeWithMeta extends SearchNode {
  _source: {
    workspaceId: string;
    docId: string;
  };
}

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  constructor(
    private readonly models: Models,
    private readonly factory: SearchProviderFactory
  ) {}

  async createTables() {
    let searchProvider: SearchProvider | undefined;
    try {
      searchProvider = this.factory.get();
    } catch (err) {
      if (err instanceof SearchProviderNotFound) {
        this.logger.debug('No search provider found, skip creating tables');
        return;
      }
      throw err;
    }
    const mappingFiles = SearchTableMappingFiles[searchProvider.provider];
    for (const table of Object.keys(mappingFiles) as SearchTable[]) {
      await searchProvider.createTable(table, mappingFiles[table]);
    }
  }

  async write<T extends SearchTable>(
    table: T,
    documents: UpsertTypeByTable<T>[],
    options?: OperationOptions
  ) {
    const searchProvider = this.factory.get();
    const schema = SearchTableSchema[table];
    // slice documents to 1000 documents each time
    const documentsChunks = chunk(documents, 1000);
    for (const documentsChunk of documentsChunks) {
      await searchProvider.write(
        table,
        documentsChunk.map(d =>
          schema.parse(mapKeys(d, (_, key) => snakeCase(key)))
        ),
        options
      );
    }
  }

  async search(input: SearchInput) {
    const searchProvider = this.factory.get();
    const dsl = this.parseInput(input);
    const result = await searchProvider.search(input.table, dsl);
    return {
      ...result,
      nodes: this.#formatSearchNodes(result.nodes),
    };
  }

  async aggregate(input: AggregateInput) {
    const searchProvider = this.factory.get();
    const dsl = this.parseInput(input);
    const result = await searchProvider.aggregate(input.table, dsl);
    for (const bucket of result.buckets) {
      bucket.hits = {
        ...bucket.hits,
        nodes: this.#formatSearchNodes(bucket.hits.nodes),
      };
    }
    return result;
  }

  async listDocIds(workspaceId: string) {
    const docIds: string[] = [];
    let cursor: string | undefined;
    do {
      const result = await this.search({
        table: SearchTable.doc,
        query: {
          type: SearchQueryType.match,
          field: 'workspaceId',
          match: workspaceId,
        },
        options: {
          fields: ['docId'],
          pagination: {
            limit: 10000,
            cursor,
          },
        },
      });
      docIds.push(...result.nodes.map(node => node.fields.docId[0] as string));
      cursor = result.nextCursor;
      this.logger.debug(
        `get ${result.nodes.length} new / ${docIds.length} total doc ids for workspace ${workspaceId}, nextCursor: ${cursor}`
      );
    } while (cursor);
    return docIds;
  }

  async syncDoc(workspaceId: string, docId: string) {
    const snapshot = await this.models.doc.getSnapshot(workspaceId, docId);
    if (!snapshot) {
      this.logger.debug(`doc ${workspaceId}/${docId} not found`);
      return;
    }
    // TODO(@fengmk2): get title, summary and journal from snapshot blob
    await this.write(SearchTable.doc, [
      {
        workspaceId,
        docId,
        title: snapshot.title,
        summary: snapshot.summary,
        journal: snapshot.journal,
        createdByUserId: snapshot.createdBy ?? '',
        updatedByUserId: snapshot.updatedBy ?? '',
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
      },
    ]);
    this.logger.debug(`synced doc ${workspaceId}/${docId}`);
  }

  async deleteDoc(
    workspaceId: string,
    docId: string,
    options?: OperationOptions
  ) {
    await this.deleteByQuery(
      SearchTable.doc,
      {
        type: SearchQueryType.boolean,
        occur: SearchQueryOccur.must,
        queries: [
          {
            type: SearchQueryType.match,
            field: 'workspaceId',
            match: workspaceId,
          },
          {
            type: SearchQueryType.match,
            field: 'docId',
            match: docId,
          },
        ],
      },
      options
    );
    this.logger.debug(`deleted doc ${workspaceId}/${docId}`);
    await this.deleteByQuery(
      SearchTable.block,
      {
        type: SearchQueryType.boolean,
        occur: SearchQueryOccur.must,
        queries: [
          {
            type: SearchQueryType.match,
            field: 'workspaceId',
            match: workspaceId,
          },
          {
            type: SearchQueryType.match,
            field: 'docId',
            match: docId,
          },
        ],
      },
      options
    );
    this.logger.debug(`deleted all blocks in doc ${workspaceId}/${docId}`);
  }

  async deleteWorkspace(workspaceId: string, options?: OperationOptions) {
    await this.deleteByQuery(
      SearchTable.doc,
      {
        type: SearchQueryType.match,
        field: 'workspaceId',
        match: workspaceId,
      },
      options
    );
    this.logger.debug(`deleted all docs in workspace ${workspaceId}`);
    await this.deleteByQuery(
      SearchTable.block,
      {
        type: SearchQueryType.match,
        field: 'workspaceId',
        match: workspaceId,
      },
      options
    );
    this.logger.debug(`deleted all blocks in workspace ${workspaceId}`);
  }

  async deleteByQuery<T extends SearchTable>(
    table: T,
    query: SearchQuery,
    options?: OperationOptions
  ) {
    const searchProvider = this.factory.get();
    const dsl = this.#parseQuery(table, query);
    await searchProvider.deleteByQuery(table, dsl, options);
  }

  #formatSearchNodes(nodes: SearchNode[]) {
    return nodes.map(node => ({
      ...node,
      fields: mapKeys(node.fields, (_, key) => camelCase(key)),
      highlights: node.highlights
        ? mapKeys(node.highlights, (_, key) => camelCase(key))
        : undefined,
      _source: {
        workspaceId: node._source.workspace_id,
        docId: node._source.doc_id,
      },
    })) as SearchNodeWithMeta[];
  }

  /**
   * Parse input to ES query DSL
   * @see https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html
   */
  parseInput<T extends SearchInput | AggregateInput>(
    input: T
  ): T extends SearchInput ? SearchQueryDSL : AggregateQueryDSL {
    // common options
    const query = this.#parseQuery(input.table, input.query);
    const searchProvider = this.factory.get();
    const dsl: BaseQueryDSL = {
      _source: [...DefaultSourceFields],
      sort: [...SearchTableSorts[searchProvider.provider][input.table]],
      query,
    };
    const pagination = input.options.pagination;
    if (pagination?.limit) {
      if (pagination.limit > 10000) {
        throw new InvalidIndexerInput({
          reason: 'limit must be less than 10000',
        });
      }
      dsl.size = pagination.limit;
    }
    if (pagination?.skip) {
      dsl.from = pagination.skip;
    }
    if (pagination?.cursor) {
      dsl.cursor = pagination.cursor;
    }

    if ('fields' in input.options) {
      // for search input
      const searchDsl: SearchQueryDSL = {
        ...dsl,
        fields: input.options.fields.map(snakeCase),
      };
      if (input.options.highlights) {
        searchDsl.highlight = this.#parseHighlights(input.options.highlights);
      }
      // @ts-expect-error should be SearchQueryDSL
      return searchDsl;
    }

    if ('field' in input) {
      // for aggregate input
      if (!AllowAggregateFields.has(input.field)) {
        throw new InvalidIndexerInput({
          reason: `aggregate field "${input.field}" is not allowed`,
        });
      }

      // input: {
      //   field: 'docId',
      //   options: {
      //     hits: {
      //       fields: [...],
      //       highlights: [...],
      //       pagination: {
      //         limit: 5,
      //       },
      //     },
      //     pagination: {
      //       limit: 100,
      //     },
      //   },
      // }
      // to
      // "aggs": {
      //   "result": {
      //     "terms": { "field": "doc_id" },
      //     "aggs": {
      //       "result": {
      //         "top_hits": {
      //           "_source": false,
      //           "fields": [...],
      //           "highlights": [...],
      //           "size": 5
      //         }
      //       }
      //     }
      //   }
      // }
      const topHits: TopHitsDSL = {
        _source: [...DefaultSourceFields],
        fields: input.options.hits.fields.map(snakeCase),
      };
      if (input.options.hits.pagination?.limit) {
        topHits.size = input.options.hits.pagination.limit;
      }
      if (input.options.hits.highlights) {
        topHits.highlight = this.#parseHighlights(
          input.options.hits.highlights
        );
      }
      const aggregateDsl: AggregateQueryDSL = {
        ...dsl,
        aggs: {
          result: {
            terms: { field: snakeCase(input.field) },
            aggs: {
              result: {
                // https://www.elastic.co/docs/reference/aggregations/search-aggregations-metrics-top-hits-aggregation
                top_hits: topHits,
              },
            },
          },
        },
      };
      // @ts-expect-error should be AggregateQueryDSL
      return aggregateDsl;
    }

    throw new InvalidIndexerInput({
      reason: '"field" or "fields" is required',
    });
  }

  #parseQuery(
    table: SearchTable,
    query: SearchQuery,
    parentNodes?: unknown[]
  ): Record<string, any> {
    if (query.type === SearchQueryType.match) {
      // required field and match
      if (!query.field) {
        throw new InvalidIndexerInput({
          reason: '"field" is required in match query',
        });
      }
      if (!query.match) {
        throw new InvalidIndexerInput({
          reason: '"match" is required in match query',
        });
      }

      // {
      //   type: 'match',
      //   field: 'content',
      //   match: keyword,
      // }
      // to
      // {
      //   match: {
      //     content: {
      //       query: keyword
      //     },
      //   },
      // }
      //
      // or
      // {
      //   type: 'match',
      //   field: 'refDocId',
      //   match: docId,
      // }
      // to
      // {
      //   term: {
      //     ref_doc_id: {
      //       value: docId
      //     },
      //   },
      // }
      const field = snakeCase(query.field);
      const isFullTextField = SupportFullTextSearchFields[table].includes(
        query.field
      );
      const op = isFullTextField ? 'match' : 'term';
      const key = isFullTextField ? 'query' : 'value';
      const dsl = {
        [op]: {
          [field]: {
            [key]: query.match,
            ...(typeof query.boost === 'number' && { boost: query.boost }),
          },
        },
      };
      if (parentNodes) {
        parentNodes.push(dsl);
      }
      return dsl;
    }
    if (query.type === SearchQueryType.boolean) {
      // required occur and queries
      if (!query.occur) {
        this.logger.debug(`query: ${JSON.stringify(query, null, 2)}`);
        throw new InvalidIndexerInput({
          reason: '"occur" is required in boolean query',
        });
      }
      if (!query.queries) {
        throw new InvalidIndexerInput({
          reason: '"queries" is required in boolean query',
        });
      }

      // {
      //   type: 'boolean',
      //   occur: 'must_not',
      //   queries: [
      //     {
      //       type: 'match',
      //       field: 'docId',
      //       match: 'docId1',
      //     },
      //   ],
      // }
      // to
      // {
      //   bool: {
      //     must_not: [
      //       {
      //         match: { doc_id: { query: 'docId1' } }
      //       },
      //     ],
      //   },
      // }
      const nodes: unknown[] = [];
      const dsl: Record<string, any> = {
        bool: {
          [query.occur]: nodes,
          ...(typeof query.boost === 'number' && { boost: query.boost }),
        },
      };
      for (const subQuery of query.queries) {
        this.#parseQuery(table, subQuery, nodes);
      }
      if (parentNodes) {
        parentNodes.push(dsl);
      }
      return dsl;
    }
    if (query.type === SearchQueryType.exists) {
      // required field
      if (!query.field) {
        throw new InvalidIndexerInput({
          reason: '"field" is required in exists query',
        });
      }

      // {
      //   type: 'exists',
      //   field: 'refDocId',
      // }
      // to
      // {
      //   exists: {
      //     field: 'ref_doc_id',
      //   },
      // }
      const dsl = {
        exists: {
          field: snakeCase(query.field),
          ...(typeof query.boost === 'number' && { boost: query.boost }),
        },
      };
      if (parentNodes) {
        parentNodes.push(dsl);
      }
      return dsl;
    }
    if (query.type === SearchQueryType.all) {
      // {
      //   type: 'all'
      // }
      // to
      // {
      //   match_all: {},
      // }
      const dsl = {
        match_all: {
          ...(typeof query.boost === 'number' && { boost: query.boost }),
        },
      };
      if (parentNodes) {
        parentNodes.push(dsl);
      }
      return dsl;
    }
    if (query.type === SearchQueryType.boost) {
      // required query and boost
      if (!query.query) {
        throw new InvalidIndexerInput({
          reason: '"query" is required in boost query',
        });
      }
      if (typeof query.boost !== 'number') {
        throw new InvalidIndexerInput({
          reason: '"boost" is required in boost query',
        });
      }

      // {
      //   type: 'boost',
      //   boost: 1.5,
      //   query: {
      //     type: 'match',
      //     field: 'flavour',
      //     match: 'affine:page',
      //   },
      // }
      // to
      // {
      //   "match": {
      //     "flavour": {
      //       "query": "affine:page",
      //       "boost": 1.5
      //     }
      //   }
      // }
      return this.#parseQuery(
        table,
        {
          ...query.query,
          boost: query.boost,
        },
        parentNodes
      );
    }
    throw new InvalidIndexerInput({
      reason: `unsupported query type: ${query.type}`,
    });
  }

  /**
   * Parse highlights to ES DSL
   * @see https://www.elastic.co/docs/reference/elasticsearch/rest-apis/highlighting
   */
  #parseHighlights(highlights: SearchHighlight[]) {
    // [
    //   {
    //     field: 'content',
    //     before: '<b>',
    //     end: '</b>',
    //   },
    // ]
    // to
    // {
    //   fields: {
    //     content: {
    //       pre_tags: ['<b>'],
    //       post_tags: ['</b>'],
    //     },
    //   },
    // }
    const fields = highlights.reduce(
      (acc, highlight) => {
        acc[snakeCase(highlight.field)] = {
          pre_tags: [highlight.before],
          post_tags: [highlight.end],
        };
        return acc;
      },
      {} as Record<string, HighlightDSL>
    );
    return { fields };
  }
}
