import type { DerivedStats } from './types';
import { reductionMultiplier, type DummyTarget } from './damage';

/**
 * Spell damage/heal simulation.
 *
 * Assumed formula (documented in data/spells/spells.json _meta):
 *   damage = (base + staff "Magical Damage") * (1 + MagicalPowerBonus% * scaling%)
 *            [* 1.5 head, projectiles only] * (1 - MDR * (1 - MagicPen)) [* headshot factors]
 *   heal   = base * (1 + MagicalPowerBonus% * scaling%)   — dummy-independent
 *
 * The staff flat bonus only applies to entries that deal damage, not heals.
 */

export interface SpellHit {
  label: string;
  base: number;
  /** percent of the Magical Power Bonus that applies (wiki "scaling") */
  scaling: number;
  heal?: boolean;
}

export interface SpellData {
  id: string;
  name: string;
  /** memory cost (= tier); null for Bard songs and Sorcerer merged spells */
  cost: number | null;
  kind: string;
  hits: SpellHit[];
  icon?: string;
  /** Real in-game description (wiki verbatim). */
  description?: string;
}

/** Skills that grant spell/song slots — each provides 5 slots (game rule). */
const MEMORY_SKILL = /^(spell_memory|music_memory|sorcery)/;

export const SLOTS_PER_MEMORY_SKILL = 5;

export function spellSlots(skillIds: string[]): number {
  return skillIds.filter((id) => MEMORY_SKILL.test(id)).length * SLOTS_PER_MEMORY_SKILL;
}

export type SpellBook = Record<string, SpellData[]>;

export function classSpells(book: SpellBook, classId: string): SpellData[] {
  return book[classId] ?? [];
}

/** Total memory cost of a selection (cost-less entries are free). */
export function selectionCost(spells: SpellData[]): number {
  return spells.reduce((sum, s) => sum + (s.cost ?? 0), 0);
}

export interface SpellHitResult {
  label: string;
  heal: boolean;
  /** rounded value vs dummy body (or heal amount) */
  body: number;
  /** rounded head value for projectiles, null otherwise */
  head: number | null;
}

export function simulateSpell(
  stats: DerivedStats,
  spell: SpellData,
  dummy: DummyTarget,
): SpellHitResult[] {
  const mpBonus = stats.magicalPowerBonusPct / 100;
  const magicPen = stats.percentExtras.magicPenetrationPct ?? 0;
  const headshotBonus = stats.percentExtras.headshotDamagePct ?? 0;
  const isProjectile = spell.kind === 'projectile';

  return spell.hits.map((hit) => {
    const scaled = (mult: number) =>
      (hit.base + (hit.heal ? 0 : stats.spellFlatDamage)) *
      mult *
      (1 + mpBonus * (hit.scaling / 100));

    if (hit.heal) {
      return { label: hit.label, heal: true, body: Math.round(scaled(1)), head: null };
    }

    const drMult = reductionMultiplier(dummy.mdrPct, magicPen);
    const body = Math.round(scaled(1) * drMult);
    const head = isProjectile
      ? Math.round(
          scaled(1.5) *
            (1 + headshotBonus / 100) *
            drMult *
            (1 - dummy.headshotReductionPct / 100),
        )
      : null;
    return { label: hit.label, heal: false, body, head };
  });
}
