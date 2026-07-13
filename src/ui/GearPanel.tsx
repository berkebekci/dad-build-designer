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

/** Paperdoll layout order (grid areas defined in CSS by slot id). */
const PAPERDOLL_SLOTS: GearSlotId[] = [
  'back', 'head', 'necklace',
  'primary', 'chest', 'secondary',
  'ring1', 'ring2',
  'hands', 'legs', 'feet',
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

/** One paperdoll slot: shows the equipped item's icon, or the slot name. */
function PaperdollSlot({
  slot,
  item,
  onClick,
}: {
  slot: GearSlotId;
  item: ItemRecord | undefined;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`pd-slot pd-slot--${slot}${item ? ' pd-slot--filled' : ''}`}
      style={{ gridArea: slot, borderColor: item ? rarityColor(item.rarity) : undefined }}
      onClick={onClick}
      title={item ? `${item.name} (${item.rarity})` : SLOT_LABELS[slot]}
    >
      {item ? (
        <>
          <SlotIcon name={item.name} />
          <span className="pd-slot-name" style={{ color: rarityColor(item.rarity) }}>
            {item.name}
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
  return (
    <div className="enchant-row">
      <select
        value={choice?.attr ?? ''}
        onChange={(e) => {
          const attr = e.target.value;
          if (!attr) return onPick(null);
          const entry = pool.find(([a]) => a === attr);
          onPick({ attr, value: entry ? entry[2] : 0 });
        }}
      >
        <option value="">— enchantment —</option>
        {pool
          .filter(([attr]) => attr === choice?.attr || !usedAttrs.has(attr))
          .map(([attr, min, max]) => (
            <option key={attr} value={attr}>
              {attrLabel(attr)} ({min}–{max})
            </option>
          ))}
      </select>
      {choice && range && (
        <NumberField
          value={choice.value}
          min={range[1]}
          max={range[2]}
          step={Number.isInteger(range[1]) && Number.isInteger(range[2]) ? 1 : 0.1}
          onChange={(v) => onPick({ attr: choice.attr, value: v })}
          ariaLabel={`${attrLabel(choice.attr)} roll`}
        />
      )}
    </div>
  );
}

interface GearPanelProps {
  classData: ClassData;
  perkIds: string[];
  loadout: UiLoadout;
  onChange: (next: UiLoadout) => void;
}

export function GearPanel({ classData, perkIds, loadout, onChange }: GearPanelProps) {
  const [pickerSlot, setPickerSlot] = useState<GearSlotId | null>(null);

  const eligibleBySlot = useMemo(() => {
    const map = new Map<GearSlotId, ItemRecord[]>();
    for (const slot of GEAR_SLOTS) map.set(slot, eligibleItems(items, classData, slot, perkIds));
    return map;
  }, [classData, perkIds]);

  const primaryItem = loadout.primary ? itemIndex.get(loadout.primary.itemId) : undefined;
  const twoHanded = isTwoHanded(primaryItem);

  const equip = (slot: GearSlotId, item: ItemRecord) => {
    const next: UiLoadout = { ...loadout };
    next[slot] = { itemId: item.id, enchants: carryEnchants(loadout[slot], item) };
    if (slot === 'primary' && isTwoHanded(item)) delete next.secondary;
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
        <div className="pd-grid">
          {PAPERDOLL_SLOTS.map((slot) => {
            const eq = loadout[slot];
            const item = eq ? itemIndex.get(eq.itemId) : undefined;
            const disabled = slot === 'secondary' && twoHanded;
            return (
              <PaperdollSlot
                key={slot}
                slot={slot}
                item={disabled ? undefined : item}
                onClick={() => !disabled && setPickerSlot(slot)}
              />
            );
          })}
        </div>
        {twoHanded && <p className="hint pd-note">Two-handed weapon — off-hand disabled.</p>}
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
