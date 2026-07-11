import type { BuildSelection, ClassData } from './types';

export interface ValidationIssue {
  code:
    | 'too_many_perks'
    | 'too_many_skills'
    | 'duplicate_perk'
    | 'duplicate_skill'
    | 'unknown_perk'
    | 'unknown_skill';
  message: string;
}

/**
 * Enforces the game's build rules (slot counts, no duplicates, ids must exist).
 * Returns a list of issues; an empty list means the build is legal.
 */
export function validateBuild(classData: ClassData, selection: BuildSelection): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (selection.perkIds.length > classData.perk_slots) {
    issues.push({
      code: 'too_many_perks',
      message: `${classData.name} allows ${classData.perk_slots} perks, got ${selection.perkIds.length}`,
    });
  }
  if (selection.skillIds.length > classData.skill_slots) {
    issues.push({
      code: 'too_many_skills',
      message: `${classData.name} allows ${classData.skill_slots} skills, got ${selection.skillIds.length}`,
    });
  }

  const knownPerks = new Set(classData.perks.map((p) => p.id));
  const knownSkills = new Set(classData.skills.map((s) => s.id));

  const seenPerks = new Set<string>();
  for (const id of selection.perkIds) {
    if (!knownPerks.has(id)) {
      issues.push({ code: 'unknown_perk', message: `unknown perk id: ${id}` });
    } else if (seenPerks.has(id)) {
      issues.push({ code: 'duplicate_perk', message: `perk selected twice: ${id}` });
    }
    seenPerks.add(id);
  }

  const seenSkills = new Set<string>();
  for (const id of selection.skillIds) {
    if (!knownSkills.has(id)) {
      issues.push({ code: 'unknown_skill', message: `unknown skill id: ${id}` });
    } else if (seenSkills.has(id)) {
      issues.push({ code: 'duplicate_skill', message: `skill selected twice: ${id}` });
    }
    seenSkills.add(id);
  }

  return issues;
}
