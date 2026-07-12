import { describe, expect, it } from 'vitest';
import { enchantablePool, type ItemRecord } from './itemStats';
import { spellSlots } from './spells';
import { rarityTiers } from './data';

describe('unique rarity enchantment count (IronMace change)', () => {
  it('unique items have exactly 1 enchantment slot', () => {
    const unique = rarityTiers.find((t) => t.id === 'unique')!;
    expect(unique.enchantments).toBe(1);
  });
});

describe('enchantablePool - base stats cannot repeat as enchants', () => {
  const helm: ItemRecord = {
    id: 'chapel_x',
    archetype: 'ChapelDeFer',
    name: 'Chapel de Fer',
    rarity: 'rare',
    gearScore: 20,
    itemType: 'armor',
    slotType: 'head',
    base: [
      ['armor_rating', 25, 25],
      ['agility', 1, 1],
    ],
    pool: [
      ['agility', 1, 3],
      ['strength', 1, 3],
      ['additional_armor_rating', 7, 15],
    ],
  };

  it('excludes base attributes from the pool', () => {
    const pool = enchantablePool(helm).map(([a]) => a);
    expect(pool).not.toContain('agility'); // base stat
    expect(pool).toContain('strength');
    // armor_rating (base) and additional_armor_rating (enchant) are different attrs
    expect(pool).toContain('additional_armor_rating');
  });
});

describe('spellSlots - memory skills grant 5 slots each', () => {
  it('no memory skill -> 0 slots', () => {
    expect(spellSlots([])).toBe(0);
    expect(spellSlots(['sprint', 'second_wind'])).toBe(0);
  });
  it('each memory skill grants 5', () => {
    expect(spellSlots(['spell_memory1'])).toBe(5);
    expect(spellSlots(['spell_memory1', 'spell_memory2'])).toBe(10);
    expect(spellSlots(['sorcery1', 'sorcery2'])).toBe(10);
    expect(spellSlots(['music_memory1', 'party_maker'])).toBe(5);
  });
  it('shapeshift memory does NOT grant spell slots', () => {
    expect(spellSlots(['shape_shift_memory1'])).toBe(0);
  });
});
