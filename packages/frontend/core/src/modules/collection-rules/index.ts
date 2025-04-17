import type { Framework } from '@toeverything/infra';

import { DocsService } from '../doc';
import { TagService } from '../tag';
import { WorkspaceScope } from '../workspace';
import { WorkspacePropertyService } from '../workspace-property';
import { CheckboxPropertyFilterProvider } from './impls/filters/checkbox';
import { CreatedAtFilterProvider } from './impls/filters/created-at';
import { DatePropertyFilterProvider } from './impls/filters/date';
import { DocPrimaryModeFilterProvider } from './impls/filters/doc-primary-mode';
import { JournalFilterProvider } from './impls/filters/journal';
import { PropertyFilterProvider } from './impls/filters/property';
import { SystemFilterProvider } from './impls/filters/system';
import { TagsFilterProvider } from './impls/filters/tags';
import { TextPropertyFilterProvider } from './impls/filters/text';
import { UpdatedAtFilterProvider } from './impls/filters/updated-at';
import { CheckboxPropertyGroupByProvider } from './impls/group-by/checkbox';
import { CreatedAtGroupByProvider } from './impls/group-by/created-at';
import { DatePropertyGroupByProvider } from './impls/group-by/date';
import { DocPrimaryModeGroupByProvider } from './impls/group-by/doc-primary-mode';
import { JournalGroupByProvider } from './impls/group-by/journal';
import { PropertyGroupByProvider } from './impls/group-by/property';
import { SystemGroupByProvider } from './impls/group-by/system';
import { TagsGroupByProvider } from './impls/group-by/tags';
import { TextPropertyGroupByProvider } from './impls/group-by/text';
import { UpdatedAtGroupByProvider } from './impls/group-by/updated-at';
import { CheckboxPropertyOrderByProvider } from './impls/order-by/checkbox';
import { CreatedAtOrderByProvider } from './impls/order-by/created-at';
import { DatePropertyOrderByProvider } from './impls/order-by/date';
import { DocPrimaryModeOrderByProvider } from './impls/order-by/doc-primary-mode';
import { JournalOrderByProvider } from './impls/order-by/journal';
import { PropertyOrderByProvider } from './impls/order-by/property';
import { SystemOrderByProvider } from './impls/order-by/system';
import { TagsOrderByProvider } from './impls/order-by/tags';
import { TextPropertyOrderByProvider } from './impls/order-by/text';
import { UpdatedAtOrderByProvider } from './impls/order-by/updated-at';
import { FilterProvider, GroupByProvider, OrderByProvider } from './provider';
import { CollectionRulesService } from './services/collection-rules';

export { CollectionRulesService } from './services/collection-rules';
export type { FilterParams } from './types';

export function configureCollectionRulesModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(CollectionRulesService)
    // --------------- Filter ---------------
    .impl(FilterProvider('system'), SystemFilterProvider)
    .impl(FilterProvider('property'), PropertyFilterProvider, [
      WorkspacePropertyService,
    ])
    .impl(FilterProvider('property:checkbox'), CheckboxPropertyFilterProvider, [
      DocsService,
    ])
    .impl(FilterProvider('property:text'), TextPropertyFilterProvider, [
      DocsService,
    ])
    .impl(FilterProvider('property:tags'), TagsFilterProvider, [
      TagService,
      DocsService,
    ])
    .impl(FilterProvider('system:tags'), TagsFilterProvider, [
      TagService,
      DocsService,
    ])
    .impl(
      FilterProvider('property:docPrimaryMode'),
      DocPrimaryModeFilterProvider,
      [DocsService]
    )
    .impl(
      FilterProvider('system:docPrimaryMode'),
      DocPrimaryModeFilterProvider,
      [DocsService]
    )
    .impl(FilterProvider('property:date'), DatePropertyFilterProvider, [
      DocsService,
    ])
    .impl(FilterProvider('property:createdAt'), CreatedAtFilterProvider, [
      DocsService,
    ])
    .impl(FilterProvider('system:createdAt'), CreatedAtFilterProvider, [
      DocsService,
    ])
    .impl(FilterProvider('property:updatedAt'), UpdatedAtFilterProvider, [
      DocsService,
    ])
    .impl(FilterProvider('system:updatedAt'), UpdatedAtFilterProvider, [
      DocsService,
    ])
    .impl(FilterProvider('property:journal'), JournalFilterProvider, [
      DocsService,
    ])
    .impl(FilterProvider('system:journal'), JournalFilterProvider, [
      DocsService,
    ])
    // --------------- Group By ---------------
    .impl(GroupByProvider('system'), SystemGroupByProvider)
    .impl(GroupByProvider('property'), PropertyGroupByProvider, [
      WorkspacePropertyService,
    ])
    .impl(GroupByProvider('property:date'), DatePropertyGroupByProvider, [
      DocsService,
    ])
    .impl(GroupByProvider('property:tags'), TagsGroupByProvider, [
      DocsService,
      TagService,
    ])
    .impl(GroupByProvider('system:tags'), TagsGroupByProvider, [
      DocsService,
      TagService,
    ])
    .impl(
      GroupByProvider('property:checkbox'),
      CheckboxPropertyGroupByProvider,
      [DocsService]
    )
    .impl(GroupByProvider('property:text'), TextPropertyGroupByProvider, [
      DocsService,
    ])
    .impl(
      GroupByProvider('property:docPrimaryMode'),
      DocPrimaryModeGroupByProvider,
      [DocsService]
    )
    .impl(
      GroupByProvider('system:docPrimaryMode'),
      DocPrimaryModeGroupByProvider,
      [DocsService]
    )
    .impl(GroupByProvider('property:createdAt'), CreatedAtGroupByProvider, [
      DocsService,
    ])
    .impl(GroupByProvider('system:createdAt'), CreatedAtGroupByProvider, [
      DocsService,
    ])
    .impl(GroupByProvider('property:updatedAt'), UpdatedAtGroupByProvider, [
      DocsService,
    ])
    .impl(GroupByProvider('system:updatedAt'), UpdatedAtGroupByProvider, [
      DocsService,
    ])
    .impl(GroupByProvider('property:journal'), JournalGroupByProvider, [
      DocsService,
    ])
    .impl(GroupByProvider('system:journal'), JournalGroupByProvider, [
      DocsService,
    ])
    // --------------- Order By ---------------
    .impl(OrderByProvider('system'), SystemOrderByProvider)
    .impl(OrderByProvider('property'), PropertyOrderByProvider, [
      WorkspacePropertyService,
    ])
    .impl(
      OrderByProvider('property:docPrimaryMode'),
      DocPrimaryModeOrderByProvider,
      [DocsService]
    )
    .impl(
      OrderByProvider('system:docPrimaryMode'),
      DocPrimaryModeOrderByProvider,
      [DocsService]
    )
    .impl(OrderByProvider('property:updatedAt'), UpdatedAtOrderByProvider, [
      DocsService,
    ])
    .impl(OrderByProvider('system:updatedAt'), UpdatedAtOrderByProvider, [
      DocsService,
    ])
    .impl(OrderByProvider('property:createdAt'), CreatedAtOrderByProvider, [
      DocsService,
    ])
    .impl(OrderByProvider('system:createdAt'), CreatedAtOrderByProvider, [
      DocsService,
    ])
    .impl(OrderByProvider('property:text'), TextPropertyOrderByProvider, [
      DocsService,
    ])
    .impl(OrderByProvider('property:date'), DatePropertyOrderByProvider, [
      DocsService,
    ])
    .impl(
      OrderByProvider('property:checkbox'),
      CheckboxPropertyOrderByProvider,
      [DocsService]
    )
    .impl(OrderByProvider('property:tags'), TagsOrderByProvider, [
      DocsService,
      TagService,
    ])
    .impl(OrderByProvider('system:tags'), TagsOrderByProvider, [
      DocsService,
      TagService,
    ])
    .impl(OrderByProvider('property:journal'), JournalOrderByProvider, [
      DocsService,
    ])
    .impl(OrderByProvider('system:journal'), JournalOrderByProvider, [
      DocsService,
    ]);
}
