/**
 * Camera safe insets.
 *
 * Every persistent piece of chrome that floats over the model canvas registers
 * the rectangle it occupies. The camera then treats the remaining rectangle as
 * the usable canvas, so a selected asset is never parked underneath the control
 * rail, the legend, the KPI strip or the simulation side panel.
 *
 * Registration is by stable key, so a control that appears, resizes or hides
 * updates its own inset without any other surface having to know about it.
 */
import { create } from 'zustand';

export type SafeInsetKey =
  | 'left-navigation'
  | 'host-layer-controls'
  | 'control-rail'
  | 'scene-controls-popover'
  | 'bottom-legend'
  | 'provenance-badge'
  | 'kpi-strip'
  | 'simulation-side-panel';

export interface InsetRect {
  /** Fractions of canvas width/height reserved on each edge, 0..1. */
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const EMPTY: InsetRect = { left: 0, right: 0, top: 0, bottom: 0 };

interface SafeInsetState {
  insets: Partial<Record<SafeInsetKey, InsetRect>>;
  setInset: (key: SafeInsetKey, rect: InsetRect | null) => void;
}

export const useCanvasSafeInsets = create<SafeInsetState>((set) => ({
  insets: {},
  setInset: (key, rect) =>
    set((s) => {
      const next = { ...s.insets };
      if (rect === null) delete next[key];
      else next[key] = rect;
      return { insets: next };
    }),
}));

/** Union of all registered insets: the edges the camera must keep clear. */
export function unionInsets(insets: Partial<Record<SafeInsetKey, InsetRect>>): InsetRect {
  return Object.values(insets).reduce<InsetRect>(
    (acc, r) => ({
      left: Math.max(acc.left, r?.left ?? 0),
      right: Math.max(acc.right, r?.right ?? 0),
      top: Math.max(acc.top, r?.top ?? 0),
      bottom: Math.max(acc.bottom, r?.bottom ?? 0),
    }),
    EMPTY,
  );
}

/** Usable canvas rectangle in normalised device coordinates (-1..1). */
export function safeViewportNdc(insets: Partial<Record<SafeInsetKey, InsetRect>>) {
  const u = unionInsets(insets);
  return {
    minX: -1 + u.left * 2,
    maxX: 1 - u.right * 2,
    minY: -1 + u.bottom * 2,
    maxY: 1 - u.top * 2,
  };
}

/**
 * True when a projected point sits inside the usable rectangle. Used by the
 * camera to decide whether a refit is required - a refit only happens when the
 * selected object would actually be obscured, so the view never jumps because
 * chrome merely changed size.
 */
export function isPointVisible(
  ndc: { x: number; y: number },
  insets: Partial<Record<SafeInsetKey, InsetRect>>,
  margin = 0.02,
): boolean {
  const v = safeViewportNdc(insets);
  return (
    ndc.x >= v.minX + margin &&
    ndc.x <= v.maxX - margin &&
    ndc.y >= v.minY + margin &&
    ndc.y <= v.maxY - margin
  );
}

/** Measure a DOM element as an inset fraction of its canvas container. */
export function insetFromElement(
  element: HTMLElement | null,
  container: HTMLElement | null,
): InsetRect | null {
  if (!element || !container) return null;
  const e = element.getBoundingClientRect();
  const c = container.getBoundingClientRect();
  if (c.width === 0 || c.height === 0 || e.width === 0 || e.height === 0) return null;
  const fromLeft = (e.left - c.left) / c.width;
  const fromRight = (c.right - e.right) / c.width;
  const fromTop = (e.top - c.top) / c.height;
  const fromBottom = (c.bottom - e.bottom) / c.height;
  // Reserve the edge the element is nearest to; a floating control only ever
  // protects one edge, so the camera keeps the largest possible usable area.
  const horizontal = fromLeft <= fromRight
    ? { left: Math.min(1, (e.right - c.left) / c.width), right: 0 }
    : { left: 0, right: Math.min(1, (c.right - e.left) / c.width) };
  const vertical = fromTop <= fromBottom
    ? { top: Math.min(1, (e.bottom - c.top) / c.height), bottom: 0 }
    : { top: 0, bottom: Math.min(1, (c.bottom - e.top) / c.height) };
  const horizontalDominant =
    Math.max(horizontal.left, horizontal.right) <= Math.max(vertical.top, vertical.bottom);
  return horizontalDominant
    ? { ...horizontal, top: 0, bottom: 0 }
    : { left: 0, right: 0, ...vertical };
}
