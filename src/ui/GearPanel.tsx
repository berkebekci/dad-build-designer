import { useMemo } from 'react';
import type { ClassData } from '../engine/types';
import {
  GEAR_SLOTS,
  attrLabel,
  type EnchantChoice,
  type GearSlotId,
  type ItemRecord,
} from '../engine/itemStats';
import { eligibleItems, isTwoHanded } from '../engine/gearRules';
import { enchantSlotCount, itemIndex, items, rarityColor, rarityOrder } from '../engine/data';

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

interface GearPanelProps {
  classData: ClassData;
  perkIds: string[];
  loadout: UiLoadout;
  onChange: (next: UiLoadout) => void;
}

function fmtBase(item: ItemRecord): string {
  return (item.base ?? [])
    .map(([attr, , max]) => `${attrLabel(attr)} ${max > 0 ? '+' : ''}${max}`)
    .join(', ');
}

function EnchantRow({
  item,
  choice,
  usedAttrs,
  onPick,
}: {
  item: ItemRecord;
  choice: EnchantChoice | null;
  usedAttrs: Set<string>;
  onPick: (next: EnchantChoice | null) => void;
}) {
  const pool = item.pool ?? [];
  const range = choice ? pool.find(([a]) => a === choice.attr) : undefined;

  return (
    <div className="enchant-row">
      <select
        value={choice?.attr ?? ''}
        onChange={(e) => {
          const attr = e.target.value;
          if (!attr) {
            onPick(null);
            return;
          }
          const entry = pool.find(([a]) => a === attr);
          onPick({ attr, value: entry ? entry[2] : 0 }); // default: max roll
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
        <input
          type="number"
          value={choice.value}
          min={range[1]}
          max={range[2]}
          step={Number.isInteger(range[1]) && Number.isInteger(range[2]) ? 1 : 0.1}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isFinite(v)) return;
            onPick({ attr: choice.attr, value: Math.min(range[2], Math.max(range[1], v)) });
          }}
        />
      )}
    </div>
  );
}

export function GearPanel({ classData, perkIds, loadout, onChange }: GearPanelProps) {
  // Eligibility depends on perks (Weapon Mastery, Slayer) — recompute per slot.
  const eligibleBySlot = useMemo(() => {
    const map = new Map<GearSlotId, ItemRecord[]>();
    for (const slot of GEAR_SLOTS) {
      const list = eligibleItems(items, classData, slot, perkIds).sort(
        (a, b) => a.name.localeCompare(b.name) || rarityOrder(a.rarity) - rarityOrder(b.rarity),
      );
      map.set(slot, list);
    }
    return map;
  }, [classData, perkIds]);

  const primaryItem = loadout.primary ? itemIndex.get(loadout.primary.itemId) : undefined;
  const twoHanded = isTwoHanded(primaryItem);

  const setSlot = (slot: GearSlotId, itemId: string) => {
    const next: UiLoadout = { ...loadout };
    if (!itemId) {
      delete next[slot];
    } else {
      const item = itemIndex.get(itemId);
      next[slot] = {
        itemId,
        enchants: Array(enchantSlotCount(item?.rarity ?? 'common')).fill(null),
      };
      if (slot === 'primary' && isTwoHanded(item)) delete next.secondary;
    }
    onChange(next);
  };

  const setEnchant = (slot: GearSlotId, idx: number, choice: EnchantChoice | null) => {
    const current = loadout[slot];
    if (!current) return;
    const enchants = [...current.enchants];
    enchants[idx] = choice;
    onChange({ ...loadout, [slot]: { ...current, enchants } });
  };

  return (
    <div className="gearpanel">
      <h2>Equipment</h2>
      {GEAR_SLOTS.map((slot) => {
        const equipped = loadout[slot];
        const item = equipped ? itemIndex.get(equipped.itemId) : undefined;
        const options = eligibleBySlot.get(slot) ?? [];
        const disabled = slot === 'secondary' && twoHanded;
        const usedAttrs = new Set(
          (equipped?.enchants ?? []).filter((e): e is EnchantChoice => e !== null).map((e) => e.attr),
        );

        return (
          <div key={slot} className="gear-slot">
            <label className="gear-slot-label">
              {SLOT_LABELS[slot]}
              {disabled && <span className="gear-note"> (two-handed)</span>}
            </label>
            <select
              value={equipped?.itemId ?? ''}
              disabled={disabled}
              onChange={(e) => setSlot(slot, e.target.value)}
            >
              <option value="">— empty —</option>
              {options.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} · {it.rarity} (GS {it.gearScore})
                </option>
              ))}
            </select>
            {item && (
              <div className="item-summary">
                <span className="item-rarity" style={{ color: rarityColor(item.rarity) }}>
                  {item.rarity}
                </span>{' '}
                {fmtBase(item)}
              </div>
            )}
            {item &&
              (equipped?.enchants ?? []).map((choice, idx) => (
                <EnchantRow
                  key={idx}
                  item={item}
                  choice={choice}
                  usedAttrs={usedAttrs}
                  onPick={(next) => setEnchant(slot, idx, next)}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}
