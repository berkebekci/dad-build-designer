/**
 * Binds the versioned game data (JSON) to the engine's types.
 * The engine itself never imports JSON directly — it takes data as
 * parameters — so tests and future patches can swap data freely.
 */
import statCurvesJson from '../../data/stat_curves.json';
import fighterJson from '../../data/classes/fighter.json';
import type { CurveSet } from './computeStats';
import type { ClassData } from './types';

export const statCurves = statCurvesJson as unknown as CurveSet;

export const fighter = fighterJson as unknown as ClassData;

export const classes: Record<string, ClassData> = {
  [fighter.id]: fighter,
};
