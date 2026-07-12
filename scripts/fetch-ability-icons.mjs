/**
 * Scrapes perk/skill/spell icon URLs from the wiki mirror class pages
 * (icon filenames encode the ability name: Perk_Adrenaline_Spike.png) and
 * injects them into data/classes/*.json and data/spells/spells.json where
 * icons are still missing.
 *
 * Usage: node scripts/fetch-ability-icons.mjs
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const MIRROR = 'https://darkanddarker.wiki.spellsandguns.com';
const IMG_HOST = 'https://www.spellsandguns.com';
const DATA = path.resolve(import.meta.dirname, '..', 'data');

const PAGES = [
  'Fighter', 'Barbarian', 'Bard', 'Cleric', 'Druid',
  'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard',
];

/** old wiki filename -> current ability name */
const ALIASES = {
  'defense expert': 'defense mastery',
  'shield expert': 'shield mastery',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function main() {
  // name -> icon URL, gathered across all pages
  const iconMap = new Map();

  for (const page of PAGES) {
    const res = await fetch(`${MIRROR}/${page}`);
    if (!res.ok) {
      console.log(`! ${page}: HTTP ${res.status}`);
      continue;
    }
    const html = await res.text();
    const re = /\/images\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/((?:Perk|Skill|Spell|Song|Music|Ability)_[^"/]+?)\.(?:png|webp)\/(\d+px-[^"]+?\.(?:png|webp))/g;
    let m;
    let found = 0;
    while ((m = re.exec(html)) !== null) {
      const file = decodeURIComponent(m[1]);
      const raw = file.replace(/^(Perk|Skill|Spell|Song|Music|Ability)_/, '').replace(/_/g, ' ');
      let key = norm(raw);
      if (ALIASES[key]) key = norm(ALIASES[key]);
      if (!iconMap.has(key)) {
        iconMap.set(key, `${IMG_HOST}/images/thumb/${m[0].split('/images/thumb/')[1]}`);
        found++;
      }
    }
    console.log(`${page}: +${found} icons (total ${iconMap.size})`);
    await sleep(150);
  }

  // Inject into class files (only where icon missing)
  const files = (await readdir(path.join(DATA, 'classes'))).filter((f) => f.endsWith('.json'));
  const unmatched = [];
  for (const file of files) {
    const p = path.join(DATA, 'classes', file);
    const cls = JSON.parse(await readFile(p, 'utf8'));
    let changed = 0;
    for (const list of [cls.perks ?? [], cls.skills ?? []]) {
      for (const entry of list) {
        if (entry.icon) continue;
        const url = iconMap.get(norm(entry.name));
        if (url) {
          entry.icon = url;
          changed++;
        } else {
          unmatched.push(`${cls.id}:${entry.name}`);
        }
      }
    }
    if (changed > 0) await writeFile(p, JSON.stringify(cls, null, 2) + '\n');
    console.log(`${file}: +${changed} icons`);
  }

  // Inject into spells.json
  const spellsPath = path.join(DATA, 'spells', 'spells.json');
  const spellsFile = JSON.parse(await readFile(spellsPath, 'utf8'));
  let spellChanged = 0;
  for (const list of Object.values(spellsFile.classes)) {
    for (const spell of list) {
      if (spell.icon) continue;
      const url = iconMap.get(norm(spell.name));
      if (url) {
        spell.icon = url;
        spellChanged++;
      } else {
        unmatched.push(`spell:${spell.name}`);
      }
    }
  }
  if (spellChanged > 0) await writeFile(spellsPath, JSON.stringify(spellsFile, null, 1));
  console.log(`spells.json: +${spellChanged} icons`);
  console.log(`unmatched (${unmatched.length}):`, unmatched.slice(0, 25).join(', '));
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
