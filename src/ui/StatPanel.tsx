import type { DerivedStats } from '../engine/types';
import { ATTRIBUTE_NAMES } from '../engine/types';
import type { PercentStat } from '../engine/itemStats';

const EXTRA_LABELS: Partial<Record<PercentStat, string>> = {
  projectileReductionPct: 'Projectile Reduction',
  armorPenetrationPct: 'Armor Penetration',
  magicPenetrationPct: 'Magic Penetration',
  headshotDamagePct: 'Headshot Damage',
  headshotReductionPct: 'Headshot Reduction',
  undeadDamagePct: 'Damage vs Undead',
  demonDamagePct: 'Damage vs Demons',
  undeadReductionPct: 'Reduction vs Undead',
  demonReductionPct: 'Reduction vs Demons',
  debuffDurationPct: 'Debuff Duration',
  outgoingPhysicalHealingPct: 'Physical Healing',
  outgoingMagicalHealingPct: 'Magical Healing',
};

/** "+12.5%" / "0%" / "-22%" — sign makes buffs/debuffs readable at a glance. */
function pct(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

function num(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** The game shows these as whole numbers (< .5 down, >= .5 up). */
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

function Row({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className={cls ?? 'stat-value'}>{value}</span>
    </div>
  );
}

export function StatPanel({ stats }: { stats: DerivedStats }) {
  return (
    <div className="statpanel">
      <h2>Stats</h2>

      <h3>Attributes</h3>
      {ATTRIBUTE_NAMES.map((name) => (
        <Row
          key={name}
          label={name.charAt(0).toUpperCase() + name.slice(1)}
          value={num(stats.attributes[name])}
        />
      ))}

      <h3>Defense</h3>
      <Row label="Max Health" value={int(stats.maxHealth)} />
      <Row label="Health Recovery" value={pct(stats.healthRecoveryPct)} cls={signClass(stats.healthRecoveryPct)} />
      <Row label="Armor Rating" value={num(stats.armorRating)} />
      <Row
        label="Physical Damage Reduction"
        value={pct(stats.physicalDamageReductionPct)}
        cls={signClass(stats.physicalDamageReductionPct)}
      />
      <Row label="Magic Resistance" value={num(stats.magicResistance)} />
      {stats.magicalDamageReductionPct !== 0 && (
        <Row
          label="Magical DR (gear)"
          value={pct(stats.magicalDamageReductionPct)}
          cls={signClass(stats.magicalDamageReductionPct)}
        />
      )}

      <h3>Offense</h3>
      <Row label="Weapon Damage" value={num(stats.weaponDamage)} />
      {stats.gearWeaponDamage !== 0 && (
        <Row label="Gear Weapon Damage" value={num(stats.gearWeaponDamage)} />
      )}
      {stats.magicWeaponDamage !== 0 && (
        <Row label="Magic Weapon Damage" value={num(stats.magicWeaponDamage)} />
      )}
      {stats.additionalPhysicalDamage !== 0 && (
        <Row label="Additional Physical Damage" value={num(stats.additionalPhysicalDamage)} />
      )}
      {stats.additionalMagicalDamage !== 0 && (
        <Row label="Additional Magical Damage" value={num(stats.additionalMagicalDamage)} />
      )}
      {stats.truePhysicalDamage !== 0 && (
        <Row label="True Physical Damage" value={num(stats.truePhysicalDamage)} />
      )}
      {stats.trueMagicalDamage !== 0 && (
        <Row label="True Magical Damage" value={num(stats.trueMagicalDamage)} />
      )}
      <Row label="Physical Power" value={num(stats.physicalPower)} />
      <Row
        label="Physical Power Bonus"
        value={pct(stats.physicalPowerBonusPct)}
        cls={signClass(stats.physicalPowerBonusPct)}
      />
      <Row label="Magical Power" value={num(stats.magicalPower)} />
      <Row
        label="Magical Power Bonus"
        value={pct(stats.magicalPowerBonusPct)}
        cls={signClass(stats.magicalPowerBonusPct)}
      />

      <h3>Speed</h3>
      <Row label="Move Speed" value={`${int(stats.moveSpeed)} (${msPct(stats.moveSpeed)})`} />
      <Row label="Action Speed" value={pct(stats.actionSpeedPct)} cls={signClass(stats.actionSpeedPct)} />
      <Row
        label="Spell Casting Speed"
        value={pct(stats.spellCastingSpeedPct)}
        cls={signClass(stats.spellCastingSpeedPct)}
      />
      <Row
        label="Interaction Speed"
        value={pct(stats.regularInteractionSpeedPct)}
        cls={signClass(stats.regularInteractionSpeedPct)}
      />
      <Row
        label="Item Equip Speed"
        value={pct(stats.itemEquipSpeedPct)}
        cls={signClass(stats.itemEquipSpeedPct)}
      />

      <h3>Utility</h3>
      <Row label="Memory Capacity" value={num(stats.memoryCapacity)} />
      <Row
        label="Cooldown Reduction"
        value={pct(stats.cooldownReductionPct)}
        cls={signClass(stats.cooldownReductionPct)}
      />
      <Row label="Buff Duration" value={pct(stats.buffDurationPct)} cls={signClass(stats.buffDurationPct)} />
      {stats.luck !== 0 && <Row label="Luck" value={num(stats.luck)} />}

      {Object.entries(stats.percentExtras).some(([, v]) => v) && (
        <>
          <h3>Situational</h3>
          {(Object.entries(stats.percentExtras) as [PercentStat, number | undefined][])
            .filter(([, v]) => v !== undefined && v !== 0)
            .map(([key, v]) => (
              <Row
                key={key}
                label={EXTRA_LABELS[key] ?? key}
                value={pct(v!)}
                cls={signClass(v!)}
              />
            ))}
        </>
      )}
    </div>
  );
}
