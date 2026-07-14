/**
 * Fetches current item icons from dnd.wiki's equipment API and writes
 * data/items/icons.json (archetype name -> icon URL).
 *
 * dnd.wiki is a maintained DaD build site whose /api/equipment/data returns
 * 2400+ items with an `item_id` matching OUR id scheme (e.g. "Longsword_5001")
 * and an `icon_path` to a current .webp. Much newer/cleaner than the old wiki
 * mirror images.
 *
 * Usage: node scripts/fetch-icons-dndwiki.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API = 'https://dnd.wiki/api/equipment/data';
const HOST = 'https://dnd.wiki';
const DATA = path.resolve(import.meta.dirname, '..', 'data');

function iconUrl(iconPath) {
  // Path contains a Chinese filename; encode each segment for a safe URL.
  const encoded = iconPath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return HOST + encoded;
}

async function main() {
  console.log('fetching dnd.wiki equipment data...');
  const res = await fetch(API);
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const json = await res.json();
  const all = json.data.data.all_items;
  const dndItems = Array.isArray(all) ? all : Object.values(all);
  console.log(`  dnd.wiki items: ${dndItems.length}`);

  // Lookups: by item_id and by English name.
  const byId = new Map();
  const byName = new Map();
  for (const it of dndItems) {
    if (!it.icon_path) continue;
    const url = iconUrl(it.icon_path);
    if (it.item_id) byId.set(it.item_id, url);
    if (it.name_en && !byName.has(it.name_en)) byName.set(it.name_en, url);
  }

  const ours = JSON.parse(await readFile(path.join(DATA, 'items', 'items.json'), 'utf8')).items;
  const icons = {};
  const missing = [];
  for (const item of ours) {
    if (icons[item.name]) continue;
    const url = byId.get(item.id) ?? byName.get(item.name);
    if (url) icons[item.name] = url;
    else missing.push(item.name);
  }

  const payload = {
    _meta: {
      source: 'dnd.wiki /api/equipment/data (icon_path -> dnd.wiki/data/images/item_icons/*.webp)',
      fetched_at: new Date().toISOString().slice(0, 10),
      count: Object.keys(icons).length,
      missing_count: [...new Set(missing)].length,
      note: 'Current webp icons keyed by archetype name; matched to our items by item_id then English name.',
    },
    icons,
  };
  await writeFile(path.join(DATA, 'items', 'icons.json'), JSON.stringify(payload, null, 1));
  const uniqueMissing = [...new Set(missing)];
  console.log(`wrote ${Object.keys(icons).length} icons; missing ${uniqueMissing.length}:`, uniqueMissing.slice(0, 15).join(', '));
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
