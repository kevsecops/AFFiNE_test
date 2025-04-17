import { Service } from '@toeverything/infra';
import type { Observable } from 'rxjs';

import type { GroupByProvider } from '../../provider';
import type { GroupByParams } from '../../types';

export class SystemGroupByProvider extends Service implements GroupByProvider {
  groupBy$(
    _items$: Observable<Set<string>>,
    _params: GroupByParams
  ): Observable<Map<string, Set<string>>> {
    throw new Error('Method not implemented.');
  }
}
