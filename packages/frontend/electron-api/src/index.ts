import type {
  events as helperEvents,
  handlers as helperHandlers,
} from '../../apps/electron/src-old/helper/exposed';
import type {
  events as mainEvents,
  handlers as mainHandlers,
} from '../../apps/electron/src-old/main/exposed';
import type { AppInfo } from '../../apps/electron/src-old/preload/electron-api';
import type { SharedStorage } from '../../apps/electron/src-old/preload/shared-storage';

type MainHandlers = typeof mainHandlers;
type HelperHandlers = typeof helperHandlers;
type HelperEvents = typeof helperEvents;
type MainEvents = typeof mainEvents;
export type ClientHandler = {
  [namespace in keyof MainHandlers]: {
    [method in keyof MainHandlers[namespace]]: MainHandlers[namespace][method] extends (
      arg0: any,
      ...rest: infer A
    ) => any
      ? (
          ...args: A
        ) => ReturnType<MainHandlers[namespace][method]> extends Promise<any>
          ? ReturnType<MainHandlers[namespace][method]>
          : Promise<ReturnType<MainHandlers[namespace][method]>>
      : never;
  };
} & HelperHandlers;
export type ClientEvents = MainEvents & HelperEvents;

export const appInfo = (globalThis as any).__appInfo as AppInfo | null;
export const apis = (globalThis as any).__apis as ClientHandler | undefined;
export const events = (globalThis as any).__events as ClientEvents | undefined;

export const sharedStorage = (globalThis as any).__sharedStorage as
  | SharedStorage
  | undefined;

export type { AppInfo, SharedStorage };

export {
  type SpellCheckStateSchema,
  type TabViewsMetaSchema,
  type WorkbenchMeta,
  type WorkbenchViewMeta,
  type WorkbenchViewModule,
} from '../../apps/electron/src-old/main/shared-state-schema';
export type { UpdateMeta } from '../../apps/electron/src-old/main/updater/event';
export type {
  AddTabOption,
  TabAction,
} from '../../apps/electron/src-old/main/windows-manager';
