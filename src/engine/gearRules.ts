import type { ClassData } from './types';
import type { GearSlotId, ItemRecord } from './itemStats';

/** Our UI slot -> the API's slot_type value. */
export const SLOT_TO_API: Record<GearSlotId, string> = {
  primary: 'primary',
  secondary: 'secondary',
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

/**
 * Which items may sit in a slot for this class and perk selection.
 * Class weapon rights come from the class data (wiki-verified name lists);
 * perks modify them: Weapon Mastery unlocks every weapon, Slayer forbids
 * plate armor.
 */
export function eligibleItems(
  allItems: ItemRecord[],
  classData: ClassData,
  slot: GearSlotId,
  selectedPerkIds: string[],
): ItemRecord[] {
  const apiSlot = SLOT_TO_API[slot];
  const weaponMastery = selectedPerkIds.includes('weapon_mastery');
  const slayer = selectedPerkIds.includes('slayer');

  const weaponNames =
    slot === 'primary'
      ? new Set([...(classData.weapons?.two_handed ?? []), ...(classData.weapons?.one_handed_main ?? [])])
      : new Set(classData.weapons?.off_hand ?? []);

  return allItems.filter((item) => {
    if (item.slotType !== apiSlot) return false;

    if (slot === 'primary' || slot === 'secondary') {
      if (item.itemType !== 'weapon') return false;
      if (weaponMastery) return true;
      return weaponNames.has(item.name);
    }

    if (ARMOR_SLOTS.includes(slot)) {
      if (item.itemType !== 'armor') return false;
      if (slayer && item.armorType === 'plate') return false;
      return true;
    }

    // necklace / rings
    return item.itemType === 'accessory';
  });
}

/** A two-handed primary occupies both hands: the off-hand must stay empty. */
export function isTwoHanded(item: ItemRecord | undefined): boolean {
  return item?.handType === 'two_handed';
}
