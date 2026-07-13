import { describe, expect, it } from 'vitest';
import { eligibleItems, isTwoHanded, normalizeLoadout } from './gearRules';
import { autoFillFixedEnchants } from './itemStats';
import { classes, enchantSlotCount, fighter, items, itemIndex, rarityColor, rarityOrder } from './data';

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

describe('eligibleItems - all 10 classes via decoded class masks', () => {
  it('every class has a non-empty primary weapon list and armor lists', () => {
    for (const cls of Object.values(classes)) {
      expect(eligibleItems(items, cls, 'primary', []).length, `${cls.id} primary`).toBeGreaterThan(0);
      expect(eligibleItems(items, cls, 'chest', []).length, `${cls.id} chest`).toBeGreaterThan(0);
      expect(eligibleItems(items, cls, 'ring1', []).length, `${cls.id} rings`).toBeGreaterThan(0);
    }
  });

  it('Wizard cannot wear plate, Cleric can', () => {
    const wizardChest = eligibleItems(items, classes['wizard']!, 'chest', []);
    const clericChest = eligibleItems(items, classes['cleric']!, 'chest', []);
    expect(wizardChest.some((i) => i.armorType === 'plate')).toBe(false);
    expect(clericChest.some((i) => i.armorType === 'plate')).toBe(true);
  });

  it('Warlock unlocks plate only with the Demon Armor perk', () => {
    const without = eligibleItems(items, classes['warlock']!, 'chest', []);
    const withPerk = eligibleItems(items, classes['warlock']!, 'chest', ['demon_armor']);
    expect(without.some((i) => i.armorType === 'plate')).toBe(false);
    expect(withPerk.some((i) => i.armorType === 'plate')).toBe(true);
  });

  it('Ranger unlocks spears only with Spear Proficiency', () => {
    const without = eligibleItems(items, classes['ranger']!, 'primary', []);
    const withPerk = eligibleItems(items, classes['ranger']!, 'primary', ['spear_proficiency']);
    expect(without.some((i) => i.name === 'Spear')).toBe(false);
    expect(withPerk.some((i) => i.name === 'Spear')).toBe(true);
  });

  it('mask-based weapon rights match known cases', () => {
    const barb = eligibleItems(items, classes['barbarian']!, 'primary', []).map((i) => i.name);
    expect(barb).toContain('Zweihander');
    expect(barb).toContain('Bardiche');
    expect(barb).not.toContain('Longsword');
    const wiz = eligibleItems(items, classes['wizard']!, 'primary', []).map((i) => i.name);
    expect(wiz).toContain('Spellbook');
    expect(wiz).not.toContain('Zweihander');
  });
});

describe('normalizeLoadout - two-handed drops the off-hand', () => {
  const longsword = items.find((i) => i.name === 'Longsword')!; // two_handed
  const crystalBall = items.find((i) => i.name === 'Crystal Ball')!; // off-hand
  const armingSword = items.find((i) => i.name === 'Arming Sword' && i.handType === 'one_handed')!;

  it('removes secondary when the primary is two-handed', () => {
    const loadout = {
      primary: { itemId: longsword.id, enchants: [] },
      secondary: { itemId: crystalBall.id, enchants: [] },
    };
    const norm = normalizeLoadout(loadout, itemIndex);
    expect(norm.primary).toBeDefined();
    expect(norm.secondary).toBeUndefined();
  });

  it('keeps the off-hand with a one-handed primary', () => {
    const loadout = {
      primary: { itemId: armingSword.id, enchants: [] },
      secondary: { itemId: crystalBall.id, enchants: [] },
    };
    const norm = normalizeLoadout(loadout, itemIndex);
    expect(norm.secondary).toBeDefined();
  });
});

describe('artifact + legend rarities', () => {
  it('artifact is a real tier above unique with its own color', () => {
    expect(rarityOrder('artifact')).toBe(7);
    expect(rarityOrder('artifact')).toBeGreaterThan(rarityOrder('unique'));
    expect(rarityColor('artifact')).not.toBe('#ffffff');
    expect(enchantSlotCount('artifact')).toBe(6); // 6 fixed unchangeable enchantments
  });

  it('legend aliases to legendary (no more unknown -1 order)', () => {
    expect(rarityOrder('legend')).toBe(rarityOrder('legendary'));
    expect(rarityColor('legend')).toBe(rarityColor('legendary'));
  });

  it('artifacts auto-fill 6 locked enchantments from the pool', () => {
    const artifact = items.find((i) => i.rarity === 'artifact' && (i.pool?.length ?? 0) >= 6)!;
    const filled = autoFillFixedEnchants(artifact, 6);
    expect(filled.length).toBe(6);
    expect(new Set(filled.map((f) => f.attr)).size).toBe(6); // no duplicates
  });

  it('every item in the DB now resolves to a known rarity order', () => {
    const unknown = items.filter((i) => rarityOrder(i.rarity) < 0);
    expect(unknown.map((i) => `${i.name}:${i.rarity}`)).toEqual([]);
  });
});
