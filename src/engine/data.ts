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
import spellsJson from '../../data/spells/spells.json';
import itemsJson from '../../data/items/items.json';
import iconsJson from '../../data/items/icons.json';
import type { CurveSet } from './computeStats';
import type { ClassData } from './types';
import type { ItemRecord } from './itemStats';
import type { CombatRules, WeaponHitsTable } from './damage';
import type { SpellBook } from './spells';

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
}

export const rarityTiers = (rarityJson as { rarity_tiers: RarityTier[] }).rarity_tiers;

const rarityById = new Map(rarityTiers.map((t) => [t.id, t]));

export function enchantSlotCount(rarity: string): number {
  return rarityById.get(rarity)?.enchantments ?? 0;
}

export function rarityOrder(rarity: string): number {
  return rarityById.get(rarity)?.order ?? -1;
}

export function rarityColor(rarity: string): string {
  return rarityById.get(rarity)?.color ?? '#ffffff';
}

export const items = (itemsJson as unknown as { items: ItemRecord[] }).items;

export const itemIndex: Map<string, ItemRecord> = new Map(items.map((i) => [i.id, i]));

export const combatRules = combatJson as unknown as CombatRules;

export const weaponHits = weaponHitsJson as unknown as WeaponHitsTable;

export const spellBook = (spellsJson as unknown as { classes: SpellBook }).classes;

/** archetype name -> icon URL (wiki mirror thumbnails) */
export const itemIcons = (iconsJson as unknown as { icons: Record<string, string> }).icons;
