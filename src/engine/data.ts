/**
 * Binds the versioned game data (JSON) to the engine's types.
 * The engine itself never imports JSON directly — it takes data as
 * parameters — so tests and future patches can swap data freely.
 */
import statCurvesJson from '../../data/stat_curves.json';
import fighterJson from '../../data/classes/fighter.json';
import rarityJson from '../../data/rules/rarity_enchantments.json';
import itemsJson from '../../data/items/items.json';
import type { CurveSet } from './computeStats';
import type { ClassData } from './types';
import type { ItemRecord } from './itemStats';

export const statCurves = statCurvesJson as unknown as CurveSet;

export const fighter = fighterJson as unknown as ClassData;

export const classes: Record<string, ClassData> = {
  [fighter.id]: fighter,
};

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
