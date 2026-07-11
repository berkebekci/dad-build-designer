/**
 * Fetches the full Dark and Darker item database + class data from the
 * community darkerdb API and writes compact, versioned JSON into data/.
 *
 * API quirks discovered along the way (v1):
 *  - /items page 1 returns NARROW rows (meta only, "id.item.foo_1001" ids,
 *    item_type field); pages 2+ return WIDE rows with every attribute inlined
 *    as primary_/secondary_ min/max columns and a `type` field instead.
 *  - The /items/{id} DETAIL endpoint uses effect_* attribute names and stores
 *    percentage stats in TENTHS of a percent; wide rows use plain names and
 *    true percents. We normalize EVERYTHING to wide names + true percents.
 *
 * Usage: node scripts/fetch-items.mjs
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const API = 'https://api.darkerdb.com/v1';
const OUT_DIR = path.resolve(import.meta.dirname, '..', 'data');

const EQUIP_TYPES = new Set(['armor', 'weapon', 'jewelry', 'accessory']);
const EQUIP_SLOTS = new Set(['primary', 'secondary', 'necklace', 'ring']);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 4) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { fatal: true });
      return await res.json();
    } catch (err) {
      if (err.fatal || attempt === tries) throw err;
      await sleep(500 * attempt * attempt);
    }
  }
}

const lc = (s) => (typeof s === 'string' ? s.toLowerCase().replace(/\s+/g, '_') : undefined);

/** detail effect_* name -> wide name (+ value scale to true percents) */
const DETAIL_TO_WIDE = {
  effect_strength: ['strength', 1],
  effect_vigor: ['vigor', 1],
  effect_agility: ['agility', 1],
  effect_dexterity: ['dexterity', 1],
  effect_will: ['will', 1],
  effect_knowledge: ['knowledge', 1],
  effect_resourcefulness: ['resourcefulness', 1],
  effect_all_attributes: ['all_attributes', 1],
  effect_armor_rating: ['armor_rating', 1],
  effect_armor_rating_add: ['additional_armor_rating', 1],
  effect_move_speed: ['move_speed', 1],
  effect_physical_weapon_damage: ['weapon_damage', 1],
  effect_physical_weapon_damage_add: ['additional_weapon_damage', 1],
  effect_magical_weapon_damage: ['magic_weapon_damage', 1],
  effect_physical_power: ['physical_power', 1],
  effect_magical_power: ['magical_power', 1],
  effect_magic_registance: ['magic_resistance', 1],
  effect_magic_resistance: ['magic_resistance', 1],
  effect_memory_capacity_add: ['additional_memory_capacity', 1],
  effect_max_health_add: ['max_health', 1],
  effect_physical_damage_add: ['additional_physical_damage', 1],
  effect_magical_damage_add: ['additional_magical_damage', 1],
  effect_luck: ['luck', 1],
  effect_action_speed: ['action_speed', 0.1],
  effect_physical_damage_bonus: ['physical_damage_bonus', 0.1],
  effect_magical_damage_bonus: ['magical_damage_bonus', 0.1],
  effect_physical_damage_reduction: ['physical_damage_reduction', 0.1],
  effect_magical_damage_reduction: ['magical_damage_reduction', 0.1],
  effect_projectile_reduction_mod: ['projectile_damage_reduction', 0.1],
  effect_regular_interaction_speed: ['regular_interaction_speed', 0.1],
  effect_magical_interaction_speed: ['magical_interaction_speed', 0.1],
  effect_spell_casting_speed: ['spell_casting_speed', 0.1],
  effect_buff_duration_bonus: ['buff_duration_bonus', 0.1],
  effect_debuff_duration_bonus: ['debuff_duration_bonus', 0.1],
  effect_cooldown_reduction_bonus: ['cooldown_reduction_bonus', 0.1],
  effect_memory_capacity_bonus: ['memory_capacity_bonus', 0.1],
  effect_armor_penetration: ['armor_penetration', 0.1],
  effect_magic_penetration: ['magic_penetration', 0.1],
  effect_headshot_damage_mod: ['headshot_damage_bonus', 0.1],
  effect_undead_damage_mod: ['undead_damage_bonus', 0.1],
  effect_demon_damage_mod: ['demon_damage_bonus', 0.1],
  effect_undead_reduction_mod: ['undead_damage_reduction', 0.1],
  effect_demon_reduction_mod: ['demon_damage_reduction', 0.1],
  effect_physical_healing: ['physical_healing', 0.1],
  effect_magical_healing: ['magical_healing', 0.1],
};

function convertDetailAttrs(list) {
  if (!Array.isArray(list) || list.length === 0) return undefined;
  const out = [];
  for (const a of list) {
    const rule = DETAIL_TO_WIDE[a.attribute];
    if (!rule) {
      out.push([a.attribute.replace(/^effect_/, ''), a.min, a.max]); // best effort
      continue;
    }
    const [name, scale] = rule;
    out.push([name, a.min * scale, a.max * scale]);
  }
  return out;
}

/** Parse a WIDE row's primary_/secondary_ columns into [attr, min, max] triples. */
function parseWideAttrs(row, prefix) {
  const out = [];
  for (const key of Object.keys(row)) {
    if (!key.startsWith(`${prefix}_min_`)) continue;
    const attr = key.slice(`${prefix}_min_`.length);
    if (attr.startsWith('enchanted_')) continue; // socketed variant, not stored yet
    const min = row[key];
    const max = row[`${prefix}_max_${attr}`];
    if (min === null || min === undefined) continue;
    out.push([attr, min, max ?? min]);
  }
  return out.length > 0 ? out : undefined;
}

function isEquippable(typeLc, slotLc) {
  return (typeLc && EQUIP_TYPES.has(typeLc)) || (slotLc && EQUIP_SLOTS.has(slotLc));
}

function fromWideRow(row) {
  const typeLc = lc(row.type);
  const slotLc = lc(row.slot_type);
  if (!isEquippable(typeLc, slotLc)) return null;
  return {
    id: row.id,
    archetype: row.archetype,
    name: row.name,
    rarity: lc(row.rarity),
    gearScore: row.gear_score,
    itemType: typeLc,
    slotType: slotLc,
    armorType: lc(row.armor_type) || undefined,
    handType: lc(row.hand_type) || undefined,
    weaponType: lc(row.weapon_type) || undefined,
    classMask: row.required_class ?? undefined,
    base: parseWideAttrs(row, 'primary'),
    pool: parseWideAttrs(row, 'secondary'),
  };
}

function fromDetail(d) {
  const typeLc = lc(d.item_type);
  const slotLc = lc(d.slot_type);
  if (!isEquippable(typeLc, slotLc)) return null;
  return {
    id: d.id,
    archetype: d.archetype,
    name: d.name,
    rarity: lc(d.rarity),
    gearScore: d.gear_score,
    itemType: typeLc,
    slotType: slotLc,
    armorType: lc(d.armor_type) || undefined,
    handType: lc(d.hand_type) || undefined,
    weaponType: lc(d.weapon_type) || undefined,
    classMask: d.required_class ?? undefined,
    base: convertDetailAttrs(d.primary_attributes),
    pool: convertDetailAttrs(d.secondary_attributes),
  };
}

async function main() {
  console.log('1) classes...');
  const classesRaw = await getJson(`${API}/classes`);
  await mkdir(path.join(OUT_DIR, 'api'), { recursive: true });
  await writeFile(
    path.join(OUT_DIR, 'api', 'classes.json'),
    JSON.stringify(classesRaw.body, null, 1),
  );
  console.log(`  saved ${classesRaw.body.length} classes (with perks/skills)`);

  console.log('2) item pages...');
  const items = [];
  const narrowRows = [];
  let skipped = 0;
  let page = 1;
  for (;;) {
    const data = await getJson(`${API}/items?limit=50&page=${page}`);
    for (const row of data.body) {
      if (row.item_type !== undefined && row.primary_min_armor_rating === undefined) {
        narrowRows.push(row); // page-1 style meta row -> needs detail fetch
      } else {
        const rec = fromWideRow(row);
        if (rec) items.push(rec);
        else skipped++;
      }
    }
    if (page % 10 === 0) console.log(`  page ${page} (${items.length} kept so far)`);
    const hasNext = Boolean(data.pagination?.next) && data.body.length > 0;
    if (!hasNext) break;
    page++;
    await sleep(80);
  }
  console.log(`  pages done: ${page}; wide-kept=${items.length}, narrow=${narrowRows.length}, skipped=${skipped}`);

  console.log('3) detail fetch for narrow rows...');
  const failed = [];
  for (const row of narrowRows) {
    try {
      const d = await getJson(`${API}/items/${row.id}`);
      const rec = fromDetail(d);
      if (rec) items.push(rec);
      else skipped++;
    } catch (err) {
      failed.push({ id: row.id, error: String(err.message ?? err) });
    }
    await sleep(60);
  }

  // Safety: dedupe by name+rarity (the two row shapes use different id schemes).
  const seen = new Set();
  const deduped = [];
  for (const it of items.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))) {
    const key = `${it.name}::${it.rarity}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(it);
  }

  const slotCounts = {};
  const attrSet = new Set();
  const typeSet = new Set();
  for (const it of deduped) {
    slotCounts[`${it.itemType}/${it.slotType}`] = (slotCounts[`${it.itemType}/${it.slotType}`] ?? 0) + 1;
    typeSet.add(it.itemType);
    for (const [attr] of [...(it.base ?? []), ...(it.pool ?? [])]) attrSet.add(attr);
  }

  await mkdir(path.join(OUT_DIR, 'items'), { recursive: true });
  const payload = {
    _meta: {
      source: 'api.darkerdb.com/v1 (community item database)',
      fetched_at: new Date().toISOString().slice(0, 10),
      total_items: deduped.length,
      failed_details: failed.length,
      units: 'attribute triples are [name, min, max]; percentage stats in TRUE percents; pool = per-item enchantment pool (ground-loot ranges)',
    },
    items: deduped,
  };
  const json = JSON.stringify(payload);
  await writeFile(path.join(OUT_DIR, 'items', 'items.json'), json);

  console.log('4) summary');
  console.log(`  items: ${deduped.length} (deduped from ${items.length}); skipped non-equippable: ${skipped}; failed: ${failed.length}`);
  console.log('  item types:', [...typeSet].join(', '));
  console.log('  slot counts:', JSON.stringify(slotCounts, null, 1));
  console.log(`  distinct attrs (${attrSet.size}):`, [...attrSet].sort().join(', '));
  console.log(`  wrote data/items/items.json (${(json.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
