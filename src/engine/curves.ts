/**
 * Dark and Darker stat curves are piecewise-linear: the wiki publishes
 * breakpoint tables ("from X to Y attribute, +Z per point"), which we store
 * as anchor points [[input, output], ...] in data/stat_curves.json.
 * Evaluating a curve = linear interpolation between the two surrounding anchors.
 */

export interface CurveSpec {
  points: number[][];
  /** Output is clamped to at most this value (e.g. 65% PDR cap). */
  cap?: number;
  /** Output is clamped to at least this value (e.g. -100% power bonus floor). */
  floor?: number;
  /** Flat amount added after interpolation (e.g. +25 health for all classes). */
  flat_add?: number;
}

/**
 * Linear interpolation over anchor points.
 * Outside the covered range the curve is CLAMPED to the first/last anchor —
 * the wiki tables end at attribute 100, and the game caps attributes there.
 */
export function evalPiecewiseLinear(points: number[][], x: number): number {
  if (points.length === 0) throw new Error('curve has no points');

  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (x <= first[0]!) return first[1]!;
  if (x >= last[0]!) return last[1]!;

  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i] as [number, number];
    if (x <= x1) {
      const [x0, y0] = points[i - 1] as [number, number];
      return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
    }
  }
  return last[1]!; // unreachable, satisfies the type checker
}

/** Evaluate a curve spec: interpolate, then apply flat_add, cap and floor. */
export function evalCurve(spec: CurveSpec, x: number): number {
  let y = evalPiecewiseLinear(spec.points, x);
  if (spec.flat_add !== undefined) y += spec.flat_add;
  if (spec.cap !== undefined) y = Math.min(y, spec.cap);
  if (spec.floor !== undefined) y = Math.max(y, spec.floor);
  return y;
}
