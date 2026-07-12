import { describe, expect, it } from 'vitest';
import { reductionMultiplier, simulateHits, type DummyTarget } from './damage';
import { computeStats } from './computeStats';
import { fighter, statCurves, combatRules, weaponHits } from './data';
import { gearTotals, type ItemRecord } from './itemStats';

const noDummy: DummyTarget = { pdrPct: 0, mdrPct: 0, headshotReductionPct: 0 };

const sword: ItemRecord = {
  id: 'sword_x',
  archetype: 'X',
  name: 'Falchion',
  rarity: 'rare',
  gearScore: 30,
  itemType: 'weapon',
  slotType: 'primary',
  base: [['weapon_damage', 40, 40]],
  pool: [],
};
const index = new Map([[sword.id, sword]]);

function statsWithSword(extra?: (t: ReturnType<typeof gearTotals>) => void) {
  const totals = gearTotals({ primary: { itemId: sword.id, enchants: [] } }, index);
  extra?.(totals);
  return computeStats(fighter, statCurves, { gear: totals });
}

describe('reductionMultiplier (penetration vs DR)', () => {
  it('no pen: plain 1-DR', () => {
    expect(reductionMultiplier(30, 0)).toBeCloseTo(0.7, 10);
  });
  it('50% pen halves the DR', () => {
    expect(reductionMultiplier(30, 50)).toBeCloseTo(0.85, 10);
  });
  it('100% pen nullifies DR', () => {
    expect(reductionMultiplier(65, 100)).toBeCloseTo(1, 10);
  });
  it('negative pen cannot help the target', () => {
    expect(reductionMultiplier(30, -20)).toBeCloseTo(0.7, 10);
  });
});

describe('simulateHits - Falchion 40 WD on naked Fighter (0% PP bonus)', () => {
  it('body hits follow the combo sequence 100/105/110', () => {
    const { hits, usedFallback } = simulateHits(
      statsWithSword(),
      'Falchion',
      weaponHits,
      combatRules,
      noDummy,
    );
    expect(usedFallback).toBe(false);
    expect(hits.map((h) => h.label)).toEqual(['Attack 1', 'Attack 2', 'Attack 3', 'Riposte']);
    expect(hits[0]!.zones.body).toBe(40); // 40 * 1.0
    expect(hits[1]!.zones.body).toBe(42); // 40 * 1.05
    expect(hits[2]!.zones.body).toBe(44); // 40 * 1.10
    expect(hits[3]!.zones.body).toBe(60); // riposte 150%
  });

  it('zone multipliers apply (head 1.5, legs 0.6)', () => {
    const { hits } = simulateHits(statsWithSword(), 'Falchion', weaponHits, combatRules, noDummy);
    expect(hits[0]!.zones.head).toBe(60); // 40 * 1.5
    expect(hits[0]!.zones.legs).toBe(24); // 40 * 0.6
  });

  it('dummy PDR reduces, armor pen restores part of it', () => {
    const stats = statsWithSword();
    const dummy: DummyTarget = { pdrPct: 30, mdrPct: 0, headshotReductionPct: 0 };
    const noPen = simulateHits(stats, 'Falchion', weaponHits, combatRules, dummy);
    expect(noPen.hits[0]!.zones.body).toBe(28); // 40 * 0.7

    stats.percentExtras.armorPenetrationPct = 50;
    const withPen = simulateHits(stats, 'Falchion', weaponHits, combatRules, dummy);
    expect(withPen.hits[0]!.zones.body).toBe(34); // 40 * (1 - 0.3*0.5)
  });

  it('headshot reduction only affects the head', () => {
    const dummy: DummyTarget = { pdrPct: 0, mdrPct: 0, headshotReductionPct: 50 };
    const { hits } = simulateHits(statsWithSword(), 'Falchion', weaponHits, combatRules, dummy);
    expect(hits[0]!.zones.head).toBe(30); // 60 * 0.5
    expect(hits[0]!.zones.body).toBe(40); // untouched
  });

  it('true damage bypasses PDR entirely', () => {
    const stats = statsWithSword((t) => {
      t.flats.truePhysicalDamage = 5;
    });
    const dummy: DummyTarget = { pdrPct: 50, mdrPct: 0, headshotReductionPct: 0 };
    const { hits } = simulateHits(stats, 'Falchion', weaponHits, combatRules, dummy);
    expect(hits[0]!.zones.body).toBe(25); // 40*0.5 + 5
  });

  it('physical power bonus scales the weapon part', () => {
    const stats = statsWithSword((t) => {
      t.attributeBonuses.strength = 10; // PP 25 -> +10% bonus
    });
    const { hits } = simulateHits(stats, 'Falchion', weaponHits, combatRules, noDummy);
    expect(hits[0]!.zones.body).toBe(44); // 40 * 1.10
  });

  it('unknown weapon falls back to a single 100% attack', () => {
    const { hits, usedFallback } = simulateHits(
      statsWithSword(),
      'Mystery Blade',
      weaponHits,
      combatRules,
      noDummy,
    );
    expect(usedFallback).toBe(true);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.zones.body).toBe(40);
  });
});
