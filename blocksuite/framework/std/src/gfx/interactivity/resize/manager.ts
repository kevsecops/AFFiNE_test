import {
  Bound,
  getCommonBoundWithRotation,
  type IVec,
} from '@blocksuite/global/gfx';

import type { GfxController } from '../..';
import type { GfxModel } from '../../model/model';

// ResizeController.ts
type ResizeHandle =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left';

interface ElementInitialSnapshot {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number; // 角度，度为单位
}

export interface OptionResize {
  elements: GfxModel[];
  handle: ResizeHandle;
  proportion: boolean;
  event: PointerEvent;
  onResizeUpdate: (payload: {
    model: GfxModel;
    originalBound: Bound;
    newBound: Bound;
  }) => void;
  onResizeStart?: (payload: { model: GfxModel }) => void;
  onResizeEnd?: (payload: { model: GfxModel }) => void;
}

export type RotateOption = {
  elements: GfxModel[];
  event: PointerEvent;
  /**
   * Called on each model's rotate update
   * @param payload
   * @returns
   */
  onRotateUpdate: (payload: {
    model: GfxModel;
    newBound: Bound;
    originalBound: Bound;
    originalRotate: number;
    newRotate: number;
  }) => void;

  /**
   * Called only once
   * @param payload
   * @returns
   */
  onRotateStart?: (payload: {}) => void;

  /**
   * Called only once
   * @param payload
   * @returns
   */
  onRotateEnd?: (payload: {}) => void;
};

export class ResizeController {
  private readonly gfx: GfxController;

  get host() {
    return this.gfx.std.host;
  }

  constructor(option: { gfx: GfxController }) {
    this.gfx = option.gfx;
  }

  startResize(options: OptionResize) {
    const {
      elements,
      handle,
      proportion,
      onResizeStart,
      onResizeUpdate,
      onResizeEnd,
    } = options;

    const originals: ElementInitialSnapshot[] = elements.map(el => ({
      x: el.x,
      y: el.y,
      w: el.w,
      h: el.h,
      rotate: el.rotate,
    }));

    const onPointerMove = (e: PointerEvent) => {
      const currPt = this.gfx.viewport.toModelCoordFromClientCoord([
        e.clientX,
        e.clientY,
      ]);
      const proportionResize = proportion || e.shiftKey;

      if (elements.length === 1) {
        this.resizeSingle(
          originals[0],
          elements[0],
          proportionResize,
          currPt,
          handle,
          onResizeUpdate
        );
      } else {
        this.resizeMulti(originals, elements, handle, currPt, onResizeUpdate);
      }
    };

    elements.forEach(model => {
      onResizeStart?.({ model });
    });

    const onPointerUp = () => {
      this.host.removeEventListener('pointermove', onPointerMove);
      this.host.removeEventListener('pointerup', onPointerUp);

      elements.forEach(model => {
        onResizeEnd?.({ model });
      });
    };

    this.host.addEventListener('pointermove', onPointerMove);
    this.host.addEventListener('pointerup', onPointerUp);
  }

  /** 单元素局部缩放（含旋转） */
  private resizeSingle(
    orig: ElementInitialSnapshot,
    model: GfxModel,
    proportion: boolean,
    currPt: IVec,
    handle: ResizeHandle,
    updateCallback: OptionResize['onResizeUpdate']
  ) {
    const { xSign, ySign } = this.getHandleSign(handle);

    const pivot = new DOMPoint(
      orig.x + (-xSign === 1 ? orig.w : 0),
      orig.y + (-ySign === 1 ? orig.h : 0)
    );
    const toLocalRotatedM = new DOMMatrix()
      .translate(-pivot.x, -pivot.y)
      .translate(orig.w / 2 + orig.x, orig.h / 2 + orig.y)
      .rotate(-orig.rotate)
      .translate(-(orig.w / 2 + orig.x), -(orig.h / 2 + orig.y));
    const toLocalM = new DOMMatrix().translate(-pivot.x, -pivot.y);

    const toLocal = (p: DOMPoint, withRotation: boolean) =>
      p.matrixTransform(withRotation ? toLocalRotatedM : toLocalM);
    const toModel = (p: DOMPoint) =>
      p.matrixTransform(toLocalRotatedM.inverse());

    const currPtLocal = toLocal(new DOMPoint(currPt[0], currPt[1]), true);
    const handleLocal = new DOMPoint(xSign * orig.w, ySign * orig.h);

    let scaleX = xSign ? (xSign * currPtLocal.x) / (xSign * handleLocal.x) : 1;
    let scaleY = ySign ? (ySign * currPtLocal.y) / (ySign * handleLocal.y) : 1;

    if (proportion) {
      const min = Math.min(Math.abs(scaleX), Math.abs(scaleY));
      scaleX = Math.sign(scaleX) * min;
      scaleY = Math.sign(scaleY) * min;
    }

    const scaleM = new DOMMatrix().scale(scaleX, scaleY);

    const [visualTopLeft, visualBottomRight] = [
      new DOMPoint(orig.x, orig.y),
      new DOMPoint(orig.x + orig.w, orig.y + orig.h),
    ].map(p => {
      const localP = toLocal(p, false);
      const scaledP = localP.matrixTransform(scaleM);

      return toModel(scaledP);
    });

    const center = {
      x:
        Math.min(visualTopLeft.x, visualBottomRight.x) +
        Math.abs(visualBottomRight.x - visualTopLeft.x) / 2,
      y:
        Math.min(visualTopLeft.y, visualBottomRight.y) +
        Math.abs(visualBottomRight.y - visualTopLeft.y) / 2,
    };

    const [topLeft, bottomRight] = [visualBottomRight, visualTopLeft].map(p => {
      return p.matrixTransform(
        new DOMMatrix()
          .translate(center.x, center.y)
          .rotate(-orig.rotate)
          .translate(-center.x, -center.y)
      );
    });

    updateCallback({
      model: model,
      originalBound: new Bound(orig.x, orig.y, orig.w, orig.h),
      newBound: new Bound(
        Math.min(topLeft.x, bottomRight.x),
        Math.min(bottomRight.y, topLeft.y),
        Math.abs(bottomRight.x - topLeft.x),
        Math.abs(bottomRight.y - topLeft.y)
      ),
    });
  }

  /** 多元素组缩放（轴对齐） */
  private resizeMulti(
    originals: ElementInitialSnapshot[],
    elements: GfxModel[],
    handle: ResizeHandle,
    currPt: IVec,
    updateCallback: OptionResize['onResizeUpdate']
  ) {
    const commonBound = getCommonBoundWithRotation(originals);
    const { xSign, ySign } = this.getHandleSign(handle);

    const pivot = new DOMPoint(
      commonBound.x + ((-xSign + 1) / 2) * commonBound.w,
      commonBound.y + ((-ySign + 1) / 2) * commonBound.h
    );
    const toLocalM = new DOMMatrix().translate(-pivot.x, -pivot.y);

    const toLocal = (p: DOMPoint) => p.matrixTransform(toLocalM);
    const toModel = (p: DOMPoint) => p.matrixTransform(toLocalM.inverse());

    const currPtLocal = toLocal(new DOMPoint(currPt[0], currPt[1]));
    const handleLocal = new DOMPoint(
      xSign * commonBound.w,
      ySign * commonBound.h
    );

    let scaleX = xSign ? (xSign * currPtLocal.x) / (xSign * handleLocal.x) : 1;
    let scaleY = ySign ? (ySign * currPtLocal.y) / (ySign * handleLocal.y) : 1;

    const min = Math.max(Math.abs(scaleX), Math.abs(scaleY));
    scaleX = Math.sign(scaleX) * min;
    scaleY = Math.sign(scaleY) * min;

    const scaleM = new DOMMatrix().scale(scaleX, scaleY);

    elements.forEach((model, i) => {
      const orig = originals[i];
      const [topLeft, bottomRight] = [
        new DOMPoint(orig.x, orig.y),
        new DOMPoint(orig.x + orig.w, orig.y + orig.h),
      ].map(p => {
        const localP = toLocal(p);
        const scaledP = localP.matrixTransform(scaleM);

        return toModel(scaledP);
      });

      const newBound = new Bound(
        Math.min(topLeft.x, bottomRight.x),
        Math.min(bottomRight.y, topLeft.y),
        Math.abs(bottomRight.x - topLeft.x),
        Math.abs(bottomRight.y - topLeft.y)
      );

      updateCallback({
        model,
        originalBound: new Bound(orig.x, orig.y, orig.w, orig.h),
        newBound,
      });
    });
  }

  startRotate(option: RotateOption) {
    const { event, elements, onRotateUpdate } = option;

    const originals: ElementInitialSnapshot[] = elements.map(el => ({
      x: el.x,
      y: el.y,
      w: el.w,
      h: el.h,
      rotate: el.rotate,
    }));

    const startPt = this.gfx.viewport.toModelCoordFromClientCoord([
      event.clientX,
      event.clientY,
    ]);
    const onPointerMove = (e: PointerEvent) => {
      const currentPt = this.gfx.viewport.toModelCoordFromClientCoord([
        e.clientX,
        e.clientY,
      ]);

      if (elements.length > 1) {
        this.rotateMulti({
          origs: originals,
          models: elements,
          startPt,
          currentPt,
          onRotateUpdate,
        });
      } else {
        this.rotateSingle({
          orig: originals[0],
          model: elements[0],
          startPt,
          currentPt,
          onRotateUpdate,
        });
      }
    };
    const onPointerUp = () => {
      this.host.removeEventListener('pointermove', onPointerMove);
      this.host.removeEventListener('pointerup', onPointerUp);

      option.onRotateEnd?.({});
    };

    elements.forEach(() => {
      option.onRotateStart?.({});
    });

    this.host.addEventListener('pointermove', onPointerMove, false);
    this.host.addEventListener('pointerup', onPointerUp, false);
  }

  private rotateSingle(option: {
    orig: ElementInitialSnapshot;
    model: GfxModel;
    startPt: IVec;
    currentPt: IVec;
    onRotateUpdate?: RotateOption['onRotateUpdate'];
  }) {
    const { orig, model, startPt, currentPt, onRotateUpdate } = option;

    const center = {
      x: orig.x + orig.w / 2,
      y: orig.y + orig.h / 2,
    };
    const toLocalM = new DOMMatrix().translate(-center.x, -center.y);
    const toLocal = (p: DOMPoint) => p.matrixTransform(toLocalM);

    const v0 = toLocal(new DOMPoint(startPt[0], startPt[1])),
      v1 = toLocal(new DOMPoint(currentPt[0], currentPt[1]));
    const a0 = Math.atan2(v0.y, v0.x),
      a1 = Math.atan2(v1.y, v1.x);
    const deltaDeg = ((a1 - a0) * 180) / Math.PI;

    onRotateUpdate?.({
      model,
      originalBound: new Bound(orig.x, orig.y, orig.w, orig.h),
      newBound: new Bound(orig.x, orig.y, orig.w, orig.h),
      originalRotate: orig.rotate,
      newRotate: orig.rotate + deltaDeg,
    });
  }

  private rotateMulti(option: {
    origs: ElementInitialSnapshot[];
    models: GfxModel[];
    startPt: IVec;
    currentPt: IVec;
    onRotateUpdate?: RotateOption['onRotateUpdate'];
  }) {
    const { models, startPt, currentPt, onRotateUpdate } = option;
    const commonBound = getCommonBoundWithRotation(option.origs);

    const center = {
      x: commonBound.x + commonBound.w / 2,
      y: commonBound.y + commonBound.h / 2,
    };
    const toLocalM = new DOMMatrix().translate(-center.x, -center.y);
    const toLocal = (p: DOMPoint) => p.matrixTransform(toLocalM);

    const v0 = toLocal(new DOMPoint(startPt[0], startPt[1])),
      v1 = toLocal(new DOMPoint(currentPt[0], currentPt[1]));
    const a0 = Math.atan2(v0.y, v0.x),
      a1 = Math.atan2(v1.y, v1.x);
    const deltaDeg = ((a1 - a0) * 180) / Math.PI;
    const rotateM = new DOMMatrix()
      .translate(center.x, center.y)
      .rotate(deltaDeg)
      .translate(-center.x, -center.y);
    const toRotatedPoint = (p: DOMPoint) => p.matrixTransform(rotateM);

    models.forEach((model, index) => {
      const orig = option.origs[index];
      const center = {
        x: orig.x + orig.w / 2,
        y: orig.y + orig.h / 2,
      };

      const toVisualM = new DOMMatrix()
        .translate(center.x, center.y)
        .rotate(-orig.rotate)
        .translate(-center.x, -center.y);
      const toVisual = (p: DOMPoint) => p.matrixTransform(toVisualM);

      const [rotatedLeftTop, rotatedBottomRight] = [
        new DOMPoint(orig.x, orig.y),
        new DOMPoint(orig.x + orig.w, orig.y + orig.h),
      ].map(p => toRotatedPoint(toVisual(p)));

      const newCenter = {
        x:
          Math.min(rotatedLeftTop.x, rotatedBottomRight.x) +
          Math.abs(rotatedBottomRight.x - rotatedLeftTop.x) / 2,
        y:
          Math.min(rotatedLeftTop.y, rotatedBottomRight.y) +
          Math.abs(rotatedBottomRight.y - rotatedLeftTop.y) / 2,
      };
      const newRotated = orig.rotate + deltaDeg;
      const topLeft = rotatedLeftTop.matrixTransform(
        new DOMMatrix()
          .translate(newCenter.x, newCenter.y)
          .rotate(-newRotated)
          .translate(-newCenter.x, -newCenter.y)
      );

      onRotateUpdate?.({
        model,
        originalBound: new Bound(orig.x, orig.y, orig.w, orig.h),
        newBound: new Bound(topLeft.x, topLeft.y, orig.w, orig.h),
        originalRotate: orig.rotate,
        newRotate: orig.rotate + deltaDeg,
      });
    });
  }

  private getHandleSign(handle: ResizeHandle) {
    switch (handle) {
      case 'top-left':
        return { xSign: -1, ySign: -1 };
      case 'top':
        return { xSign: 0, ySign: -1 };
      case 'top-right':
        return { xSign: 1, ySign: -1 };
      case 'right':
        return { xSign: 1, ySign: 0 };
      case 'bottom-right':
        return { xSign: 1, ySign: 1 };
      case 'bottom':
        return { xSign: 0, ySign: 1 };
      case 'bottom-left':
        return { xSign: -1, ySign: 1 };
      case 'left':
        return { xSign: -1, ySign: 0 };
      default:
        return { xSign: 0, ySign: 0 };
    }
  }
}
