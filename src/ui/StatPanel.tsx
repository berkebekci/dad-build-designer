import type { DerivedStats } from '../engine/types';
import { ATTRIBUTE_NAMES } from '../engine/types';

/** "+12.5%" / "0%" / "-22%" — sign makes buffs/debuffs readable at a glance. */
function pct(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

function num(value: number): string {
  return String(Math.round(value * 100) / 100);
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
      <Row label="Max Health" value={num(stats.maxHealth)} />
      <Row label="Health Recovery" value={pct(stats.healthRecoveryPct)} cls={signClass(stats.healthRecoveryPct)} />
      <Row
        label="Physical Damage Reduction"
        value={pct(stats.physicalDamageReductionPct)}
        cls={signClass(stats.physicalDamageReductionPct)}
      />
      <Row label="Magic Resistance" value={num(stats.magicResistance)} />

      <h3>Offense</h3>
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
      <Row label="Move Speed" value={num(stats.moveSpeed)} />
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
    </div>
  );
}
