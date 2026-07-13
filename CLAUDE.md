# CLAUDE.md — DaD Build Designer

Path of Building-style build designer for Dark and Darker. User's first app-dev
learning project — explain steps and decisions. **Chat in Turkish; all data/code/
UI/commits in English** (no Turkish characters in files).

Live: https://dad-build-designer.vercel.app (Vercel auto-deploys on push to main).
Repo: https://github.com/berkebekci/dad-build-designer

## Architecture (data-first)

- Game data lives in versioned `data/*.json` — patches update data, not code.
- Core is a pure fn: `computeStats(class, curves, {gear}) → stats` (`src/engine/computeStats.ts`).
- Stats are NOT linear: `data/stat_curves.json` holds piecewise-linear breakpoint
  curves (`points=[[input,output],...]`, linear interpolation between anchors).
- Stack: TypeScript + React + Vite, no backend, static JSON. Run: `npm run dev`
  (localhost:5173), `npm test` (vitest), `npm run typecheck`, `npm run build`.

## Engine modules (`src/engine/`)

- `curves.ts` — `evalCurve` (cap/floor/flat_add) interpolation.
- `computeStats.ts` — pure fn, the whole app funnels into it.
- `itemStats.ts` — ATTR_RULES (attribute/flat/percent), `gearTotals` (perfect-roll
  base = max of range + chosen enchant rolls), `enchantablePool` (base stats can't
  repeat as enchants).
- `gearRules.ts` — slot legality (mask-first), `normalizeLoadout` (2H drops off-hand),
  `perk_gear_hooks` (weapon_mastery, slayer, demon_armor, spear_proficiency).
- `spells.ts` — spell damage; memory-skill gating (5 slots each).
- `damage.ts` — hit simulator, wiki formula order, zone multipliers.
- `buildCodec.ts` — base64url share links; `data.ts` binds JSON to types.

## Data sources (critical)

- **darkanddarker.wiki.gg is BLOCKED here (401).** Use mirror
  `darkanddarker.wiki.spellsandguns.com` (WebFetch works).
- Item DB: `api.darkerdb.com/v1/items` (wide rows on page 2+ carry all attrs inline).
- **Icons:** darkerdb CDN `cdn.darkerdb.com/codex/<hash>` works. Mirror images use host
  `darkanddarker.wiki.spellsandguns.com` (NOT www.spellsandguns.com = 404). Item icons
  need FULL-SIZE `/images/X/YY/Name.png` (96px thumbs 404). darkerdb API dropped item
  icon fields in its 2026-07 migration — mirror is the only item-icon source.
- Scripts: `fetch-items.mjs`, `fetch-icons.mjs`, `fetch-ability-icons.mjs`,
  `build-classes.mjs`. Verification notes: `docs/kaynaklar.md`. History: `docs/CHANGELOG.md`.

## Game rules

- 7 attributes: STR VIG AGI DEX WILL KNOW RES (class bases sum to 105).
- Composite ratings: Health = 0.25·STR+0.75·VIG; Action Speed = 0.25·AGI+0.75·DEX;
  Interaction = 0.25·DEX+0.75·RES.
- required_class bitmask GOVERNS gear eligibility; class weapon name-lists are only a
  fallback for maskless items (stale entries harmless).
- Rarity → enchantments: Poor/Common 0, Uncommon 1, Rare 2, Epic 3, Legendary 4,
  Unique 1, Artifact 6 (fixed/unchangeable). Bit order above; artifact = top tier.
- Zone multipliers: head 1.5, body 1.0, arms 0.8, hands 0.7, legs 0.6, feet 0.5.
- Move speed shown as % with 330 = 100%. Penetration: effDR = DR·(1−pen).

## Status

Live and working (10 classes, gear+enchant, spells, damage sim, share links, icons).
Detailed phase history in `docs/CHANGELOG.md`. Open ideas: skill/perk buff-toggle
(live stat effects), monster targets + TTK, fuller ability descriptions.
