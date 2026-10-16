// Enemies: for now only rats. They wander around looking for food and bite bunnies that come close.
// The server runs them (server/src/rats.ts); the client only draws them. All numbers are here.
//
// Balance, compared to a starting bunny (HP 20 + 5 × Endurance ≈ 35, Sword attack 5 → about 6 per hit):
// - a rat has 12 HP, so it falls after 2 sword hits (3 for a weak bunny, many more with empty paws);
// - its bite (attack 3) takes about 3 HP without armor, about 1 HP through a vest and boots, and a
//   block with the sword stops it completely (but each blocked bite costs fatigue, as usual);
// - it bites a bit more slowly than a bunny attacks and runs slower than a bunny, so you can flee.
import { TILE_SIZE } from "./combat.js";

export const RAT = {
  count: 100, // rats on the map at any time (dead ones come back elsewhere)
  hp: 12,
  attack: 3, // like a weapon's attack value (shared/stats.ts damage(): reduced by blocks and armor)
  biteCooldownMs: 1200, // at most one bite per 1.2 s (a bunny can attack 3 times a second)
  biteRange: 36, // px between centers: practically touching
  wanderSpeed: 55, // px/s while looking for food (a bunny walks about 200+)
  chaseSpeed: 140, // px/s while chasing a bunny: slower than a bunny, so running away works
  aggroRange: 4 * TILE_SIZE, // notices bunnies this close...
  giveUpRange: 7 * TILE_SIZE, // ...and stops chasing when they get this far away
  respawnMs: 60_000, // a dead rat comes back (somewhere else) after this long
  minSpawnDistance: 15 * TILE_SIZE, // rats never appear this close to the start town
};

/** Terrain a rat may appear on (map.json keys): grass, trees, hills, swamp. */
export const RAT_SPAWN_TERRAIN = new Set(["G", "T", "H", "S"]);

// ---------------- crusaders (an easter egg) ----------------
// 30 bands of 5 knights roam the land: King Arthur walks ahead, four knights follow him in a loose
// formation, never more than 2 tiles away. A bunny within 5 tiles is charged ("CHARGE!"); after three
// of a band fall, the rest lose their nerve and run away screaming. Server: server/src/crusaders.ts.
export const CRUSADERS = {
  groups: 30,
  size: 5, // the king + 4 knights
  leash: 2 * TILE_SIZE, // knights never stray further than this from their leader
  aggroRange: 5 * TILE_SIZE, // a bunny this close to the leader is charged
  giveUpRange: 8 * TILE_SIZE,
  fleeFrom: 6 * TILE_SIZE, // a broken band runs from bunnies this close...
  safeAt: 9 * TILE_SIZE, // ...until they are this far away
  breakAfter: 3, // members killed before the rest flee
  walkSpeed: 45, // px/s marching about
  chaseSpeed: 125, // charging (slower than a bunny)
  fleeSpeed: 185, // running for their lives (still a bit slower than most bunnies)
  followSpeed: 1.35, // knights catch up to their formation spot up to this many times the leader's speed
  hitRange: 44, // swords reach a bit further than rat teeth
  hitCooldownMs: 1300,
  respawnMs: 120_000, // a band wiped out completely comes back elsewhere after this long
  minSpawnDistance: 20 * TILE_SIZE, // from the start town
  knight: { hp: 14, attack: 3 },
  king: { hp: 20, attack: 4 },
};

/** Things crusaders shout (translated on each client: "shout.<line>"). */
export const SHOUTS = ["charge", "aaa", "retreat", "run", "victory", "fineDay", "lostMen", "triumph"] as const;
export type Shout = (typeof SHOUTS)[number];

/** Full health of an enemy kind (the client uses it for the bleeding trail). */
export function enemyMaxHp(kind: string): number {
  if (kind === "king") return CRUSADERS.king.hp;
  if (kind === "knight") return CRUSADERS.knight.hp;
  return RAT.hp;
}
