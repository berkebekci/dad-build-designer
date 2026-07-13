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
  rarityOrder,
  rarityTiers,
} from '../engine/data';
import { NumberField } from './NumberField';

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

const MAX_SUGGESTIONS = 8;

function fmtBase(item: ItemRecord): string {
  return (item.base ?? [])
    .map(([attr, , max]) => `${attrLabel(attr)} ${max > 0 ? '+' : ''}${max}`)
    .join(', ');
}

/**
 * Switching rarity keeps the enchant choices that still exist in the new
 * item's pool, clamped into the new roll ranges; row count follows the
 * new rarity.
 */
function carryEnchants(
  old: UiEquipped | undefined,
  newItem: ItemRecord,
): (EnchantChoice | null)[] {
  const slots = enchantSlotCount(newItem.rarity);
  // Artifacts: preset unchangeable enchantments, always auto-filled.
  if (hasFixedEnchants(newItem.rarity)) {
    return autoFillFixedEnchants(newItem, slots);
  }
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

/** An archetype that exists in a single rarity is a named/crafted variant. */
function isNamed(variants: ItemRecord[]): boolean {
  return variants.length === 1;
}

function ItemIcon({ name }: { name: string }) {
  const url = itemIcons[name];
  if (url) return <img className="item-icon" src={url} alt="" loading="lazy" />;
  return <span className="item-icon item-icon--fallback">{name[0]}</span>;
}

/** Rarity chips for one archetype; the equipped rarity is highlighted. */
function RarityChips({
  variants,
  activeId,
  onPick,
}: {
  variants: ItemRecord[];
  activeId?: string;
  onPick: (item: ItemRecord) => void;
}) {
  return (
    <div className="rarity-chips">
      {variants.map((v) => (
        <button
          key={v.id}
          type="button"
          className={`rarity-chip${v.id === activeId ? ' rarity-chip--active' : ''}`}
          style={{ borderColor: rarityColor(v.rarity), color: rarityColor(v.rarity) }}
          title={`GS ${v.gearScore}`}
          onClick={() => onPick(v)}
        >
          {v.rarity}
        </button>
      ))}
    </div>
  );
}

/** Search-first item picker: type a name, pick the archetype, then a rarity. */
function ItemPicker({
  slot,
  options,
  equipped,
  onEquip,
  onClear,
}: {
  slot: GearSlotId;
  options: ItemRecord[];
  equipped: UiEquipped | undefined;
  onEquip: (item: ItemRecord) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);

  // One entry per archetype name, variants sorted by rarity.
  const byName = useMemo(() => {
    const map = new Map<string, ItemRecord[]>();
    for (const item of options) {
      const list = map.get(item.name) ?? [];
      list.push(item);
      map.set(item.name, list);
    }
    for (const list of map.values()) list.sort((a, b) => rarityOrder(a.rarity) - rarityOrder(b.rarity));
    return map;
  }, [options]);

  const equippedItem = equipped ? itemIndex.get(equipped.itemId) : undefined;

  if (equippedItem) {
    const variants = byName.get(equippedItem.name) ?? [equippedItem];
    return (
      <div className="itempicker">
        <div className="itempicker-equipped">
          <ItemIcon name={equippedItem.name} />
          <span className="item-name" style={{ color: rarityColor(equippedItem.rarity) }}>
            {equippedItem.name}
          </span>
          <button type="button" className="clear-btn" onClick={onClear} title="Unequip">
            ×
          </button>
        </div>
        <RarityChips variants={variants} activeId={equippedItem.id} onPick={onEquip} />
        <div className="item-summary">{fmtBase(equippedItem)}</div>
      </div>
    );
  }

  // With an empty query the FULL archetype list opens on focus (scrollable),
  // so newcomers can browse; typing or the rarity filter narrows it down.
  const names = [...byName.keys()].filter(
    (n) => !rarityFilter || byName.get(n)!.some((v) => v.rarity === rarityFilter),
  );
  const matches = query.trim()
    ? names.filter((n) => n.toLowerCase().includes(query.trim().toLowerCase())).slice(0, MAX_SUGGESTIONS)
    : focused || rarityFilter !== null
      ? names
      : [];

  if (pickedName && byName.has(pickedName)) {
    return (
      <div className="itempicker">
        <div className="itempicker-equipped">
          <ItemIcon name={pickedName} />
          <span className="item-name">{pickedName}</span>
          <button type="button" className="clear-btn" onClick={() => setPickedName(null)}>
            ×
          </button>
        </div>
        <RarityChips
          variants={byName.get(pickedName)!}
          onPick={(item) => {
            setPickedName(null);
            setQuery('');
            onEquip(item);
          }}
        />
      </div>
    );
  }

  return (
    <div className="itempicker">
      <input
        type="text"
        className="item-search"
        placeholder={`Search ${byName.size} items…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches.length > 0) setPickedName(matches[0]!);
          if (e.key === 'Escape') setFocused(false);
        }}
        aria-label={`Search item for ${SLOT_LABELS[slot]}`}
      />
      {(focused || rarityFilter !== null) && (
        // onMouseDown keeps the input focused so blur doesn't close the row first
        <div className="rarity-filter" onMouseDown={(e) => e.preventDefault()}>
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
      )}
      {matches.length > 0 && (
        <ul className="suggestions">
          {matches.map((name) => {
            const variants = byName.get(name)!;
            return (
              <li key={name}>
                {/* onMouseDown keeps the input focused so blur doesn't close the list first */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setPickedName(name)}
                >
                  <ItemIcon name={name} />
                  <span className="suggestion-name">{name}</span>
                  {isNamed(variants) && (
                    <span
                      className="named-badge"
                      style={{
                        borderColor: rarityColor(variants[0]!.rarity),
                        color: rarityColor(variants[0]!.rarity),
                      }}
                    >
                      named · {variants[0]!.rarity}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
  // Artifacts: enchantments are preset and unchangeable — show read-only.
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

  // Game rule: base stats can't repeat as enchantments (enchantablePool).
  const pool = enchantablePool(item);
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
  /** Bumped by Reset/class switch — remounts pickers to clear mid-pick state. */
  resetNonce?: number;
}

export function GearPanel({ classData, perkIds, loadout, onChange, resetNonce = 0 }: GearPanelProps) {
  // Eligibility depends on perks (Weapon Mastery, Slayer, Demon Armor...).
  const eligibleBySlot = useMemo(() => {
    const map = new Map<GearSlotId, ItemRecord[]>();
    for (const slot of GEAR_SLOTS) {
      map.set(
        slot,
        eligibleItems(items, classData, slot, perkIds).sort(
          (a, b) => a.name.localeCompare(b.name) || rarityOrder(a.rarity) - rarityOrder(b.rarity),
        ),
      );
    }
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

  return (
    <div className="gearpanel">
      <h2>Equipment</h2>
      {GEAR_SLOTS.map((slot) => {
        const equipped = loadout[slot];
        const item = equipped ? itemIndex.get(equipped.itemId) : undefined;
        const disabled = slot === 'secondary' && twoHanded;
        const usedAttrs = new Set(
          (equipped?.enchants ?? [])
            .filter((e): e is EnchantChoice => e !== null)
            .map((e) => e.attr),
        );

        return (
          <div key={slot} className={`gear-slot${disabled ? ' gear-slot--disabled' : ''}`}>
            <label className="gear-slot-label">
              {SLOT_LABELS[slot]}
              {disabled && <span className="gear-note"> (two-handed)</span>}
            </label>
            {!disabled && (
              <ItemPicker
                key={`${slot}:${resetNonce}`}
                slot={slot}
                options={eligibleBySlot.get(slot) ?? []}
                equipped={equipped}
                onEquip={(it) => equip(slot, it)}
                onClear={() => clear(slot)}
              />
            )}
            {item && !disabled && hasFixedEnchants(item.rarity) && (
              <div className="fixed-enchants-note">Fixed enchantments (artifact)</div>
            )}
            {item &&
              !disabled &&
              (equipped?.enchants ?? []).map((choice, idx) => (
                <EnchantRow
                  key={idx}
                  item={item}
                  choice={choice}
                  usedAttrs={usedAttrs}
                  locked={hasFixedEnchants(item.rarity)}
                  onPick={(next) => setEnchant(slot, idx, next)}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}
