import { Service } from '@toeverything/infra';
import { Indexer } from '../entities/indexer';

export class IndexerService extends Service {
  indexer = this.framework.createEntity(Indexer);
}
