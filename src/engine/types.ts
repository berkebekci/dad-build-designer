export const ATTRIBUTE_NAMES = [
  'strength',
  'vigor',
  'agility',
  'dexterity',
  'will',
  'knowledge',
  'resourcefulness',
] as const;

export type AttributeName = (typeof ATTRIBUTE_NAMES)[number];

export type Attributes = Record<AttributeName, number>;

export interface PerkData {
  id: string;
  name: string;
  effect: string;
}

export interface SkillData {
  id: string;
  name: string;
  effect: string;
}

export interface ClassData {
  id: string;
  name: string;
  base_attributes: Attributes;
  perk_slots: number;
  skill_slots: number;
  perks: PerkData[];
  skills: SkillData[];
  /** Wiki-verified weapon rights by hand; used by gearRules. */
  weapons?: {
    two_handed: string[];
    one_handed_main: string[];
    off_hand: string[];
  };
  /** Decoded required_class bit for this class (see scripts/build-classes.mjs). */
  class_mask?: number;
  /** Armor materials the class can natively wear; undefined = all. */
  armor_types?: string[];
  /** Perk-driven gear rule overrides, keyed by perk id. */
  perk_gear_hooks?: Record<
    string,
    {
      unlock_all_weapons?: boolean;
      unlock_weapons?: string[];
      unlock_armor_types?: string[];
      forbid_armor_types?: string[];
    }
  >;
}

/** The player's perk/skill choices for a build. */
export interface BuildSelection {
  perkIds: string[];
  skillIds: string[];
}

import type { GearTotals, PercentStat } from './itemStats';

/**
 * External inputs to the stat engine. The manual fields (attribute bonuses,
 * armor rating, move speed) predate the gear system and remain for tests and
 * quick experiments; `gear` carries the aggregated loadout from itemStats.
 */
export interface ExternalModifiers {
  /** Flat attribute points added manually (e.g. +3 Strength). */
  attributeBonuses?: Partial<Attributes>;
  /** Manually specified armor rating (adds to gear's). Naked = 0. */
  armorRating?: number;
  /** Flat move speed add (adds to gear's). */
  bonusMoveSpeed?: number;
  /** Aggregated equipment + enchantments (see gearTotals). */
  gear?: GearTotals;
}

/** Everything the character sheet shows, derived from attributes via curves. */
export interface DerivedStats {
  attributes: Attributes;
  physicalPower: number;
  physicalPowerBonusPct: number;
  magicalPower: number;
  magicalPowerBonusPct: number;
  maxHealth: number;
  /** Absolute move speed (base 300 + adds), hard-capped by the game. */
  moveSpeed: number;
  actionSpeedPct: number;
  regularInteractionSpeedPct: number;
  magicalInteractionSpeedPct: number;
  spellCastingSpeedPct: number;
  itemEquipSpeedPct: number;
  manualDexterityPct: number;
  memoryCapacity: number;
  memoryRecoveryPct: number;
  healthRecoveryPct: number;
  magicResistance: number;
  physicalDamageReductionPct: number;
  /** Gear additions only until the MR->MDR curve lands (see stat_curves _todo). */
  magicalDamageReductionPct: number;
  cooldownReductionPct: number;
  buffDurationPct: number;
  persuasiveness: number;

  /** Total armor rating that fed the PDR curve. */
  armorRating: number;
  /** Base weapon damage (perfect roll) — scaled by combo/zone in the damage sim. */
  weaponDamage: number;
  /** Enchant "Weapon Damage" — added after combo/zone scaling. */
  gearWeaponDamage: number;
  magicWeaponDamage: number;
  /** Added after the power bonus, still reduced by armor. */
  additionalPhysicalDamage: number;
  additionalMagicalDamage: number;
  /** Bypasses all reductions. */
  truePhysicalDamage: number;
  trueMagicalDamage: number;
  /** Staff/spellbook "Magical Damage" — flat bonus applied to SPELL casts. */
  spellFlatDamage: number;
  luck: number;
  /** Situational gear-only percentages, shown when nonzero. */
  percentExtras: Partial<Record<PercentStat, number>>;
}
