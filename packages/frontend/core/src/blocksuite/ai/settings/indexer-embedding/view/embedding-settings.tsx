import { Button, Switch } from '@affine/component';
import {
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';
import { Upload } from '@affine/core/components/pure/file-upload';
import { WorkspaceDialogService } from '@affine/core/modules/dialogs';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import type React from 'react';
import { useCallback, useMemo } from 'react';

import { EmbeddingService } from '../services/embedding';
import { Attachments } from './attachments';
import { IgnoredDocs } from './ignored-docs';

interface EmbeddingSettingsProps {}

export const EmbeddingSettings: React.FC<EmbeddingSettingsProps> = () => {
  const t = useI18n();
  const embeddingService = useService(EmbeddingService);
  const embeddingEnabled = useLiveData(embeddingService.embedding.enabled$);
  const attachments = useLiveData(embeddingService.embedding.attachments$);
  const ignoredDocs = useLiveData(embeddingService.embedding.ignoredDocs$);
  const attachmentNodes = useMemo(
    () => attachments.edges.map(edge => edge.node),
    [attachments]
  );
  const ignoredDocNodes = ignoredDocs;

  const workspaceDialogService = useService(WorkspaceDialogService);

  const handleEmbeddingToggle = useCallback((checked: boolean) => {
    embeddingService.embedding.setEnabled(checked);
  }, []);

  const handleAttachmentUpload = useCallback(
    (file: File) => {
      embeddingService.embedding.addAttachments([file]);
    },
    [attachments]
  );

  const handleAttachmentsDelete = useCallback(
    (fileId: string) => {
      embeddingService.embedding.removeAttachment(fileId);
    },
    [attachments]
  );

  const handleAttachmentsPageChange = useCallback(
    (offset: number) => {
      embeddingService.embedding.getAttachments({
        offset,
        after: attachments.pageInfo.endCursor,
      });
    },
    [embeddingService, attachments]
  );

  const handleSelectDoc = useCallback(() => {
    const initialIds = ignoredDocNodes.map(doc => doc.docId);
    workspaceDialogService.open(
      'doc-selector',
      {
        init: initialIds,
      },
      selectedIds => {
        if (selectedIds === undefined) {
          return;
        }
        const add = selectedIds.filter(id => !initialIds?.includes(id));
        const remove = initialIds?.filter(id => !selectedIds.includes(id));
        embeddingService.embedding.updateIgnoredDocs({ add, remove });
        embeddingService.embedding.getIgnoredDocs();
      }
    );
  }, [ignoredDocNodes, workspaceDialogService, embeddingService]);

  return (
    <SettingWrapper
      title={t['Embedding']()}
      testId="workspace-embedding-setting-wrapper"
    >
      <SettingRow
        name=""
        desc={t[
          'Embedding allows AI to retrieve your content. If the indexer uses local settings, it may affect some of the results of the Embedding.'
        ]()}
      ></SettingRow>
      <SettingRow
        name={t['Workspace Embedding']()}
        desc={t['AI can call files embedded in the workspace.']()}
      >
        <Switch
          data-testid="workspace-embedding-setting-switch"
          checked={embeddingEnabled}
          onChange={handleEmbeddingToggle}
        />
      </SettingRow>

      <SettingRow
        name={t['Additional docs']()}
        desc={t[
          'The uploaded file will be embedded in the current workspace.'
        ]()}
      >
        <Upload fileChange={handleAttachmentUpload}>
          <Button
            data-testid="workspace-embedding-setting-upload-button"
            variant="primary"
          >
            {t['Upload File']()}
          </Button>
        </Upload>
      </SettingRow>

      {attachmentNodes.length > 0 && (
        <Attachments
          attachments={attachmentNodes}
          onDelete={handleAttachmentsDelete}
          totalCount={attachments.totalCount}
          onPageChange={handleAttachmentsPageChange}
        />
      )}

      <SettingRow
        name={t['Ingore Docs']()}
        desc={t[
          'The Ignored docs will not be embedded into the current workspace.'
        ]()}
      >
        <Button
          data-testid="workspace-embedding-setting-ignore-docs-button"
          variant="primary"
          onClick={handleSelectDoc}
        >
          {t['Select Doc']()}
        </Button>
      </SettingRow>

      {ignoredDocNodes.length > 0 && (
        <IgnoredDocs ignoredDocs={ignoredDocNodes} />
      )}
    </SettingWrapper>
  );
};
