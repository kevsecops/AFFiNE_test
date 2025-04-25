import type { ExtensionType } from '@blocksuite/affine/store';
import { type FrameworkProvider } from '@toeverything/infra';

import { getViewManager } from '../../manager/migrating-view';

export function enableEditorExtension(
  framework: FrameworkProvider,
  mode: 'edgeless' | 'page',
  enableAI: boolean
): ExtensionType[] {
  const manager = getViewManager(framework, enableAI);
  return manager.get(mode);
}
