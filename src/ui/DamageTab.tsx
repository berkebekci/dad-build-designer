import { useState } from 'react';
import type { DerivedStats } from '../engine/types';
import { simulateHits, type DummyTarget, type ZoneId } from '../engine/damage';
import { simulateSpell, type SpellData } from '../engine/spells';
import { simulateSkillDamage, type SkillDamageEffect } from '../engine/skillDamage';
import { classes, opponentProfile, skillEffects, type TankinessTier } from '../engine/data';
import { combatRules, weaponHits } from '../engine/data';

const SHOWN_ZONES: { id: ZoneId; label: string }[] = [
  { id: 'head', label: 'Head' },
  { id: 'body', label: 'Body' },
  { id: 'arms', label: 'Arm' },
  { id: 'legs', label: 'Leg' },
];

const TIERS: TankinessTier[] = ['low', 'medium', 'high'];
const TIER_LABEL: Record<TankinessTier, string> = { low: 'Low', medium: 'Medium', high: 'High' };

interface DamageTabProps {
  stats: DerivedStats;
  weaponName: string | undefined;
  selectedSpells: SpellData[];
  selectedSkills: { id: string; name: string }[];
}

function htk(hp: number, perHit: number): string {
  if (perHit <= 0) return '∞';
  return String(Math.ceil(hp / perHit));
}

export function DamageTab({ stats, weaponName, selectedSpells, selectedSkills }: DamageTabProps) {
  // The opponent is a real class at a chosen tankiness tier; its averaged
  // PDR/MDR/headshot-reduction and HP drive the damage + hits-to-kill.
  const [opponentId, setOpponentId] = useState('fighter');
  const [tierIdx, setTierIdx] = useState(1); // 0=low, 1=medium, 2=high
  const tier = TIERS[tierIdx]!;
  const prof = opponentProfile(opponentId, tier);

  const dummy: DummyTarget = {
    pdrPct: prof.pdr,
    mdrPct: prof.mdr,
    headshotReductionPct: prof.hdr,
  };

  const hasWeapon = stats.weaponDamage > 0 || stats.magicWeaponDamage > 0;
  const melee = hasWeapon ? simulateHits(stats, weaponName, weaponHits, combatRules, dummy) : null;
  const damageSpells = selectedSpells.filter((s) => s.hits.length > 0);
  const damageSkills: { name: string; effect: SkillDamageEffect }[] = [];
  for (const s of selectedSkills) {
    const effect = skillEffects[s.id]?.damage;
    if (effect) damageSkills.push({ name: s.name, effect });
  }

  // Hits-to-kill: average the main combo (non-riposte) body/head damage.
  const comboHits = melee?.hits.filter((h) => !h.isRiposte) ?? [];
  const avgBody = comboHits.length
    ? comboHits.reduce((s, h) => s + h.zones.body, 0) / comboHits.length
    : 0;
  const avgHead = comboHits.length
    ? comboHits.reduce((s, h) => s + h.zones.head, 0) / comboHits.length
    : 0;

  return (
    <div className="damage-tab">
      <div className="damagesim opponent-panel">
        <h2>Opponent</h2>
        <div className="opponent-controls">
          <label className="gear-field">
            Class
            <select value={opponentId} onChange={(e) => setOpponentId(e.target.value)}>
              {Object.values(classes).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="tankiness">
            <span className="tankiness-caption">Tankiness</span>
            <div className="tankiness-switch" role="group" aria-label="Opponent tankiness">
              {TIERS.map((t, i) => (
                <button
                  key={t}
                  type="button"
                  className={`tk-opt${tierIdx === i ? ' tk-opt--active' : ''}`}
                  onClick={() => setTierIdx(i)}
                >
                  {TIER_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="opponent-profile">
          <span className="profile-chip">HP {prof.hp}</span>
          <span className="profile-chip">PDR {prof.pdr}%</span>
          <span className="profile-chip">MDR {prof.mdr}%</span>
          <span className="profile-chip">Headshot Red. {prof.hdr}%</span>
        </div>
        <p className="hint">
          Values are per-class, per-tankiness averages ({classes[opponentId]?.name} · {TIER_LABEL[tier]}).
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
              Headshot reduction subtracts from the headshot bonus (150% − 15% = 135%).
              {melee.usedFallback && ' Combo data missing for this weapon — showing a single 100% attack.'}
            </p>
          </>
        )}
      </div>

      <div className="damagesim">
        <h2>Skill Damage</h2>
        {damageSkills.length === 0 && (
          <p className="hint">Select a damage-dealing skill in the Perks & Skills tab to see numbers here.</p>
        )}
        {damageSkills.map(({ name, effect }) => (
          <div key={name} className="spell-result">
            <h3>{name}</h3>
            <table className="hit-table">
              <tbody>
                {simulateSkillDamage(stats, effect, dummy).map((r) => (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td className="hit-dmg">{r.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {melee && (
        <div className="damagesim ttk-panel">
          <h2>Hits to Kill</h2>
          <div className="ttk-grid">
            <div className="ttk-cell">
              <div className="ttk-num">{htk(prof.hp, avgBody)}</div>
              <div className="ttk-label">body hits</div>
              <div className="ttk-sub">~{Math.round(avgBody)}/hit</div>
            </div>
            <div className="ttk-cell ttk-cell--head">
              <div className="ttk-num">{htk(prof.hp, avgHead)}</div>
              <div className="ttk-label">head hits</div>
              <div className="ttk-sub">~{Math.round(avgHead)}/hit</div>
            </div>
          </div>
          <p className="hint">Average across the {comboHits.length}-hit combo vs {prof.hp} HP.</p>
        </div>
      )}

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
            Spell damage = (base + staff Magical Damage) × (1 + MP Bonus × scaling) vs the opponent's
            MDR with your Magic Penetration; projectiles can headshot. Heals ignore the opponent.
          </p>
        )}
      </div>
    </div>
  );
}
