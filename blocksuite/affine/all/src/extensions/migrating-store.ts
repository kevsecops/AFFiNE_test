import {
  RootBlockHtmlAdapterExtension,
  RootBlockMarkdownAdapterExtension,
  RootBlockNotionHtmlAdapterExtension,
} from '@blocksuite/affine-block-root';
import {
  type StoreExtensionContext,
  StoreExtensionProvider,
} from '@blocksuite/affine-ext-loader';
import { RootBlockSchemaExtension } from '@blocksuite/affine-model';
import type { ExtensionType } from '@blocksuite/store';

const defaultBlockHtmlAdapterMatchers = [RootBlockHtmlAdapterExtension];

const defaultBlockMarkdownAdapterMatchers = [RootBlockMarkdownAdapterExtension];

const defaultBlockNotionHtmlAdapterMatchers: ExtensionType[] = [
  RootBlockNotionHtmlAdapterExtension,
];

function getHtmlAdapterExtensions(): ExtensionType[] {
  return [...defaultBlockHtmlAdapterMatchers];
}

function getMarkdownAdapterExtensions(): ExtensionType[] {
  return [...defaultBlockMarkdownAdapterMatchers];
}

function getNotionHtmlAdapterExtensions(): ExtensionType[] {
  return [...defaultBlockNotionHtmlAdapterMatchers];
}

const MigratingStoreExtensions: ExtensionType[] = [
  RootBlockSchemaExtension,

  getHtmlAdapterExtensions(),
  getMarkdownAdapterExtensions(),
  getNotionHtmlAdapterExtensions(),
].flat();

export class MigratingStoreExtension extends StoreExtensionProvider {
  override name = 'migrating';

  override setup(context: StoreExtensionContext) {
    super.setup(context);
    context.register(MigratingStoreExtensions);
  }
}
