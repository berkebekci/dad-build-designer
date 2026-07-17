import { describe, expect, it } from 'vitest';
import { addSavedBuild, removeSavedBuild, renameSavedBuild, sortByNewest, type SavedBuild } from './savedBuilds';

const a: SavedBuild = { id: 'a', name: 'Tank Fighter', savedAt: 100, code: 'x' };
const b: SavedBuild = { id: 'b', name: 'Glass Cannon Rogue', savedAt: 300, code: 'y' };

describe('savedBuilds list operations', () => {
  it('addSavedBuild appends without mutating the input', () => {
    const list = [a];
    const next = addSavedBuild(list, b);
    expect(list).toEqual([a]); // original untouched
    expect(next).toEqual([a, b]);
  });

  it('removeSavedBuild drops only the matching id', () => {
    expect(removeSavedBuild([a, b], 'a')).toEqual([b]);
    expect(removeSavedBuild([a, b], 'nonexistent')).toEqual([a, b]);
  });

  it('renameSavedBuild updates only the matching entry', () => {
    const next = renameSavedBuild([a, b], 'a', 'Renamed');
    expect(next[0]!.name).toBe('Renamed');
    expect(next[1]).toEqual(b);
  });

  it('sortByNewest orders by savedAt descending', () => {
    expect(sortByNewest([a, b]).map((s) => s.id)).toEqual(['b', 'a']);
  });
});
