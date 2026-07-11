import { useMemo, useState } from 'react';
import { computeStats } from './engine/computeStats';
import { validateBuild } from './engine/validateBuild';
import { classes, itemIndex, statCurves } from './engine/data';
import { gearTotals, type EnchantChoice, type GearSlotId, type Loadout } from './engine/itemStats';
import { eligibleItems } from './engine/gearRules';
import { items } from './engine/data';
import { PickList } from './ui/PickList';
import { StatPanel } from './ui/StatPanel';
import { GearPanel, type UiLoadout } from './ui/GearPanel';

/** Strip empty enchant rows for the engine. */
function toEngineLoadout(ui: UiLoadout): Loadout {
  const out: Loadout = {};
  for (const [slot, equipped] of Object.entries(ui) as [GearSlotId, UiLoadout[GearSlotId]][]) {
    if (!equipped) continue;
    out[slot] = {
      itemId: equipped.itemId,
      enchants: equipped.enchants.filter((e): e is EnchantChoice => e !== null),
    };
  }
  return out;
}

export default function App() {
  // Only Fighter exists for now; the select is already wired for more classes.
  const [classId, setClassId] = useState('fighter');
  const classData = classes[classId]!;

  const [perkIds, setPerkIds] = useState<string[]>([]);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [loadout, setLoadout] = useState<UiLoadout>({});

  // The whole app funnels into this one pure engine call.
  const stats = useMemo(() => {
    const gear = gearTotals(toEngineLoadout(loadout), itemIndex);
    return computeStats(classData, statCurves, { gear });
  }, [classData, loadout]);

  const issues = validateBuild(classData, { perkIds, skillIds });

  /**
   * Perks can change gear legality (Weapon Mastery off -> caster weapons must
   * go; Slayer on -> plate must go). Re-check every equipped item.
   */
  const reconcileLoadout = (nextPerkIds: string[]) => {
    setLoadout((current) => {
      const next: UiLoadout = { ...current };
      for (const [slot, equipped] of Object.entries(current) as [
        GearSlotId,
        UiLoadout[GearSlotId],
      ][]) {
        if (!equipped) continue;
        const stillLegal = eligibleItems(items, classData, slot, nextPerkIds).some(
          (i) => i.id === equipped.itemId,
        );
        if (!stillLegal) delete next[slot];
      }
      return next;
    });
  };

  const togglePerk = (id: string) => {
    const next = perkIds.includes(id)
      ? perkIds.filter((x) => x !== id)
      : perkIds.length < classData.perk_slots
        ? [...perkIds, id]
        : perkIds;
    if (next !== perkIds) {
      setPerkIds(next);
      reconcileLoadout(next);
    }
  };

  const toggleSkill = (id: string) => {
    setSkillIds((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length < classData.skill_slots
          ? [...cur, id]
          : cur,
    );
  };

  const switchClass = (id: string) => {
    // Perk/skill/gear choices belong to a class; changing class resets them.
    setClassId(id);
    setPerkIds([]);
    setSkillIds([]);
    setLoadout({});
  };

  return (
    <div className="app">
      <header className="header">
        <h1>DaD Build Designer</h1>
        <label className="class-picker">
          Class
          <select value={classId} onChange={(e) => switchClass(e.target.value)}>
            {Object.values(classes).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      {issues.length > 0 && (
        <div className="issues" role="alert">
          {issues.map((i) => (
            <div key={i.code + i.message}>⚠ {i.message}</div>
          ))}
        </div>
      )}

      <main className="columns columns--four">
        <section className="column">
          <PickList
            title="Perks"
            items={classData.perks}
            selectedIds={perkIds}
            capacity={classData.perk_slots}
            onToggle={togglePerk}
          />
        </section>

        <section className="column">
          <PickList
            title="Skills"
            items={classData.skills}
            selectedIds={skillIds}
            capacity={classData.skill_slots}
            onToggle={toggleSkill}
          />
        </section>

        <section className="column">
          <GearPanel
            classData={classData}
            perkIds={perkIds}
            loadout={loadout}
            onChange={setLoadout}
          />
        </section>

        <section className="column">
          <StatPanel stats={stats} />
        </section>
      </main>
    </div>
  );
}
