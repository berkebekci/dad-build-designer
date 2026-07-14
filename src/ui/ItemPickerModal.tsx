import { useMemo, useState } from 'react';
import type { GearSlotId, ItemRecord } from '../engine/itemStats';
import { attrLabel } from '../engine/itemStats';
import { itemIcons, rarityColor, rarityOrder, rarityTiers } from '../engine/data';

const SLOT_LABELS: Record<GearSlotId, string> = {
  primary: 'Primary Weapon',
  secondary: 'Off-Hand',
  head: 'Head',
  chest: 'Chest',
  legs: 'Legs',
  hands: 'Hands',
  feet: 'Feet',
  back: 'Back',
  necklace: 'Necklace',
  ring1: 'Ring 1',
  ring2: 'Ring 2',
};

function ItemImg({ name, size }: { name: string; size: number }) {
  const url = itemIcons[name];
  if (url) return <img className="modal-item-img" src={url} alt="" loading="lazy" style={{ width: size, height: size }} />;
  return (
    <span className="modal-item-img modal-item-img--fallback" style={{ width: size, height: size }}>
      {name[0]}
    </span>
  );
}

function baseStats(item: ItemRecord): string {
  return (item.base ?? [])
    .map(([attr, , max]) => `${attrLabel(attr)} ${max > 0 ? '+' : ''}${max}`)
    .join('  ·  ');
}

interface ItemPickerModalProps {
  slot: GearSlotId;
  options: ItemRecord[];
  equippedId?: string;
  onEquip: (item: ItemRecord) => void;
  onClose: () => void;
  onUnequip?: () => void;
}

/**
 * Full-screen modal shown when an equipment slot is clicked. Big item cards
 * (icon + name + base stats + rarity), rarity filter chips and a search box
 * live inside the modal. One card per archetype; rarity picked via the chips
 * or a per-card rarity strip.
 */
export function ItemPickerModal({
  slot,
  options,
  equippedId,
  onEquip,
  onClose,
  onUnequip,
}: ItemPickerModalProps) {
  const [query, setQuery] = useState('');
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);

  // One entry per archetype, variants sorted by rarity; pick the highest
  // rarity that passes the current filter as the card's default.
  const cards = useMemo(() => {
    const byName = new Map<string, ItemRecord[]>();
    for (const item of options) {
      const list = byName.get(item.name) ?? [];
      list.push(item);
      byName.set(item.name, list);
    }
    const out: { name: string; variants: ItemRecord[] }[] = [];
    for (const [name, variants] of byName) {
      variants.sort((a, b) => rarityOrder(a.rarity) - rarityOrder(b.rarity));
      out.push({ name, variants });
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [options]);

  const q = query.trim().toLowerCase();
  const visible = cards.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q)) return false;
    if (rarityFilter && !c.variants.some((v) => v.rarity === rarityFilter)) return false;
    return true;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Choose {SLOT_LABELS[slot]}</h2>
          <div className="modal-head-actions">
            {onUnequip && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  onUnequip();
                  onClose();
                }}
              >
                Unequip
              </button>
            )}
            <button type="button" className="clear-btn" onClick={onClose} title="Close">
              ×
            </button>
          </div>
        </div>

        <div className="modal-controls">
          <input
            type="text"
            className="item-search"
            placeholder={`Search ${cards.length} items…`}
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="rarity-filter">
            <button
              type="button"
              className={`rarity-chip${rarityFilter === null ? ' rarity-chip--active' : ''}`}
              onClick={() => setRarityFilter(null)}
            >
              all
            </button>
            {rarityTiers
              .filter((t) => t.order >= 2)
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`rarity-chip${rarityFilter === t.id ? ' rarity-chip--active' : ''}`}
                  style={{ borderColor: t.color, color: t.color }}
                  onClick={() => setRarityFilter(rarityFilter === t.id ? null : t.id)}
                >
                  {t.id}
                </button>
              ))}
          </div>
        </div>

        <div className="modal-grid">
          {visible.length === 0 && <p className="hint">No items match.</p>}
          {visible.map(({ name, variants }) => {
            // Clicking the card equips the item at the filtered rarity (or the
            // highest available when the filter is "all"). The rarity filter at
            // the top is the rarity selector, so cards don't repeat it.
            const filtered = rarityFilter
              ? variants.find((v) => v.rarity === rarityFilter)
              : undefined;
            const pick = filtered ?? variants[variants.length - 1]!;
            const isEquipped = variants.some((v) => v.id === equippedId);
            return (
              <button
                key={name}
                type="button"
                className={`modal-card${isEquipped ? ' modal-card--equipped' : ''}`}
                style={{ borderColor: rarityColor(pick.rarity) }}
                title={`${name} · ${pick.rarity} (Gear Score ${pick.gearScore})`}
                onClick={() => {
                  onEquip(pick);
                  onClose();
                }}
              >
                <ItemImg name={name} size={72} />
                <div className="modal-card-body">
                  <div className="modal-card-name" style={{ color: rarityColor(pick.rarity) }}>
                    {name}
                  </div>
                  <div className="modal-card-stats">{baseStats(pick) || '—'}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
