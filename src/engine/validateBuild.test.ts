import { describe, expect, it } from 'vitest';
import { validateBuild } from './validateBuild';
import { fighter } from './data';

describe('validateBuild - Fighter rules (4 perks, 2 skills)', () => {
  it('accepts a legal build', () => {
    const issues = validateBuild(fighter, {
      perkIds: ['weapon_mastery', 'swift', 'combo_attack', 'dual_wield'],
      skillIds: ['sprint', 'second_wind'],
    });
    expect(issues).toEqual([]);
  });

  it('rejects a 5th perk', () => {
    const issues = validateBuild(fighter, {
      perkIds: ['weapon_mastery', 'swift', 'combo_attack', 'dual_wield', 'barricade'],
      skillIds: [],
    });
    expect(issues.map((i) => i.code)).toContain('too_many_perks');
  });

  it('rejects a 3rd skill', () => {
    const issues = validateBuild(fighter, {
      perkIds: [],
      skillIds: ['sprint', 'second_wind', 'taunt'],
    });
    expect(issues.map((i) => i.code)).toContain('too_many_skills');
  });

  it('rejects duplicate selections', () => {
    const issues = validateBuild(fighter, {
      perkIds: ['swift', 'swift'],
      skillIds: ['sprint', 'sprint'],
    });
    const codes = issues.map((i) => i.code);
    expect(codes).toContain('duplicate_perk');
    expect(codes).toContain('duplicate_skill');
  });

  it('rejects ids that do not exist on the class', () => {
    const issues = validateBuild(fighter, {
      perkIds: ['fireball_mastery'],
      skillIds: ['meteor'],
    });
    const codes = issues.map((i) => i.code);
    expect(codes).toContain('unknown_perk');
    expect(codes).toContain('unknown_skill');
  });

  it('an empty build is legal (nothing selected yet)', () => {
    expect(validateBuild(fighter, { perkIds: [], skillIds: [] })).toEqual([]);
  });
});
