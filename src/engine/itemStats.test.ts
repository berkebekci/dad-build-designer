import { describe, expect, it } from 'vitest';
import { gearTotals, type ItemRecord, type Loadout } from './itemStats';
import { computeStats } from './computeStats';
import { fighter, statCurves } from './data';

const fakeSword: ItemRecord = {
  id: 'test_sword_4001',
  archetype: 'TestSword',
  name: 'Test Sword',
  rarity: 'rare',
  gearScore: 30,
  itemType: 'weapon',
  slotType: 'primary',
  handType: 'two_handed',
  base: [
    ['weapon_damage', 39, 39],
    ['move_speed', -30, -30],
  ],
  pool: [
    ['strength', 1, 3],
    ['action_speed', 1, 2],
  ],
};

const fakeBoots: ItemRecord = {
  id: 'test_boots_3001',
  archetype: 'TestBoots',
  name: 'Test Boots',
  rarity: 'uncommon',
  gearScore: 10,
  itemType: 'armor',
  slotType: 'foot',
  base: [
    ['armor_rating', 20, 23],
    ['dexterity', 1, 1],
    ['move_speed', 6, 6],
  ],
  pool: [['physical_damage_reduction', 0.7, 1.5]],
};

const index = new Map<string, ItemRecord>([
  [fakeSword.id, fakeSword],
  [fakeBoots.id, fakeBoots],
]);

describe('gearTotals', () => {
  it('sums base stats at PERFECT roll (max of range)', () => {
    const loadout: Loadout = { feet: { itemId: fakeBoots.id, enchants: [] } };
    const totals = gearTotals(loadout, index);
    expect(totals.flats.armorRating).toBe(23); // max, not min 20
    expect(totals.flats.moveSpeedAdd).toBe(6);
    expect(totals.attributeBonuses.dexterity).toBe(1);
  });

  it('adds enchant choices at their chosen values', () => {
    const loadout: Loadout = {
      primary: {
        itemId: fakeSword.id,
        enchants: [
          { attr: 'strength', value: 3 },
          { attr: 'action_speed', value: 2 }, // true percents: +2%
        ],
      },
    };
    const totals = gearTotals(loadout, index);
    expect(totals.flats.weaponDamage).toBe(39);
    expect(totals.flats.moveSpeedAdd).toBe(-30);
    expect(totals.attributeBonuses.strength).toBe(3);
    expect(totals.percents.actionSpeedPct).toBe(2);
  });

  it('expands all_attributes to every attribute', () => {
    const item: ItemRecord = {
      ...fakeBoots,
      id: 'x',
      base: [['all_attributes', 1, 1]],
      pool: [],
    };
    const totals = gearTotals({ feet: { itemId: 'x', enchants: [] } }, new Map([['x', item]]));
    expect(totals.attributeBonuses).toEqual({
      strength: 1,
      vigor: 1,
      agility: 1,
      dexterity: 1,
      will: 1,
      knowledge: 1,
      resourcefulness: 1,
    });
  });

  it('records unknown attributes instead of crashing', () => {
    const item: ItemRecord = {
      ...fakeBoots,
      id: 'y',
      base: [['totally_new_stat', 5, 5]],
      pool: [],
    };
    const totals = gearTotals({ feet: { itemId: 'y', enchants: [] } }, new Map([['y', item]]));
    expect(totals.unknownAttrs).toEqual(['totally_new_stat']);
  });
});

describe('computeStats with gear', () => {
  it('boots: armor feeds PDR curve, move speed and dexterity apply', () => {
    const totals = gearTotals({ feet: { itemId: fakeBoots.id, enchants: [] } }, index);
    const stats = computeStats(fighter, statCurves, { gear: totals });
    expect(stats.armorRating).toBe(23);
    // AR 23 sits between anchors (20, 4.2) and (75, 12.45): 4.2 + 3*0.15 = 4.65
    expect(stats.physicalDamageReductionPct).toBeCloseTo(4.65, 10);
    expect(stats.moveSpeed).toBe(306);
    expect(stats.attributes.dexterity).toBe(16);
  });

  it('PDR enchant adds AFTER the armor curve', () => {
    const loadout: Loadout = {
      feet: {
        itemId: fakeBoots.id,
        enchants: [{ attr: 'physical_damage_reduction', value: 1.5 }],
      },
    };
    const stats = computeStats(fighter, statCurves, { gear: gearTotals(loadout, index) });
    expect(stats.physicalDamageReductionPct).toBeCloseTo(4.65 + 1.5, 10);
  });

  it('flat physical power shifts the bonus curve input', () => {
    const totals = gearTotals({ primary: { itemId: fakeSword.id, enchants: [] } }, index);
    totals.flats.flatPhysicalPower = 2;
    const stats = computeStats(fighter, statCurves, { gear: totals });
    expect(stats.physicalPower).toBe(17);
    expect(stats.physicalPowerBonusPct).toBeCloseTo(2, 10); // curve at 17: +1%/pt above 15
  });

  it('memory capacity formula: ceil(curve * (1 + bonus%)) + add', () => {
    const totals = gearTotals({}, index);
    totals.percents.memoryCapacityBonusPct = 12.5;
    totals.flats.memoryCapacityAdd = 2;
    const stats = computeStats(fighter, statCurves, { gear: totals });
    // knowledge 15 -> curve 9; ceil(9 * 1.125) = ceil(10.125) = 11; + 2 = 13
    expect(stats.memoryCapacity).toBe(13);
  });

  it('weapon move-speed penalty lowers move speed', () => {
    const totals = gearTotals({ primary: { itemId: fakeSword.id, enchants: [] } }, index);
    const stats = computeStats(fighter, statCurves, { gear: totals });
    expect(stats.moveSpeed).toBe(270);
    expect(stats.weaponDamage).toBe(39);
  });

  it('max health bonus multiplies after flat adds', () => {
    const totals = gearTotals({}, index);
    totals.flats.maxHealthAdd = 10;
    totals.percents.maxHealthBonusPct = 10;
    const stats = computeStats(fighter, statCurves, { gear: totals });
    expect(stats.maxHealth).toBeCloseTo((125 + 10) * 1.1, 10);
  });
});
