import { effects as blockRootEffects } from '@blocksuite/affine-block-root/effects';
import { effects as fragmentDocTitleEffects } from '@blocksuite/affine-fragment-doc-title/effects';
import { effects as fragmentFramePanelEffects } from '@blocksuite/affine-fragment-frame-panel/effects';
import { effects as fragmentOutlineEffects } from '@blocksuite/affine-fragment-outline/effects';

export function effects() {
  blockRootEffects();

  fragmentDocTitleEffects();
  fragmentFramePanelEffects();
  fragmentOutlineEffects();
}
