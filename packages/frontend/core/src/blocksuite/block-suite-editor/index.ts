import { registerAIEffects } from '@affine/core/blocksuite/ai/effects';
import { editorEffects } from '@affine/core/blocksuite/editors';
import type * as EffectType from '@blocksuite/affine/effects';

declare type _GLOBAL_ = typeof EffectType;

import { registerTemplates } from './register-templates';

editorEffects();
registerAIEffects();
registerTemplates();

export * from './blocksuite-editor';
