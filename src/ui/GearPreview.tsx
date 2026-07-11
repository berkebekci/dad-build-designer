import type { Attributes } from '../engine/types';
import { ATTRIBUTE_NAMES } from '../engine/types';

interface GearPreviewProps {
  attributeBonuses: Partial<Attributes>;
  onAttributeBonusesChange: (v: Partial<Attributes>) => void;
  armorRating: number;
  onArmorRatingChange: (v: number) => void;
}

/**
 * Temporary playground standing in for the real gear system (Phase 4).
 * It feeds the exact same ExternalModifiers input the item picker will
 * produce, so the engine wiring is already final.
 */
export function GearPreview({
  attributeBonuses,
  onAttributeBonusesChange,
  armorRating,
  onArmorRatingChange,
}: GearPreviewProps) {
  const setBonus = (name: (typeof ATTRIBUTE_NAMES)[number], raw: string) => {
    const value = Number(raw);
    onAttributeBonusesChange({
      ...attributeBonuses,
      [name]: Number.isFinite(value) ? value : 0,
    });
  };

  return (
    <div className="gearpreview">
      <h2>Gear Preview</h2>
      <p className="hint">
        Simulates gear/enchantment totals until the item picker arrives in Phase 4.
      </p>
      <div className="gear-grid">
        {ATTRIBUTE_NAMES.map((name) => (
          <label key={name} className="gear-field">
            +{name.slice(0, 3).toUpperCase()}
            <input
              type="number"
              value={attributeBonuses[name] ?? 0}
              onChange={(e) => setBonus(name, e.target.value)}
            />
          </label>
        ))}
        <label className="gear-field">
          Armor
          <input
            type="number"
            value={armorRating}
            onChange={(e) => {
              const v = Number(e.target.value);
              onArmorRatingChange(Number.isFinite(v) ? v : 0);
            }}
          />
        </label>
      </div>
    </div>
  );
}
