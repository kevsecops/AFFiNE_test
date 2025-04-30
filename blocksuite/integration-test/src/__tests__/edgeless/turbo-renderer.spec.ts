/**
 * Please refer to integration-test/README.md for commands to run tests.
 */
import { ParagraphLayoutHandlerExtension } from '@blocksuite/affine/blocks/paragraph';
import { noop } from '@blocksuite/affine/global/utils';
import {
  TurboRendererConfigFactory,
  ViewportTurboRendererExtension,
} from '@blocksuite/affine-gfx-turbo-renderer';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { wait } from '../utils/common.js';
import { addSampleNotes } from '../utils/doc-generator.js';
import {
  createPainterWorker,
  getRenderer,
  setupEditor,
} from '../utils/setup.js';

const FRAME = 16;

describe('viewport turbo renderer', () => {
  let cleanup: () => void;

  beforeEach(async () => {
    cleanup = await setupEditor('edgeless', [
      ParagraphLayoutHandlerExtension,
      TurboRendererConfigFactory({
        painterWorkerEntry: createPainterWorker,
      }),
      ViewportTurboRendererExtension,
    ]);
    return cleanup;
  });

  afterEach(() => cleanup?.());

  test('should render 6 notes in viewport', async () => {
    addSampleNotes(doc, 6);
    const renderer = getRenderer();
    await renderer.refresh();
    await wait(FRAME);
    await firstValueFrom(renderer.state$.pipe(filter(s => s === 'ready')));

    const notes = document.querySelectorAll('affine-edgeless-note');
    expect(notes.length).toBe(6);
  });

  test('should access turbo renderer instance', async () => {
    const renderer = getRenderer();
    expect(renderer).toBeDefined();
    expect(renderer instanceof ViewportTurboRendererExtension).toBe(true);
    expect(renderer.canvas).toBeInstanceOf(HTMLCanvasElement);
  });

  test('initial state should be pending', async () => {
    const renderer = getRenderer();
    expect(renderer.state$.value).toBe('pending');
  });

  test('zooming should change internal state and populate optimized block ids', async () => {
    const renderer = getRenderer();
    addSampleNotes(doc, 1);
    await renderer.refresh();
    await wait(FRAME);
    await firstValueFrom(renderer.state$.pipe(filter(s => s === 'ready')));
    expect(renderer.optimizedBlockIds.length).toBe(0);

    renderer.viewport.zooming$.next(true);
    await firstValueFrom(renderer.state$.pipe(filter(s => s === 'zooming')));

    const canUseCache = renderer.canUseBitmapCache();
    expect(canUseCache).toBe(false);

    await renderer.refresh();
    await wait(FRAME);
    expect(renderer.optimizedBlockIds.length).toBe(1);

    renderer.viewport.zooming$.next(false);
    await firstValueFrom(renderer.state$.pipe(filter(s => s === 'ready')));

    expect(renderer.state$.value).toBe('ready');
    expect(renderer.optimizedBlockIds.length).toBe(0);
  });

  test('state transitions between pending and ready', async () => {
    const renderer = getRenderer();

    addSampleNotes(doc, 1);
    await renderer.refresh();
    await wait(FRAME);
    await firstValueFrom(renderer.state$.pipe(filter(s => s === 'pending')));
    expect(renderer.state$.value).toBe('pending');

    renderer.viewport.zooming$.next(false);
    await renderer.refresh();
    await wait(FRAME);
    await firstValueFrom(renderer.state$.pipe(filter(s => s === 'ready')));

    expect(renderer.state$.value).toBe('ready');
  });

  test('initial layout cache data should be null', () => {
    const renderer = getRenderer();
    expect(renderer.layoutCacheData).toBeNull();
  });

  test('invalidation should reset layout cache data to null', async () => {
    const renderer = getRenderer();
    addSampleNotes(doc, 1);
    await wait(100);

    const _cache = renderer.layoutCache;
    noop(_cache);
    expect(renderer.layoutCacheData).not.toBeNull();

    addSampleNotes(doc, 1);
    await wait(100);
    await renderer.refresh();
    await wait(FRAME);

    expect(renderer.layoutCacheData).toBeNull();
  });

  test('accessing layoutCache getter should populate cache data', async () => {
    const renderer = getRenderer();
    addSampleNotes(doc, 1);
    await renderer.refresh();
    await wait(FRAME);
    expect(renderer.layoutCacheData).toBeNull();

    const _cache = renderer.layoutCache;
    noop(_cache);
    expect(renderer.layoutCacheData).not.toBeNull();
    expect(renderer.layoutCache?.roots.length).toBeGreaterThan(0);
  });
});
