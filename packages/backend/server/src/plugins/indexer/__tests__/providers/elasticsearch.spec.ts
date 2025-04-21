import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import test from 'ava';

import { createModule } from '../../../../__tests__/create-module';
import { Mockers } from '../../../../__tests__/mocks';
import { ConfigModule } from '../../../../base/config';
import { IndexerModule } from '../../';
import { SearchProviderName } from '../../config';
import { ElasticsearchProvider } from '../../providers';
import { SearchTable } from '../../tables';

const module = await createModule({
  imports: [
    IndexerModule,
    ConfigModule.override({
      search: {
        provider: SearchProviderName.Elasticsearch,
        endpoint: 'http://localhost:9200',
        username: 'elastic',
        password: 'affine',
      },
    }),
  ],
  providers: [ElasticsearchProvider],
});
const searchProvider = module.get(ElasticsearchProvider);
const user = await module.create(Mockers.User);
const workspace = await module.create(Mockers.Workspace);

test.before(async () => {
  const tablesDir = path.join(import.meta.dirname, '../../tables');
  await searchProvider.createTable(
    SearchTable.block,
    path.join(tablesDir, 'block.json')
  );
  await searchProvider.createTable(
    SearchTable.doc,
    path.join(tablesDir, 'doc.json')
  );

  await searchProvider.write(
    SearchTable.block,
    [
      {
        workspace_id: randomUUID(),
        doc_id: randomUUID(),
        block_id: randomUUID(),
        content: `hello world on search title, ${randomUUID()}`,
        flavour: 'affine:page',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        workspace_id: randomUUID(),
        doc_id: randomUUID(),
        block_id: randomUUID(),
        content: `hello world on search block content, ${randomUUID()}`,
        flavour: 'other:flavour',
        blob: randomUUID(),
        ref_doc_id: randomUUID(),
        ref: ['{"foo": "bar"}', '{"foo": "baz"}'],
        parent_flavour: 'parent:flavour',
        parent_block_id: randomUUID(),
        additional: '{"foo": "bar"}',
        markdown_preview: 'markdownPreview',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        workspace_id: 'workspaceId101',
        doc_id: 'docId101',
        block_id: 'blockId101',
        content: 'hello world on search block content at 101',
        flavour: 'other:flavour',
        blob: 'blob101',
        ref_doc_id: 'docId101',
        ref: ['{"foo": "bar"}', '{"foo": "baz"}'],
        parent_flavour: 'parent:flavour',
        parent_block_id: 'blockId101',
        additional: '{"foo": "bar"}',
        markdown_preview: 'markdownPreview',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date('2025-04-19T08:19:36.160Z'),
        updated_at: new Date('2025-04-19T08:19:36.160Z'),
      },
      {
        workspace_id: 'workspaceId1',
        doc_id: 'docId2',
        block_id: 'blockId8',
        content:
          'title8 hello hello hello hello hello hello hello hello hello hello, hello hello hello hello hello hello hello hello some link https://linear.app/affine-design/issue/AF-1379/slash-commands-%E6%BF%80%E6%B4%BB%E6%8F%92%E5%85%A5-link-%E7%9A%84%E5%BC%B9%E7%AA%97%E9%87%8C%EF%BC%8C%E8%BE%93%E5%85%A5%E9%93%BE%E6%8E%A5%E4%B9%8B%E5%90%8E%E4%B8%8D%E5%BA%94%E8%AF%A5%E7%9B%B4%E6%8E%A5%E5%AF%B9%E9%93%BE%E6%8E%A5%E8%BF%9B%E8%A1%8C%E5%88%86%E8%AF%8D%E6%90%9C%E7%B4%A2',
        flavour: 'flavour8',
        ref_doc_id: 'docId1',
        ref: [
          '{"docId":"docId1","mode":"page"}',
          '{"docId":"docId2","mode":"page"}',
        ],
        parent_flavour: 'parentFlavour8',
        parent_block_id: 'parentBlockId8',
        additional: 'additional8',
        markdown_preview: 'markdownPreview8',
        created_by_user_id: 'userId8',
        updated_by_user_id: 'userId8',
        created_at: new Date('2025-03-08T06:04:13.278Z'),
        updated_at: new Date('2025-03-08T06:04:13.278Z'),
      },
    ],
    {
      refresh: true,
    }
  );
  const blocks = await readFile(
    path.join(import.meta.dirname, '../test-blocks.json'),
    'utf-8'
  );
  // @ts-expect-error access protected method
  await searchProvider.requestBulk(
    SearchTable.block,
    blocks.trim().split('\n'),
    {
      // make sure the data is visible to search
      refresh: 'true',
    }
  );
  const docs = await readFile(
    path.join(import.meta.dirname, '../test-docs.json'),
    'utf-8'
  );
  // @ts-expect-error access protected method
  await searchProvider.requestBulk(SearchTable.doc, docs.trim().split('\n'), {
    refresh: 'true',
  });
});

test.after.always(async () => {
  await searchProvider.deleteByQuery(
    SearchTable.block,
    {
      term: {
        workspace_id: workspace.id,
      },
    },
    {
      refresh: true,
    }
  );
  await searchProvider.deleteByQuery(
    SearchTable.doc,
    {
      term: {
        workspace_id: workspace.id,
      },
    },
    {
      refresh: true,
    }
  );
  await module.close();
});

test('should provider is elasticsearch', t => {
  t.is(searchProvider.provider, SearchProviderName.Elasticsearch);
});

// #region write

test('should write document work', async t => {
  const docId = randomUUID();
  await searchProvider.write(
    SearchTable.block,
    [
      {
        workspace_id: workspace.id,
        doc_id: docId,
        content: 'hello world',
        flavour: 'affine:page',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );
  let result = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id'],
    query: { match: { doc_id: docId } },
    fields: ['flavour', 'block_id', 'content', 'ref_doc_id'],
    sort: ['_score'],
  });
  t.is(result.nodes.length, 1);
  t.deepEqual(result.nodes[0].fields, {
    flavour: ['affine:page'],
    content: ['hello world'],
  });
  t.deepEqual(result.nodes[0]._source, {
    doc_id: docId,
    workspace_id: workspace.id,
  });
  // set ref_doc_id to a string
  await searchProvider.write(
    SearchTable.block,
    [
      {
        workspace_id: workspace.id,
        doc_id: docId,
        content: 'hello world',
        flavour: 'affine:page',
        ref_doc_id: 'docId2',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );
  result = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id'],
    query: { match: { doc_id: docId } },
    fields: ['flavour', 'block_id', 'content', 'ref_doc_id'],
    sort: ['_score'],
  });
  t.is(result.nodes.length, 1);
  t.deepEqual(result.nodes[0].fields, {
    flavour: ['affine:page'],
    content: ['hello world'],
    ref_doc_id: ['docId2'],
  });
  // not set ref_doc_id and replace the old value to null
  await searchProvider.write(
    SearchTable.block,
    [
      {
        workspace_id: workspace.id,
        doc_id: docId,
        content: 'hello world',
        flavour: 'affine:page',
        // ref_doc_id: 'docId2',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );
  result = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id'],
    query: { match: { doc_id: docId } },
    fields: ['flavour', 'block_id', 'content', 'ref_doc_id'],
    sort: ['_score'],
  });
  t.is(result.nodes.length, 1);
  t.deepEqual(result.nodes[0].fields, {
    flavour: ['affine:page'],
    content: ['hello world'],
  });
});

test('should handle ref_doc_id as string[]', async t => {
  const docId = randomUUID();
  // set ref_doc_id to a string
  await searchProvider.write(
    SearchTable.block,
    [
      {
        workspace_id: workspace.id,
        doc_id: docId,
        content: 'hello world',
        flavour: 'affine:page',
        ref_doc_id: 'docId2',
        ref: '{"foo": "bar"}',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );
  let result = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id', 'ref_doc_id', 'ref'],
    query: { match: { doc_id: docId } },
    fields: ['flavour', 'content', 'ref_doc_id', 'ref'],
    sort: ['_score'],
  });
  t.is(result.nodes.length, 1);
  t.deepEqual(result.nodes[0].fields, {
    flavour: ['affine:page'],
    content: ['hello world'],
    ref_doc_id: ['docId2'],
    ref: ['{"foo": "bar"}'],
  });
  t.deepEqual(result.nodes[0]._source, {
    doc_id: docId,
    workspace_id: workspace.id,
    ref_doc_id: 'docId2',
    ref: '{"foo": "bar"}',
  });

  // set ref_doc_id to a string[]
  await searchProvider.write(
    SearchTable.block,
    [
      {
        workspace_id: workspace.id,
        doc_id: docId,
        content: 'hello world',
        flavour: 'affine:page',
        ref_doc_id: ['docId2', 'docId3'],
        ref: ['{"foo": "bar"}', '{"foo": "baz"}'],
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );
  result = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id', 'ref_doc_id', 'ref'],
    query: { match: { doc_id: docId } },
    fields: ['flavour', 'content', 'ref_doc_id', 'ref'],
    sort: ['_score'],
  });
  t.is(result.nodes.length, 1);
  t.deepEqual(result.nodes[0].fields, {
    flavour: ['affine:page'],
    content: ['hello world'],
    ref_doc_id: ['docId2', 'docId3'],
    ref: ['{"foo": "bar"}', '{"foo": "baz"}'],
  });
  t.deepEqual(result.nodes[0]._source, {
    doc_id: docId,
    workspace_id: workspace.id,
    ref_doc_id: ['docId2', 'docId3'],
    ref: ['{"foo": "bar"}', '{"foo": "baz"}'],
  });
});

test('should handle content as string[]', async t => {
  const docId = randomUUID();
  // set content to a string
  await searchProvider.write(
    SearchTable.block,
    [
      {
        workspace_id: workspace.id,
        doc_id: docId,
        content: 'hello world',
        flavour: 'affine:page',
        ref_doc_id: 'docId2',
        ref: '{"foo": "bar"}',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );
  let result = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id', 'ref_doc_id', 'ref'],
    query: { match: { doc_id: docId } },
    fields: ['flavour', 'content', 'ref_doc_id', 'ref'],
    sort: ['_score'],
  });
  t.is(result.nodes.length, 1);
  t.deepEqual(result.nodes[0].fields, {
    flavour: ['affine:page'],
    content: ['hello world'],
    ref_doc_id: ['docId2'],
    ref: ['{"foo": "bar"}'],
  });
  t.deepEqual(result.nodes[0]._source, {
    doc_id: docId,
    workspace_id: workspace.id,
    ref_doc_id: 'docId2',
    ref: '{"foo": "bar"}',
  });

  // set content to a string[]
  await searchProvider.write(
    SearchTable.block,
    [
      {
        workspace_id: workspace.id,
        doc_id: docId,
        content: ['hello', 'world 2'],
        flavour: 'affine:page',
        ref_doc_id: 'docId2',
        ref: '{"foo": "bar"}',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );
  result = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id', 'ref_doc_id', 'ref'],
    query: { match: { doc_id: docId } },
    fields: ['flavour', 'content', 'ref_doc_id', 'ref'],
    sort: ['_score'],
  });
  t.is(result.nodes.length, 1);
  t.deepEqual(result.nodes[0].fields, {
    flavour: ['affine:page'],
    content: ['hello', 'world 2'],
    ref_doc_id: ['docId2'],
    ref: ['{"foo": "bar"}'],
  });
  t.deepEqual(result.nodes[0]._source, {
    doc_id: docId,
    workspace_id: workspace.id,
    ref_doc_id: 'docId2',
    ref: '{"foo": "bar"}',
  });
});

test('should handle blob as string[]', async t => {
  const docId = randomUUID();
  const blockId = randomUUID();
  // set blob to a string
  await searchProvider.write(
    SearchTable.block,
    [
      {
        workspace_id: workspace.id,
        doc_id: docId,
        block_id: blockId,
        content: '',
        flavour: 'affine:page',
        blob: 'blob1',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );
  let result = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id', 'blob'],
    query: { match: { doc_id: docId } },
    fields: ['flavour', 'content', 'blob'],
    sort: ['_score'],
  });
  t.is(result.nodes.length, 1);
  t.deepEqual(result.nodes[0].fields, {
    flavour: ['affine:page'],
    blob: ['blob1'],
    content: [''],
  });
  t.deepEqual(result.nodes[0]._source, {
    doc_id: docId,
    workspace_id: workspace.id,
    blob: 'blob1',
  });

  // set blob to a string[]
  await searchProvider.write(
    SearchTable.block,
    [
      {
        workspace_id: workspace.id,
        doc_id: docId,
        block_id: blockId,
        content: '',
        flavour: 'affine:page',
        blob: ['blob1', 'blob2'],
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );
  result = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id', 'blob'],
    query: { match: { doc_id: docId } },
    fields: ['flavour', 'content', 'blob'],
    sort: ['_score'],
  });
  t.is(result.nodes.length, 1);
  t.deepEqual(result.nodes[0].fields, {
    flavour: ['affine:page'],
    blob: ['blob1', 'blob2'],
    content: [''],
  });
  t.deepEqual(result.nodes[0]._source, {
    doc_id: docId,
    workspace_id: workspace.id,
    blob: ['blob1', 'blob2'],
  });

  await searchProvider.write(
    SearchTable.block,
    [
      {
        workspace_id: workspace.id,
        doc_id: docId,
        block_id: blockId,
        content: '',
        flavour: 'affine:page',
        blob: ['blob3'],
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );
  result = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id', 'blob'],
    query: { match: { doc_id: docId } },
    fields: ['flavour', 'content', 'blob'],
    sort: ['_score'],
  });
  t.is(result.nodes.length, 1);
  t.deepEqual(result.nodes[0].fields, {
    flavour: ['affine:page'],
    blob: ['blob3'],
    content: [''],
  });
  t.deepEqual(result.nodes[0]._source, {
    doc_id: docId,
    workspace_id: workspace.id,
    blob: ['blob3'],
  });
});

// #endregion

// #region search

test('should search query all and get next cursor work', async t => {
  const result = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id'],
    sort: [
      '_score',
      {
        updated_at: 'desc',
      },
      'doc_id',
      'block_id',
    ],
    query: {
      match_all: {},
    },
    fields: ['flavour', 'doc_id', 'content', 'created_at', 'updated_at'],
    size: 2,
  });
  t.truthy(result.total);
  t.is(result.timedOut, false);
  t.truthy(result.nextCursor);
  t.is(typeof result.nextCursor, 'string');
  t.is(result.nodes.length, 2);
  t.truthy(result.nodes[0]._id);
  t.truthy(result.nodes[0]._score);
  t.truthy(result.nodes[0].fields.flavour);
  t.truthy(result.nodes[0].fields.doc_id);
  t.truthy(result.nodes[0].fields.content);
  t.truthy(result.nodes[0].fields.created_at);
  t.truthy(result.nodes[0].fields.updated_at);
  t.deepEqual(Object.keys(result.nodes[0]._source), ['workspace_id', 'doc_id']);

  // test cursor
  const result2 = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id'],
    sort: [
      '_score',
      {
        updated_at: 'desc',
      },
      'doc_id',
      'block_id',
    ],
    query: {
      match_all: {},
    },
    fields: ['flavour', 'doc_id', 'content', 'created_at', 'updated_at'],
    size: 10000,
    cursor: result.nextCursor,
  });
  t.is(result2.total, result.total);
  t.is(result2.timedOut, false);
  t.truthy(result2.nextCursor);
  t.is(typeof result2.nextCursor, 'string');
  t.true(result2.nodes.length < 10000);

  // next cursor should be empty
  const result3 = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id'],
    sort: [
      '_score',
      {
        updated_at: 'desc',
      },
      'doc_id',
      'block_id',
    ],
    query: {
      match_all: {},
    },
    fields: ['flavour', 'doc_id', 'content', 'created_at', 'updated_at'],
    size: 10000,
    cursor: result2.nextCursor,
  });
  t.is(result3.total, result.total);
  t.is(result3.timedOut, false);
  t.falsy(result3.nextCursor);
  t.is(result3.nodes.length, 0);
});

test('should search query match url work', async t => {
  const result = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id'],
    query: {
      match: {
        content: 'https://linear.app/affine-design/issue/AF-1379/',
      },
    },
    fields: [
      'doc_id',
      'content',
      'ref',
      'ref_doc_id',
      'parent_flavour',
      'parent_block_id',
      'additional',
      'markdown_preview',
      'created_at',
      'updated_at',
    ],
    highlight: {
      fields: {
        content: {
          pre_tags: ['<b>'],
          post_tags: ['</b>'],
        },
      },
    },
    sort: ['_score'],
  });
  t.true(result.total >= 1);
  t.deepEqual(result.nodes[0].fields.doc_id, ['docId2']);
  t.deepEqual(result.nodes[0].fields.ref, [
    '{"docId":"docId1","mode":"page"}',
    '{"docId":"docId2","mode":"page"}',
  ]);
  t.deepEqual(result.nodes[0].fields.ref_doc_id, ['docId1']);
  t.deepEqual(result.nodes[0].fields.parent_flavour, ['parentFlavour8']);
  t.deepEqual(result.nodes[0].fields.parent_block_id, ['parentBlockId8']);
  t.deepEqual(result.nodes[0].fields.additional, ['additional8']);
  t.deepEqual(result.nodes[0].fields.markdown_preview, ['markdownPreview8']);
  t.regex(
    result.nodes[0].highlights?.content?.join('') as string,
    /<b>https<\/b>:\/\/<b>linear\.app<\/b>\/<b>affine<\/b>-<b>design<\/b>\/<b>issue<\/b>\/<b>AF<\/b>-<b>1379<\/b>/
  );
  t.deepEqual(result.nodes[0]._source, {
    doc_id: 'docId2',
    workspace_id: 'workspaceId1',
  });
});

test('should search query match ref_doc_id work', async t => {
  const docId = randomUUID();
  const refDocId1 = randomUUID();
  const refDocId2 = randomUUID();
  const refDocId3 = randomUUID();
  const refDocId4 = randomUUID();
  const refDocId5 = randomUUID();
  const refDocId6 = randomUUID();
  const refDocId7 = randomUUID();
  const refDocId8 = randomUUID();
  const refDocId9 = randomUUID();
  const refDocId10 = randomUUID();

  await searchProvider.write(
    SearchTable.block,
    [
      {
        workspace_id: workspace.id,
        doc_id: docId,
        block_id: 'blockId1',
        content: 'hello world on search title, ' + randomUUID(),
        flavour: 'affine:page',
        parent_flavour: 'affine:database',
        parent_block_id: 'parentBlockId1',
        ref_doc_id: refDocId1,
        ref: '{"docId":"docId1","mode":"page"}',
        additional: '{"foo": "bar0"}',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        workspace_id: workspace.id,
        doc_id: docId,
        block_id: 'blockId1-not-matched',
        content: 'hello world on search title, ' + randomUUID(),
        flavour: 'affine:page',
        parent_flavour: 'affine:database1',
        parent_block_id: 'parentBlockId1',
        ref_doc_id: refDocId1,
        ref: '{"docId":"docId1","mode":"page"}',
        additional: '{"foo": "bar0"}',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        workspace_id: workspace.id,
        doc_id: docId,
        block_id: 'blockId-all',
        content: 'hello world on search title, ' + randomUUID(),
        flavour: 'affine:page',
        parent_flavour: 'affine:database',
        parent_block_id: 'parentBlockId2',
        ref_doc_id: [
          refDocId2,
          refDocId3,
          refDocId4,
          refDocId5,
          refDocId6,
          refDocId7,
          refDocId8,
          refDocId9,
          refDocId10,
          refDocId1,
        ],
        ref: [
          '{"docId":"docId1","mode":"page"}',
          '{"docId":"docId2","mode":"page"}',
        ],
        additional: '{"foo": "bar1"}',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        workspace_id: workspace.id,
        doc_id: docId,
        block_id: 'blockId1-2',
        content: 'hello world on search title, ' + randomUUID(),
        flavour: 'affine:page',
        parent_flavour: 'affine:database',
        parent_block_id: 'parentBlockId2',
        ref_doc_id: [refDocId1, refDocId2],
        ref: [
          '{"docId":"docId1","mode":"page"}',
          '{"docId":"docId2","mode":"page"}',
        ],
        additional: '{"foo": "bar1"}',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        workspace_id: workspace.id,
        doc_id: docId,
        block_id: 'blockId2-1',
        content: 'hello world on search title, ' + randomUUID(),
        flavour: 'affine:page',
        parent_flavour: 'affine:database',
        parent_block_id: 'parentBlockId2',
        ref_doc_id: [refDocId2, refDocId1],
        ref: [
          '{"docId":"docId1","mode":"page"}',
          '{"docId":"docId2","mode":"page"}',
        ],
        additional: '{"foo": "bar1"}',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        workspace_id: workspace.id,
        doc_id: docId,
        block_id: 'blockId3-2-1-4',
        content: 'hello world on search title, ' + randomUUID(),
        flavour: 'affine:page',
        parent_flavour: 'affine:database',
        parent_block_id: 'parentBlockId2',
        ref_doc_id: [refDocId3, refDocId2, refDocId1, refDocId4],
        ref: [
          '{"docId":"docId1","mode":"page"}',
          '{"docId":"docId2","mode":"page"}',
        ],
        additional: '{"foo": "bar1"}',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      // a link to the `refDocId1` document
      {
        workspace_id: workspace.id,
        doc_id: refDocId1,
        block_id: 'blockId3',
        content: 'hello world on search title, ' + randomUUID(),
        flavour: 'affine:page',
        parent_flavour: 'affine:database',
        parent_block_id: 'parentBlockId3',
        ref_doc_id: refDocId1,
        ref: '{"docId":"docId1","mode":"page"}',
        additional: '{"foo": "bar2"}',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        workspace_id: workspace.id,
        doc_id: docId,
        block_id: 'blockId4',
        content: 'hello world on search title, ' + randomUUID(),
        flavour: 'affine:page',
        parent_flavour: 'affine:database',
        parent_block_id: 'parentBlockId4',
        ref_doc_id: refDocId10,
        ref: '{"docId":"docId2","mode":"page"}',
        additional: '{"foo": "bar3"}',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        workspace_id: workspace.id,
        doc_id: docId,
        block_id: 'blockId1-text',
        content: 'hello world on search title, ' + randomUUID(),
        flavour: 'affine:text',
        parent_flavour: 'affine:text',
        parent_block_id: 'parentBlockId1',
        ref_doc_id: refDocId1,
        ref: '{"docId":"docId1","mode":"page"}',
        additional: '{"foo": "bar0"}',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );

  let result = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id', 'parent_flavour'],
    query: {
      bool: {
        must: [
          {
            // match: { workspace_id: { query: workspace.id } },
            term: { workspace_id: { value: workspace.id } },
          },
          {
            bool: {
              must: [
                {
                  term: { parent_flavour: { value: 'affine:database' } },
                },
                {
                  // https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/array
                  // match: { ref_doc_id: { query: refDocId1 } },
                  term: { ref_doc_id: { value: refDocId1 } },
                },
                // Ignore if it is a link to the `refDocId1` document
                {
                  bool: {
                    must_not: {
                      // match: { doc_id: { query: refDocId1 } },
                      term: { doc_id: { value: refDocId1 } },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
    fields: [
      'doc_id',
      'block_id',
      'ref_doc_id',
      'parent_block_id',
      'additional',
      'parent_flavour',
    ],
    sort: ['_score'],
  });
  // console.log(JSON.stringify(result, null, 2));
  t.is(result.total, 5);
  t.deepEqual(result.nodes[0].fields, {
    doc_id: [docId],
    block_id: ['blockId1'],
    ref_doc_id: [refDocId1],
    parent_block_id: ['parentBlockId1'],
    parent_flavour: ['affine:database'],
    additional: ['{"foo": "bar0"}'],
  });
  t.deepEqual(result.nodes[1].fields, {
    doc_id: [docId],
    block_id: ['blockId-all'],
    ref_doc_id: [
      refDocId2,
      refDocId3,
      refDocId4,
      refDocId5,
      refDocId6,
      refDocId7,
      refDocId8,
      refDocId9,
      refDocId10,
      refDocId1,
    ],
    parent_block_id: ['parentBlockId2'],
    parent_flavour: ['affine:database'],
    additional: ['{"foo": "bar1"}'],
  });
  t.deepEqual(result.nodes[2].fields, {
    doc_id: [docId],
    block_id: ['blockId1-2'],
    ref_doc_id: [refDocId1, refDocId2],
    parent_block_id: ['parentBlockId2'],
    parent_flavour: ['affine:database'],
    additional: ['{"foo": "bar1"}'],
  });
  t.deepEqual(result.nodes[3].fields, {
    doc_id: [docId],
    block_id: ['blockId2-1'],
    ref_doc_id: [refDocId2, refDocId1],
    parent_block_id: ['parentBlockId2'],
    parent_flavour: ['affine:database'],
    additional: ['{"foo": "bar1"}'],
  });
  t.deepEqual(result.nodes[4].fields, {
    doc_id: [docId],
    block_id: ['blockId3-2-1-4'],
    ref_doc_id: [refDocId3, refDocId2, refDocId1, refDocId4],
    parent_block_id: ['parentBlockId2'],
    parent_flavour: ['affine:database'],
    additional: ['{"foo": "bar1"}'],
  });

  result = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id'],
    query: {
      bool: {
        must: [
          {
            term: { workspace_id: { value: workspace.id } },
          },
          {
            bool: {
              must: [
                {
                  term: { parent_flavour: { value: 'affine:database' } },
                },
                {
                  term: { ref_doc_id: { value: refDocId10 } },
                },
                // Ignore if it is a link to the `refDocId1` document
                {
                  bool: {
                    must_not: {
                      term: { doc_id: { value: refDocId1 } },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
    fields: [
      'doc_id',
      'block_id',
      'ref_doc_id',
      'parent_block_id',
      'parent_flavour',
      'additional',
    ],
    sort: ['_score'],
  });
  // console.log(JSON.stringify(result, null, 2));
  t.is(result.total, 2);
  t.deepEqual(result.nodes[0].fields, {
    doc_id: [docId],
    block_id: ['blockId-all'],
    ref_doc_id: [
      refDocId2,
      refDocId3,
      refDocId4,
      refDocId5,
      refDocId6,
      refDocId7,
      refDocId8,
      refDocId9,
      refDocId10,
      refDocId1,
    ],
    parent_block_id: ['parentBlockId2'],
    parent_flavour: ['affine:database'],
    additional: ['{"foo": "bar1"}'],
  });
  t.deepEqual(result.nodes[1].fields, {
    doc_id: [docId],
    block_id: ['blockId4'],
    ref_doc_id: [refDocId10],
    parent_block_id: ['parentBlockId4'],
    parent_flavour: ['affine:database'],
    additional: ['{"foo": "bar3"}'],
  });
});

// #endregion

// #region aggregate

test('should aggregate query work', async t => {
  const result = await searchProvider.aggregate(SearchTable.block, {
    _source: ['workspace_id', 'doc_id'],
    sort: ['_score', { updated_at: 'desc' }, 'doc_id', 'block_id'],
    query: {
      bool: {
        must: [
          {
            term: {
              workspace_id: {
                value: 'workspaceId1',
              },
            },
          },
          {
            bool: {
              must: [
                {
                  match: {
                    content: 'hello',
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        match: {
                          content: 'hello',
                        },
                      },
                      {
                        term: {
                          flavour: {
                            value: 'affine:page',
                            boost: 1.5,
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    aggs: {
      result: {
        terms: { field: 'doc_id' },
        aggs: {
          result: {
            top_hits: {
              _source: ['workspace_id', 'doc_id'],
              highlight: {
                fields: {
                  content: {
                    pre_tags: ['<b>'],
                    post_tags: ['</b>'],
                  },
                },
              },
              fields: ['block_id', 'flavour'],
              size: 2,
            },
          },
        },
      },
    },
  });
  // console.log(JSON.stringify(result, null, 2));
  t.truthy(result.total);
  t.is(result.timedOut, false);
  t.truthy(result.nextCursor);
  t.is(typeof result.nextCursor, 'string');
  t.true(result.buckets.length > 0);
  t.truthy(result.buckets[0].key);
  t.true(result.buckets[0].count > 0);
  t.truthy(result.buckets[0].hits.nodes.length > 0);
  t.truthy(result.buckets[0].hits.nodes[0]._id);
  t.truthy(result.buckets[0].hits.nodes[0]._score);
  t.truthy(result.buckets[0].hits.nodes[0].fields.block_id);
  // top1 result should be "affine:page" flavour
  t.deepEqual(result.buckets[0].hits.nodes[0].fields.flavour, ['affine:page']);
  t.truthy(result.buckets[0].hits.nodes[0].highlights?.content);
  t.deepEqual(Object.keys(result.buckets[0].hits.nodes[0]._source), [
    'workspace_id',
    'doc_id',
  ]);
});

// #endregion

// #region delete by query

test('should delete by query work', async t => {
  const docId = randomUUID();
  await searchProvider.write(
    SearchTable.block,
    [
      {
        workspace_id: workspace.id,
        doc_id: docId,
        content: `hello world on search title, ${randomUUID()}`,
        flavour: 'affine:page',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        workspace_id: workspace.id,
        doc_id: docId,
        block_id: randomUUID(),
        content: `hello world on search title, ${randomUUID()}`,
        flavour: 'other:flavour',
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    {
      refresh: true,
    }
  );
  const result = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id'],
    query: {
      bool: {
        must: [
          {
            term: {
              workspace_id: workspace.id,
            },
          },
          {
            term: {
              doc_id: docId,
            },
          },
        ],
      },
    },
    fields: ['block_id'],
    sort: ['_score'],
  });
  t.is(result.nodes.length, 2);
  await searchProvider.deleteByQuery(
    SearchTable.block,
    {
      bool: {
        must: [
          {
            term: {
              workspace_id: workspace.id,
            },
          },
          {
            term: {
              doc_id: docId,
            },
          },
        ],
      },
    },
    {
      refresh: true,
    }
  );

  const result2 = await searchProvider.search(SearchTable.block, {
    _source: ['workspace_id', 'doc_id'],
    query: {
      bool: {
        must: [
          {
            term: {
              workspace_id: workspace.id,
            },
          },
          {
            term: {
              doc_id: docId,
            },
          },
        ],
      },
    },
    fields: ['block_id'],
    sort: ['_score'],
  });
  t.is(result2.nodes.length, 0);
});

// #endregion
