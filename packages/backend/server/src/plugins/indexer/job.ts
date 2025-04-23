import { Injectable, Logger } from '@nestjs/common';

import { JobQueue, OnJob } from '../../base';
import { readAllDocIdsFromWorkspaceSnapshot } from '../../core/utils/blocksuite';
import { Models } from '../../models';
import { IndexerService } from './service';

declare global {
  interface Jobs {
    'doc.indexer.syncDoc': {
      workspaceId: string;
      docId: string;
    };
    'doc.indexer.deleteDoc': {
      workspaceId: string;
      docId: string;
    };
    'doc.indexer.syncWorkspace': {
      workspaceId: string;
    };
    'doc.indexer.deleteWorkspace': {
      workspaceId: string;
    };
  }
}

@Injectable()
export class IndexerJob {
  private readonly logger = new Logger(IndexerJob.name);

  constructor(
    private readonly models: Models,
    private readonly service: IndexerService,
    private readonly queue: JobQueue
  ) {}

  @OnJob('doc.indexer.syncDoc')
  async syncDoc({ workspaceId, docId }: Jobs['doc.indexer.syncDoc']) {
    // delete the 'indexer.deleteDoc' job from the queue
    await this.queue.remove(`${workspaceId}/${docId}`, 'doc.indexer.deleteDoc');
    await this.service.syncDoc(workspaceId, docId);
  }

  @OnJob('doc.indexer.deleteDoc')
  async deleteDoc({ workspaceId, docId }: Jobs['doc.indexer.deleteDoc']) {
    // delete the 'indexer.updateDoc' job from the queue
    await this.queue.remove(`${workspaceId}/${docId}`, 'doc.indexer.syncDoc');
    await this.service.deleteDoc(workspaceId, docId);
  }

  @OnJob('doc.indexer.syncWorkspace')
  async syncWorkspace({ workspaceId }: Jobs['doc.indexer.syncWorkspace']) {
    await this.queue.remove(workspaceId, 'doc.indexer.deleteWorkspace');
    // TODO(@fengmk2): find out the missing docs and deleted docs, and sync them to indexer
    const snapshot = await this.models.doc.get(workspaceId, workspaceId);
    if (!snapshot) {
      this.logger.warn(`workspace ${workspaceId} not found`);
      return;
    }
    const docIdsInWorkspace = readAllDocIdsFromWorkspaceSnapshot(snapshot.blob);
    const docIdsInIndexer = await this.service.listDocIds(workspaceId);
    const docIdsInWorkspaceSet = new Set(docIdsInWorkspace);
    const docIdsInIndexerSet = new Set(docIdsInIndexer);
    // diff the docIdsInWorkspace and docIdsInIndexer
    const missingDocIds = docIdsInWorkspace.filter(
      docId => !docIdsInIndexerSet.has(docId)
    );
    const deletedDocIds = docIdsInIndexer.filter(
      docId => !docIdsInWorkspaceSet.has(docId)
    );
    for (const docId of deletedDocIds) {
      await this.queue.add(
        'doc.indexer.deleteDoc',
        {
          workspaceId,
          docId,
        },
        {
          jobId: `${workspaceId}/${docId}`,
          // the delete job should be higher priority than the update job
          priority: 0,
        }
      );
    }
    for (const docId of missingDocIds) {
      await this.queue.add(
        'doc.indexer.syncDoc',
        {
          workspaceId,
          docId,
        },
        {
          jobId: `${workspaceId}/${docId}`,
          priority: 100,
        }
      );
    }
    this.logger.debug(
      `synced workspace ${workspaceId} with ${missingDocIds.length} missing docs and ${deletedDocIds.length} deleted docs`
    );
  }

  @OnJob('doc.indexer.deleteWorkspace')
  async deleteWorkspace({ workspaceId }: Jobs['doc.indexer.deleteWorkspace']) {
    await this.queue.remove(workspaceId, 'doc.indexer.syncWorkspace');
    await this.service.deleteWorkspace(workspaceId);
  }
}
