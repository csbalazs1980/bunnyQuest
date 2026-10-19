// Magic: spells, the spell slots on the hotbar, the fireball and healing, shared by the client and the server.
//
// How it plays (see also shared/runes.ts for how drawings are read):
//   1. Hold F: a magic scroll opens (only for you; everyone else just sees your eyes glow red and sparkle).
//   2. Draw a spell's runes on it from top to bottom (left-right position doesn't matter), let go of F.
//   3. If you know the runes and drew them well enough, the spell goes into a free spell slot on the
//      hotbar for spellChargeMs(Intelligence). How many slots you have depends on Intelligence too
//      (spellSlotCount). Using a spell (press its key, aim, click) casts it once.
import { TILE_SIZE } from "./combat.js";
import type { RuneId } from "./runes.js";

/**
 * The spells. `radius`: the tiles a spell covers around the target tile (1 = the tile and the 8 around
 * it, 0 = just that tile); `hostile`: an attack (just-respawned, protected bunnies can't use it yet);
 * `color`: the target shown while aiming.
 */
export const SPELLS = {
  fireball: { runes: ["ka", "ash", "dom"] as RuneId[], icon: "🔥", radius: 1, hostile: true, color: 0xff8a2a },
  healing: { runes: ["ul", "tor", "sel"] as RuneId[], icon: "💚", radius: 0, hostile: false, color: 0x5ee07a },
} as const;
export type SpellId = keyof typeof SPELLS;
export const SPELL_IDS = Object.keys(SPELLS) as SpellId[];

/** Runes every new bunny knows (for now: those of every spell). Later runes could be learned from scrolls or teachers. */
export const STARTER_RUNES: RuneId[] = ["ka", "ash", "dom", "ul", "tor", "sel"];

/** The hotbar keys of the spell slots, in the order they fill up. */
export const SPELL_SLOTS = ["X", "C", "V", "B"] as const;
export type SpellSlot = (typeof SPELL_SLOTS)[number];

/**
 * How many spell slots a bunny has, by Intelligence: 1-2 → 1 (X), 3-5 → 2 (X, C), 6-7 → 3 (X, C, V),
 * 8+ → all 4 (X, C, V, B).
 */
export function spellSlotCount(intelligence: number): number {
  if (intelligence >= 8) return 4;
  if (intelligence >= 6) return 3;
  if (intelligence >= 3) return 2;
  return 1;
}
/** The spell slots a bunny can use (the first spellSlotCount of SPELL_SLOTS). */
export const spellSlotsFor = (intelligence: number): SpellSlot[] => SPELL_SLOTS.slice(0, spellSlotCount(intelligence));

/** A charged spell waits in its slot 1 minute + 6 s per Intelligence point, then fades away unused. */
export const SPELL_CHARGE_BASE_MS = 60_000;
export const SPELL_CHARGE_PER_INTELLIGENCE_MS = 6_000;
export const spellChargeMs = (intelligence: number) => SPELL_CHARGE_BASE_MS + intelligence * SPELL_CHARGE_PER_INTELLIGENCE_MS;
/** At most one cast (scroll read) per this long, so nobody floods the server with drawings. */
export const CAST_COOLDOWN_MS = 400;

/** Which spell these runes (top to bottom) make, if any. */
export function spellOf(runes: readonly (RuneId | null)[]): SpellId | null {
  return SPELL_IDS.find((id) => {
    const want = SPELLS[id].runes;
    return want.length === runes.length && want.every((r, i) => r === runes[i]);
  }) ?? null;
}

/** Why a scroll didn't give a spell (shown to the caster; texts: "magic.fail.<reason>"). */
export type CastFail = "empty" | "unreadable" | "unknownRune" | "noSpell" | "busy";

// ---------------- aiming ----------------
/** How far a spell reaches (target tile center, from the caster), in tiles. */
export const SPELL_RANGE_TILES = 8;
export const SPELL_RANGE = SPELL_RANGE_TILES * TILE_SIZE;

/** Center of a tile in pixels. */
export const tileCenter = (tx: number, ty: number) => ({ x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE });

/** Can a bunny at (x, y) cast a spell at tile (tx, ty)? */
export const inSpellRange = (x: number, y: number, tx: number, ty: number) => {
  const c = tileCenter(tx, ty);
  return Math.hypot(c.x - x, c.y - y) <= SPELL_RANGE;
};

/** Is someone standing at (x, y) inside the area of a spell (`radius` tiles around tile (tx, ty))? */
export const inArea = (x: number, y: number, tx: number, ty: number, radius: number) =>
  Math.abs(Math.floor(x / TILE_SIZE) - tx) <= radius && Math.abs(Math.floor(y / TILE_SIZE) - ty) <= radius;

// ---------------- the fireball ----------------
export const FIREBALL = {
  baseDamage: 2, // damage = 2 + Intelligence, then the target's armor is subtracted (never below 0)
  radiusTiles: SPELLS.fireball.radius, // explodes on the target tile and the 8 around it
  speed: 650, // px/s in flight; the explosion (and the damage) happens when it lands
};

/** Fireball damage before armor. */
export const fireballPower = (intelligence: number) => FIREBALL.baseDamage + intelligence;

/** Is someone standing at (x, y) caught in the blast of a fireball landing on tile (tx, ty)? */
export const inBlast = (x: number, y: number, tx: number, ty: number) => inArea(x, y, tx, ty, FIREBALL.radiusTiles);

/** Flight time of a fireball from (x, y) to tile (tx, ty), in ms. */
export const fireballFlightMs = (x: number, y: number, tx: number, ty: number) => {
  const c = tileCenter(tx, ty);
  return Math.round((Math.hypot(c.x - x, c.y - y) / FIREBALL.speed) * 1000);
};

// ---------------- healing ----------------
/** Healing: every bunny standing on the target tile (the caster too) gets back 5 + 2 × Intelligence HP (up to its max). */
export const HEALING = { base: 5, perIntelligence: 2 };
export const healAmount = (intelligence: number) => HEALING.base + HEALING.perIntelligence * intelligence;
