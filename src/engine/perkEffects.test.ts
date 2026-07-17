import { describe, expect, it } from 'vitest';
import { perkTotals, classes } from './data';
import { computeStats } from './computeStats';
import { statCurves } from './data';
import { mergeGearTotals, emptyTotals } from './itemStats';

describe('perkTotals - perks apply their stats', () => {
  it('unconditional perks apply when selected', () => {
    const t = perkTotals(['mana_surge', 'sage'], []);
    expect(t.percents.magicalPowerBonusPct).toBe(10); // Mana Surge
    expect(t.attributeBonusPct.knowledge).toBe(15); // Sage: +15% Knowledge Bonus
  });

  it('conditional perks apply only when toggled active', () => {
    const off = perkTotals(['barricade'], []);
    expect(off.flats.armorRating).toBe(0);
    const on = perkTotals(['barricade'], ['barricade']);
    expect(on.flats.armorRating).toBe(75);
    expect(on.flats.magicResistanceAdd).toBe(75);
  });

  it('perks with no stat effect contribute nothing', () => {
    const t = perkTotals(['double_jump', 'pickpocket'], []);
    expect(t).toEqual(perkTotals([], []));
  });
});

describe('computeStats with perk effects (attribute bonus %)', () => {
  const wizard = classes['wizard']!;

  it('Sage multiplies Knowledge by 1.15', () => {
    const base = computeStats(wizard, statCurves);
    const withSage = computeStats(wizard, statCurves, {
      gear: mergeGearTotals(emptyTotals(), perkTotals(['sage'], [])),
    });
    // Wizard base Knowledge 25 -> 25 * 1.15 = 28.75 -> clamp -> 28.75
    expect(base.attributes.knowledge).toBe(25);
    expect(withSage.attributes.knowledge).toBeCloseTo(28.75, 2);
  });

  it('Mana Surge adds +10% Magical Power Bonus on top of the curve', () => {
    const base = computeStats(wizard, statCurves);
    const withSurge = computeStats(wizard, statCurves, {
      gear: mergeGearTotals(emptyTotals(), perkTotals(['mana_surge'], [])),
    });
    expect(withSurge.magicalPowerBonusPct).toBeCloseTo(base.magicalPowerBonusPct + 10, 6);
  });
});
