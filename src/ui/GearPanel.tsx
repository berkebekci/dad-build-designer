import { useMemo, useState } from 'react';
import type { ClassData } from '../engine/types';
import {
  GEAR_SLOTS,
  attrLabel,
  autoFillFixedEnchants,
  enchantablePool,
  type EnchantChoice,
  type GearSlotId,
  type ItemRecord,
} from '../engine/itemStats';
import { eligibleItems, isTwoHanded } from '../engine/gearRules';
import {
  enchantSlotCount,
  hasFixedEnchants,
  itemIcons,
  itemIndex,
  items,
  rarityColor,
} from '../engine/data';
import { NumberField } from './NumberField';
import { ItemPickerModal } from './ItemPickerModal';

/** UI-side loadout: enchant rows may be empty (null) until the user picks. */
export interface UiEquipped {
  itemId: string;
  enchants: (EnchantChoice | null)[];
}
export type UiLoadout = Partial<Record<GearSlotId, UiEquipped>>;

const SLOT_LABELS: Record<GearSlotId, string> = {
  primary: 'Weapon 1 — Main Hand',
  secondary: 'Weapon 1 — Off-Hand',
  primary2: 'Weapon 2 — Main Hand',
  secondary2: 'Weapon 2 — Off-Hand',
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

/** Paperdoll layout order (grid areas defined in CSS by slot id). */
const PAPERDOLL_SLOTS: GearSlotId[] = [
  'primary', 'secondary', 'head', 'necklace', 'primary2', 'secondary2',
  'chest', 'back',
  'ring1', 'ring2',
  'hands', 'legs', 'feet',
];

/** [main-hand, off-hand] slot pairs, one per weapon set. */
const WEAPON_SET_SLOTS: [GearSlotId, GearSlotId][] = [
  ['primary', 'secondary'],
  ['primary2', 'secondary2'],
];

function carryEnchants(old: UiEquipped | undefined, newItem: ItemRecord): (EnchantChoice | null)[] {
  const slots = enchantSlotCount(newItem.rarity);
  if (hasFixedEnchants(newItem.rarity)) return autoFillFixedEnchants(newItem, slots);
  const out: (EnchantChoice | null)[] = Array(slots).fill(null);
  if (!old) return out;
  const pool = enchantablePool(newItem);
  let i = 0;
  for (const en of old.enchants) {
    if (!en || i >= slots) continue;
    const range = pool.find(([a]) => a === en.attr);
    if (!range) continue;
    out[i++] = { attr: en.attr, value: Math.min(range[2], Math.max(range[1], en.value)) };
  }
  return out;
}

function SlotIcon({ name }: { name: string }) {
  const url = itemIcons[name];
  if (url) return <img className="slot-img" src={url} alt="" loading="lazy" />;
  return <span className="slot-img slot-img--fallback">{name[0]}</span>;
}

/** Base stats + chosen enchants as "Label +value" lines for the hover tooltip. */
function statLines(item: ItemRecord, enchants: (EnchantChoice | null)[]): string[] {
  const lines = (item.base ?? []).map(
    ([attr, , max]) => `${attrLabel(attr)} ${max > 0 ? '+' : ''}${max}`,
  );
  for (const en of enchants) {
    if (en) lines.push(`${attrLabel(en.attr)} +${en.value}  (enchant)`);
  }
  return lines;
}

/** One paperdoll slot: shows the equipped item's icon, or the slot name.
 * Hovering a filled slot reveals its stats in a tooltip. */
function PaperdollSlot({
  slot,
  item,
  enchants,
  onClick,
}: {
  slot: GearSlotId;
  item: ItemRecord | undefined;
  enchants: (EnchantChoice | null)[];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`pd-slot pd-slot--${slot}${item ? ' pd-slot--filled' : ''}`}
      style={{ gridArea: slot, borderColor: item ? rarityColor(item.rarity) : undefined }}
      onClick={onClick}
    >
      {item ? (
        <>
          <SlotIcon name={item.name} />
          <span className="pd-slot-name" style={{ color: rarityColor(item.rarity) }}>
            {item.name}
          </span>
          <span className="pd-tooltip">
            <span className="pd-tt-name" style={{ color: rarityColor(item.rarity) }}>
              {item.name} · {item.rarity}
            </span>
            {statLines(item, enchants).map((l, i) => (
              <span key={i} className="pd-tt-line">
                {l}
              </span>
            ))}
          </span>
        </>
      ) : (
        <span className="pd-slot-empty">{SLOT_LABELS[slot]}</span>
      )}
    </button>
  );
}

function EnchantRow({
  item,
  choice,
  usedAttrs,
  locked,
  onPick,
}: {
  item: ItemRecord;
  choice: EnchantChoice | null;
  usedAttrs: Set<string>;
  locked?: boolean;
  onPick: (next: EnchantChoice | null) => void;
}) {
  if (locked) {
    return (
      <div className="enchant-row enchant-row--locked">
        <span className="locked-enchant">
          <span className="lock-icon">🔒</span>
          {choice ? `${attrLabel(choice.attr)} +${choice.value}` : '—'}
        </span>
      </div>
    );
  }
  const pool = enchantablePool(item);
  const range = choice ? pool.find(([a]) => a === choice.attr) : undefined;
  const available = pool.filter(([attr]) => attr === choice?.attr || !usedAttrs.has(attr));
  return (
    <div className="enchant-row">
      {choice ? (
        <>
          <span className="enchant-chosen">
            {attrLabel(choice.attr)}
            <button type="button" className="enchant-clear" onClick={() => onPick(null)} title="Remove">
              ×
            </button>
          </span>
          {range && (
            <NumberField
              value={choice.value}
              min={range[1]}
              max={range[2]}
              step={Number.isInteger(range[1]) && Number.isInteger(range[2]) ? 1 : 0.1}
              onChange={(v) => onPick({ attr: choice.attr, value: v })}
              ariaLabel={`${attrLabel(choice.attr)} roll`}
            />
          )}
        </>
      ) : (
        <EnchantSearch
          options={available}
          onPick={(attr) => {
            const entry = pool.find(([a]) => a === attr);
            onPick({ attr, value: entry ? entry[2] : 0 });
          }}
        />
      )}
    </div>
  );
}

/** Searchable enchantment picker: type to filter the (up to 29) pool options. */
function EnchantSearch({
  options,
  onPick,
}: {
  options: [string, number, number][];
  onPick: (attr: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const q = query.trim().toLowerCase();
  const matches = q
    ? options.filter(([attr]) => attrLabel(attr).toLowerCase().includes(q))
    : options;
  return (
    <div className="enchant-search">
      <input
        type="text"
        placeholder="search enchantment…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
      {open && matches.length > 0 && (
        <ul className="enchant-options">
          {matches.map(([attr, min, max]) => (
            <li key={attr}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(attr)}>
                {attrLabel(attr)} <span className="enchant-range">({min}–{max})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface GearPanelProps {
  classData: ClassData;
  perkIds: string[];
  loadout: UiLoadout;
  onChange: (next: UiLoadout) => void;
  /** Which weapon set (1 or 2) currently feeds the character's live stats. */
  activeWeaponSet: 1 | 2;
  onSetActiveWeaponSet: (set: 1 | 2) => void;
}

export function GearPanel({
  classData,
  perkIds,
  loadout,
  onChange,
  activeWeaponSet,
  onSetActiveWeaponSet,
}: GearPanelProps) {
  const [pickerSlot, setPickerSlot] = useState<GearSlotId | null>(null);

  const eligibleBySlot = useMemo(() => {
    const map = new Map<GearSlotId, ItemRecord[]>();
    for (const slot of GEAR_SLOTS) map.set(slot, eligibleItems(items, classData, slot, perkIds));
    return map;
  }, [classData, perkIds]);

  // Two-handed check is independent per weapon set (main-hand -> its own off-hand).
  const disabledOffHands = new Set(
    WEAPON_SET_SLOTS.filter(([main]) => {
      const item = loadout[main] ? itemIndex.get(loadout[main]!.itemId) : undefined;
      return isTwoHanded(item);
    }).map(([, off]) => off),
  );

  const equip = (slot: GearSlotId, item: ItemRecord) => {
    const next: UiLoadout = { ...loadout };
    next[slot] = { itemId: item.id, enchants: carryEnchants(loadout[slot], item) };
    const pair = WEAPON_SET_SLOTS.find(([main]) => main === slot);
    if (pair && isTwoHanded(item)) delete next[pair[1]];
    onChange(next);
  };

  const clear = (slot: GearSlotId) => {
    const next: UiLoadout = { ...loadout };
    delete next[slot];
    onChange(next);
  };

  const setEnchant = (slot: GearSlotId, idx: number, choice: EnchantChoice | null) => {
    const current = loadout[slot];
    if (!current) return;
    const enchants = [...current.enchants];
    enchants[idx] = choice;
    onChange({ ...loadout, [slot]: { ...current, enchants } });
  };

  // Equipped items that have enchant slots -> shown in the enchant column.
  const enchantable = PAPERDOLL_SLOTS.filter((slot) => {
    const eq = loadout[slot];
    if (!eq) return false;
    const item = itemIndex.get(eq.itemId);
    return item && enchantSlotCount(item.rarity) > 0;
  });

  return (
    <div className="gear-layout">
      <div className="paperdoll">
        <div className="weapon-set-switch" role="group" aria-label="Active weapon set">
          {([1, 2] as const).map((set) => (
            <button
              key={set}
              type="button"
              className={`ws-opt${activeWeaponSet === set ? ' ws-opt--active' : ''}`}
              onClick={() => onSetActiveWeaponSet(set)}
            >
              Weapon Set {set}
            </button>
          ))}
        </div>
        <p className="hint pd-note">
          Only the active set's stats/enchants feed your Stats and Calculations — the other
          set is a saved backup loadout.
        </p>
        <div className="pd-grid">
          {PAPERDOLL_SLOTS.map((slot) => {
            const eq = loadout[slot];
            const item = eq ? itemIndex.get(eq.itemId) : undefined;
            const disabled = disabledOffHands.has(slot);
            return (
              <PaperdollSlot
                key={slot}
                slot={slot}
                item={disabled ? undefined : item}
                enchants={eq?.enchants ?? []}
                onClick={() => !disabled && setPickerSlot(slot)}
              />
            );
          })}
        </div>
        {disabledOffHands.size > 0 && (
          <p className="hint pd-note">Two-handed weapon — its off-hand is disabled.</p>
        )}
      </div>

      <div className="enchant-column">
        <h2>Enchantments</h2>
        {enchantable.length === 0 && (
          <p className="hint">Equip Uncommon+ gear to add enchantments.</p>
        )}
        {enchantable.map((slot) => {
          const eq = loadout[slot]!;
          const item = itemIndex.get(eq.itemId)!;
          const usedAttrs = new Set(
            eq.enchants.filter((e): e is EnchantChoice => e !== null).map((e) => e.attr),
          );
          const locked = hasFixedEnchants(item.rarity);
          return (
            <div key={slot} className="enchant-group">
              <div className="enchant-group-head">
                <span style={{ color: rarityColor(item.rarity) }}>{item.name}</span>
                <span className="enchant-group-slot">{SLOT_LABELS[slot]}</span>
              </div>
              {locked && <div className="fixed-enchants-note">Fixed (artifact)</div>}
              {eq.enchants.map((choice, idx) => (
                <EnchantRow
                  key={idx}
                  item={item}
                  choice={choice}
                  usedAttrs={usedAttrs}
                  locked={locked}
                  onPick={(next) => setEnchant(slot, idx, next)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {pickerSlot && (
        <ItemPickerModal
          slot={pickerSlot}
          options={eligibleBySlot.get(pickerSlot) ?? []}
          equippedId={loadout[pickerSlot]?.itemId}
          onEquip={(item) => equip(pickerSlot, item)}
          onClose={() => setPickerSlot(null)}
          onUnequip={loadout[pickerSlot] ? () => clear(pickerSlot) : undefined}
        />
      )}
    </div>
  );
}
