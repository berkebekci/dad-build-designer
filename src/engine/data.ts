/**
 * Binds the versioned game data (JSON) to the engine's types.
 * The engine itself never imports JSON directly — it takes data as
 * parameters — so tests and future patches can swap data freely.
 */
import statCurvesJson from '../../data/stat_curves.json';
import fighterJson from '../../data/classes/fighter.json';
import barbarianJson from '../../data/classes/barbarian.json';
import bardJson from '../../data/classes/bard.json';
import clericJson from '../../data/classes/cleric.json';
import druidJson from '../../data/classes/druid.json';
import rangerJson from '../../data/classes/ranger.json';
import rogueJson from '../../data/classes/rogue.json';
import sorcererJson from '../../data/classes/sorcerer.json';
import warlockJson from '../../data/classes/warlock.json';
import wizardJson from '../../data/classes/wizard.json';
import rarityJson from '../../data/rules/rarity_enchantments.json';
import combatJson from '../../data/rules/combat.json';
import weaponHitsJson from '../../data/rules/weapon_hits.json';
import opponentsJson from '../../data/rules/opponents.json';
import spellsJson from '../../data/spells/spells.json';
import perkEffectsJson from '../../data/rules/perk_effects.json';
import skillEffectsJson from '../../data/rules/skill_effects.json';
import itemsJson from '../../data/items/items.json';
import iconsJson from '../../data/items/icons.json';
import type { CurveSet } from './computeStats';
import type { ClassData } from './types';
import type { ItemRecord } from './itemStats';
import type { CombatRules, WeaponHitsTable } from './damage';
import type { SpellBook } from './spells';
import type { SkillDamageEffect } from './skillDamage';
import { applyStatMap, emptyTotals, type GearTotals } from './itemStats';

export const statCurves = statCurvesJson as unknown as CurveSet;

export const fighter = fighterJson as unknown as ClassData;

const allClasses = [
  fighter,
  barbarianJson as unknown as ClassData,
  bardJson as unknown as ClassData,
  clericJson as unknown as ClassData,
  druidJson as unknown as ClassData,
  rangerJson as unknown as ClassData,
  rogueJson as unknown as ClassData,
  sorcererJson as unknown as ClassData,
  warlockJson as unknown as ClassData,
  wizardJson as unknown as ClassData,
];

export const classes: Record<string, ClassData> = Object.fromEntries(
  allClasses.map((c) => [c.id, c]),
);

export interface RarityTier {
  id: string;
  name: string;
  order: number;
  enchantments: number;
  enchantments_crafted: number;
  color: string;
  /** Artifacts: the enchantments are preset and can't be changed by the player. */
  fixed_enchants?: boolean;
}

export const rarityTiers = (rarityJson as { rarity_tiers: RarityTier[] }).rarity_tiers;

const rarityById = new Map(rarityTiers.map((t) => [t.id, t]));

// A few DB rows use legacy rarity strings (e.g. "legend" for 2 starter items);
// map them onto the canonical tier so color/sort/enchant math still work.
const rarityAliases = (rarityJson as { rarity_aliases?: Record<string, string> })
  .rarity_aliases ?? {};

function tierFor(rarity: string): RarityTier | undefined {
  return rarityById.get(rarity) ?? rarityById.get(rarityAliases[rarity] ?? '');
}

export function enchantSlotCount(rarity: string): number {
  return tierFor(rarity)?.enchantments ?? 0;
}

export function rarityOrder(rarity: string): number {
  return tierFor(rarity)?.order ?? -1;
}

export function rarityColor(rarity: string): string {
  return tierFor(rarity)?.color ?? '#ffffff';
}

/** True for artifacts: enchantments are preset and locked (not user-editable). */
export function hasFixedEnchants(rarity: string): boolean {
  return tierFor(rarity)?.fixed_enchants ?? false;
}

export const items = (itemsJson as unknown as { items: ItemRecord[] }).items;

export const itemIndex: Map<string, ItemRecord> = new Map(items.map((i) => [i.id, i]));

export const combatRules = combatJson as unknown as CombatRules;

export const weaponHits = weaponHitsJson as unknown as WeaponHitsTable;

export const spellBook = (spellsJson as unknown as { classes: SpellBook }).classes;

export interface PerkEffect {
  stats: Record<string, number>;
  /** Situational condition; when set, applied only if the user toggles it on. */
  conditional?: string;
}

export const perkEffects = (
  perkEffectsJson as unknown as { perks: Record<string, PerkEffect> }
).perks;

/** True if a perk has a stat effect at all. */
export function perkHasEffect(perkId: string): boolean {
  return !!perkEffects[perkId];
}

/**
 * Stat totals from selected perks. Unconditional perks apply when selected;
 * conditional perks apply only if their id is in `activeConditional`.
 */
export function perkTotals(perkIds: string[], activeConditional: string[]): GearTotals {
  const totals = emptyTotals();
  for (const id of perkIds) {
    const eff = perkEffects[id];
    if (!eff) continue;
    if (eff.conditional && !activeConditional.includes(id)) continue;
    applyStatMap(totals, eff.stats);
  }
  return totals;
}

export interface SkillEffect {
  /** Persistent/toggleable stat contribution, same shape as PerkEffect. */
  stats?: Record<string, number>;
  conditional?: string;
  /** Direct-damage hits shown in the Calculations tab's Skill Damage panel. */
  damage?: SkillDamageEffect;
}

export const skillEffects = (
  skillEffectsJson as unknown as { skills: Record<string, SkillEffect> }
).skills;

/** Stat totals from selected skills — mirrors perkTotals(). */
export function skillTotals(skillIds: string[], activeConditional: string[]): GearTotals {
  const totals = emptyTotals();
  for (const id of skillIds) {
    const eff = skillEffects[id];
    if (!eff?.stats) continue;
    if (eff.conditional && !activeConditional.includes(id)) continue;
    applyStatMap(totals, eff.stats);
  }
  return totals;
}

export type TankinessTier = 'low' | 'medium' | 'high';

export interface OpponentProfile {
  pdr: number;
  mdr: number;
  hdr: number;
  hp: number;
}

export const opponentProfiles = (
  opponentsJson as unknown as { classes: Record<string, Record<TankinessTier, OpponentProfile>> }
).classes;

export function opponentProfile(classId: string, tier: TankinessTier): OpponentProfile {
  return opponentProfiles[classId]?.[tier] ?? { pdr: 0, mdr: 0, hdr: 0, hp: 125 };
}

/** archetype name -> icon URL (wiki mirror thumbnails) */
export const itemIcons = (iconsJson as unknown as { icons: Record<string, string> }).icons;
