import { Store, LiveData } from '@toeverything/infra';
import type { WorkspaceServerService } from '@affine/core/modules/cloud';

export class IndexerStore extends Store {
  private readonly _status$ = new LiveData<number>(0);

  constructor(private readonly workspaceServerService: WorkspaceServerService) {
    super();
  }

  get status() {
    return this._status$.value;
  }

  startIndexing() {
    if (!this.workspaceServerService.server) {
      throw new Error('[IndexerStore]No Server');
    }

    this.workspaceServerService.server.gql({});
  }
} 