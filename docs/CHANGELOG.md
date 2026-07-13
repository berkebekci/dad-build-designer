# Changelog / phase log

Detailed per-phase history (moved out of CLAUDE.md to keep that file lean).
Newest last. For current architecture see [CLAUDE.md](../CLAUDE.md).

## Phase 0-1 — data foundation

Fighter (base stats, 15 perks, 12 skills, weapon/armor lists), stat curves
(PP bonus, HP, move/action speed, PDR table), rarity→enchantment rules.

## Phase 2 — engine

`src/engine/`: `curves.ts` (piecewise-linear interpolation), `computeStats.ts`
(pure fn; ExternalModifiers gear input), `validateBuild.ts`, `data.ts` (JSON bind).
24 tests.

## Phase 3 — MVP UI

`src/App.tsx` + `src/ui/` (PickList, StatPanel).

## Phase 4 — gear & enchantment system

`scripts/fetch-items.mjs`: 1639 items → `data/items/items.json` (1.5 MB). API traps:
page 1 = narrow schema (needs detail call), pages 2+ = wide schema (all attrs inline);
detail endpoint uses effect_* names + percentages in TENTHS, wide rows use plain names +
true percents. items.json normalized to wide names + true percents. `itemStats.ts`
(ATTR_RULES, gearTotals), `gearRules.ts` (slot legality). GearPanel UI.

## Phase 5a — save/share

`buildCodec.ts` (base64url), localStorage autosave, `#b=` hash load, `sanitizeBuild`.

## Phase 5b — all 10 classes

`data/classes/*.json` (perks/weapons: wiki mirror; base stats + skills: API via
`scripts/build-classes.mjs`, fills empty fields only). **required_class bitmask decoded**
by intersecting weapon lists with masks (release order): fighter=1, barbarian=2, rogue=4,
ranger=8, wizard=16, cleric=32, bard=64, warlock=128, druid=256, sorcerer=512.

## Phase 6 — user feedback round 1

Item picker (search → archetype → rarity chips). Integer HP/MS + MS% (330=100%).
Weapon combo damage (`weapon_hits.json`, 35 weapons). Damage simulator (`engine/damage.ts`,
wiki formula order; zone multipliers in `combat.json`). Armor/Magic Penetration.
Refactor: additional_/true_ damage split into separate buckets; additional_weapon_damage →
gearWeaponDamage (added after combo/zone).

## Phase 7 — user feedback round 2

ItemPicker opens full list on focus. Unique rarity 5→1 enchant. **Spell system**
(`data/spells/spells.json`, 6 casters; `engine/spells.ts`). MR→MDR curve (cap 65%).
Tabbed UI (Class / Gear & Stats / Damage). Reset via resetNonce.

## Phase 8 — tester feedback (icons/rules/inputs)

NumberField (select-on-focus, negative input). enchantablePool (base stats can't repeat
as enchants). Rarity filter chips + named badges. Icon tile grids. Spell Memory gating
(memory skill grants 5 slots).

## Phase 9 — icon fix / artifact / 2H enforcement

**Critical icon fix:** (1) wrong host — www.spellsandguns.com 404s, use
darkanddarker.wiki.spellsandguns.com. (2) item thumbnails 404 at 96px → use full-size
`/images/X/YY/Name.png`. Artifact + legend rarities added. `normalizeLoadout` drops
off-hand when primary is 2H (engine + sanitizer, not just UI).
