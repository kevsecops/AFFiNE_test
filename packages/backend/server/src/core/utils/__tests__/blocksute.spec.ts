import test from 'ava';

import { createModule } from '../../../__tests__/create-module';
import { Mockers } from '../../../__tests__/mocks';
import { Models } from '../../../models';
import { readAllDocIdsFromWorkspaceSnapshot } from '../blocksuite';

const module = await createModule({});
const models = module.get(Models);

const workspace = await module.create(Mockers.Workspace, {
  snapshot: true,
});

test('can read all doc ids from workspace snapshot', async t => {
  const doc = await models.doc.get(workspace.id, workspace.id);
  t.truthy(doc);
  const docIds = readAllDocIdsFromWorkspaceSnapshot(doc!.blob);
  t.deepEqual(docIds, []);
});
