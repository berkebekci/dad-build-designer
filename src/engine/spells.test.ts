import { describe, expect, it } from 'vitest';
import { classSpells, selectionCost, simulateSpell } from './spells';
import { computeStats } from './computeStats';
import { classes, spellBook, statCurves } from './data';

describe('spell book data', () => {
  it('six caster classes have spells; martial classes have none', () => {
    for (const id of ['wizard', 'cleric', 'warlock', 'sorcerer', 'druid', 'bard']) {
      expect(classSpells(spellBook, id).length, id).toBeGreaterThan(0);
    }
    expect(classSpells(spellBook, 'fighter')).toEqual([]);
    expect(classSpells(spellBook, 'barbarian')).toEqual([]);
  });

  it('selection cost sums tiers and ignores free entries', () => {
    const wizard = classSpells(spellBook, 'wizard');
    const pick = (ids: string[]) => wizard.filter((s) => ids.includes(s.id));
    expect(selectionCost(pick(['zap', 'fireball']))).toBe(5); // 1 + 4
    const bard = classSpells(spellBook, 'bard');
    expect(selectionCost(bard.slice(0, 3))).toBe(0); // songs are cost-free
  });
});

describe('simulateSpell - Wizard Fireball', () => {
  const wizard = classes['wizard']!;
  const fireball = classSpells(spellBook, 'wizard').find((s) => s.id === 'fireball')!;
  const noDummy = { pdrPct: 0, mdrPct: 0, headshotReductionPct: 0 };

  // Fireball base 30 since Patch 6.12 (was 35).
  it('naked wizard: base scaled by MP bonus only', () => {
    const stats = computeStats(wizard, statCurves); // will 20 -> MP bonus +5%
    const [direct] = simulateSpell(stats, fireball, noDummy);
    // 30 * (1 + 0.05 * 1.0) = 31.5 -> 32
    expect(direct!.body).toBe(32);
    expect(direct!.head).toBe(47); // 30 * 1.5 * 1.05 = 47.25 -> 47
  });

  it('staff Magical Damage adds flat before scaling', () => {
    const stats = computeStats(wizard, statCurves);
    stats.spellFlatDamage = 9; // Magic Staff
    const [direct] = simulateSpell(stats, fireball, noDummy);
    // (30 + 9) * 1.05 = 40.95 -> 41
    expect(direct!.body).toBe(41);
  });

  it('dummy MDR reduces, magic pen restores part of it', () => {
    const stats = computeStats(wizard, statCurves);
    const dummy = { pdrPct: 0, mdrPct: 40, headshotReductionPct: 0 };
    const [without] = simulateSpell(stats, fireball, dummy);
    expect(without!.body).toBe(19); // 31.5 * 0.6 = 18.9

    stats.percentExtras.magicPenetrationPct = 50;
    const [withPen] = simulateSpell(stats, fireball, dummy);
    expect(withPen!.body).toBe(25); // 31.5 * (1 - 0.4*0.5) = 25.2
  });

  it('heals ignore the dummy and staff flat damage', () => {
    const cleric = classes['cleric']!;
    const lesserHeal = classSpells(spellBook, 'cleric').find((s) => s.id === 'lesser_heal')!;
    const stats = computeStats(cleric, statCurves); // will 23 -> MP bonus +8%
    stats.spellFlatDamage = 9;
    const dummy = { pdrPct: 50, mdrPct: 50, headshotReductionPct: 50 };
    const [heal] = simulateSpell(stats, lesserHeal, dummy);
    expect(heal!.heal).toBe(true);
    // 20 * (1 + 0.08 * 0.8) = 21.28 -> 21 (no staff bonus, no reductions)
    expect(heal!.body).toBe(21);
  });
});
