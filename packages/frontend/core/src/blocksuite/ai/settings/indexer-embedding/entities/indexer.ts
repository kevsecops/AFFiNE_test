import { Entity, LiveData } from '@toeverything/infra';
import type { IndexerStore } from '../stores/indexer';
import type { WorkspaceService } from '@affine/core/modules/workspace';

export interface IndexerConfig {
  type: 'local' | 'cloud';
  lastIndexedAt?: Date;
  status: 'idle' | 'indexing' | 'error';
  error?: string;
}

export class Indexer extends Entity {
  status$ = new LiveData<number>(this.store.status);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly store: IndexerStore,
  ) {
    super();
  }

  async startIndexing() {
    await this.store.startIndexing();
  }

  override dispose(): void {
    super.dispose();
  }
}
