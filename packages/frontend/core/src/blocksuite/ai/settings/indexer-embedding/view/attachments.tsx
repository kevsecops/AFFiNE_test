import { useConfirmModal } from '@affine/component';
import { Pagination } from '@affine/component/setting-components';
import { useI18n } from '@affine/i18n';
import { getAttachmentFileIconRC } from '@blocksuite/affine/components/icons';
import { cssVarV2 } from '@blocksuite/affine/shared/theme';
import { CloseIcon } from '@blocksuite/icons/rc';
import { useCallback } from 'react';

import { COUNT_PER_PAGE } from '../constants';
import type { AttachmentFile } from '../types';
import {
  attachmentItem,
  attachmentOperation,
  attachmentsWrapper,
  attachmentTitle,
} from './styles.css';

interface AttachmentsProps {
  attachments: AttachmentFile[];
  totalCount: number;
  onPageChange: (offset: number) => void;
  onDelete: (id: string) => void;
}

interface AttachmentItemProps {
  attachment: AttachmentFile;
  onDelete: (id: string) => void;
}

const AttachmentItem: React.FC<AttachmentItemProps> = ({
  attachment,
  onDelete,
}) => {
  const t = useI18n();
  const { openConfirmModal } = useConfirmModal();

  const handleDelete = useCallback(() => {
    openConfirmModal({
      title: t['Remove the doc from embedding？'](),
      description:
        t[
          'Attachment will be removed. AI will not continue to extract content from this attachment.'
        ](),
      confirmText: t['Confirm'](),
      confirmButtonOptions: {
        variant: 'error',
      },
      onConfirm: () => {
        onDelete(attachment.fileId);
      },
    });
  }, [onDelete, attachment.fileId, openConfirmModal, t]);

  const Icon = getAttachmentFileIconRC(attachment.mimeType);
  return (
    <div
      className={attachmentItem}
      data-testid="workspace-embedding-setting-attachment-item"
    >
      <div className={attachmentTitle}>
        <Icon style={{ marginRight: 4 }} /> {attachment.fileName}
      </div>
      <div className={attachmentOperation}>
        <CloseIcon
          data-testid="workspace-embedding-setting-attachment-delete-button"
          onClick={handleDelete}
          color={cssVarV2('icon/primary')}
          style={{ cursor: 'pointer' }}
        />
      </div>
    </div>
  );
};

export const Attachments: React.FC<AttachmentsProps> = ({
  attachments,
  totalCount,
  onDelete,
  onPageChange,
}) => {
  const handlePageChange = useCallback(
    (offset: number) => {
      onPageChange(offset);
    },
    [onPageChange]
  );

  return (
    <div
      className={attachmentsWrapper}
      data-testid="workspace-embedding-setting-attachment-list"
    >
      {attachments.map(attachment => (
        <AttachmentItem
          key={attachment.fileId}
          attachment={attachment}
          onDelete={onDelete}
        />
      ))}
      <Pagination
        totalCount={totalCount}
        countPerPage={COUNT_PER_PAGE}
        onPageChange={handlePageChange}
      />
    </div>
  );
};
