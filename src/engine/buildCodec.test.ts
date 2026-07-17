import { describe, expect, it } from 'vitest';
import { decodeBuild, encodeBuild, type BuildState } from './buildCodec';

describe('buildCodec', () => {
  const sample: BuildState = {
    classId: 'fighter',
    perkIds: ['swift', 'weapon_mastery'],
    skillIds: ['sprint'],
    spellIds: [],
    loadout: {
      primary: {
        itemId: 'Longsword_6001',
        enchants: [{ attr: 'action_speed', value: 3 }, null, null, null],
      },
      feet: { itemId: 'AdventurerBoots_3001', enchants: [null] },
    },
    activeWeaponSet: 1,
  };

  it('round-trips a full build', () => {
    const code = encodeBuild(sample);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/); // URL-safe alphabet
    expect(decodeBuild(code)).toEqual(sample);
  });

  it('round-trips an empty build', () => {
    const empty: BuildState = {
      classId: 'fighter',
      perkIds: [],
      skillIds: [],
      spellIds: [],
      loadout: {},
      activeWeaponSet: 1,
    };
    expect(decodeBuild(encodeBuild(empty))).toEqual(empty);
  });

  it('round-trips a caster build with spells', () => {
    const caster: BuildState = {
      classId: 'wizard',
      perkIds: ['quick_chant'],
      skillIds: ['spell_memory1'],
      spellIds: ['fireball', 'zap', 'haste'],
      loadout: {},
      activeWeaponSet: 2,
    };
    expect(decodeBuild(encodeBuild(caster))).toEqual(caster);
  });

  it('rejects garbage without throwing', () => {
    expect(decodeBuild('not-a-build!!!')).toBeNull();
    expect(decodeBuild('')).toBeNull();
    expect(decodeBuild(btoa('{"v":99}'))).toBeNull();
  });
});
