/**
 * Builds the item icon map (archetype name -> icon URL) by scraping the wiki
 * mirror's index pages, whose thumbnails are named after the item
 * (e.g. /images/thumb/3/34/Longsword.png/96px-Longsword.png).
 *
 * (The darkerdb API dropped per-item icon fields in its 2026-07 dataset
 * migration, so the mirror is the icon source now.)
 *
 * Usage: node scripts/fetch-icons.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MIRROR = 'https://darkanddarker.wiki.spellsandguns.com';
// Images are served from the wiki's own host; www.spellsandguns.com 404s.
const IMG_HOST = 'https://darkanddarker.wiki.spellsandguns.com';
const DATA = path.resolve(import.meta.dirname, '..', 'data');

const PAGES = [
  'Weapons',
  'Armor',
  'Armors',
  'Head_Armor',
  'Chest_Armor',
  'Leg_Armor',
  'Hand_Armor',
  'Foot_Armor',
  'Back_Armor',
  'Accessories',
  'Jewelry',
  'Necklaces',
  'Rings',
  'Utility',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function main() {
  const itemsFile = JSON.parse(await readFile(path.join(DATA, 'items', 'items.json'), 'utf8'));
  const wanted = new Map(); // normalized name -> canonical name
  for (const it of itemsFile.items) wanted.set(norm(it.name), it.name);
  console.log(`looking for ${wanted.size} archetypes across mirror pages...`);

  const icons = {};
  for (const page of PAGES) {
    let html;
    try {
      const res = await fetch(`${MIRROR}/${page}`);
      if (!res.ok) {
        console.log(`  ${page}: HTTP ${res.status} (skipped)`);
        continue;
      }
      html = await res.text();
    } catch (err) {
      console.log(`  ${page}: ${err.message} (skipped)`);
      continue;
    }
    const re = /\/images\/thumb\/([0-9a-f]\/[0-9a-f]{2})\/([^"/]+?)\.(png|webp)\/(\d+)px-/g;
    let m;
    let added = 0;
    while ((m = re.exec(html)) !== null) {
      const file = decodeURIComponent(m[2]);
      if (/_Hitbox$/i.test(file)) continue;
      const key = norm(file.replace(/_/g, ' '));
      const canonical = wanted.get(key);
      if (!canonical || icons[canonical]) continue;
      // Full-size image: item thumbnails aren't generated at 96px (they 400),
      // but the source image always resolves.
      icons[canonical] = `${IMG_HOST}/images/${m[1]}/${m[2]}.${m[3]}`;
      added++;
    }
    console.log(`  ${page}: +${added} (total ${Object.keys(icons).length})`);
    await sleep(150);
  }

  const missing = [...wanted.values()].filter((n) => !icons[n]);
  const payload = {
    _meta: {
      source: 'darkanddarker.wiki.spellsandguns.com index pages (thumb filenames match item names)',
      fetched_at: new Date().toISOString().slice(0, 10),
      count: Object.keys(icons).length,
      missing_count: missing.length,
      missing: missing.slice(0, 60),
    },
    icons,
  };
  await writeFile(path.join(DATA, 'items', 'icons.json'), JSON.stringify(payload, null, 1));
  console.log(`wrote ${Object.keys(icons).length} icons; missing ${missing.length}:`, missing.slice(0, 15).join(', '));
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
