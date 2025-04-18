import { type Framework } from '@toeverything/infra';

import { WorkspaceServerService } from '@affine/core/modules/cloud';
import { WorkspaceScope, WorkspaceService } from '@affine/core/modules/workspace';
import { Embedding } from './entities/embedding';
import { EmbeddingService } from './services/embedding';
import { EmbeddingStore } from './stores/embedding';

export function configureIndexerEmbeddingModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(EmbeddingService)
    .store(EmbeddingStore, [WorkspaceServerService])
    .entity(Embedding, [
      WorkspaceService,
      EmbeddingStore,
    ]);
}

export { IndexerEmbeddingSettings } from './view';
