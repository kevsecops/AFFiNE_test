import { expect, test } from 'vitest';
import { applyUpdate, Array as YArray, Doc as YDoc, Map as YMap } from 'yjs';

import {
  readAllBlocksFromDoc,
  readAllDocIdsFromRootDoc,
  readAllDocsFromRootDoc,
} from '../src/reader';
import { snapshot as docSnapshot } from './fixtures/test-doc';
import { snapshot as rootDocSnapshot } from './fixtures/test-root-doc';
import { base64ToUint8Array } from './utils';

test('should read doc blocks work', async () => {
  const rootDoc = new YDoc({
    guid: 'test-root-doc',
  });
  applyUpdate(rootDoc, base64ToUint8Array(rootDocSnapshot));

  const doc1 = new YDoc({
    guid: 'test-doc',
  });
  applyUpdate(doc1, base64ToUint8Array(docSnapshot));
  const result = await readAllBlocksFromDoc({
    ydoc: doc1,
    rootYDoc: rootDoc,
    spaceId: 'test-space',
  });
  expect(result).toBeDefined();
  expect(result?.title).toEqual('Write, Draw, Plan all at Once.');
  expect(result?.summary).toEqual(
    'AFFiNE is an open source all in one workspace, an operating system for all the building blocks of your team wiki, knowledge management and digital assets and a better alternative to Notion and Miro. You own your data, with no compromisesLocal-first & Real-time collaborativeWe love the idea proposed by Ink & Switch in the famous article about you owning your data, despite the cloud. Furthermore, AFFiNE is the first all-in-one workspace that keeps your data ownership with no compromises on real-time collaboration and editing experience.AFFiNE is a local-first application upon CRDTs with real-time collaboration support. Your data is always stored locally while multiple nodes remain synced in real-time.Blocks that assemble your next docs, tasks kanban or whiteboardThere is a large overlap of their atomic "building blocks" between these apps. They are neither open source nor have a plugin system like VS Code for contributors to customize. We want to have something that contains all the features we love and goes one step further. '
  );
  expect(result?.blocks.length).toEqual(42);
  // first block is title
  expect(result?.blocks[0].docId).toEqual('test-doc');
  expect(result?.blocks[0].blockId).toEqual('TnUgtVg7Eu');
  expect(result?.blocks[0].flavour).toEqual('affine:page');
  expect(result?.blocks[0].content).toEqual('Write, Draw, Plan all at Once.');
  expect(result?.blocks[0].additional).toEqual({
    displayMode: 'edgeless',
  });
});

test('should get all docs from root doc work', async () => {
  const rootDoc = new YDoc({
    guid: 'test-root-doc',
  });
  rootDoc.getMap('meta').set(
    'pages',
    YArray.from([
      new YMap([
        ['id', 'test-doc-1'],
        ['title', 'Test Doc 1'],
      ]),
      new YMap([
        ['id', 'test-doc-2'],
        ['title', 'Test Doc 2'],
      ]),
      new YMap([
        ['id', 'test-doc-3'],
        ['title', 'Test Doc 3'],
        ['trash', true],
      ]),
      new YMap([['id', 'test-doc-4']]),
    ])
  );

  const docs = readAllDocsFromRootDoc(rootDoc);
  expect(Array.from(docs.entries())).toEqual([
    ['test-doc-1', { title: 'Test Doc 1' }],
    ['test-doc-2', { title: 'Test Doc 2' }],
    ['test-doc-4', { title: undefined }],
  ]);

  // include trash
  const docsWithTrash = readAllDocsFromRootDoc(rootDoc, {
    includeTrash: true,
  });
  expect(Array.from(docsWithTrash.entries())).toEqual([
    ['test-doc-1', { title: 'Test Doc 1' }],
    ['test-doc-2', { title: 'Test Doc 2' }],
    ['test-doc-3', { title: 'Test Doc 3' }],
    ['test-doc-4', { title: undefined }],
  ]);
});

test('should read all docs from root doc snapshot work', async () => {
  const rootDoc = new YDoc({
    guid: 'test-root-doc',
  });
  applyUpdate(rootDoc, base64ToUint8Array(rootDocSnapshot));
  const docsWithTrash = readAllDocsFromRootDoc(rootDoc, {
    includeTrash: true,
  });
  expect(Array.from(docsWithTrash.entries())).toEqual([
    ['5nS9BSp3Px', { title: 'Write, Draw, Plan all at Once.' }],
  ]);
});

test('should read all doc ids from root doc snapshot work', async () => {
  const rootDoc = new YDoc({
    guid: 'test-root-doc',
  });
  applyUpdate(rootDoc, base64ToUint8Array(rootDocSnapshot));
  const docIds = readAllDocIdsFromRootDoc(rootDoc);
  expect(docIds).toEqual(['5nS9BSp3Px']);
});
