interface PickItem {
  id: string;
  name: string;
  effect: string;
}

interface PickListProps {
  title: string;
  items: PickItem[];
  selectedIds: string[];
  capacity: number;
  onToggle: (id: string) => void;
}

/**
 * Generic selectable card list used for both perks and skills —
 * same rules (toggle, capacity limit), so one component serves both.
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
      <ul>
        {items.map((item) => {
          const selected = selectedIds.includes(item.id);
          const locked = !selected && full;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`card${selected ? ' card--selected' : ''}${locked ? ' card--locked' : ''}`}
                onClick={() => onToggle(item.id)}
                disabled={locked}
                aria-pressed={selected}
              >
                <span className="card-name">{item.name}</span>
                <span className="card-effect">{item.effect}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
