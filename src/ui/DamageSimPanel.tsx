import { useState } from 'react';
import type { DerivedStats } from '../engine/types';
import { simulateHits, type DummyTarget, type ZoneId } from '../engine/damage';
import { combatRules, weaponHits } from '../engine/data';

/** Columns shown in the table (hands ×0.7 and feet ×0.5 exist but are rarer targets). */
const SHOWN_ZONES: { id: ZoneId; label: string }[] = [
  { id: 'head', label: 'Head' },
  { id: 'body', label: 'Body' },
  { id: 'arms', label: 'Arm' },
  { id: 'legs', label: 'Leg' },
];

function clampPct(raw: string, max = 100): number {
  const v = Number(raw);
  if (!Number.isFinite(v)) return 0;
  return Math.min(max, Math.max(0, v));
}

interface DamageSimPanelProps {
  stats: DerivedStats;
  weaponName: string | undefined;
}

export function DamageSimPanel({ stats, weaponName }: DamageSimPanelProps) {
  const [dummy, setDummy] = useState<DummyTarget>({
    pdrPct: 30,
    mdrPct: 20,
    headshotReductionPct: 0,
  });

  const hasWeapon = stats.weaponDamage > 0 || stats.magicWeaponDamage > 0;
  const result = hasWeapon
    ? simulateHits(stats, weaponName, weaponHits, combatRules, dummy)
    : null;

  return (
    <div className="damagesim">
      <h2>Damage Simulator</h2>

      <div className="dummy-controls">
        <label className="gear-field">
          Dummy PDR %
          <input
            type="number"
            min={0}
            max={100}
            value={dummy.pdrPct}
            onChange={(e) => setDummy({ ...dummy, pdrPct: clampPct(e.target.value) })}
          />
        </label>
        <label className="gear-field">
          Dummy MDR %
          <input
            type="number"
            min={0}
            max={100}
            value={dummy.mdrPct}
            onChange={(e) => setDummy({ ...dummy, mdrPct: clampPct(e.target.value) })}
          />
        </label>
        <label className="gear-field">
          Headshot Red. %
          <input
            type="number"
            min={0}
            max={100}
            value={dummy.headshotReductionPct}
            onChange={(e) =>
              setDummy({ ...dummy, headshotReductionPct: clampPct(e.target.value) })
            }
          />
        </label>
      </div>

      {!hasWeapon && <p className="hint">Equip a primary weapon to simulate hits.</p>}

      {result && (
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
              {result.hits.map((hit) => (
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
            Armor/Magic Penetration and Headshot Bonus from your gear are applied.
            {result.usedFallback &&
              ' Combo data missing for this weapon — showing a single 100% attack.'}
          </p>
        </>
      )}
    </div>
  );
}
