import type { AttributeName, Attributes, ClassData, DerivedStats, ExternalModifiers } from './types';
import { ATTRIBUTE_NAMES } from './types';
import { evalCurve, type CurveSpec } from './curves';
import type { GearTotals } from './itemStats';

/** Shape of data/stat_curves.json that the engine relies on. */
export interface CurveSet {
  composite_ratings: Record<string, Partial<Record<AttributeName, number>>>;
  curves: Record<string, CurveSpec & Record<string, unknown>>;
}

/** The game clamps attributes to this range (curve tables end at 100). */
const ATTRIBUTE_MIN = 0;
const ATTRIBUTE_MAX = 100;

/** Hard caps stated on the wiki. */
const PDR_CAP = 65;
const CDR_CAP = 65;
const MDR_CAP = 65;

function clampAttribute(value: number): number {
  return Math.min(ATTRIBUTE_MAX, Math.max(ATTRIBUTE_MIN, value));
}

/** base attributes + manual bonuses + gear bonuses, clamped to the game's range. */
export function resolveAttributes(
  base: Attributes,
  ...bonusSets: (Partial<Attributes> | undefined)[]
): Attributes {
  const out = {} as Attributes;
  for (const name of ATTRIBUTE_NAMES) {
    let v = base[name];
    for (const bonuses of bonusSets) v += bonuses?.[name] ?? 0;
    out[name] = clampAttribute(v);
  }
  return out;
}

/** Weighted sum like "Action Speed Rating = 0.25*AGI + 0.75*DEX", weights from JSON. */
export function compositeRating(
  attrs: Attributes,
  weights: Partial<Record<AttributeName, number>>,
): number {
  let rating = 0;
  for (const name of ATTRIBUTE_NAMES) {
    const w = weights[name];
    if (w !== undefined) rating += attrs[name] * w;
  }
  return rating;
}

/**
 * The heart of the app: a pure function from build inputs to the character sheet.
 * Gear percentages add AFTER their attribute curve (game behavior); flat gear
 * values add to their bucket before dependent curves run (e.g. armor rating
 * feeds the PDR curve).
 */
export function computeStats(
  classData: ClassData,
  curveSet: CurveSet,
  mods: ExternalModifiers = {},
): DerivedStats {
  const c = curveSet.curves;
  const need = (key: string): CurveSpec & Record<string, unknown> => {
    const spec = c[key];
    if (!spec) throw new Error(`missing curve: ${key}`);
    return spec;
  };

  const gear: GearTotals | undefined = mods.gear;
  const flats = gear?.flats;
  const padd = gear?.percents ?? {};

  const attrs = resolveAttributes(
    classData.base_attributes,
    mods.attributeBonuses,
    gear?.attributeBonuses,
  );

  // Ratings that blend two attributes (weights live in the data file).
  const healthRating = compositeRating(attrs, curveSet.composite_ratings['base_health_rating'] ?? {});
  const actionRating = compositeRating(attrs, curveSet.composite_ratings['action_speed_rating'] ?? {});
  const interactionRating = compositeRating(
    attrs,
    curveSet.composite_ratings['regular_interaction_rating'] ?? {},
  );

  // Powers: 1:1 with the governing attribute, plus flat gear power.
  const physicalPower = attrs.strength + (flats?.flatPhysicalPower ?? 0);
  const magicalPower = attrs.will + (flats?.flatMagicalPower ?? 0);

  // Armor rating total feeds the PDR curve.
  const armorRating = (mods.armorRating ?? 0) + (flats?.armorRating ?? 0);

  // Magic resistance feeds the MDR curve, the magical mirror of armor -> PDR.
  const magicResistance =
    evalCurve(need('magic_resistance'), attrs.will) + (flats?.magicResistanceAdd ?? 0);

  // Move speed: flat base + agility curve + adds, times any Move Speed Bonus
  // percentage, then the game's hard cap.
  const moveCurve = need('move_speed_add');
  const baseMove = (moveCurve['base_move_speed'] as number | undefined) ?? 300;
  const moveCap = (moveCurve['hard_cap_total'] as number | undefined) ?? 330;
  const moveSpeedRaw =
    (baseMove +
      evalCurve(moveCurve, attrs.agility) +
      (mods.bonusMoveSpeed ?? 0) +
      (flats?.moveSpeedAdd ?? 0)) *
    (1 + (padd.moveSpeedBonusPct ?? 0) / 100);
  const moveSpeed = Math.min(moveSpeedRaw, moveCap);

  // Memory capacity uses the wiki formula: ceil(curve * (1 + bonus%)) + add.
  const memoryFromCurve = evalCurve(need('memory_capacity'), attrs.knowledge);
  const memoryBonusPct = padd.memoryCapacityBonusPct ?? 0;
  const memoryCapacity =
    Math.ceil(memoryFromCurve * (1 + memoryBonusPct / 100)) + (flats?.memoryCapacityAdd ?? 0);

  return {
    attributes: attrs,
    physicalPower,
    physicalPowerBonusPct:
      evalCurve(need('physical_power_bonus'), physicalPower) + (padd.physicalPowerBonusPct ?? 0),
    magicalPower,
    magicalPowerBonusPct:
      evalCurve(need('magical_power_bonus'), magicalPower) + (padd.magicalPowerBonusPct ?? 0),
    maxHealth:
      (evalCurve(need('base_health'), healthRating) + (flats?.maxHealthAdd ?? 0)) *
      (1 + (padd.maxHealthBonusPct ?? 0) / 100),
    moveSpeed,
    actionSpeedPct: evalCurve(need('action_speed'), actionRating) + (padd.actionSpeedPct ?? 0),
    regularInteractionSpeedPct:
      evalCurve(need('regular_interaction_speed'), interactionRating) +
      (padd.regularInteractionSpeedPct ?? 0),
    magicalInteractionSpeedPct:
      evalCurve(need('magical_interaction_speed'), attrs.will) +
      (padd.magicalInteractionSpeedPct ?? 0),
    spellCastingSpeedPct:
      evalCurve(need('spell_casting_speed'), attrs.knowledge) + (padd.spellCastingSpeedPct ?? 0),
    itemEquipSpeedPct:
      evalCurve(need('item_equip_speed'), attrs.dexterity) + (padd.itemEquipSpeedPct ?? 0),
    manualDexterityPct: evalCurve(need('manual_dexterity'), attrs.dexterity),
    memoryCapacity,
    memoryRecoveryPct: evalCurve(need('memory_recovery'), attrs.knowledge),
    healthRecoveryPct: evalCurve(need('health_recovery'), attrs.vigor),
    magicResistance,
    physicalDamageReductionPct: Math.min(
      evalCurve(need('physical_damage_reduction'), armorRating) +
        (padd.physicalDamageReductionPct ?? 0),
      PDR_CAP,
    ),
    magicalDamageReductionPct: Math.min(
      evalCurve(need('magical_damage_reduction'), magicResistance) +
        (padd.magicalDamageReductionPct ?? 0),
      MDR_CAP,
    ),
    cooldownReductionPct: Math.min(
      evalCurve(need('cooldown_reduction'), attrs.resourcefulness) +
        (padd.cooldownReductionPct ?? 0),
      CDR_CAP,
    ),
    buffDurationPct: evalCurve(need('buff_duration'), attrs.will) + (padd.buffDurationPct ?? 0),
    persuasiveness: evalCurve(need('persuasiveness'), attrs.resourcefulness),

    armorRating,
    weaponDamage: flats?.weaponDamage ?? 0,
    gearWeaponDamage: flats?.gearWeaponDamage ?? 0,
    magicWeaponDamage: flats?.magicWeaponDamage ?? 0,
    additionalPhysicalDamage: flats?.additionalPhysicalDamage ?? 0,
    additionalMagicalDamage: flats?.additionalMagicalDamage ?? 0,
    truePhysicalDamage: flats?.truePhysicalDamage ?? 0,
    trueMagicalDamage: flats?.trueMagicalDamage ?? 0,
    spellFlatDamage: flats?.spellFlatDamage ?? 0,
    luck: flats?.luck ?? 0,
    percentExtras: {
      projectileReductionPct: padd.projectileReductionPct,
      armorPenetrationPct: padd.armorPenetrationPct,
      magicPenetrationPct: padd.magicPenetrationPct,
      headshotDamagePct: padd.headshotDamagePct,
      undeadDamagePct: padd.undeadDamagePct,
      demonDamagePct: padd.demonDamagePct,
      undeadReductionPct: padd.undeadReductionPct,
      demonReductionPct: padd.demonReductionPct,
      debuffDurationPct: padd.debuffDurationPct,
      outgoingPhysicalHealingPct: padd.outgoingPhysicalHealingPct,
      outgoingMagicalHealingPct: padd.outgoingMagicalHealingPct,
    },
  };
}
