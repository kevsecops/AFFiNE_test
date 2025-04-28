import { FileDropExtension } from '@blocksuite/affine-components/drop-indicator';
import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine-ext-loader';
import {
  AttachmentAdapter,
  ClipboardAdapter,
  HtmlAdapter,
  ImageAdapter,
  MixTextAdapter,
  NotionTextAdapter,
} from '@blocksuite/affine-shared/adapters';
import {
  AutoClearSelectionService,
  DefaultOpenDocExtension,
  DNDAPIExtension,
  DocDisplayMetaService,
  DocModeService,
  EditPropsStore,
  EmbedOptionService,
  FileSizeLimitService,
  FontLoaderService,
  PageViewportServiceExtension,
  ThemeService,
  ToolbarRegistryExtension,
} from '@blocksuite/affine-shared/services';
import { ClipboardAdapterConfigExtension } from '@blocksuite/std';
import { InteractivityManager, ToolController } from '@blocksuite/std/gfx';
import type { ExtensionType } from '@blocksuite/store';

import { effects } from './effects';

const SnapshotClipboardConfig = ClipboardAdapterConfigExtension({
  mimeType: ClipboardAdapter.MIME,
  adapter: ClipboardAdapter,
  priority: 100,
});

const NotionClipboardConfig = ClipboardAdapterConfigExtension({
  mimeType: 'text/_notion-text-production',
  adapter: NotionTextAdapter,
  priority: 95,
});

const HtmlClipboardConfig = ClipboardAdapterConfigExtension({
  mimeType: 'text/html',
  adapter: HtmlAdapter,
  priority: 90,
});

const imageClipboardConfigs = [
  'image/apng',
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
].map(mimeType => {
  return ClipboardAdapterConfigExtension({
    mimeType,
    adapter: ImageAdapter,
    priority: 80,
  });
});

const PlainTextClipboardConfig = ClipboardAdapterConfigExtension({
  mimeType: 'text/plain',
  adapter: MixTextAdapter,
  priority: 70,
});

const AttachmentClipboardConfig = ClipboardAdapterConfigExtension({
  mimeType: '*/*',
  adapter: AttachmentAdapter,
  priority: 60,
});

export const clipboardConfigs: ExtensionType[] = [
  SnapshotClipboardConfig,
  NotionClipboardConfig,
  HtmlClipboardConfig,
  ...imageClipboardConfigs,
  PlainTextClipboardConfig,
  AttachmentClipboardConfig,
];

export class FoundationViewExtension extends ViewExtensionProvider {
  override name = 'foundation';

  override effect() {
    super.effect();
    effects();
  }

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    context.register([
      DocDisplayMetaService,
      EditPropsStore,
      DefaultOpenDocExtension,
      FontLoaderService,

      DocModeService,
      ThemeService,
      EmbedOptionService,
      PageViewportServiceExtension,
      DNDAPIExtension,
      FileDropExtension,
      ToolbarRegistryExtension,
      AutoClearSelectionService,
      FileSizeLimitService,
    ]);
    context.register(clipboardConfigs);
    if (this.isEdgeless(context.scope)) {
      context.register([InteractivityManager, ToolController]);
    }
  }
}
