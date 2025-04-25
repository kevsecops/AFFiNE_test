import { FileDropExtension } from '@blocksuite/affine-components/drop-indicator';
import { NoteBlockSchema } from '@blocksuite/affine-model';
import {
  AutoClearSelectionService,
  DNDAPIExtension,
  DocModeService,
  EmbedOptionService,
  PageViewportServiceExtension,
  ThemeService,
  ToolbarModuleExtension,
  ToolbarRegistryExtension,
} from '@blocksuite/affine-shared/services';
import { linkedDocWidget } from '@blocksuite/affine-widget-linked-doc';
import { docRemoteSelectionWidget } from '@blocksuite/affine-widget-remote-selection';
import { scrollAnchoringWidget } from '@blocksuite/affine-widget-scroll-anchoring';
import { SlashMenuExtension } from '@blocksuite/affine-widget-slash-menu';
import { toolbarWidget } from '@blocksuite/affine-widget-toolbar';
import { BlockFlavourIdentifier, FlavourExtension } from '@blocksuite/std';
import type { ExtensionType } from '@blocksuite/store';

import { RootBlockAdapterExtensions } from '../adapters/extension';
import { clipboardConfigs } from '../clipboard';
import { builtinToolbarConfig } from '../configs/toolbar';
import { fallbackKeymap } from '../keyboard/keymap';
import { viewportOverlayWidget } from './widgets';

export const CommonSpecs: ExtensionType[] = [
  FlavourExtension('affine:page'),
  DocModeService,
  ThemeService,
  EmbedOptionService,
  PageViewportServiceExtension,
  DNDAPIExtension,
  FileDropExtension,
  ToolbarRegistryExtension,
  AutoClearSelectionService,
  ...RootBlockAdapterExtensions,
  ...clipboardConfigs,
  SlashMenuExtension,
  linkedDocWidget,
  docRemoteSelectionWidget,
  viewportOverlayWidget,
  scrollAnchoringWidget,
  toolbarWidget,
  fallbackKeymap,

  ToolbarModuleExtension({
    id: BlockFlavourIdentifier(NoteBlockSchema.model.flavour),
    config: builtinToolbarConfig,
  }),
];

export * from './widgets';
