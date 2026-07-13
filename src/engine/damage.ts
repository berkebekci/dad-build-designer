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

/** Reskin prefixes/suffixes that don't change a weapon's attack pattern. */
const RESKIN_PREFIXES = [
  'Golden',
  'Obsidian',
  'Divine',
  'Sterling',
  'Tidal',
  'Frostlight',
  'Elven',
  'Rubysilver',
];
const RESKIN_SUFFIXES = [' of Righteousness', ' of Honor', ' of Truth', ' of Solaris'];

/**
 * Resolves a weapon's combo, inheriting from the base weapon for named
 * reskins (e.g. "Obsidian War Hammer" -> "War Hammer", "Tidal Falchion" ->
 * "Falchion"). Unique-name artifacts with no base fall through to the caller's
 * single-hit fallback.
 */
export function resolveWeaponHits(
  weaponName: string | undefined,
  table: WeaponHitsTable,
): { hits: number[]; riposte?: number[] } | undefined {
  if (!weaponName) return undefined;
  if (table.weapons[weaponName]) return table.weapons[weaponName];

  let base = weaponName;
  for (const p of RESKIN_PREFIXES) {
    if (base.startsWith(p + ' ')) {
      base = base.slice(p.length + 1);
      break;
    }
  }
  for (const s of RESKIN_SUFFIXES) {
    if (base.endsWith(s)) {
      base = base.slice(0, -s.length);
      break;
    }
  }
  return table.weapons[base];
}

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
  drPct: number,
  penPct: number,
): number {
  if (base <= 0 && gearWeaponDmg <= 0 && additional <= 0) return 0;
  const afterZone = base * comboMult * zoneMult + gearWeaponDmg;
  const afterPower = afterZone * (1 + powerBonusPct / 100) + additional;
  return afterPower * reductionMultiplier(drPct, penPct);
}

/**
 * Effective head zone multiplier. Headshot Damage BONUS (from gear) and the
 * target's Headshot Damage REDUCTION modify the headshot bonus ADDITIVELY,
 * not multiplicatively: a 1.5x head with 15% reduction is 1.35x (150% - 15%),
 * NOT 1.5 * 0.85. Player headshot bonus adds on top. Floored so a head hit is
 * never worse than a body hit.
 */
export function headZoneMultiplier(
  baseHeadMult: number,
  headshotBonusPct: number,
  headshotReductionPct: number,
): number {
  return Math.max(1, baseHeadMult + headshotBonusPct / 100 - headshotReductionPct / 100);
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
  const entry = resolveWeaponHits(weaponName, hitsTable);
  const usedFallback = !entry;
  const sequence = entry?.hits ?? [100];
  const riposte = entry?.riposte ?? [];

  const armorPen = stats.percentExtras.armorPenetrationPct ?? 0;
  const magicPen = stats.percentExtras.magicPenetrationPct ?? 0;
  const headshotBonus = stats.percentExtras.headshotDamagePct ?? 0;

  const buildHit = (multPct: number, label: string, isRiposte: boolean): HitResult => {
    const zones = {} as Record<ZoneId, number>;
    for (const zone of ZONES) {
      // Head applies headshot bonus/reduction additively to its multiplier
      // (150% - 15% reduction = 135%), other zones use their flat multiplier.
      const zoneMult =
        zone === 'head'
          ? headZoneMultiplier(rules.hit_zones.head, headshotBonus, dummy.headshotReductionPct)
          : rules.hit_zones[zone];

      const physical = componentDamage(
        stats.weaponDamage,
        multPct / 100,
        zoneMult,
        stats.gearWeaponDamage,
        stats.physicalPowerBonusPct,
        stats.additionalPhysicalDamage,
        dummy.pdrPct,
        armorPen,
      );
      const magical = componentDamage(
        stats.magicWeaponDamage,
        multPct / 100,
        zoneMult,
        0,
        stats.magicalPowerBonusPct,
        stats.additionalMagicalDamage,
        dummy.mdrPct,
        magicPen,
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
