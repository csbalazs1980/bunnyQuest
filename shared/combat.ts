// Attack / defend timing, reach, fatigue and hit detection, shared by the client (effects,
// throttling) and the server (authoritative; later also damage with shared/stats.ts).

export const TILE_SIZE = 64;
/** How far an attack reaches from the bunny's center: one tile. */
export const ATTACK_RANGE = TILE_SIZE;
/** At most 3 attacks per second (each also costs fatigue). */
export const ATTACK_COOLDOWN_MS = 1000 / 3;
/** The comic burst shows this long. */
export const ATTACK_FLASH_MS = 500;
/** A block (Shift+click) lasts this long: longer than an attack. */
export const DEFEND_MS = 1000;
/** Minimum time between two blocks (holding Shift and clicking again refreshes the block). */
export const DEFEND_COOLDOWN_MS = 1000 / 3;

/** How many comic attack words there are (the words themselves are translated on each client: "fx.words"). */
export const ATTACK_WORD_COUNT = 3;

// ---------------- fatigue ----------------
/** Fatigue points each action costs (max fatigue = 20 + 3 × Endurance, see shared/stats.ts). */
export const FATIGUE_COST = {
  attack: 2,
  defend: 1,
  successfulDefense: 2, // paid by the defender when a block stops a hit
};
/** Regeneration: 1 fatigue point every 2 seconds at base; Endurance shortens it (fatigueRegenMs in shared/stats.ts). */
export const FATIGUE_REGEN_MS = 2000;

// ---------------- knock-out and respawn ----------------
/** A bunny at 0 HP lies knocked out (x.x) where it fell this long, then wakes up in the start town. */
export const RESPAWN_DELAY_MS = 10_000;
/** After waking up the bunny can't be hurt for this long, but it can't attack either. */
export const SPAWN_PROTECTION_MS = 10_000;
/** With friendly fire on, a bunny that just joined is protected this long too (same rules as above). */
export const JOIN_PROTECTION_MS = 10_000;

// ---------------- hits and blocks ----------------
/** An attack hits bunnies within reach, inside this half-angle around the attack direction. */
export const ATTACK_HALF_ANGLE = Math.PI / 3; // 60° each side
/** A block stops attacks coming from within this half-angle around the block direction. */
export const BLOCK_HALF_ANGLE = Math.PI / 3;
/** Bunnies are about this big: an attack reaches ATTACK_RANGE + this from the attacker's center. */
export const BUNNY_RADIUS = 16;

/** Smallest difference between two angles (radians, 0..π). */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}

interface Pos {
  x: number;
  y: number;
}

/** Does an attack from `attacker` toward `angle` hit a bunny standing at `target`? */
export function attackHits(attacker: Pos, angle: number, target: Pos): boolean {
  const dx = target.x - attacker.x;
  const dy = target.y - attacker.y;
  const dist = Math.hypot(dx, dy);
  if (dist > ATTACK_RANGE + BUNNY_RADIUS) return false;
  if (dist < BUNNY_RADIUS) return true; // standing on top of each other
  return angleDiff(Math.atan2(dy, dx), angle) <= ATTACK_HALF_ANGLE;
}

/** Is a bunny at `defender`, blocking toward `blockAngle`, facing an attacker standing at `attacker`? */
export function blockFaces(defender: Pos, blockAngle: number, attacker: Pos): boolean {
  const toAttacker = Math.atan2(attacker.y - defender.y, attacker.x - defender.x);
  return angleDiff(toAttacker, blockAngle) <= BLOCK_HALF_ANGLE;
}

// ---------------- damage and luck ----------------
/** Hits take HP (set to false to make combat harmless again). At 0 HP a bunny respawns in the start town. */
export const DAMAGE_ENABLED = true;

/** Chances per Luck point (Luck 1-10). */
export const LUCK = {
  doubleDamage: 0.01, // attack: damage × 2, a "2x" appears next to the burst
  bonusDamage: 0.03, // attack: +2 damage, the burst is 25% bigger
  bonusDamageAmount: 2,
  perfectBlock: 0.01, // block: stops everything and the attacker loses half their fatigue; shield 50% bigger
  fullBlock: 0.03, // block: stops all the damage; shield 25% bigger
};

export interface AttackLuck {
  double: boolean;
  bonus: boolean;
}
export interface BlockLuck {
  perfect: boolean;
  full: boolean;
}

/** Visual size of the effects: lucky events stack (e.g. perfect + full block = 75% bigger shield). */
export const burstScale = (l: AttackLuck) => 1 + (l.bonus ? 0.25 : 0);
export const shieldScale = (l: BlockLuck) => 1 + (l.perfect ? 0.5 : 0) + (l.full ? 0.25 : 0);

/** Rolls the attacker's luck for one swing. `rand` returns 0..1 (Math.random by default). */
export function rollAttackLuck(luck: number, rand: () => number = Math.random): AttackLuck {
  return { double: rand() < LUCK.doubleDamage * luck, bonus: rand() < LUCK.bonusDamage * luck };
}

/** Rolls the defender's luck when their block meets a hit. Both can happen at once. */
export function rollBlockLuck(luck: number, rand: () => number = Math.random): BlockLuck {
  return { perfect: rand() < LUCK.perfectBlock * luck, full: rand() < LUCK.fullBlock * luck };
}

export const NO_BLOCK_LUCK: BlockLuck = { perfect: false, full: false };

/**
 * Damage of one hit, with luck. Double damage applies first, then the +2 bonus. A blocked hit is
 * reduced by the defender's defense, a lucky (full or perfect) block stops it completely; armor
 * always counts. Uses `damage()` from shared/stats.ts for the rounding.
 */
export function hitDamage(
  attack: number,
  attackLuck: AttackLuck,
  defense: number,
  armor: number,
  blocked: boolean,
  blockLuck: BlockLuck,
  damageFn: (attack: number, defense: number, armor: number, blocked: boolean) => number
): number {
  if (blocked && (blockLuck.perfect || blockLuck.full)) return 0;
  let a = attack;
  if (attackLuck.double) a *= 2;
  if (attackLuck.bonus) a += LUCK.bonusDamageAmount;
  return damageFn(a, defense, armor, blocked);
}

export type CombatFx =
  // An attack (sent to everyone, the attacker too: `seq` lets them find the burst they already show)
  | { kind: "attack"; id: string; angle: number; dist: number; word: number; seq: number } & AttackLuck // word = index
  | { kind: "defend"; id: string; angle: number }
  // Damage amounts are deliberately not sent: players only see HP bars and have to guess
  // `bleed`: the hit did some damage (the client shows blood, how much depends on each player's setting)
  | { kind: "blocked"; id: string; by: string; luck: BlockLuck; bleed: boolean } // `id` blocked a hit from `by`
  | { kind: "hit"; id: string; by: string; bleed: boolean } // `id` was hit by `by`
  | { kind: "bite"; id: string; angle: number } // rat `id` bites toward `angle`
  | { kind: "shout"; id: string; line: string } // an enemy shouts one of SHOUTS (shared/enemies.ts)
  | { kind: "death"; id: string } // `id` ran out of HP: a bunny is knocked out, a rat dies
  | { kind: "respawn"; id: string }; // `id` woke up in the start town (protected for a while)

/** Cleans an angle (radians) and click distance coming from a client. Returns null if invalid. */
export function cleanAim(angle: unknown, dist: unknown): { angle: number; dist: number } | null {
  if (typeof angle !== "number" || !Number.isFinite(angle)) return null;
  const d = typeof dist === "number" && Number.isFinite(dist) ? dist : ATTACK_RANGE;
  return { angle, dist: Math.max(0, Math.min(ATTACK_RANGE, d)) };
}
