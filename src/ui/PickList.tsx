interface PickItem {
  id: string;
  name: string;
  effect: string;
  icon?: string;
}

interface PickListProps {
  title: string;
  items: PickItem[];
  selectedIds: string[];
  capacity: number;
  onToggle: (id: string) => void;
}

/** Icon tile with a letter fallback when no game icon is available. */
export function AbilityIcon({ name, icon }: { name: string; icon?: string }) {
  if (icon) {
    return <img className="tile-icon" src={icon} alt="" loading="lazy" />;
  }
  const letters = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return <span className="tile-icon tile-icon--fallback">{letters}</span>;
}

/**
 * Game-style icon grid used for both perks and skills — same rules
 * (toggle, capacity limit), one component. Effects show on hover.
 */
export function PickList({ title, items, selectedIds, capacity, onToggle }: PickListProps) {
  const full = selectedIds.length >= capacity;

  return (
    <div className="picklist">
      <h2>
        {title}
        <span className={`slot-counter${full ? ' slot-counter--full' : ''}`}>
          {selectedIds.length}/{capacity}
        </span>
      </h2>
      <div className="tile-grid">
        {items.map((item) => {
          const selected = selectedIds.includes(item.id);
          const locked = !selected && full;
          return (
            <button
              key={item.id}
              type="button"
              className={`tile${selected ? ' tile--selected' : ''}${locked ? ' tile--locked' : ''}`}
              onClick={() => onToggle(item.id)}
              disabled={locked}
              aria-pressed={selected}
              title={`${item.name} — ${item.effect}`}
            >
              <AbilityIcon name={item.name} icon={item.icon} />
              <span className="tile-name">{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
