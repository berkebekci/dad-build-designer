import { useState } from 'react';

/**
 * Controlled number input without the classic warts:
 * - select-all on focus, so typing replaces the "0" instead of producing "050"
 * - free typing (including a lone "-") — the value only commits when parseable,
 *   and the text normalizes back to the committed value on blur
 */
export function NumberField({
  value,
  min,
  max,
  step = 1,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      type="number"
      value={draft ?? String(value)}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const v = Number(raw);
        if (raw !== '' && raw !== '-' && Number.isFinite(v)) {
          onChange(Math.min(max, Math.max(min, v)));
        }
      }}
      onBlur={() => setDraft(null)}
    />
  );
}
