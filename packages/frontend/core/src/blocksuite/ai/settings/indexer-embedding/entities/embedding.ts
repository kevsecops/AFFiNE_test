import { logger } from '@affine/core/modules/share-doc/entities/share-docs-list';
import type { WorkspaceService } from '@affine/core/modules/workspace';
import type { PaginationInput } from '@affine/graphql';
import {
  catchErrorInto,
  effect,
  Entity,
  fromPromise,
  LiveData,
  onComplete,
  onStart,
  smartRetry,
} from '@toeverything/infra';
import { EMPTY } from 'rxjs';
import { concatMap, exhaustMap, mergeMap } from 'rxjs/operators';

import { COUNT_PER_PAGE } from '../constants';
import type { EmbeddingStore } from '../stores/embedding';
import type { AttachmentFile, IgnoredDoc } from '../types';

export interface EmbeddingConfig {
  enabled: boolean;
}

interface Attachments {
  totalCount: number;
  pageInfo: {
    endCursor: string | null;
    hasNextPage: boolean;
  };
  edges: {
    node: AttachmentFile;
  }[];
}

type IngoredDocs = IgnoredDoc[];

export class Embedding extends Entity {
  enabled$ = new LiveData<boolean>(this.store.enabled);
  error$ = new LiveData<any>(null);
  attachments$ = new LiveData<Attachments>({
    edges: [],
    pageInfo: {
      endCursor: null,
      hasNextPage: false,
    },
    totalCount: 0,
  });
  ignoredDocs$ = new LiveData<IngoredDocs>([]);
  isEnabledLoading$ = new LiveData(false);
  isAttachmentsLoading$ = new LiveData(false);
  isIgnoredDocsLoading$ = new LiveData(false);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly store: EmbeddingStore
  ) {
    super();
    this.getEnabled();
    this.getAttachments({ first: COUNT_PER_PAGE, after: null });
    this.getIgnoredDocs();
  }

  getEnabled = effect(
    exhaustMap(() => {
      return fromPromise(signal =>
        this.store.getEnabled(this.workspaceService.workspace.id, signal)
      ).pipe(
        smartRetry(),
        mergeMap(value => {
          if (value) {
            this.enabled$.next(value.enableDocEmbedding);
          }
          return EMPTY;
        }),
        catchErrorInto(this.error$, error => {
          logger.error(
            'Failed to fetch workspace doc embedding enabled',
            error
          );
        }),
        onStart(() => this.isEnabledLoading$.setValue(true)),
        onComplete(() => this.isEnabledLoading$.setValue(false))
      );
    })
  );

  setEnabled = effect(
    exhaustMap((enabled: boolean) => {
      return fromPromise(signal =>
        this.store.updateEnabled(
          this.workspaceService.workspace.id,
          enabled,
          signal
        )
      ).pipe(
        smartRetry(),
        concatMap(() => {
          this.getEnabled();
          return EMPTY;
        }),
        catchErrorInto(this.error$, error => {
          logger.error(
            'Failed to update workspace doc embedding enabled',
            error
          );
        }),
        onStart(() => this.isEnabledLoading$.setValue(true)),
        onComplete(() => this.isEnabledLoading$.setValue(false))
      );
    })
  );

  getIgnoredDocs = effect(
    exhaustMap(() => {
      return fromPromise(signal =>
        this.store.getIgnoredDocs(this.workspaceService.workspace.id, signal)
      ).pipe(
        smartRetry(),
        mergeMap(value => {
          this.ignoredDocs$.next(value);
          return EMPTY;
        }),
        catchErrorInto(this.error$, error => {
          logger.error(
            'Failed to fetch workspace doc embedding ignored docs',
            error
          );
        }),
        onStart(() => this.isIgnoredDocsLoading$.setValue(true)),
        onComplete(() => this.isIgnoredDocsLoading$.setValue(false))
      );
    })
  );

  updateIgnoredDocs = effect(
    exhaustMap(({ add, remove }: { add: string[]; remove: string[] }) => {
      return fromPromise(signal =>
        this.store.updateIgnoredDocs(
          this.workspaceService.workspace.id,
          add,
          remove,
          signal
        )
      ).pipe(
        smartRetry(),
        concatMap(() => {
          this.getIgnoredDocs();
          return EMPTY;
        }),
        catchErrorInto(this.error$, error => {
          logger.error(
            'Failed to update workspace doc embedding ignored docs',
            error
          );
        })
      );
    })
  );

  getAttachments = effect(
    exhaustMap((pagination: PaginationInput) => {
      return fromPromise(signal =>
        this.store.getEmbeddingFiles(
          this.workspaceService.workspace.id,
          pagination,
          signal
        )
      ).pipe(
        smartRetry(),
        mergeMap(value => {
          this.attachments$.next(value);
          return EMPTY;
        }),
        catchErrorInto(this.error$, error => {
          logger.error(
            'Failed to fetch workspace doc embedding attachments',
            error
          );
        }),
        onStart(() => this.isAttachmentsLoading$.setValue(true)),
        onComplete(() => this.isAttachmentsLoading$.setValue(false))
      );
    })
  );

  addAttachments = effect(
    exhaustMap((files: File[]) => {
      return fromPromise(signal =>
        this.store.addEmbeddingFiles(
          this.workspaceService.workspace.id,
          files,
          signal
        )
      ).pipe(
        concatMap(() => {
          this.getAttachments({ first: COUNT_PER_PAGE, after: null });
          return EMPTY;
        }),
        catchErrorInto(this.error$, error => {
          logger.error(
            'Failed to add workspace doc embedding attachments',
            error
          );
        })
      );
    })
  );

  removeAttachment = effect(
    exhaustMap((id: string) => {
      return fromPromise(signal =>
        this.store.removeEmbeddingFile(
          this.workspaceService.workspace.id,
          id,
          signal
        )
      ).pipe(
        concatMap(() => {
          this.getAttachments({ first: COUNT_PER_PAGE, after: null });
          return EMPTY;
        }),
        catchErrorInto(this.error$, error => {
          logger.error(
            'Failed to remove workspace doc embedding attachment',
            error
          );
        })
      );
    })
  );

  override dispose(): void {
    this.getEnabled.unsubscribe();
    this.getAttachments.unsubscribe();
    this.getIgnoredDocs.unsubscribe();
    this.updateIgnoredDocs.unsubscribe();
    this.addAttachments.unsubscribe();
    this.removeAttachment.unsubscribe();
    this.setEnabled.unsubscribe();
  }
}
