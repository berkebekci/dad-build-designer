import type { DerivedStats } from './types';
import { reductionMultiplier, type DummyTarget } from './damage';

/**
 * Direct-damage skill hits (Blow of Corruption, Shield Slam, ...) — a single
 * fixed-power instance, not a weapon combo. `type` picks whether the hit
 * scales off Physical or Magical Power Bonus and which DR/penetration it
 * fights through, matching the wiki's "Physical/Magical Base Damage" split.
 */
export interface SkillHit {
  label: string;
  base: number;
  /** percent of the relevant Power Bonus that applies (wiki "scaling") */
  scaling: number;
  type: 'physical' | 'magical';
}

export interface SkillDamageEffect {
  hits: SkillHit[];
}

export interface SkillHitResult {
  label: string;
  amount: number;
}

export function simulateSkillDamage(
  stats: DerivedStats,
  effect: SkillDamageEffect,
  dummy: DummyTarget,
): SkillHitResult[] {
  const armorPen = stats.percentExtras.armorPenetrationPct ?? 0;
  const magicPen = stats.percentExtras.magicPenetrationPct ?? 0;

  return effect.hits.map((hit) => {
    if (hit.type === 'physical') {
      const powerBonus = stats.physicalPowerBonusPct / 100;
      const raw = hit.base * (1 + powerBonus * (hit.scaling / 100));
      return { label: hit.label, amount: Math.round(raw * reductionMultiplier(dummy.pdrPct, armorPen)) };
    }
    const powerBonus = stats.magicalPowerBonusPct / 100;
    const raw = (hit.base + stats.spellFlatDamage) * (1 + powerBonus * (hit.scaling / 100));
    return { label: hit.label, amount: Math.round(raw * reductionMultiplier(dummy.mdrPct, magicPen)) };
  });
}
