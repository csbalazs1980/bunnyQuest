// Hunger and its effect on health, shared by the server (authoritative) and the client (display).

export const HUNGER_MAX = 50; // full belly
export const HUNGER_START = HUNGER_MAX; // new bunnies start full
/** At this hunger level health neither regenerates nor drains. */
export const HUNGER_NEUTRAL = 10;
/** Hunger goes down by 1 every 30 seconds. */
export const HUNGER_DECAY_MS = 30_000;
/** With a full belly: +1 HP every 5 seconds. */
export const REGEN_HP_PER_SEC_AT_FULL = 1 / 5;
/** Completely starving (hunger 0): -1 HP every 15 seconds. */
export const STARVE_HP_PER_SEC_AT_ZERO = 1 / 15;
/** After a respawn hunger is at least this, so a starved bunny doesn't starve again right away. */
export const HUNGER_AFTER_RESPAWN = 20;

/**
 * HP change per second at a given hunger level, linear on both sides of HUNGER_NEUTRAL:
 *   50 -> +1/5   30 -> +1/10   10 -> 0   5 -> -1/30   0 -> -1/15
 */
export function hpPerSecond(hunger: number): number {
  const h = Math.max(0, Math.min(HUNGER_MAX, hunger));
  if (h >= HUNGER_NEUTRAL) return ((h - HUNGER_NEUTRAL) / (HUNGER_MAX - HUNGER_NEUTRAL)) * REGEN_HP_PER_SEC_AT_FULL;
  return -((HUNGER_NEUTRAL - h) / HUNGER_NEUTRAL) * STARVE_HP_PER_SEC_AT_ZERO;
}
