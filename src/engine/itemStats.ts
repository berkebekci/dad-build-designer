import type { AttributeName, Attributes } from './types';

/**
 * Item database record as written by scripts/fetch-items.mjs.
 * base/pool entries are [attribute, min, max] triples in the NORMALIZED
 * convention: wide attribute names, percentage stats in true percents.
 * `pool` is the item's own enchantment pool with ground-loot roll ranges.
 */
export interface ItemRecord {
  id: string;
  archetype: string;
  name: string;
  rarity: string;
  gearScore: number;
  itemType: string;
  slotType: string;
  armorType?: string;
  handType?: string;
  weaponType?: string;
  classMask?: number;
  base?: [string, number, number][];
  pool?: [string, number, number][];
}

export interface EnchantChoice {
  /** normalized attribute name from the item's pool (e.g. "strength") */
  attr: string;
  /** chosen roll, expected within the pool's [min, max] */
  value: number;
}

export interface EquippedItem {
  itemId: string;
  enchants: EnchantChoice[];
}

export const GEAR_SLOTS = [
  'primary',
  'secondary',
  'head',
  'chest',
  'legs',
  'hands',
  'feet',
  'back',
  'necklace',
  'ring1',
  'ring2',
] as const;

export type GearSlotId = (typeof GEAR_SLOTS)[number];

export type Loadout = Partial<Record<GearSlotId, EquippedItem>>;

/**
 * How each normalized attribute feeds the character sheet.
 * - attribute: +N to a primary attribute
 * - flat:      +N to a named flat bucket (armor rating, move speed, ...)
 * - percent:   +N% added AFTER the stat's attribute curve
 */
type AttrRule =
  | { kind: 'attribute'; attr: AttributeName }
  | { kind: 'flat'; bucket: FlatBucket }
  | { kind: 'percent'; stat: PercentStat };

export type FlatBucket =
  | 'armorRating'
  | 'moveSpeedAdd'
  | 'weaponDamage'
  | 'magicWeaponDamage'
  | 'flatPhysicalPower'
  | 'flatMagicalPower'
  | 'magicResistanceAdd'
  | 'memoryCapacityAdd'
  | 'maxHealthAdd'
  | 'physicalDamageAdd'
  | 'magicalDamageAdd'
  | 'luck';

export type PercentStat =
  | 'actionSpeedPct'
  | 'physicalPowerBonusPct'
  | 'magicalPowerBonusPct'
  | 'physicalDamageReductionPct'
  | 'magicalDamageReductionPct'
  | 'projectileReductionPct'
  | 'regularInteractionSpeedPct'
  | 'magicalInteractionSpeedPct'
  | 'spellCastingSpeedPct'
  | 'buffDurationPct'
  | 'debuffDurationPct'
  | 'cooldownReductionPct'
  | 'memoryCapacityBonusPct'
  | 'armorPenetrationPct'
  | 'magicPenetrationPct'
  | 'headshotDamagePct'
  | 'headshotReductionPct'
  | 'undeadDamagePct'
  | 'demonDamagePct'
  | 'undeadReductionPct'
  | 'demonReductionPct'
  | 'outgoingPhysicalHealingPct'
  | 'outgoingMagicalHealingPct'
  | 'moveSpeedBonusPct'
  | 'maxHealthBonusPct'
  | 'itemEquipSpeedPct';

export const ATTR_RULES: Record<string, AttrRule> = {
  strength: { kind: 'attribute', attr: 'strength' },
  vigor: { kind: 'attribute', attr: 'vigor' },
  agility: { kind: 'attribute', attr: 'agility' },
  dexterity: { kind: 'attribute', attr: 'dexterity' },
  will: { kind: 'attribute', attr: 'will' },
  knowledge: { kind: 'attribute', attr: 'knowledge' },
  resourcefulness: { kind: 'attribute', attr: 'resourcefulness' },
  all_attributes: { kind: 'attribute', attr: 'strength' }, // special-cased in apply()

  armor_rating: { kind: 'flat', bucket: 'armorRating' },
  additional_armor_rating: { kind: 'flat', bucket: 'armorRating' },
  move_speed: { kind: 'flat', bucket: 'moveSpeedAdd' },
  additional_move_speed: { kind: 'flat', bucket: 'moveSpeedAdd' },
  weapon_damage: { kind: 'flat', bucket: 'weaponDamage' },
  additional_weapon_damage: { kind: 'flat', bucket: 'weaponDamage' },
  magic_weapon_damage: { kind: 'flat', bucket: 'magicWeaponDamage' },
  physical_power: { kind: 'flat', bucket: 'flatPhysicalPower' },
  magical_power: { kind: 'flat', bucket: 'flatMagicalPower' },
  magic_resistance: { kind: 'flat', bucket: 'magicResistanceAdd' },
  additional_memory_capacity: { kind: 'flat', bucket: 'memoryCapacityAdd' },
  max_health: { kind: 'flat', bucket: 'maxHealthAdd' },
  additional_physical_damage: { kind: 'flat', bucket: 'physicalDamageAdd' },
  true_physical_damage: { kind: 'flat', bucket: 'physicalDamageAdd' },
  additional_magical_damage: { kind: 'flat', bucket: 'magicalDamageAdd' },
  true_magical_damage: { kind: 'flat', bucket: 'magicalDamageAdd' },
  magical_damage: { kind: 'flat', bucket: 'magicalDamageAdd' },
  luck: { kind: 'flat', bucket: 'luck' },

  action_speed: { kind: 'percent', stat: 'actionSpeedPct' },
  physical_damage_bonus: { kind: 'percent', stat: 'physicalPowerBonusPct' },
  magical_damage_bonus: { kind: 'percent', stat: 'magicalPowerBonusPct' },
  physical_damage_reduction: { kind: 'percent', stat: 'physicalDamageReductionPct' },
  magical_damage_reduction: { kind: 'percent', stat: 'magicalDamageReductionPct' },
  projectile_damage_reduction: { kind: 'percent', stat: 'projectileReductionPct' },
  regular_interaction_speed: { kind: 'percent', stat: 'regularInteractionSpeedPct' },
  magical_interaction_speed: { kind: 'percent', stat: 'magicalInteractionSpeedPct' },
  spell_casting_speed: { kind: 'percent', stat: 'spellCastingSpeedPct' },
  buff_duration_bonus: { kind: 'percent', stat: 'buffDurationPct' },
  debuff_duration_bonus: { kind: 'percent', stat: 'debuffDurationPct' },
  cooldown_reduction_bonus: { kind: 'percent', stat: 'cooldownReductionPct' },
  memory_capacity_bonus: { kind: 'percent', stat: 'memoryCapacityBonusPct' },
  armor_penetration: { kind: 'percent', stat: 'armorPenetrationPct' },
  magic_penetration: { kind: 'percent', stat: 'magicPenetrationPct' },
  headshot_damage_bonus: { kind: 'percent', stat: 'headshotDamagePct' },
  headshot_damage_reduction: { kind: 'percent', stat: 'headshotReductionPct' },
  undead_damage_bonus: { kind: 'percent', stat: 'undeadDamagePct' },
  demon_damage_bonus: { kind: 'percent', stat: 'demonDamagePct' },
  undead_damage_reduction: { kind: 'percent', stat: 'undeadReductionPct' },
  demon_damage_reduction: { kind: 'percent', stat: 'demonReductionPct' },
  physical_healing: { kind: 'percent', stat: 'outgoingPhysicalHealingPct' },
  magical_healing: { kind: 'percent', stat: 'outgoingMagicalHealingPct' },
  move_speed_bonus: { kind: 'percent', stat: 'moveSpeedBonusPct' },
  max_health_bonus: { kind: 'percent', stat: 'maxHealthBonusPct' },
  equip_speed: { kind: 'percent', stat: 'itemEquipSpeedPct' },
};

/** Human-readable label for enchantment pickers and stat rows. */
export function attrLabel(attr: string): string {
  return attr
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Everything gear contributes, in engine units. */
export interface GearTotals {
  attributeBonuses: Partial<Attributes>;
  flats: Record<FlatBucket, number>;
  percents: Partial<Record<PercentStat, number>>;
  unknownAttrs: string[];
}

const ATTRIBUTE_NAMES_LOCAL: AttributeName[] = [
  'strength',
  'vigor',
  'agility',
  'dexterity',
  'will',
  'knowledge',
  'resourcefulness',
];

function emptyTotals(): GearTotals {
  return {
    attributeBonuses: {},
    flats: {
      armorRating: 0,
      moveSpeedAdd: 0,
      weaponDamage: 0,
      magicWeaponDamage: 0,
      flatPhysicalPower: 0,
      flatMagicalPower: 0,
      magicResistanceAdd: 0,
      memoryCapacityAdd: 0,
      maxHealthAdd: 0,
      physicalDamageAdd: 0,
      magicalDamageAdd: 0,
      luck: 0,
    },
    percents: {},
    unknownAttrs: [],
  };
}

function apply(totals: GearTotals, attr: string, value: number): void {
  if (attr === 'all_attributes') {
    for (const name of ATTRIBUTE_NAMES_LOCAL) {
      totals.attributeBonuses[name] = (totals.attributeBonuses[name] ?? 0) + value;
    }
    return;
  }
  const rule = ATTR_RULES[attr];
  if (!rule) {
    if (!totals.unknownAttrs.includes(attr)) totals.unknownAttrs.push(attr);
    return;
  }
  switch (rule.kind) {
    case 'attribute':
      totals.attributeBonuses[rule.attr] = (totals.attributeBonuses[rule.attr] ?? 0) + value;
      break;
    case 'flat':
      totals.flats[rule.bucket] += value;
      break;
    case 'percent':
      totals.percents[rule.stat] = (totals.percents[rule.stat] ?? 0) + value;
      break;
  }
}

/**
 * Aggregates a full loadout into engine inputs.
 * Design choice (Path of Building tradition): base item stats assume a
 * PERFECT roll — we take `max` of each base range. Enchant rolls are the
 * user's explicit choices.
 */
export function gearTotals(loadout: Loadout, itemIndex: Map<string, ItemRecord>): GearTotals {
  const totals = emptyTotals();
  for (const equipped of Object.values(loadout)) {
    if (!equipped) continue;
    const item = itemIndex.get(equipped.itemId);
    if (!item) continue;
    for (const [attr, , max] of item.base ?? []) {
      apply(totals, attr, max);
    }
    for (const enchant of equipped.enchants) {
      apply(totals, enchant.attr, enchant.value);
    }
  }
  return totals;
}
