import { Service } from '@toeverything/infra';

import { Embedding } from '../entities/embedding';

export class EmbeddingService extends Service {
  embedding = this.framework.createEntity(Embedding);
}
