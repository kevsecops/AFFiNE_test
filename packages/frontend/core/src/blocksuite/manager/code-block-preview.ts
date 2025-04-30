import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine/ext-loader';

import {
  CodeBlockHtmlPreview,
  effects as htmlPreviewEffects,
} from '../extensions/code-block-preview/html-preview';

export class CodeBlockPreviewExtensionProvider extends ViewExtensionProvider<{}> {
  override name = 'code-block-preview';

  override effect() {
    super.effect();
    htmlPreviewEffects();
  }

  override setup(context: ViewExtensionContext) {
    super.setup(context);

    context.register(CodeBlockHtmlPreview);
  }
}
