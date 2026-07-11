import { describe, expect, it } from 'vitest';
import { eligibleItems, isTwoHanded } from './gearRules';
import { fighter, items, itemIndex } from './data';

describe('eligibleItems - Fighter with real item DB', () => {
  it('primary weapons match the wiki-verified Fighter list', () => {
    const list = eligibleItems(items, fighter, 'primary', []);
    const names = new Set(list.map((i) => i.name));
    expect(names.has('Longsword')).toBe(true);
    expect(names.has('Zweihander')).toBe(true);
    expect(names.has('Spellbook')).toBe(false); // caster weapon, not Fighter's
  });

  it('Weapon Mastery unlocks every primary weapon', () => {
    const without = eligibleItems(items, fighter, 'primary', []);
    const withWM = eligibleItems(items, fighter, 'primary', ['weapon_mastery']);
    expect(withWM.length).toBeGreaterThan(without.length);
    expect(withWM.some((i) => i.name === 'Spellbook')).toBe(true);
  });

  it('Slayer removes plate armor from armor slots', () => {
    const normal = eligibleItems(items, fighter, 'chest', []);
    const slayer = eligibleItems(items, fighter, 'chest', ['slayer']);
    expect(normal.some((i) => i.armorType === 'plate')).toBe(true);
    expect(slayer.some((i) => i.armorType === 'plate')).toBe(false);
    expect(slayer.length).toBeGreaterThan(0); // leather/cloth still there
  });

  it('rings only offer accessories', () => {
    const rings = eligibleItems(items, fighter, 'ring1', []);
    expect(rings.length).toBeGreaterThan(0);
    expect(rings.every((i) => i.itemType === 'accessory' && i.slotType === 'ring')).toBe(true);
  });

  it('feet slot maps to the API "foot" slot type', () => {
    const feet = eligibleItems(items, fighter, 'feet', []);
    expect(feet.length).toBeGreaterThan(0);
    expect(feet.every((i) => i.slotType === 'foot')).toBe(true);
  });

  it('two-handed detection works on a real item', () => {
    const zwei = items.find((i) => i.name === 'Zweihander');
    expect(zwei).toBeDefined();
    expect(isTwoHanded(zwei)).toBe(true);
    expect(isTwoHanded(itemIndex.get('nonexistent'))).toBe(false);
  });
});
