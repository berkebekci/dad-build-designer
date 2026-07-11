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
}

/** The player's perk/skill choices for a build. */
export interface BuildSelection {
  perkIds: string[];
  skillIds: string[];
}

/**
 * External inputs that will come from gear/enchantments in Phase 4.
 * Kept as a separate input so the engine API doesn't change later:
 * gear resolution will simply produce one of these.
 */
export interface ExternalModifiers {
  /** Flat attribute points added by gear/enchantments (e.g. +3 Strength). */
  attributeBonuses?: Partial<Attributes>;
  /** Total armor rating from equipped gear. Naked = 0. */
  armorRating?: number;
  /** Flat move speed add from gear/enchantments/skills. */
  bonusMoveSpeed?: number;
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
  cooldownReductionPct: number;
  buffDurationPct: number;
  persuasiveness: number;
}
