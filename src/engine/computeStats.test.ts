import { describe, expect, it } from 'vitest';
import { computeStats } from './computeStats';
import { fighter, statCurves } from './data';

/**
 * Baseline truth: a naked level-0 Fighter has 15 in every attribute,
 * and 15 is the game's neutral point — every percentage curve crosses 0 there.
 * These values were cross-checked against the wiki on 2026-07-11.
 */
describe('computeStats - naked Fighter (all attributes 15)', () => {
  const stats = computeStats(fighter, statCurves);

  it('has 125 max health (wiki-confirmed value)', () => {
    expect(stats.maxHealth).toBe(125);
  });

  it('has 300 move speed (base, no gear)', () => {
    expect(stats.moveSpeed).toBe(300);
  });

  it('is at the neutral point (0%) for the speed/bonus curves', () => {
    expect(stats.actionSpeedPct).toBe(0);
    expect(stats.physicalPowerBonusPct).toBe(0);
    expect(stats.magicalPowerBonusPct).toBe(0);
    expect(stats.regularInteractionSpeedPct).toBe(0);
    expect(stats.magicalInteractionSpeedPct).toBe(0);
    expect(stats.spellCastingSpeedPct).toBe(0);
    expect(stats.itemEquipSpeedPct).toBe(0);
    expect(stats.manualDexterityPct).toBe(0);
    expect(stats.healthRecoveryPct).toBe(0);
    expect(stats.buffDurationPct).toBe(0);
    expect(stats.cooldownReductionPct).toBe(0);
  });

  it('has 15 physical/magical power (1:1 with STR/WILL)', () => {
    expect(stats.physicalPower).toBe(15);
    expect(stats.magicalPower).toBe(15);
  });

  it('has 30 magic resistance at 15 Will', () => {
    expect(stats.magicResistance).toBe(30);
  });

  it('has 9 memory capacity at 15 Knowledge (+1 per point above 6)', () => {
    expect(stats.memoryCapacity).toBe(9);
  });

  it('takes MORE physical damage when naked (negative PDR at 0 armor)', () => {
    // AR 0 sits between anchors (-4, -26.8) and (6, -14.8): -26.8 + 4*1.2 = -22%
    expect(stats.physicalDamageReductionPct).toBeCloseTo(-22, 10);
  });
});

describe('computeStats - gear modifiers (Phase 4 preview)', () => {
  it('+10 STR gear puts Physical Power Bonus at +10%', () => {
    // PP 25 sits between anchors (15, 0) and (50, 35): +1% per point
    const stats = computeStats(fighter, statCurves, { attributeBonuses: { strength: 10 } });
    expect(stats.physicalPower).toBe(25);
    expect(stats.physicalPowerBonusPct).toBeCloseTo(10, 10);
    // Health rating 0.25*25 + 0.75*15 = 17.5; segment 15->21 has slope
    // (110.5-100)/6 = 1.75/pt, so 100 + 2.5*1.75 + 25 flat = 129.375
    expect(stats.maxHealth).toBeCloseTo(129.375, 10);
  });

  it('armor rating feeds the PDR curve', () => {
    // AR 115 is an exact anchor: 18.55%
    const stats = computeStats(fighter, statCurves, { armorRating: 115 });
    expect(stats.physicalDamageReductionPct).toBeCloseTo(18.55, 10);
  });

  it('move speed respects the 330 hard cap', () => {
    // Agility 100 -> +43.5 add -> 343.5 raw, capped to 330
    const stats = computeStats(fighter, statCurves, { attributeBonuses: { agility: 85 } });
    expect(stats.moveSpeed).toBe(330);
  });

  it('attributes are clamped to 100 (curve table end)', () => {
    const stats = computeStats(fighter, statCurves, { attributeBonuses: { strength: 500 } });
    expect(stats.attributes.strength).toBe(100);
    expect(stats.physicalPowerBonusPct).toBe(50); // curve value at 100
  });
});
