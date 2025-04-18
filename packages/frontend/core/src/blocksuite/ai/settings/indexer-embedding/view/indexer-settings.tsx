import React, { useState } from 'react';
import { Button, Progress } from '@affine/component';
import {
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';
import { useI18n } from '@affine/i18n';

interface IndexerSettingsProps {}

export const IndexerSettings: React.FC<IndexerSettingsProps> = ({}) => {
  const t = useI18n();
  const [indexingProgress, setIndexingProgress] = useState(0);
  const [isIndexing, setIsIndexing] = useState(false);

  const handleReindexClick = React.useCallback(() => {
    setIsIndexing(true);
    setIndexingProgress(0);

    // Simulated progress for demo
    const interval = setInterval(() => {
      setIndexingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsIndexing(false);
          return 100;
        }
        return prev + 10;
      });
    }, 1000);
  }, []);

  return (
    <SettingWrapper title={t['Indexer']()}>
      <SettingRow
        name=""
        desc={t[
          'The indexer can choose from cloud and local sources. If the indexer is local, it may consume more memory.'
        ]()}
      ></SettingRow>

      <SettingRow
        name={t['Indexing Progress']()}
        data-testid="indexer-indexing-progress-setting-row"
        style={{ marginBottom: 10 }}
      >
        <Button onClick={handleReindexClick} disabled={isIndexing}>
          {isIndexing ? t['Indexing...']() : t['Resync Indexing']()}
        </Button>
      </SettingRow>

      <Progress
        readonly
        value={indexingProgress}
        style={{ width: '100%', height: '20px' }}
      />
    </SettingWrapper>
  );
};
