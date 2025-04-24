import type { MainEventRegister } from '../../../shared/type';
import { globalCacheStorage, globalStateStorage } from './storage';

export const storageEvents = {
  onGlobalStateChanged: (
    fn: (state: Record<string, unknown | undefined>) => void
  ) => {
    const subscription = globalStateStorage.watchAll().subscribe(updates => {
      fn(updates);
    });
    return () => {
      subscription.unsubscribe();
    };
  },
  onGlobalCacheChanged: (
    fn: (state: Record<string, unknown | undefined>) => void
  ) => {
    const subscription = globalCacheStorage.watchAll().subscribe(updates => {
      fn(updates);
    });
    return () => {
      subscription.unsubscribe();
    };
  },
} satisfies Record<string, MainEventRegister>;
