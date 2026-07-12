/**
 * Merges API class data (base attributes, skills) into the hand-authored
 * per-class JSON files (perks/weapons/armor_types from the wiki).
 * Only EMPTY fields are filled, so wiki-verified content is never clobbered.
 *
 * Also prints two analyses used to refine the data:
 *  - distinct armor_type values in the item DB
 *  - required_class bitmask intersection per class weapon list
 *
 * Usage: node scripts/build-classes.mjs
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const DATA = path.resolve(import.meta.dirname, '..', 'data');

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const ATTRS = ['strength', 'vigor', 'agility', 'dexterity', 'will', 'knowledge', 'resourcefulness'];

/**
 * required_class bit per class, decoded 2026-07-11 by intersecting the masks
 * of each class's wiki-verified weapon list (see analysis below). The bit
 * order matches the classes' release order.
 */
const CLASS_MASK_BITS = {
  fighter: 1,
  barbarian: 2,
  rogue: 4,
  ranger: 8,
  wizard: 16,
  cleric: 32,
  bard: 64,
  warlock: 128,
  druid: 256,
  sorcerer: 512,
};

async function main() {
  const apiClasses = JSON.parse(await readFile(path.join(DATA, 'api', 'classes.json'), 'utf8'));
  const itemsFile = JSON.parse(await readFile(path.join(DATA, 'items', 'items.json'), 'utf8'));
  const items = itemsFile.items;

  const files = (await readdir(path.join(DATA, 'classes'))).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const p = path.join(DATA, 'classes', file);
    const cls = JSON.parse(await readFile(p, 'utf8'));
    const api = apiClasses.find((c) => c.id === `id.class.${cls.id}`);
    if (!api) {
      console.log(`! no API record for ${cls.id}`);
      continue;
    }

    let changed = false;

    if (!cls.base_attributes || Object.keys(cls.base_attributes).length === 0) {
      cls.base_attributes = Object.fromEntries(ATTRS.map((a) => [a, api.stats[a]]));
      changed = true;
    }

    if (!Array.isArray(cls.skills) || cls.skills.length === 0) {
      cls.skills = (api.skills ?? []).map((s) => ({
        id: s.id?.split('.').pop() ?? slug(s.name),
        name: s.name,
        effect: (s.description ?? '').trim(),
      }));
      changed = true;
    }

    if (cls.class_mask === undefined && CLASS_MASK_BITS[cls.id] !== undefined) {
      cls.class_mask = CLASS_MASK_BITS[cls.id];
      changed = true;
    }

    // Inject icon URLs from the API by name match (skills are complete in the
    // API; perks only partially — missing ones keep a letter-tile fallback).
    const iconByName = new Map();
    for (const p of api.perks ?? []) if (p.icon_url) iconByName.set(p.name, p.icon_url);
    for (const s of api.skills ?? []) if (s.icon_url) iconByName.set(s.name, s.icon_url);
    for (const list of [cls.perks ?? [], cls.skills ?? []]) {
      for (const entry of list) {
        const url = iconByName.get(entry.name);
        if (url && entry.icon !== url) {
          entry.icon = url;
          changed = true;
        }
      }
    }

    if (changed) {
      await writeFile(p, JSON.stringify(cls, null, 2) + '\n');
      console.log(`updated ${file}: attrs=${JSON.stringify(cls.base_attributes)} skills=${cls.skills.length}`);
    } else {
      console.log(`unchanged ${file}`);
    }
  }

  // --- analysis 1: distinct armor types in the item DB
  const armorTypes = new Set(items.filter((i) => i.itemType === 'armor').map((i) => i.armorType));
  console.log('\narmor_type values in item DB:', [...armorTypes].join(', '));

  // --- analysis 2: classMask bit intersection per class weapon list
  console.log('\nrequired_class mask analysis (AND of all masks per class weapon list):');
  for (const file of files) {
    const cls = JSON.parse(await readFile(path.join(DATA, 'classes', file), 'utf8'));
    const names = new Set([
      ...(cls.weapons?.two_handed ?? []),
      ...(cls.weapons?.one_handed_main ?? []),
      ...(cls.weapons?.off_hand ?? []),
    ]);
    const masks = items
      .filter((i) => names.has(i.name) && typeof i.classMask === 'number')
      .map((i) => i.classMask);
    if (masks.length === 0) {
      console.log(`  ${cls.id.padEnd(10)} no masks found`);
      continue;
    }
    const common = masks.reduce((a, b) => a & b);
    console.log(
      `  ${cls.id.padEnd(10)} weapons=${String(names.size).padStart(3)} matched=${String(masks.length).padStart(4)} commonBits=${common} (0b${common.toString(2).padStart(10, '0')})`,
    );
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
