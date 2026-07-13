import { useState } from 'react';
import type { SpellData } from '../engine/spells';
import { selectionCost, spellSlots, SLOTS_PER_MEMORY_SKILL } from '../engine/spells';
import { AbilityIcon, DetailCard } from './PickList';

interface SpellPanelProps {
  spells: SpellData[];
  selectedIds: string[];
  skillIds: string[];
  memoryCapacity: number;
  onToggle: (id: string) => void;
}

function summary(spell: SpellData): string {
  if (spell.hits.length === 0) return `${spell.kind} — no direct damage`;
  const parts = spell.hits.map(
    (h) => `${h.label}: ${h.base}${h.heal ? ' base heal' : ' base'} (${h.scaling}% scaling)`,
  );
  return `${spell.kind}. ${parts.join('; ')}.`;
}

/**
 * Spell memorization, gated like the game:
 * - requires a memory skill (Spell Memory / Music Memory / Sorcery); each
 *   grants 5 spell slots
 * - total memory cost must fit in Memory Capacity
 */
export function SpellPanel({
  spells,
  selectedIds,
  skillIds,
  memoryCapacity,
  onToggle,
}: SpellPanelProps) {
  const slots = spellSlots(skillIds);
  const selected = spells.filter((s) => selectedIds.includes(s.id));
  const used = selectionCost(selected);
  const overMemory = used > memoryCapacity;
  const slotsFull = selected.length >= slots;
  const [hoverId, setHoverId] = useState<string | null>(null);
  const shown = spells.find((s) => s.id === hoverId) ?? selected[0] ?? spells[0];

  return (
    <div className="picklist">
      <h2>
        Spells
        <span className="header-badges">
          <span className={`slot-counter${slotsFull ? ' slot-counter--full' : ''}`}>
            Slots {selected.length}/{slots}
          </span>
          <span className={`slot-counter${overMemory ? ' slot-counter--over' : ''}`}>
            Memory {used}/{memoryCapacity}
          </span>
        </span>
      </h2>

      {slots === 0 && (
        <p className="memory-warning">
          Select a memory skill first (Spell Memory / Music Memory / Sorcery) — each grants{' '}
          {SLOTS_PER_MEMORY_SKILL} spell slots.
        </p>
      )}
      {overMemory && (
        <p className="memory-warning">
          Over memory capacity — remove spells or add Knowledge/Memory gear.
        </p>
      )}

      {shown && (
        <DetailCard
          name={shown.name}
          icon={shown.icon}
          effect={shown.description ?? summary(shown)}
          meta={shown.cost !== null ? `Tier ${shown.cost} · ${shown.kind}` : `Free · ${shown.kind}`}
        />
      )}

      <div className="tile-grid">
        {spells.map((spell) => {
          const isSelected = selectedIds.includes(spell.id);
          const locked = !isSelected && (slots === 0 || slotsFull);
          return (
            <button
              key={spell.id}
              type="button"
              className={`tile${isSelected ? ' tile--selected' : ''}${locked ? ' tile--locked' : ''}`}
              onClick={() => onToggle(spell.id)}
              onMouseEnter={() => setHoverId(spell.id)}
              onFocus={() => setHoverId(spell.id)}
              disabled={locked}
              aria-pressed={isSelected}
              title={`${spell.name} — ${summary(spell)}`}
            >
              <AbilityIcon name={spell.name} icon={spell.icon} />
              <span className="tile-name">{spell.name}</span>
              <span className="tile-badge">{spell.cost !== null ? spell.cost : '★'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
