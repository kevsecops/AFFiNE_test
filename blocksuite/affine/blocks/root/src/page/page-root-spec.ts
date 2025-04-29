import { ViewportElementExtension } from '@blocksuite/affine-shared/services';
import { BlockViewExtension } from '@blocksuite/std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import { PageClipboard } from '../clipboard/page-clipboard.js';
import { CommonSpecs } from '../common-specs/index.js';

const PageCommonExtension: ExtensionType[] = [
  CommonSpecs,
  ViewportElementExtension('.affine-page-viewport'),
].flat();

export const PageRootBlockSpec: ExtensionType[] = [
  ...PageCommonExtension,
  BlockViewExtension('affine:page', literal`affine-page-root`),
  PageClipboard,
].flat();

export const PreviewPageRootBlockSpec: ExtensionType[] = [
  ...PageCommonExtension,
  BlockViewExtension('affine:page', literal`affine-preview-root`),
];
