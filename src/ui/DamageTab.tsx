import { useState } from 'react';
import type { DerivedStats } from '../engine/types';
import { simulateHits, type DummyTarget, type ZoneId } from '../engine/damage';
import { simulateSpell, type SpellData } from '../engine/spells';
import { evalCurve } from '../engine/curves';
import { combatRules, statCurves, weaponHits } from '../engine/data';

const SHOWN_ZONES: { id: ZoneId; label: string }[] = [
  { id: 'head', label: 'Head' },
  { id: 'body', label: 'Body' },
  { id: 'arms', label: 'Arm' },
  { id: 'legs', label: 'Leg' },
];

function clamp(raw: string, min: number, max: number): number {
  const v = Number(raw);
  if (!Number.isFinite(v)) return 0;
  return Math.min(max, Math.max(min, v));
}

interface DamageTabProps {
  stats: DerivedStats;
  weaponName: string | undefined;
  selectedSpells: SpellData[];
}

export function DamageTab({ stats, weaponName, selectedSpells }: DamageTabProps) {
  // The dummy is configured like a real target: armor rating as a NUMBER
  // (converted through the same PDR curve as players), MDR as a percent.
  const [armorRating, setArmorRating] = useState(200);
  const [mdrPct, setMdrPct] = useState(20);
  const [headshotReductionPct, setHeadshotReductionPct] = useState(0);

  const pdrCurve = statCurves.curves['physical_damage_reduction']!;
  const dummyPdr = Math.min(evalCurve(pdrCurve, armorRating), 65);
  const dummy: DummyTarget = { pdrPct: dummyPdr, mdrPct, headshotReductionPct };

  const hasWeapon = stats.weaponDamage > 0 || stats.magicWeaponDamage > 0;
  const melee = hasWeapon ? simulateHits(stats, weaponName, weaponHits, combatRules, dummy) : null;
  const damageSpells = selectedSpells.filter((s) => s.hits.length > 0);

  return (
    <div className="damage-tab">
      <div className="damagesim">
        <h2>Training Dummy</h2>
        <div className="dummy-controls">
          <label className="gear-field">
            Armor Rating
            <input
              type="number"
              min={-300}
              max={600}
              value={armorRating}
              onChange={(e) => setArmorRating(clamp(e.target.value, -300, 600))}
            />
          </label>
          <label className="gear-field">
            → PDR
            <span className="derived-value">{(Math.round(dummyPdr * 10) / 10).toFixed(1)}%</span>
          </label>
          <label className="gear-field">
            MDR %
            <input
              type="number"
              min={0}
              max={100}
              value={mdrPct}
              onChange={(e) => setMdrPct(clamp(e.target.value, 0, 100))}
            />
          </label>
          <label className="gear-field">
            Headshot Red. %
            <input
              type="number"
              min={0}
              max={100}
              value={headshotReductionPct}
              onChange={(e) => setHeadshotReductionPct(clamp(e.target.value, 0, 100))}
            />
          </label>
        </div>
        <p className="hint">
          The dummy's armor rating runs through the same PDR curve as players (cap 65%).
          Your Armor/Magic Penetration, Headshot Bonus, additional and true damage are all applied.
        </p>
      </div>

      <div className="damagesim">
        <h2>Weapon Hits{weaponName ? ` — ${weaponName}` : ''}</h2>
        {!hasWeapon && <p className="hint">Equip a primary weapon in the Gear tab.</p>}
        {melee && (
          <>
            <table className="hit-table">
              <thead>
                <tr>
                  <th>Hit</th>
                  {SHOWN_ZONES.map((z) => (
                    <th key={z.id}>{z.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {melee.hits.map((hit) => (
                  <tr key={hit.label} className={hit.isRiposte ? 'hit-row--riposte' : ''}>
                    <td>
                      {hit.label} <span className="hit-mult">{hit.multPct}%</span>
                    </td>
                    {SHOWN_ZONES.map((z) => (
                      <td key={z.id} className="hit-dmg">
                        {hit.zones[z.id]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hint">
              Zones: head ×1.5, body ×1.0, arm ×0.8, leg ×0.6 (hands ×0.7, feet ×0.5 not shown).
              {melee.usedFallback &&
                ' Combo data missing for this weapon — showing a single 100% attack.'}
            </p>
          </>
        )}
      </div>

      <div className="damagesim">
        <h2>Spell Damage</h2>
        {damageSpells.length === 0 && (
          <p className="hint">Memorize damage/heal spells in the Class tab to see numbers here.</p>
        )}
        {damageSpells.map((spell) => {
          const results = simulateSpell(stats, spell, dummy);
          return (
            <div key={spell.id} className="spell-result">
              <h3>
                {spell.name} <span className="hit-mult">{spell.kind}</span>
              </h3>
              <table className="hit-table">
                <tbody>
                  {results.map((r) => (
                    <tr key={r.label}>
                      <td>{r.label}</td>
                      <td className="hit-dmg">
                        {r.heal ? `${r.body} heal` : r.body}
                        {r.head !== null && <span className="hit-mult"> · head {r.head}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {damageSpells.length > 0 && (
          <p className="hint">
            Spell damage = (base + staff Magical Damage) × (1 + MP Bonus × scaling) vs dummy MDR
            with Magic Penetration; projectiles can headshot (×1.5). Heals ignore the dummy.
          </p>
        )}
      </div>
    </div>
  );
}
