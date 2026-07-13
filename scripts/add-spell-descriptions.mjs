/**
 * Injects the real in-game spell/song descriptions (fetched verbatim from the
 * wiki mirror class pages) into data/spells/spells.json, keyed by spell name.
 *
 * Usage: node scripts/add-spell-descriptions.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DESCRIPTIONS = {
  // Wizard
  Zap: 'Deals 20 Light Magical Base Damage and burns the target for 1s, dealing 1 Fire Magical Base Damage.',
  'Light Orb': 'Cast spheres of floating light that travel to brightly illuminate your surroundings for 40s. Also reveals allied and enemy hidden Rogues within 3m, ignoring walls.',
  'Magic Lock': 'Lockable objects such as doors or boxes will be locked for 10s.',
  Slow: 'Cause the target to suffer -40% Move Speed Bonus for 2s.',
  Ignite: "Set the target's weapon on fire for 12s. While active, deal 5 Fire Magical Base Damage and burn enemies for 1 Fire Magical Base Damage over 1s on successful attacks.",
  'Ice Bolt': 'Deal 30 Projectile Ice Magical Base Damage with 4 Impact Power and inflict -20% Move Speed Bonus and -20% Action Speed for 1s. Projectile speed 14m/s.',
  'Magic Missile': 'Channel up to 3s while still, firing a homing missile every 0.3s that each deal 10 Projectile Arcane Magical Base Damage with 2 Impact Power. Projectile speed 7m/s.',
  Haste: 'Grants the target 5% Move Speed Bonus, 10% Action Speed and 10% Spell Casting Speed for 6s. Self-cast if no target found.',
  'Lightning Strike': 'A bolt of lightning falls in the targeted area after 0.5s, dealing 30 Lightning Magical Base Damage in a 0.8m blast radius and inflicting -20% Move Speed Bonus for 1s.',
  Invisibility: 'Grants the target invisibility for 4s and 5% Move Speed Bonus. Self-cast if no target found.',
  Fireball: 'Shoot a fireball dealing 35 Projectile Fire Magical Base Damage on direct hit (6 Impact Power), or 10 Fire AoE damage with knockback and a 3-damage burn over 2s. Direct hits do not also splash. Projectile speed 12m/s.',
  Explosion: 'Place a mark that explodes after 3s, dealing 25 Fire Magical Base Damage in a 1m area plus a 3-damage burn over 2s. On a character it sticks until it explodes; removed with no damage if the Wizard dies or extracts.',
  'Chain Lightning': 'Deal 30 Lightning Magical Base Damage, then bounce to a random target within 8m up to 3 times (25/25/20 by bounce). Targets suffer -20% Move Speed Bonus for 1s. Does not re-hit previous targets.',

  // Cleric
  Protection: 'Target within 7m receives a 20 Physical Base Shield for 8s. Self-cast if no target found.',
  Bless: 'Target within 7m gains 2 All Attributes for 30s. Self-cast if no target found.',
  'Divine Strike': 'Target within 7m gains 5 Divine Strike Damage for 12s. Self-cast if no target found.',
  Cleanse: 'Removes all harmful magic and poison effects from a target within 7m. Self-cast if no target found.',
  'Lesser Heal': 'Heals a target within 7m for 20 Magical Base Healing. Self-cast if no target found.',
  Bind: 'Binds a target within 7m in place for 0.75s.',
  'Holy Strike': 'Burst of light in an area within 7m, hitting all targets within 1m after 0.5s for 20 Divine Magical Base Damage and disorienting their vision over 4s.',
  'Holy Light': 'Heal a target player within 7m for 35 Magical Base Healing, OR deal 100 Divine Magical Base Damage to an Undead monster in range. Cannot target self.',
  Sanctuary: 'Channel up to 5s while still, creating a 3.5m aura that pulses every 1s: heals players for 5 and deals 14 Divine damage to Undead monsters each pulse.',
  'Locust Swarm': 'Channel a swarm in a 3m area within 7m for up to 6s, dealing 13 Divine Magical Base Damage/s and inflicting -50% incoming physical & magical healing.',
  Earthquake: 'Channel in a 2.5m area within 7m for up to 6s, dealing 7 Earth Magical Base Damage per step a target moves and inflicting -50% Move Speed Bonus.',
  Resurrection: 'Channel while still on a fallen ally, reviving them after 20s but with -99% Max Health Healing on revival. Requires a soul heart.',

  // Warlock
  'Power of Sacrifice': 'Curse the target for 3 Curse/Evil Hybrid damage per second while granting them 15 Strength and 15 Vigor for 12s. Self-cast if no target found.',
  'Curse of Weakness': 'Curse the target: -25% All Attributes Bonus, -15% Physical DR Mod and -15% Magical DR Mod for 12s.',
  'Bolt of Darkness': 'Fire a bolt dealing 20 Projectile Dark Magical Base Damage. Can be shot down by other projectiles, detonating early.',
  'Curse of Pain': 'Curse the target for 15 Evil/Curse Hybrid damage over 8s. If not already cursed, they instantly take 15 Evil damage.',
  'Bloodstained Blade': 'Target gains 5 Physical Buff Weapon Damage for 20s but takes 3 Evil damage on each swing. Self-cast if no target found.',
  'Spell Predation': 'Consume all removable magical buffs on the enemy; per status removed, gain 1 Darkness Shard and deal 3 Evil damage.',
  'Evil Eye': "Channel to summon a pilotable Evil Eye monster for 30s. While controlling it, the caster stands still and vulnerable.",
  'Ray of Darkness': 'Channel a dark beam up to 5s, dealing 12 Dark Magical Base Damage/s to anything it touches. Can move and aim while channeling.',
  'Life Drain': 'Channel up to 7.5s, dealing 5 Evil damage/s to the target and converting 100% of it into your health.',
  Hellfire: 'Blast eternal hellfire at the target, dealing 60 Fire Magical Base Damage/s (12 Impact Power) to anything in the area.',
  'Flame Walker': 'For 6s, leave a trail of hellfire; each step leaves a 4s-lasting flame. Targets entering it burn.',
  'Eldritch Shield': 'Grant the target a 25 Magical Base Shield for 15s. When it fully absorbs, gain 30% Dark Power Bonus and 50% Spell Casting Speed for the next dark spell within 6s.',
  'Summon Hydra': 'Summon a Hydra that spits fireballs dealing 10 Projectile Fire damage (4 Impact Power) for 10s.',

  // Sorcerer
  'Fire Arrow': 'Fire homing arrows every 0.2s for 0.6s, each dealing 8 Projectile Fire damage and inflicting Burn (5 fire over 3s).',
  'Stone Skin': 'Surround yourself in stone for 12s: +10% Physical DR and +10% Physical Power Bonus, but -5 Move Speed Add.',
  'Water Bolt': 'Launch a water orb (6m/s) dealing 15 Projectile Ice damage and inflicting Wet for 2s (-20% Move Speed, -30% jump). Up to 3 orbs; 7m range.',
  Glaciate: 'Envelop your weapon in ice for 12s: deal 3 Ice damage and inflict Frostbite (-5% Move Speed, -20% Action Speed) on hit.',
  Windblast: 'Channel 0.6s, then deal 10 Air damage to a target within 4m and push them back.',
  Eruption: 'Ground explosion up to 4m away (0.8m wide) dealing 20 Earth damage and lifting all targets into the air after 0.85s.',
  Flamestrike: 'Create a 1s fire pillar dealing 30 Fire on creation and 10 Fire/s (6 Impact Power) inside, inflicting Burn (3 fire over 3s).',
  'Ice Spear': 'Fire a piercing ice spear (16.5m/s) dealing 30 Projectile Ice damage and inflicting Frostbite (-20% Move Speed, -20% Action Speed) for 2s.',
  'Fire Orb': 'Launch a slow fire orb dealing 5 Fire/s nearby; on contact deals 45 Projectile Fire (12 Impact Power) then explodes for 10 more plus Burn. 7m range.',
  'Lightning Bolt': 'Channel a beam for 5s while moving, dealing 7 Lightning/s to a target within 7m and inflicting Electrified (-20% Move Speed for 1s).',
  Vortex: 'Create a vortex on the caster: targets touching it take 15 Air damage and are pushed back.',
  Levitation: 'Lift a target within 7m into the air over 1s, then gently lower them over 3s.',
  'Lightning Sphere': 'Surround yourself with a field for 5s, dealing 5 Lightning/s to targets within 1.75m and inflicting Electrified.',
  'Summon Earth Elemental': 'Summon an Earth Elemental (7m range) for 18s that grants you 50 Armor Rating and deals 40 Projectile Physical damage to nearby enemies.',

  // Druid
  "Nature's Touch": 'Target receives 15 Recoverable Health and 15 Magical Base Healing over 12s. 7m range.',
  'Barkskin Armor': 'Grant target (self if none) 50 Armor Rating for 10s and 10% Headshot Damage Reduction.',
  'Orb of Nature': "Fire an orb (14m/s) dealing 15 Spirit damage to an enemy, or granting Nature's Touch to an ally on contact.",
  Dreamfire: "Deal 15 Spirit damage in a 0.8m area within 7m after 0.5s. Allies/self with Nature's Touch within 7m are healed 10 per enemy hit.",
  'Thorn Barrier': 'Create a 2m thorn barrier for 4s dealing 4 Physical damage/s to anything touching it. 6 Impact Endurance. 7m range.',
  'Entangling Vines': 'Spread roots in a 1m area after 0.75s; targets passing through are rooted for 1s, then gain 1s immunity. One at a time. 7m range.',
  Restore: 'Allies within 3m (including you) are healed for 20 Magical Base Healing over 12s.',
  'Summon Treant': 'Summon a mobile Treant within 7m for 12s that deals 35.2 damage (4 Impact Power) per hit and has Demolition.',
  'Tree of Life': 'Sprout a tree on a player within 7m granting 3 All Attributes, 20 Recoverable Health and 15 Magical Base Healing over 8s.',
  'Mending Grove': 'Create a 3m forest around you for 7s: targets inside gain 10% Max Health Bonus and heal 10/s.',

  // Bard (songs — mechanical effect; tiers shown as t1/t2/t3)
  'Rousing Rhythms': 'Grant all allies in range 2 All Attributes for 60s/120s/240s (by performance quality).',
  'Din of Darkness': 'Deal 1/3/5 Dark Magical Base Damage per beat to enemies in range during a 7.36s channel.',
  'Beats of Alacrity': 'Grant self 4/5/6 Move Speed Add for 60s/120s/240s.',
  Allegro: 'Grant allies stacking 3%/4%/5% Action Speed and Spell Casting Speed (max 3 stacks).',
  Accelerando: 'Grant allies stacking 2/3/4 Move Speed Add per stack (max 3 stacks).',
  'Unchained Harmony': 'Open all doors/containers in range, including locked containers (not locked doors).',
  'Shriek of Weakness': 'Reduce enemy Physical Power, Armor Rating and Physical Damage Reduction for 6s/12s/18s.',
  'Piercing Shrill': 'Deal 20/25/30 Physical Base Damage to enemies and inflict an echo effect on players.',
  'Banshees Howl': 'Cause enemies/monsters in range (except sub-boss/boss) to suffer -1/-2/-3 All Attributes for 20s.',
  'Song of Silence': 'Silence all enemies/monsters in range for 1s/1.5s/2s.',
  Peacemaking: 'Channel 5s; all characters in range lose the ability to fight or attack.',
  'Lament of Languor': 'Cause enemies/monsters in range to suffer -10 Move Speed Add for 6s/12s/18s.',
  'Chaotic Discord': 'Channel 5s causing monsters to attack the nearest non-performer target.',
  'Aria of Alacrity': 'Grant self 4%/6%/8% Action Speed for 60s/120s/240s.',
  Tranquility: 'Grant allies healing restoration while resting for 10s/20s/30s.',
  'Song of Shadow': 'Grant all allies in range invisibility for 10s/20s/30s.',
  'Harmonic Shield': 'Grant self 3%/4%/5% Physical and Magical Damage Reduction for 60s/120s/240s.',
  'Chorale of Clarity': 'Grant allies Spell Point restoration while resting for 8s/16s/24s.',
  'Ballad of Courage': 'Grant all allies 5/7/10 Physical Power for 6s.',
};

async function main() {
  const p = path.resolve(import.meta.dirname, '..', 'data', 'spells', 'spells.json');
  const file = JSON.parse(await readFile(p, 'utf8'));
  let updated = 0;
  const missing = [];
  for (const list of Object.values(file.classes)) {
    for (const spell of list) {
      const desc = DESCRIPTIONS[spell.name];
      if (desc) {
        spell.description = desc;
        updated++;
      } else {
        missing.push(spell.name);
      }
    }
  }
  await writeFile(p, JSON.stringify(file, null, 1));
  console.log(`added descriptions to ${updated} spells`);
  if (missing.length) console.log(`missing (${missing.length}):`, missing.join(', '));
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
