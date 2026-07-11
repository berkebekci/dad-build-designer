import { describe, expect, it } from 'vitest';
import { evalCurve, evalPiecewiseLinear } from './curves';

describe('evalPiecewiseLinear', () => {
  const points = [
    [0, -38],
    [10, -8],
    [15, 0],
    [33, 22.5],
  ];

  it('returns exact values at anchor points', () => {
    expect(evalPiecewiseLinear(points, 0)).toBe(-38);
    expect(evalPiecewiseLinear(points, 10)).toBe(-8);
    expect(evalPiecewiseLinear(points, 15)).toBe(0);
    expect(evalPiecewiseLinear(points, 33)).toBe(22.5);
  });

  it('interpolates linearly between anchors', () => {
    // between 15 (0%) and 33 (22.5%): slope = 22.5 / 18 = 1.25 per point
    expect(evalPiecewiseLinear(points, 20)).toBeCloseTo(6.25, 10);
    // between 0 (-38) and 10 (-8): slope = 3 per point
    expect(evalPiecewiseLinear(points, 5)).toBeCloseTo(-23, 10);
  });

  it('clamps outside the covered range', () => {
    expect(evalPiecewiseLinear(points, -50)).toBe(-38);
    expect(evalPiecewiseLinear(points, 999)).toBe(22.5);
  });

  it('throws on an empty curve', () => {
    expect(() => evalPiecewiseLinear([], 5)).toThrow();
  });
});

describe('evalCurve (spec modifiers)', () => {
  it('applies flat_add after interpolation (health +25)', () => {
    const spec = { points: [[0, 70], [15, 100]], flat_add: 25 };
    expect(evalCurve(spec, 15)).toBe(125);
  });

  it('applies cap (cooldown reduction capped at 65%)', () => {
    const spec = { points: [[0, 0], [100, 80]], cap: 65 };
    expect(evalCurve(spec, 100)).toBe(65);
  });

  it('applies floor (power bonus floored at -100%)', () => {
    const spec = { points: [[0, -200], [10, 0]], floor: -100 };
    expect(evalCurve(spec, 0)).toBe(-100);
  });
});
