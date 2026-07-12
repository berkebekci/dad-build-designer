import type { SpellData } from '../engine/spells';
import { selectionCost } from '../engine/spells';

interface SpellPanelProps {
  spells: SpellData[];
  selectedIds: string[];
  memoryCapacity: number;
  onToggle: (id: string) => void;
}

function summary(spell: SpellData): string {
  if (spell.hits.length === 0) return spell.kind;
  const parts = spell.hits.map(
    (h) => `${h.label}: ${h.base}${h.heal ? ' heal' : ''} (${h.scaling}%)`,
  );
  return `${spell.kind} — ${parts.join(', ')}`;
}

/**
 * Spell memorization: the sum of selected spell costs must fit in the
 * build's Memory Capacity (Bard songs and Sorcerer merged spells are
 * cost-free and don't count).
 */
export function SpellPanel({ spells, selectedIds, memoryCapacity, onToggle }: SpellPanelProps) {
  const selected = spells.filter((s) => selectedIds.includes(s.id));
  const used = selectionCost(selected);
  const over = used > memoryCapacity;

  return (
    <div className="picklist">
      <h2>
        Spells
        <span className={`slot-counter${over ? ' slot-counter--over' : ''}`}>
          Memory {used}/{memoryCapacity}
        </span>
      </h2>
      {over && (
        <p className="memory-warning">
          Over memory capacity — remove spells or add Knowledge/Memory gear.
        </p>
      )}
      <ul>
        {spells.map((spell) => {
          const isSelected = selectedIds.includes(spell.id);
          return (
            <li key={spell.id}>
              <button
                type="button"
                className={`card${isSelected ? ' card--selected' : ''}`}
                onClick={() => onToggle(spell.id)}
                aria-pressed={isSelected}
              >
                <span className="card-name">
                  {spell.name}
                  <span className="spell-cost">
                    {spell.cost !== null ? ` · cost ${spell.cost}` : ' · free'}
                  </span>
                </span>
                <span className="card-effect">{summary(spell)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
