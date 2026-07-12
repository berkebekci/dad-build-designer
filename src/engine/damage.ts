import type { DerivedStats } from './types';

/**
 * Damage simulation against a configurable training dummy, following the
 * wiki's order of operations:
 *
 *   (((Base * Combo * Zone) + GearWeaponDmg) * (1 + PowerBonus) + AdditionalDmg)
 *     * (1 + HeadshotBonus, head only)
 *     * (1 - DR * (1 - Pen))            <- penetration weakens the target's DR
 *     * (1 - HeadshotReduction, head only)
 *   + TrueDmg
 *
 * Not modeled yet: buff weapon damage (perks), race bonuses, projectile
 * falloff, DR mod. AoE/DoT ignore zone multipliers by game rule.
 */

export type ZoneId = 'head' | 'body' | 'arms' | 'hands' | 'legs' | 'feet';

export interface CombatRules {
  hit_zones: Record<ZoneId, number>;
}

export interface WeaponHitsTable {
  weapons: Record<string, { hits: number[]; riposte?: number[] }>;
}

export interface DummyTarget {
  /** Physical damage reduction, percent (0-100). */
  pdrPct: number;
  /** Magical damage reduction, percent (0-100). */
  mdrPct: number;
  /** Headshot damage reduction, percent (0-100) — head hits only. */
  headshotReductionPct: number;
}

export interface HitResult {
  label: string;
  /** combo multiplier in percent, e.g. 110 */
  multPct: number;
  isRiposte: boolean;
  /** rounded total damage per zone (physical + magical components) */
  zones: Record<ZoneId, number>;
}

const ZONES: ZoneId[] = ['head', 'body', 'arms', 'hands', 'legs', 'feet'];

/** Effective damage-reduction multiplier after penetration (pen only helps). */
export function reductionMultiplier(drPct: number, penPct: number): number {
  const dr = drPct / 100;
  const pen = Math.min(Math.max(penPct, 0), 100) / 100;
  const effective = 1 - dr * (1 - pen);
  return Math.max(effective, 1 - dr); // formula: max((1 - DR*(1-Pen)), 1 - DR)
}

function componentDamage(
  base: number,
  comboMult: number,
  zoneMult: number,
  gearWeaponDmg: number,
  powerBonusPct: number,
  additional: number,
  headFactor: number,
  drPct: number,
  penPct: number,
  headReductionFactor: number,
): number {
  if (base <= 0 && gearWeaponDmg <= 0 && additional <= 0) return 0;
  const afterZone = base * comboMult * zoneMult + gearWeaponDmg;
  const afterPower = afterZone * (1 + powerBonusPct / 100) + additional;
  return afterPower * headFactor * reductionMultiplier(drPct, penPct) * headReductionFactor;
}

/**
 * Per-hit, per-zone damage table for the equipped primary weapon.
 * Weapons missing from the hits table fall back to a single 100% attack.
 */
export function simulateHits(
  stats: DerivedStats,
  weaponName: string | undefined,
  hitsTable: WeaponHitsTable,
  rules: CombatRules,
  dummy: DummyTarget,
): { hits: HitResult[]; usedFallback: boolean } {
  const entry = weaponName ? hitsTable.weapons[weaponName] : undefined;
  const usedFallback = !entry;
  const sequence = entry?.hits ?? [100];
  const riposte = entry?.riposte ?? [];

  const armorPen = stats.percentExtras.armorPenetrationPct ?? 0;
  const magicPen = stats.percentExtras.magicPenetrationPct ?? 0;
  const headshotBonus = stats.percentExtras.headshotDamagePct ?? 0;

  const buildHit = (multPct: number, label: string, isRiposte: boolean): HitResult => {
    const zones = {} as Record<ZoneId, number>;
    for (const zone of ZONES) {
      const zoneMult = rules.hit_zones[zone];
      const headFactor = zone === 'head' ? 1 + headshotBonus / 100 : 1;
      const headRed = zone === 'head' ? 1 - dummy.headshotReductionPct / 100 : 1;

      const physical = componentDamage(
        stats.weaponDamage,
        multPct / 100,
        zoneMult,
        stats.gearWeaponDamage,
        stats.physicalPowerBonusPct,
        stats.additionalPhysicalDamage,
        headFactor,
        dummy.pdrPct,
        armorPen,
        headRed,
      );
      const magical = componentDamage(
        stats.magicWeaponDamage,
        multPct / 100,
        zoneMult,
        0,
        stats.magicalPowerBonusPct,
        stats.additionalMagicalDamage,
        headFactor,
        dummy.mdrPct,
        magicPen,
        headRed,
      );

      const total = physical + magical + stats.truePhysicalDamage + stats.trueMagicalDamage;
      zones[zone] = Math.round(total);
    }
    return { label, multPct, isRiposte, zones };
  };

  const hits = sequence.map((m, i) => buildHit(m, `Attack ${i + 1}`, false));
  riposte.forEach((m, i) => {
    hits.push(buildHit(m, riposte.length > 1 ? `Riposte ${i + 1}` : 'Riposte', true));
  });

  return { hits, usedFallback };
}
