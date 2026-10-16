// Magic: spells, the spell slots on the hotbar and the fireball, shared by the client and the server.
//
// How it plays (see also shared/runes.ts for how drawings are read):
//   1. Hold F: a magic scroll opens (only for you; everyone else just sees your eyes glow red and sparkle).
//   2. Draw a spell's runes on it from top to bottom (left-right position doesn't matter), let go of F.
//   3. If you know the runes and drew them well enough, the spell goes into a free spell slot on the
//      hotbar (X, C, V, B) for SPELL_CHARGE_MS. Using it (press its key, aim, click) casts it once.
import { TILE_SIZE } from "./combat.js";
import type { RuneId } from "./runes.js";

export const SPELLS = {
  fireball: { runes: ["ka", "ash", "dom"] as RuneId[], icon: "🔥" },
} as const;
export type SpellId = keyof typeof SPELLS;
export const SPELL_IDS = Object.keys(SPELLS) as SpellId[];

/** Runes every new bunny knows (for now: the fireball's). Later runes could be learned from scrolls or teachers. */
export const STARTER_RUNES: RuneId[] = ["ka", "ash", "dom"];

/** The hotbar keys of the spell slots, in the order they fill up. */
export const SPELL_SLOTS = ["X", "C", "V", "B"] as const;
export type SpellSlot = (typeof SPELL_SLOTS)[number];

/** A charged spell waits in its slot this long, then fades away unused. */
export const SPELL_CHARGE_MS = 60_000;
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

// ---------------- the fireball ----------------
export const FIREBALL = {
  baseDamage: 2, // damage = 2 + Intelligence, then the target's armor is subtracted (never below 0)
  radiusTiles: 1, // explodes on the target tile and the 8 around it
  rangeTiles: 8, // how far you can throw it (target tile center, from the caster)
  speed: 650, // px/s in flight; the explosion (and the damage) happens when it lands
};
export const FIREBALL_RANGE = FIREBALL.rangeTiles * TILE_SIZE;

/** Fireball damage before armor. */
export const fireballPower = (intelligence: number) => FIREBALL.baseDamage + intelligence;

/** Center of a tile in pixels. */
export const tileCenter = (tx: number, ty: number) => ({ x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE });

/** Can a bunny at (x, y) throw a fireball at tile (tx, ty)? */
export const inFireballRange = (x: number, y: number, tx: number, ty: number) => {
  const c = tileCenter(tx, ty);
  return Math.hypot(c.x - x, c.y - y) <= FIREBALL_RANGE;
};

/** Is someone standing at (x, y) caught in the blast of a fireball landing on tile (tx, ty)? */
export const inBlast = (x: number, y: number, tx: number, ty: number) =>
  Math.abs(Math.floor(x / TILE_SIZE) - tx) <= FIREBALL.radiusTiles && Math.abs(Math.floor(y / TILE_SIZE) - ty) <= FIREBALL.radiusTiles;

/** Flight time of a fireball from (x, y) to tile (tx, ty), in ms. */
export const fireballFlightMs = (x: number, y: number, tx: number, ty: number) => {
  const c = tileCenter(tx, ty);
  return Math.round((Math.hypot(c.x - x, c.y - y) / FIREBALL.speed) * 1000);
};
