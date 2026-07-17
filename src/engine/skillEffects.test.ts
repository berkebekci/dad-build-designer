import { describe, expect, it } from 'vitest';
import { skillTotals, skillEffects, classes } from './data';
import { computeStats } from './computeStats';
import { statCurves } from './data';
import { mergeGearTotals, emptyTotals } from './itemStats';
import { simulateSkillDamage } from './skillDamage';

describe('skillTotals - skills apply their stats', () => {
  it('unconditional skills apply when selected (none currently) and conditional gate correctly', () => {
    const off = skillTotals(['rage'], []);
    expect(off.attributeBonuses.strength ?? 0).toBe(0);
    const on = skillTotals(['rage'], ['rage']);
    expect(on.attributeBonuses.strength).toBe(10);
    expect(on.percents.moveSpeedBonusPct).toBe(7);
    expect(on.percents.physicalDamageReductionPct).toBe(-5);
  });

  it('skills with no stat effect (damage-only) contribute nothing to stats', () => {
    const t = skillTotals(['blow_of_corruption'], []);
    expect(t).toEqual(skillTotals([], []));
  });
});

describe('computeStats with skill effects', () => {
  const barbarian = classes['barbarian']!;

  it('War Sacrifice adds +8 to every attribute when toggled active', () => {
    const base = computeStats(barbarian, statCurves);
    const withBuff = computeStats(barbarian, statCurves, {
      gear: mergeGearTotals(emptyTotals(), skillTotals(['war_sacrifice'], ['war_sacrifice'])),
    });
    expect(withBuff.attributes.strength).toBeCloseTo(base.attributes.strength + 8, 2);
    expect(withBuff.attributes.will).toBeCloseTo(base.attributes.will + 8, 2);
  });
});

describe('simulateSkillDamage', () => {
  const dummy = { pdrPct: 0, mdrPct: 0, headshotReductionPct: 0 };

  it('Blow of Corruption deals its base magical damage with no reductions', () => {
    const wizard = classes['wizard']!;
    const stats = computeStats(wizard, statCurves);
    const effect = skillEffects['blow_of_corruption']!.damage!;
    const [hit] = simulateSkillDamage(stats, effect, dummy);
    expect(hit!.amount).toBeGreaterThan(0);
  });

  it('opponent PDR reduces a physical skill hit', () => {
    const fighter = classes['fighter']!;
    const stats = computeStats(fighter, statCurves);
    const effect = skillEffects['shield_slam']!.damage!;
    const noDr = simulateSkillDamage(stats, effect, dummy)[0]!.amount;
    const withDr = simulateSkillDamage(stats, effect, { ...dummy, pdrPct: 50 })[0]!.amount;
    expect(withDr).toBeLessThan(noDr);
  });
});
