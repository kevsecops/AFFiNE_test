import type * as BrushEffect from '@blocksuite/affine-gfx-brush';
import type * as NoteEffect from '@blocksuite/affine-gfx-note';
import type * as ShapeEffect from '@blocksuite/affine-gfx-shape';
import { InteractivityManager } from '@blocksuite/std/gfx';
import type { ExtensionType } from '@blocksuite/store';

import { EdgelessElementToolbarExtension } from './configs/toolbar';
import { EdgelessRootBlockSpec } from './edgeless-root-spec.js';
import { DefaultTool } from './gfx-tool/default-tool.js';
import { EmptyTool } from './gfx-tool/empty-tool.js';
import { PanTool } from './gfx-tool/pan-tool.js';
import { AltCloneExtension } from './interact-extensions/clone-ext.js';
import { SnapExtension } from './interact-extensions/snap-manager.js';
import { EditPropsMiddlewareBuilder } from './middlewares/base.js';
import { SnapOverlay } from './utils/snap-manager.js';

declare type _GLOBAL_ =
  | typeof NoteEffect
  | typeof BrushEffect
  | typeof ShapeEffect;

export const EdgelessToolExtension: ExtensionType[] = [
  DefaultTool,
  PanTool,
  EmptyTool,
];

export const EdgelessEditExtensions: ExtensionType[] = [
  InteractivityManager,
  SnapExtension,
];

export const EdgelessBuiltInManager: ExtensionType[] = [
  SnapOverlay,
  AltCloneExtension,
  EditPropsMiddlewareBuilder,
  EdgelessElementToolbarExtension,
].flat();

export const EdgelessBuiltInSpecs: ExtensionType[] = [
  EdgelessRootBlockSpec,
  EdgelessToolExtension,
  EdgelessBuiltInManager,
  EdgelessEditExtensions,
].flat();
