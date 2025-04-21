import { randomUUID } from 'node:crypto';

import { indexerAggregateQuery, SearchTable } from '@affine/graphql';

import { IndexerService } from '../../../plugins/indexer/service';
import { Mockers } from '../../mocks';
import { app, e2e } from '../test';

const isElasticsearch =
  process.env.AFFINE_INDEXER_SEARCH_PROVIDER === 'elasticsearch';

e2e('should aggregate by docId', async t => {
  const owner = await app.signup();

  const workspace = await app.create(Mockers.Workspace, {
    owner: { id: owner.id },
  });

  const docIds = [randomUUID(), randomUUID(), randomUUID()];
  const blockIds = [
    randomUUID(),
    randomUUID(),
    randomUUID(),
    randomUUID(),
    randomUUID(),
  ];
  const indexerService = app.get(IndexerService);

  await indexerService.write(
    SearchTable.block,
    [
      {
        docId: docIds[0],
        workspaceId: workspace.id,
        content: 'test1 hello world top2',
        flavour: 'affine:text',
        blockId: blockIds[0],
        createdByUserId: owner.id,
        updatedByUserId: owner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        docId: docIds[0],
        workspaceId: workspace.id,
        content: 'test2 hello hello top3',
        flavour: 'affine:text',
        blockId: blockIds[1],
        createdByUserId: owner.id,
        updatedByUserId: owner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        docId: docIds[0],
        workspaceId: workspace.id,
        content: 'test3 hello title top1',
        flavour: 'affine:page',
        blockId: blockIds[2],
        createdByUserId: owner.id,
        updatedByUserId: owner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        docId: docIds[1],
        workspaceId: workspace.id,
        content: 'test4 hello world',
        flavour: 'affine:text',
        blockId: blockIds[3],
        refDocId: docIds[0],
        ref: ['{"foo": "bar1"}'],
        createdByUserId: owner.id,
        updatedByUserId: owner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        docId: docIds[2],
        workspaceId: workspace.id,
        content: 'test5 hello',
        flavour: 'affine:text',
        blockId: blockIds[4],
        refDocId: docIds[0],
        ref: ['{"foo": "bar2"}'],
        createdByUserId: owner.id,
        updatedByUserId: owner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );

  const result = await app.gql({
    query: indexerAggregateQuery,
    variables: {
      id: workspace.id,
      input: {
        table: SearchTable.block,
        query: {
          // @ts-expect-error allow to use string as enum
          type: 'boolean',
          // @ts-expect-error allow to use string as enum
          occur: 'must',
          queries: [
            {
              // @ts-expect-error allow to use string as enum
              type: 'match',
              field: 'content',
              match: 'hello world',
            },
            {
              // @ts-expect-error allow to use string as enum
              type: 'boolean',
              // @ts-expect-error allow to use string as enum
              occur: 'should',
              queries: [
                {
                  // @ts-expect-error allow to use string as enum
                  type: 'match',
                  field: 'content',
                  match: 'hello world',
                },
                {
                  // @ts-expect-error allow to use string as enum
                  type: 'boost',
                  boost: 1.5,
                  query: {
                    // @ts-expect-error allow to use string as enum
                    type: 'match',
                    field: 'flavour',
                    match: 'affine:page',
                  },
                },
              ],
            },
          ],
        },
        field: 'docId',
        options: {
          pagination: {
            limit: 50,
            skip: 0,
          },
          hits: {
            pagination: {
              limit: 2,
              skip: 0,
            },
            fields: ['blockId', 'flavour'],
            highlights: [
              {
                field: 'content',
                before: '<b>',
                end: '</b>',
              },
            ],
          },
        },
      },
    },
  });
  // console.log(JSON.stringify(result, null, 2));
  t.truthy(result.workspace.aggregate, 'failed to aggregate');
  t.is(result.workspace.aggregate.pagination.count, 5);
  t.is(result.workspace.aggregate.pagination.hasMore, true);
  t.truthy(result.workspace.aggregate.pagination.nextCursor);
  t.deepEqual(result.workspace.aggregate.buckets, [
    {
      key: docIds[0],
      count: 3,
      hits: {
        nodes: [
          {
            fields: {
              flavour: ['affine:page'],
              blockId: [blockIds[2]],
            },
            highlights: {
              content: ['test3 <b>hello</b> title top1'],
            },
          },
          {
            fields: {
              blockId: [blockIds[0]],
              flavour: ['affine:text'],
            },
            highlights: {
              content: isElasticsearch
                ? ['test1 <b>hello</b> <b>world</b> top2']
                : ['test1 <b>hello world</b> top2'],
            },
          },
        ],
      },
    },
    {
      key: docIds[1],
      count: 1,
      hits: {
        nodes: [
          {
            fields: {
              blockId: [blockIds[3]],
              flavour: ['affine:text'],
            },
            highlights: {
              content: isElasticsearch
                ? ['test4 <b>hello</b> <b>world</b>']
                : ['test4 <b>hello world</b>'],
            },
          },
        ],
      },
    },
    {
      key: docIds[2],
      count: 1,
      hits: {
        nodes: [
          {
            fields: {
              blockId: [blockIds[4]],
              flavour: ['affine:text'],
            },
            highlights: {
              content: ['test5 <b>hello</b>'],
            },
          },
        ],
      },
    },
  ]);
});
