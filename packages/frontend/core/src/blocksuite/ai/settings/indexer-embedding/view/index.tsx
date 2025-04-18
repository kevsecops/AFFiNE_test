import { SettingHeader } from '@affine/component/setting-components';
import { useI18n } from '@affine/i18n';
import type React from 'react';

import { EmbeddingSettings } from './embedding-settings';
import { IndexerSettings } from './indexer-settings';

export const IndexerEmbeddingSettings: React.FC = () => {
  const t = useI18n();

  return (
    <>
      <SettingHeader
        title={t['Indexer & Embedding']()}
        subtitle={t[
          'Manage AFFiNE indexing and AFFiNE AI Embedding for local content processing'
        ]()}
      />

      <EmbeddingSettings />
      <IndexerSettings />
    </>
  );
};
