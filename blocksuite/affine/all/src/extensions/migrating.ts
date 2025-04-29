import {
  EdgelessBuiltInSpecs,
  PageRootBlockSpec,
  PreviewEdgelessRootBlockSpec,
  PreviewPageRootBlockSpec,
  ReadOnlyClipboard,
} from '@blocksuite/affine-block-root';
import type { ExtensionType } from '@blocksuite/store';

export const MigratingEdgelessEditorBlockSpecs: ExtensionType[] = [
  EdgelessBuiltInSpecs,
].flat();

export const MigratingPageEditorBlockSpecs: ExtensionType[] = [
  PageRootBlockSpec,
].flat();

export const MigratingPreviewEdgelessEditorBlockSpecs: ExtensionType[] = [
  PreviewEdgelessRootBlockSpec,
  ReadOnlyClipboard,
].flat();

export const MigratingPreviewPageEditorBlockSpecs: ExtensionType[] = [
  PreviewPageRootBlockSpec,
  ReadOnlyClipboard,
].flat();
