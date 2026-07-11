import type { UiLoadout } from '../ui/GearPanel';
import type { EnchantChoice, GearSlotId } from './itemStats';

/**
 * Serializable build state for sharing (URL hash) and persistence
 * (localStorage). Kept intentionally compact: short keys, enchants as
 * [attr, value] pairs, nulls preserved as empty slots.
 */
export interface BuildState {
  classId: string;
  perkIds: string[];
  skillIds: string[];
  loadout: UiLoadout;
}

interface WireFormat {
  v: 1;
  c: string;
  p: string[];
  s: string[];
  g: Partial<Record<GearSlotId, { i: string; e: ([string, number] | null)[] }>>;
}

function toWire(state: BuildState): WireFormat {
  const g: WireFormat['g'] = {};
  for (const [slot, eq] of Object.entries(state.loadout) as [
    GearSlotId,
    UiLoadout[GearSlotId],
  ][]) {
    if (!eq) continue;
    g[slot] = {
      i: eq.itemId,
      e: eq.enchants.map((en) => (en ? [en.attr, en.value] : null)),
    };
  }
  return { v: 1, c: state.classId, p: state.perkIds, s: state.skillIds, g };
}

function fromWire(wire: WireFormat): BuildState {
  const loadout: UiLoadout = {};
  for (const [slot, eq] of Object.entries(wire.g ?? {}) as [
    GearSlotId,
    WireFormat['g'][GearSlotId],
  ][]) {
    if (!eq) continue;
    loadout[slot] = {
      itemId: eq.i,
      enchants: (eq.e ?? []).map((en): EnchantChoice | null =>
        en ? { attr: en[0], value: en[1] } : null,
      ),
    };
  }
  return {
    classId: wire.c,
    perkIds: wire.p ?? [],
    skillIds: wire.s ?? [],
    loadout,
  };
}

/** Unicode-safe base64url of the JSON wire format. */
export function encodeBuild(state: BuildState): string {
  const json = JSON.stringify(toWire(state));
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeBuild(code: string): BuildState | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    const wire = JSON.parse(new TextDecoder().decode(bytes)) as WireFormat;
    if (wire.v !== 1 || typeof wire.c !== 'string') return null;
    return fromWire(wire);
  } catch {
    return null;
  }
}
