import type { ClassData } from './types';
import type { GearSlotId, ItemRecord } from './itemStats';

/** Our UI slot -> the API's slot_type value. Weapon set 2 mirrors set 1's slot types. */
export const SLOT_TO_API: Record<GearSlotId, string> = {
  primary: 'primary',
  secondary: 'secondary',
  primary2: 'primary',
  secondary2: 'secondary',
  head: 'head',
  chest: 'chest',
  legs: 'legs',
  hands: 'hands',
  feet: 'foot',
  back: 'back',
  necklace: 'necklace',
  ring1: 'ring',
  ring2: 'ring',
};

const ARMOR_SLOTS: GearSlotId[] = ['head', 'chest', 'legs', 'hands', 'feet', 'back'];
const MAIN_HAND_SLOTS: GearSlotId[] = ['primary', 'primary2'];
const OFF_HAND_SLOTS: GearSlotId[] = ['secondary', 'secondary2'];
const WEAPON_SLOTS: GearSlotId[] = [...MAIN_HAND_SLOTS, ...OFF_HAND_SLOTS];
/** [main-hand, off-hand] pairs — the off-hand is dropped when the main-hand is two-handed. */
const WEAPON_SET_PAIRS: readonly [
  'primary' | 'primary2',
  'secondary' | 'secondary2',
][] = [
  ['primary', 'secondary'],
  ['primary2', 'secondary2'],
];

interface ActiveHooks {
  unlockAllWeapons: boolean;
  unlockWeapons: Set<string>;
  unlockArmorTypes: Set<string>;
  forbidArmorTypes: Set<string>;
}

function resolveHooks(classData: ClassData, selectedPerkIds: string[]): ActiveHooks {
  const hooks: ActiveHooks = {
    unlockAllWeapons: false,
    unlockWeapons: new Set(),
    unlockArmorTypes: new Set(),
    forbidArmorTypes: new Set(),
  };
  for (const perkId of selectedPerkIds) {
    const hook = classData.perk_gear_hooks?.[perkId];
    if (!hook) continue;
    if (hook.unlock_all_weapons) hooks.unlockAllWeapons = true;
    for (const w of hook.unlock_weapons ?? []) hooks.unlockWeapons.add(w);
    for (const t of hook.unlock_armor_types ?? []) hooks.unlockArmorTypes.add(t);
    for (const t of hook.forbid_armor_types ?? []) hooks.forbidArmorTypes.add(t);
  }
  return hooks;
}

/**
 * Whether the class can natively equip an item, using the item's decoded
 * required_class bitmask when present (exact, per-item), otherwise the
 * class's wiki weapon name lists / armor material types as fallback.
 */
function nativelyEquippable(
  item: ItemRecord,
  classData: ClassData,
  slot: GearSlotId,
): boolean {
  if (typeof item.classMask === 'number' && item.classMask > 0 && classData.class_mask) {
    return (item.classMask & classData.class_mask) !== 0;
  }
  // Fallbacks when the item carries no mask:
  if (WEAPON_SLOTS.includes(slot)) {
    const names = MAIN_HAND_SLOTS.includes(slot)
      ? new Set([
          ...(classData.weapons?.two_handed ?? []),
          ...(classData.weapons?.one_handed_main ?? []),
        ])
      : new Set(classData.weapons?.off_hand ?? []);
    return names.has(item.name);
  }
  if (ARMOR_SLOTS.includes(slot)) {
    if (!classData.armor_types || !item.armorType) return true;
    return classData.armor_types.includes(item.armorType);
  }
  return true; // accessories are class-free
}

/**
 * Which items may sit in a slot for this class and perk selection.
 * Perk hooks override the native rules: Weapon Mastery unlocks every weapon,
 * Demon Armor unlocks plate, Slayer forbids plate, Spear Proficiency adds
 * specific weapons.
 */
export function eligibleItems(
  allItems: ItemRecord[],
  classData: ClassData,
  slot: GearSlotId,
  selectedPerkIds: string[],
): ItemRecord[] {
  const apiSlot = SLOT_TO_API[slot];
  const hooks = resolveHooks(classData, selectedPerkIds);

  return allItems.filter((item) => {
    if (item.slotType !== apiSlot) return false;

    if (WEAPON_SLOTS.includes(slot)) {
      if (item.itemType !== 'weapon') return false;
      if (hooks.unlockAllWeapons) return true;
      if (hooks.unlockWeapons.has(item.name)) return true;
      return nativelyEquippable(item, classData, slot);
    }

    if (ARMOR_SLOTS.includes(slot)) {
      if (item.itemType !== 'armor') return false;
      if (item.armorType && hooks.forbidArmorTypes.has(item.armorType)) return false;
      if (item.armorType && hooks.unlockArmorTypes.has(item.armorType)) return true;
      // Material allowlist applies on top of the mask (Demon Armor aside,
      // a caster's mask may allow an item its material list would — both
      // must agree for native wear).
      if (
        classData.armor_types &&
        item.armorType &&
        !classData.armor_types.includes(item.armorType)
      ) {
        return false;
      }
      return nativelyEquippable(item, classData, slot);
    }

    // necklace / rings
    return item.itemType === 'accessory' && nativelyEquippable(item, classData, slot);
  });
}

/** A two-handed primary occupies both hands: the off-hand must stay empty. */
export function isTwoHanded(item: ItemRecord | undefined): boolean {
  return item?.handType === 'two_handed';
}

/**
 * Drops the off-hand whenever its weapon set's main-hand is two-handed,
 * independently for each of the two weapon sets. Applied at the engine
 * boundary and in the share/persistence sanitizer so an illegal loadout (e.g.
 * an old save with Longsword + Crystal Ball) can never contribute the off-hand
 * to the stats — the UI hiding the slot alone is not enough. Works structurally
 * on both the engine Loadout and the UI loadout (both key slots by { itemId }).
 */
export function normalizeLoadout<
  T extends Partial<Record<'primary' | 'secondary' | 'primary2' | 'secondary2', { itemId: string }>>,
>(loadout: T, itemIndex: Map<string, ItemRecord>): T {
  let next = loadout;
  for (const [mainSlot, offSlot] of WEAPON_SET_PAIRS) {
    const main = next[mainSlot] ? itemIndex.get(next[mainSlot]!.itemId) : undefined;
    if (isTwoHanded(main) && next[offSlot]) {
      next = { ...next };
      delete next[offSlot];
    }
  }
  return next;
}
