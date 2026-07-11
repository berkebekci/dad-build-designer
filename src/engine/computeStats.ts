import type { AttributeName, Attributes, ClassData, DerivedStats, ExternalModifiers } from './types';
import { ATTRIBUTE_NAMES } from './types';
import { evalCurve, type CurveSpec } from './curves';

/** Shape of data/stat_curves.json that the engine relies on. */
export interface CurveSet {
  composite_ratings: Record<string, Partial<Record<AttributeName, number>>>;
  curves: Record<string, CurveSpec & Record<string, unknown>>;
}

/** The game clamps attributes to this range (curve tables end at 100). */
const ATTRIBUTE_MIN = 0;
const ATTRIBUTE_MAX = 100;

function clampAttribute(value: number): number {
  return Math.min(ATTRIBUTE_MAX, Math.max(ATTRIBUTE_MIN, value));
}

/** base attributes + gear/enchantment bonuses, clamped to the game's range. */
export function resolveAttributes(
  base: Attributes,
  bonuses: Partial<Attributes> | undefined,
): Attributes {
  const out = {} as Attributes;
  for (const name of ATTRIBUTE_NAMES) {
    out[name] = clampAttribute(base[name] + (bonuses?.[name] ?? 0));
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
 * No side effects — same input always gives the same output, which is what
 * makes it unit-testable against known in-game values.
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

  const attrs = resolveAttributes(classData.base_attributes, mods.attributeBonuses);

  // Ratings that blend two attributes (weights live in the data file).
  const healthRating = compositeRating(attrs, curveSet.composite_ratings['base_health_rating'] ?? {});
  const actionRating = compositeRating(attrs, curveSet.composite_ratings['action_speed_rating'] ?? {});
  const interactionRating = compositeRating(
    attrs,
    curveSet.composite_ratings['regular_interaction_rating'] ?? {},
  );

  // Powers are 1:1 with their governing attribute; the BONUS runs through a curve.
  const physicalPower = attrs.strength;
  const magicalPower = attrs.will;

  // Move speed: flat base + agility curve + external adds, then the game's hard cap.
  const moveCurve = need('move_speed_add');
  const baseMove = (moveCurve['base_move_speed'] as number | undefined) ?? 300;
  const moveCap = (moveCurve['hard_cap_total'] as number | undefined) ?? 330;
  const moveSpeed = Math.min(
    baseMove + evalCurve(moveCurve, attrs.agility) + (mods.bonusMoveSpeed ?? 0),
    moveCap,
  );

  return {
    attributes: attrs,
    physicalPower,
    physicalPowerBonusPct: evalCurve(need('physical_power_bonus'), physicalPower),
    magicalPower,
    magicalPowerBonusPct: evalCurve(need('magical_power_bonus'), magicalPower),
    maxHealth: evalCurve(need('base_health'), healthRating),
    moveSpeed,
    actionSpeedPct: evalCurve(need('action_speed'), actionRating),
    regularInteractionSpeedPct: evalCurve(need('regular_interaction_speed'), interactionRating),
    magicalInteractionSpeedPct: evalCurve(need('magical_interaction_speed'), attrs.will),
    spellCastingSpeedPct: evalCurve(need('spell_casting_speed'), attrs.knowledge),
    itemEquipSpeedPct: evalCurve(need('item_equip_speed'), attrs.dexterity),
    manualDexterityPct: evalCurve(need('manual_dexterity'), attrs.dexterity),
    memoryCapacity: evalCurve(need('memory_capacity'), attrs.knowledge),
    memoryRecoveryPct: evalCurve(need('memory_recovery'), attrs.knowledge),
    healthRecoveryPct: evalCurve(need('health_recovery'), attrs.vigor),
    magicResistance: evalCurve(need('magic_resistance'), attrs.will),
    physicalDamageReductionPct: evalCurve(need('physical_damage_reduction'), mods.armorRating ?? 0),
    cooldownReductionPct: evalCurve(need('cooldown_reduction'), attrs.resourcefulness),
    buffDurationPct: evalCurve(need('buff_duration'), attrs.will),
    persuasiveness: evalCurve(need('persuasiveness'), attrs.resourcefulness),
  };
}
