import type { ExtensionType } from '@blocksuite/store';

import { EdgelessElementToolbarExtension } from './configs/toolbar';
import { EdgelessRootBlockSpec } from './edgeless-root-spec.js';
import { AltCloneExtension } from './interact-extensions/clone-ext.js';

export const EdgelessBuiltInManager: ExtensionType[] = [
  AltCloneExtension,
  EdgelessElementToolbarExtension,
].flat();

export const EdgelessBuiltInSpecs: ExtensionType[] = [
  EdgelessRootBlockSpec,
  EdgelessBuiltInManager,
].flat();
