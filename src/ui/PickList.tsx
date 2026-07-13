import { useState, type ReactNode } from 'react';

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
export function AbilityIcon({ name, icon, size }: { name: string; icon?: string; size?: number }) {
  const style = size ? { width: size, height: size } : undefined;
  if (icon) {
    return <img className="tile-icon" src={icon} alt="" loading="lazy" style={style} />;
  }
  const letters = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="tile-icon tile-icon--fallback" style={style}>
      {letters}
    </span>
  );
}

/** Rich detail card for the hovered/selected ability — shows the full effect. */
export function DetailCard({
  name,
  icon,
  effect,
  meta,
  children,
}: {
  name: string;
  icon?: string;
  effect: string;
  meta?: string;
  children?: ReactNode;
}) {
  return (
    <div className="detail-card">
      <div className="detail-head">
        <AbilityIcon name={name} icon={icon} size={44} />
        <div>
          <div className="detail-name">{name}</div>
          {meta && <div className="detail-meta">{meta}</div>}
        </div>
      </div>
      <div className="detail-effect">{effect}</div>
      {children}
    </div>
  );
}

/**
 * Game-style icon grid for perks/skills. Hovering (or selecting) a tile fills
 * a detail card above the grid with the full effect text — the descriptions
 * are always one glance away instead of buried in a tooltip.
 */
export function PickList({ title, items, selectedIds, capacity, onToggle }: PickListProps) {
  const full = selectedIds.length >= capacity;
  const [hoverId, setHoverId] = useState<string | null>(null);

  const shown =
    items.find((i) => i.id === hoverId) ??
    items.find((i) => selectedIds.includes(i.id)) ??
    items[0];

  return (
    <div className="picklist">
      <h2>
        {title}
        <span className={`slot-counter${full ? ' slot-counter--full' : ''}`}>
          {selectedIds.length}/{capacity}
        </span>
      </h2>

      {shown && <DetailCard name={shown.name} icon={shown.icon} effect={shown.effect} />}

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
              onMouseEnter={() => setHoverId(item.id)}
              onFocus={() => setHoverId(item.id)}
              disabled={locked}
              aria-pressed={selected}
              title={item.effect}
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
