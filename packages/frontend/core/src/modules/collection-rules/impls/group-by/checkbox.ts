import type { DocsService } from '@affine/core/modules/doc';
import { Service } from '@toeverything/infra';
import { combineLatest, map, type Observable } from 'rxjs';

import type { GroupByProvider } from '../../provider';
import type { GroupByParams } from '../../types';

export class CheckboxPropertyGroupByProvider
  extends Service
  implements GroupByProvider
{
  constructor(private readonly docsService: DocsService) {
    super();
  }

  groupBy$(
    _items$: Observable<Set<string>>,
    params: GroupByParams
  ): Observable<Map<string, Set<string>>> {
    return combineLatest([
      this.docsService.list.docs$, // We need the complete doc list as docs without property values should default to false
      this.docsService.propertyValues$('custom:' + params.key),
    ]).pipe(
      map(([docs, values]) => {
        const result = new Map<string, Set<string>>();
        for (const doc of docs) {
          const value = values.get(doc.id) === 'true' ? 'true' : 'false';
          const set = result.get(value) ?? new Set<string>();
          set.add(doc.id);
          result.set(value, set);
        }
        return result;
      })
    );
  }
}
