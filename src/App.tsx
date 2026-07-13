import { useEffect, useMemo, useState } from 'react';
import { computeStats } from './engine/computeStats';
import { validateBuild } from './engine/validateBuild';
import {
  classes,
  enchantSlotCount,
  hasFixedEnchants,
  itemIndex,
  items,
  spellBook,
  statCurves,
} from './engine/data';
import {
  autoFillFixedEnchants,
  enchantablePool,
  gearTotals,
  type EnchantChoice,
  type GearSlotId,
  type Loadout,
} from './engine/itemStats';
import { eligibleItems, normalizeLoadout } from './engine/gearRules';
import { classSpells, spellSlots } from './engine/spells';
import { decodeBuild, encodeBuild, type BuildState } from './engine/buildCodec';
import { PickList } from './ui/PickList';
import { StatPanel } from './ui/StatPanel';
import { GearPanel, type UiLoadout } from './ui/GearPanel';
import { SpellPanel } from './ui/SpellPanel';
import { DamageTab } from './ui/DamageTab';

const STORAGE_KEY = 'dad_build_v1';

type TabId = 'class' | 'gear' | 'damage';

const TABS: { id: TabId; label: string }[] = [
  { id: 'class', label: 'Class' },
  { id: 'gear', label: 'Gear & Stats' },
  { id: 'damage', label: 'Damage' },
];

/** Strip empty enchant rows and enforce the 2H rule for the engine. */
function toEngineLoadout(ui: UiLoadout): Loadout {
  const out: Loadout = {};
  for (const [slot, equipped] of Object.entries(ui) as [GearSlotId, UiLoadout[GearSlotId]][]) {
    if (!equipped) continue;
    out[slot] = {
      itemId: equipped.itemId,
      enchants: equipped.enchants.filter((e): e is EnchantChoice => e !== null),
    };
  }
  return normalizeLoadout(out, itemIndex);
}

/**
 * Decoded builds come from URLs and old saves — trust nothing. Unknown ids
 * are dropped, enchant rows are resized to the item's rarity, roll values
 * are clamped back into the pool's range.
 */
function sanitizeBuild(raw: BuildState): BuildState {
  const classData = classes[raw.classId] ? classes[raw.classId]! : classes['fighter']!;
  const perkPool = new Set(classData.perks.map((p) => p.id));
  const skillPool = new Set(classData.skills.map((s) => s.id));
  const spellPool = new Set(classSpells(spellBook, classData.id).map((s) => s.id));
  const perkIds = [...new Set(raw.perkIds)].filter((id) => perkPool.has(id)).slice(0, classData.perk_slots);
  const skillIds = [...new Set(raw.skillIds)]
    .filter((id) => skillPool.has(id))
    .slice(0, classData.skill_slots);
  const spellIds = [...new Set(raw.spellIds ?? [])]
    .filter((id) => spellPool.has(id))
    .slice(0, spellSlots(skillIds)); // spells require memory-skill slots

  const loadout: UiLoadout = {};
  for (const [slot, eq] of Object.entries(raw.loadout) as [GearSlotId, UiLoadout[GearSlotId]][]) {
    if (!eq) continue;
    const item = itemIndex.get(eq.itemId);
    if (!item) continue;
    const legal = eligibleItems(items, classData, slot, perkIds).some((i) => i.id === item.id);
    if (!legal) continue;
    const slots = enchantSlotCount(item.rarity);
    // Artifacts: preset unchangeable enchantments, ignore whatever was saved.
    if (hasFixedEnchants(item.rarity)) {
      loadout[slot] = { itemId: item.id, enchants: autoFillFixedEnchants(item, slots) };
      continue;
    }
    const enchants: (EnchantChoice | null)[] = Array(slots).fill(null);
    const seen = new Set<string>();
    const pool = enchantablePool(item); // base stats can't repeat as enchants
    (eq.enchants ?? []).slice(0, slots).forEach((en, idx) => {
      if (!en || seen.has(en.attr)) return;
      const range = pool.find(([a]) => a === en.attr);
      if (!range) return;
      seen.add(en.attr);
      enchants[idx] = { attr: en.attr, value: Math.min(range[2], Math.max(range[1], en.value)) };
    });
    loadout[slot] = { itemId: item.id, enchants };
  }

  return { classId: classData.id, perkIds, skillIds, spellIds, loadout: normalizeLoadout(loadout, itemIndex) };
}

function loadInitialBuild(): BuildState {
  const fallback: BuildState = {
    classId: 'fighter',
    perkIds: [],
    skillIds: [],
    spellIds: [],
    loadout: {},
  };
  const hashMatch = window.location.hash.match(/#b=([A-Za-z0-9_-]+)/);
  const fromHash = hashMatch ? decodeBuild(hashMatch[1]!) : null;
  if (fromHash) return sanitizeBuild(fromHash);
  const stored = window.localStorage.getItem(STORAGE_KEY);
  const fromStore = stored ? decodeBuild(stored) : null;
  if (fromStore) return sanitizeBuild(fromStore);
  return fallback;
}

const initial = loadInitialBuild();

export default function App() {
  const [tab, setTab] = useState<TabId>('class');
  const [classId, setClassId] = useState(initial.classId);
  const classData = classes[classId]!;

  const [perkIds, setPerkIds] = useState<string[]>(initial.perkIds);
  const [skillIds, setSkillIds] = useState<string[]>(initial.skillIds);
  const [spellIds, setSpellIds] = useState<string[]>(initial.spellIds);
  const [loadout, setLoadout] = useState<UiLoadout>(initial.loadout);
  const [copied, setCopied] = useState(false);

  const spells = classSpells(spellBook, classId);
  const selectedSpells = spells.filter((s) => spellIds.includes(s.id));

  // The whole app funnels into this one pure engine call.
  const stats = useMemo(() => {
    const gear = gearTotals(toEngineLoadout(loadout), itemIndex);
    return computeStats(classData, statCurves, { gear });
  }, [classData, loadout]);

  const issues = validateBuild(classData, { perkIds, skillIds });

  // Autosave every change; the URL hash is only written on Share.
  useEffect(() => {
    const state: BuildState = { classId, perkIds, skillIds, spellIds, loadout };
    window.localStorage.setItem(STORAGE_KEY, encodeBuild(state));
  }, [classId, perkIds, skillIds, spellIds, loadout]);

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
    setSkillIds((cur) => {
      const next = cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length < classData.skill_slots
          ? [...cur, id]
          : cur;
      // Dropping a memory skill shrinks the spell slots — trim the overflow.
      setSpellIds((spells) => spells.slice(0, spellSlots(next)));
      return next;
    });
  };

  const toggleSpell = (id: string) => {
    setSpellIds((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      return cur.length < spellSlots(skillIds) ? [...cur, id] : cur;
    });
  };

  const switchClass = (id: string) => {
    // Perk/skill/spell/gear choices belong to a class; changing class resets them.
    setClassId(id);
    setPerkIds([]);
    setSkillIds([]);
    setSpellIds([]);
    setLoadout({});
  };

  const shareBuild = async () => {
    const code = encodeBuild({ classId, perkIds, skillIds, spellIds, loadout });
    const url = `${window.location.origin}${window.location.pathname}#b=${code}`;
    window.history.replaceState(null, '', `#b=${code}`);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable (permissions) — the URL is still in the address bar
    }
  };

  const resetBuild = () => {
    setPerkIds([]);
    setSkillIds([]);
    setSpellIds([]);
    setLoadout({});
    window.history.replaceState(null, '', window.location.pathname);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>DaD Build Designer</h1>
        <div className="header-actions">
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
          <button type="button" className="btn" onClick={shareBuild}>
            {copied ? 'Copied!' : 'Share Build'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={resetBuild}>
            Reset
          </button>
        </div>
      </header>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab${tab === t.id ? ' tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {issues.length > 0 && (
        <div className="issues" role="alert">
          {issues.map((i) => (
            <div key={i.code + i.message}>⚠ {i.message}</div>
          ))}
        </div>
      )}

      {tab === 'class' && (
        <main className={`columns ${spells.length > 0 ? 'columns--three' : 'columns--two'}`}>
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
          {spells.length > 0 && (
            <section className="column">
              <SpellPanel
                spells={spells}
                selectedIds={spellIds}
                skillIds={skillIds}
                memoryCapacity={stats.memoryCapacity}
                onToggle={toggleSpell}
              />
            </section>
          )}
        </main>
      )}

      {tab === 'gear' && (
        <main className="gear-tab">
          <StatPanel stats={stats} />
          <GearPanel classData={classData} perkIds={perkIds} loadout={loadout} onChange={setLoadout} />
        </main>
      )}

      {tab === 'damage' && (
        <DamageTab
          stats={stats}
          weaponName={loadout.primary ? itemIndex.get(loadout.primary.itemId)?.name : undefined}
          selectedSpells={selectedSpells}
        />
      )}
    </div>
  );
}
