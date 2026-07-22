/**
 * Probes our upstream data sources and reports whether they have caught up
 * to the current game patch (6.12 / EA Season 10, 2026-07-17).
 *
 * Run any day with: node scripts/check-sources.mjs
 * When a sentinel turns FRESH, run the matching refresh step:
 *  - darkerdb items fresh  -> node scripts/fetch-items.mjs
 *  - dnd.wiki fresh        -> node scripts/fetch-icons-dndwiki.mjs (icons for new items)
 *  - wiki fresh            -> update data/spells/spells.json (new Wizard/Cleric spells)
 *                             and refresh ability texts with real numbers
 */

const UA = { headers: { 'User-Agent': 'Mozilla/5.0' } };

async function getJson(url) {
  const res = await fetch(url, UA);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

console.log('Patch 6.12 source freshness check\n');

// 1) darkerdb item DB — 6.12 changed Dark Leather Leggings AR to 33~39 (unique was 59 pre-patch).
try {
  const d = await getJson('https://api.darkerdb.com/v1/items/DarkLeatherLeggings_7001');
  const row = d.body ?? d;
  const ar = row.primary_max_armor_rating;
  const fresh = Number(ar) <= 45;
  console.log(`darkerdb items: unique Dark Leather Leggings AR = ${ar} -> ${fresh ? 'FRESH (run fetch-items.mjs)' : 'still pre-6.12 (59; expect ~39 after update)'}`);
} catch (e) {
  console.log('darkerdb items: probe failed —', e.message);
}

// 2) dnd.wiki equipment snapshot — pre-6.12 hash was 5b7277e466f7a7d57145e41da06c9bca (2026-07-14).
try {
  const d = await getJson('https://dnd.wiki/api/equipment/data/version');
  const body = d.data ?? d;
  const stale = JSON.stringify(body).includes('5b7277e466f7a7d57145e41da06c9bca');
  console.log(`dnd.wiki: version = ${JSON.stringify(body).slice(0, 120)} -> ${stale ? 'still the 2026-07-14 snapshot' : 'CHANGED (re-check equipment/spells data)'}`);
} catch (e) {
  console.log('dnd.wiki: probe failed —', e.message);
}

// 3) wiki automated class data — banner names the patch its data was generated from.
try {
  const res = await fetch('https://darkanddarker.wiki.spellsandguns.com/Wizard', UA);
  const html = await res.text();
  const m = html.match(/Class Data last updated on:\s*<[^>]*>?\s*Patch:([\d.]+)/i) ?? html.match(/Patch:([\d.]+)#[^"<]*/);
  const patch = m?.[1] ?? '?';
  const fresh = patch.startsWith('6.12');
  console.log(`wiki class data: Patch ${patch} -> ${fresh ? 'FRESH (add new spells + refresh ability numbers)' : 'still pre-6.12'}`);
} catch (e) {
  console.log('wiki: probe failed —', e.message);
}

console.log('\nStill missing while sources lag (from official notes): 7 Wizard + 7 Cleric spells,');
console.log('new artifacts (Shadowbite, Windreaver, Titanium Pavise, Grimveil Cloak, Tear of');
console.log('Hrimthurs, Soul-Devoted Folio), ~12 armor stat rebalances, unique-item 2x modifier rolls.');
