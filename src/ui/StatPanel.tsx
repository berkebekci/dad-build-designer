import type { DerivedStats } from '../engine/types';
import { ATTRIBUTE_NAMES } from '../engine/types';
import type { PercentStat } from '../engine/itemStats';

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
function pct(value: number): string {
  const r = round2(value);
  return `${r > 0 ? '+' : ''}${r}%`;
}
function num(value: number): string {
  return String(round2(value));
}
/** The game shows these as whole numbers. */
function int(value: number): string {
  return String(Math.round(value));
}
/** In-game move speed percentage: 330 MS = 100%. */
function msPct(moveSpeed: number): string {
  return `${((moveSpeed / 330) * 100).toFixed(1)}%`;
}
function signClass(value: number): string {
  if (value > 0) return 'stat-value stat-value--pos';
  if (value < 0) return 'stat-value stat-value--neg';
  return 'stat-value';
}

function Row({ label, value, cls, sub }: { label: string; value: string; cls?: string; sub?: string }) {
  return (
    <div className="stat-row">
      <span className="stat-label">
        {label}
        {sub && <span className="stat-sub"> {sub}</span>}
      </span>
      <span className={cls ?? 'stat-value'}>{value}</span>
    </div>
  );
}

export function StatPanel({ stats }: { stats: DerivedStats }) {
  // Gear-only percentages default to 0 so every stat is always visible.
  const ex = (k: PercentStat): number => stats.percentExtras[k] ?? 0;

  return (
    <div className="statpanel">
      <h2>Stats</h2>

      <h3>Attributes</h3>
      {ATTRIBUTE_NAMES.map((name) => (
        <Row
          key={name}
          label={name.charAt(0).toUpperCase() + name.slice(1)}
          value={int(stats.attributes[name])}
        />
      ))}

      <h3>Offense</h3>
      <Row label="Physical Power" value={num(stats.physicalPower)} />
      <Row label="Physical Power Bonus" value={pct(stats.physicalPowerBonusPct)} cls={signClass(stats.physicalPowerBonusPct)} />
      <Row label="Magical Power" value={num(stats.magicalPower)} />
      <Row label="Magical Power Bonus" value={pct(stats.magicalPowerBonusPct)} cls={signClass(stats.magicalPowerBonusPct)} />
      <Row label="Weapon Damage" value={num(stats.weaponDamage)} />
      <Row label="Magic Weapon Damage" value={num(stats.magicWeaponDamage)} />
      <Row label="Additional Physical Damage" value={num(stats.additionalPhysicalDamage)} />
      <Row label="Additional Magical Damage" value={num(stats.additionalMagicalDamage)} />
      <Row label="True Physical Damage" value={num(stats.truePhysicalDamage)} />
      <Row label="True Magical Damage" value={num(stats.trueMagicalDamage)} />
      <Row label="Spell Damage (staff)" value={num(stats.spellFlatDamage)} />
      <Row label="Armor Penetration" value={pct(ex('armorPenetrationPct'))} cls={signClass(ex('armorPenetrationPct'))} />
      <Row label="Magic Penetration" value={pct(ex('magicPenetrationPct'))} cls={signClass(ex('magicPenetrationPct'))} />
      <Row label="Headshot Damage" value={pct(ex('headshotDamagePct'))} cls={signClass(ex('headshotDamagePct'))} />

      <h3>Defense</h3>
      <Row label="Max Health" value={int(stats.maxHealth)} />
      <Row label="Health Recovery" value={pct(stats.healthRecoveryPct)} cls={signClass(stats.healthRecoveryPct)} />
      <Row label="Armor Rating" value={num(stats.armorRating)} />
      <Row
        label="Physical Damage Reduction"
        value={pct(stats.physicalDamageReductionPct)}
        cls={signClass(stats.physicalDamageReductionPct)}
        sub={`(from ${num(stats.armorRating)} armor)`}
      />
      <Row label="Magic Resistance" value={num(stats.magicResistance)} />
      <Row
        label="Magical Damage Reduction"
        value={pct(stats.magicalDamageReductionPct)}
        cls={signClass(stats.magicalDamageReductionPct)}
        sub={`(from ${num(stats.magicResistance)} MR)`}
      />
      <Row label="Projectile Damage Reduction" value={pct(ex('projectileReductionPct'))} cls={signClass(ex('projectileReductionPct'))} />
      <Row label="Headshot Reduction" value={pct(ex('headshotReductionPct'))} cls={signClass(ex('headshotReductionPct'))} />
      <Row label="Physical DR vs Undead" value={pct(ex('undeadReductionPct'))} cls={signClass(ex('undeadReductionPct'))} />
      <Row label="Physical DR vs Demons" value={pct(ex('demonReductionPct'))} cls={signClass(ex('demonReductionPct'))} />

      <h3>Speed</h3>
      <Row label="Move Speed" value={`${int(stats.moveSpeed)}`} sub={`(${msPct(stats.moveSpeed)})`} />
      <Row label="Action Speed" value={pct(stats.actionSpeedPct)} cls={signClass(stats.actionSpeedPct)} />
      <Row label="Spell Casting Speed" value={pct(stats.spellCastingSpeedPct)} cls={signClass(stats.spellCastingSpeedPct)} />
      <Row label="Interaction Speed" value={pct(stats.regularInteractionSpeedPct)} cls={signClass(stats.regularInteractionSpeedPct)} />
      <Row label="Magical Interaction Speed" value={pct(stats.magicalInteractionSpeedPct)} cls={signClass(stats.magicalInteractionSpeedPct)} />
      <Row label="Item Equip Speed" value={pct(stats.itemEquipSpeedPct)} cls={signClass(stats.itemEquipSpeedPct)} />
      <Row label="Manual Dexterity" value={pct(stats.manualDexterityPct)} cls={signClass(stats.manualDexterityPct)} />

      <h3>Utility</h3>
      <Row label="Memory Capacity" value={num(stats.memoryCapacity)} />
      <Row label="Memory Recovery" value={pct(stats.memoryRecoveryPct)} cls={signClass(stats.memoryRecoveryPct)} />
      <Row label="Cooldown Reduction" value={pct(stats.cooldownReductionPct)} cls={signClass(stats.cooldownReductionPct)} />
      <Row label="Buff Duration" value={pct(stats.buffDurationPct)} cls={signClass(stats.buffDurationPct)} />
      <Row label="Debuff Duration" value={pct(ex('debuffDurationPct'))} cls={signClass(ex('debuffDurationPct'))} />
      <Row label="Persuasiveness" value={num(stats.persuasiveness)} />
      <Row label="Luck" value={num(stats.luck)} />
      <Row label="Damage vs Undead" value={pct(ex('undeadDamagePct'))} cls={signClass(ex('undeadDamagePct'))} />
      <Row label="Damage vs Demons" value={pct(ex('demonDamagePct'))} cls={signClass(ex('demonDamagePct'))} />
      <Row label="Outgoing Physical Healing" value={pct(ex('outgoingPhysicalHealingPct'))} cls={signClass(ex('outgoingPhysicalHealingPct'))} />
      <Row label="Outgoing Magical Healing" value={pct(ex('outgoingMagicalHealingPct'))} cls={signClass(ex('outgoingMagicalHealingPct'))} />
    </div>
  );
}
