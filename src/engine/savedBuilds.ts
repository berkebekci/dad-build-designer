/**
 * A named library of saved builds, separate from the single "current build"
 * autosave. Each entry stores the build as the same compact `encodeBuild()`
 * string used for sharing — one codec, no duplicated schema.
 */
export interface SavedBuild {
  id: string;
  name: string;
  /** Date.now() at save time. */
  savedAt: number;
  code: string;
}

const SAVED_BUILDS_KEY = 'dad_saved_builds_v1';

export function addSavedBuild(list: SavedBuild[], entry: SavedBuild): SavedBuild[] {
  return [...list, entry];
}

export function removeSavedBuild(list: SavedBuild[], id: string): SavedBuild[] {
  return list.filter((b) => b.id !== id);
}

export function renameSavedBuild(list: SavedBuild[], id: string, name: string): SavedBuild[] {
  return list.map((b) => (b.id === id ? { ...b, name } : b));
}

export function sortByNewest(list: SavedBuild[]): SavedBuild[] {
  return [...list].sort((a, b) => b.savedAt - a.savedAt);
}

function isSavedBuild(value: unknown): value is SavedBuild {
  const b = value as Partial<SavedBuild> | null;
  return (
    !!b &&
    typeof b.id === 'string' &&
    typeof b.name === 'string' &&
    typeof b.savedAt === 'number' &&
    typeof b.code === 'string'
  );
}

/** Reads the saved-build library from localStorage; corrupt/foreign data -> empty list. */
export function loadSavedBuilds(): SavedBuild[] {
  try {
    const raw = window.localStorage.getItem(SAVED_BUILDS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSavedBuild) : [];
  } catch {
    return [];
  }
}

export function persistSavedBuilds(list: SavedBuild[]): void {
  window.localStorage.setItem(SAVED_BUILDS_KEY, JSON.stringify(list));
}
