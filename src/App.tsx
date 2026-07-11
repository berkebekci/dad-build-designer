import { useMemo, useState } from 'react';
import { computeStats } from './engine/computeStats';
import { validateBuild } from './engine/validateBuild';
import { classes, statCurves } from './engine/data';
import type { Attributes } from './engine/types';
import { PickList } from './ui/PickList';
import { StatPanel } from './ui/StatPanel';
import { GearPreview } from './ui/GearPreview';

export default function App() {
  // Only Fighter exists for now; the select is already wired for more classes.
  const [classId, setClassId] = useState('fighter');
  const classData = classes[classId]!;

  const [perkIds, setPerkIds] = useState<string[]>([]);
  const [skillIds, setSkillIds] = useState<string[]>([]);

  // "Gear preview" playground until Phase 4 delivers the real item picker.
  const [attributeBonuses, setAttributeBonuses] = useState<Partial<Attributes>>({});
  const [armorRating, setArmorRating] = useState(0);

  // The whole app funnels into this one pure engine call.
  const stats = useMemo(
    () => computeStats(classData, statCurves, { attributeBonuses, armorRating }),
    [classData, attributeBonuses, armorRating],
  );

  const issues = validateBuild(classData, { perkIds, skillIds });

  const toggle = (list: string[], setList: (v: string[]) => void, capacity: number, id: string) => {
    if (list.includes(id)) {
      setList(list.filter((x) => x !== id));
    } else if (list.length < capacity) {
      setList([...list, id]);
    }
  };

  const switchClass = (id: string) => {
    // Perk/skill ids belong to a class; changing class resets the selection.
    setClassId(id);
    setPerkIds([]);
    setSkillIds([]);
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

      <main className="columns">
        <section className="column">
          <PickList
            title="Perks"
            items={classData.perks}
            selectedIds={perkIds}
            capacity={classData.perk_slots}
            onToggle={(id) => toggle(perkIds, setPerkIds, classData.perk_slots, id)}
          />
        </section>

        <section className="column">
          <PickList
            title="Skills"
            items={classData.skills}
            selectedIds={skillIds}
            capacity={classData.skill_slots}
            onToggle={(id) => toggle(skillIds, setSkillIds, classData.skill_slots, id)}
          />
          <GearPreview
            attributeBonuses={attributeBonuses}
            onAttributeBonusesChange={setAttributeBonuses}
            armorRating={armorRating}
            onArmorRatingChange={setArmorRating}
          />
        </section>

        <section className="column">
          <StatPanel stats={stats} />
        </section>
      </main>
    </div>
  );
}
