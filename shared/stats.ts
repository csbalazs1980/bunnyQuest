// Bunny stats and the combat math, shared by the client (creation screen, Stats window)
// and the server (validates the stats you join with; will run real fights later).
import { PLAYER_SPEED } from "./world.js";
import { FATIGUE_REGEN_MS } from "./combat.js";

export type StatKey = "strength" | "agility" | "intelligence" | "charm" | "endurance" | "luck";
export type Stats = Record<StatKey, number>;

/** `help` is shown to players: a summary of what the stat affects, never the exact math (that is below). */
export const STATS: { key: StatKey; label: string; short: string; help: string }[] = [
  { key: "strength", label: "Strength", short: "STR", help: "Affects attack" },
  { key: "agility", label: "Agility", short: "AGI", help: "Affects attack, defense and movement speed" },
  { key: "intelligence", label: "Intelligence", short: "INT", help: "Will matter later for magic" },
  { key: "charm", label: "Charm", short: "CHA", help: "Will matter later" },
  { key: "endurance", label: "Endurance", short: "END", help: "Affects health, stamina (fatigue) and how fast you recover" },
  { key: "luck", label: "Luck", short: "LCK", help: "Lucky hits and lucky blocks happen more often" },
];

export const STAT_MIN = 1;
export const STAT_MAX = 10;
export const CREATION_POINTS = 20; // points to distribute at character creation (all must be spent)

/** A fresh character before distributing: every stat at the minimum. */
export const baseStats = (): Stats =>
  Object.fromEntries(STATS.map((s) => [s.key, STAT_MIN])) as Stats;

export const pointsSpent = (stats: Stats) => STATS.reduce((sum, s) => sum + stats[s.key], 0);

/** Why these creation stats are not allowed, or null if they are fine. */
export function creationProblem(stats: unknown): string | null {
  if (!stats || typeof stats !== "object") return "No stats";
  const s = stats as Record<string, unknown>;
  for (const { key, label } of STATS) {
    const v = s[key];
    if (typeof v !== "number" || !Number.isInteger(v)) return `${label} must be a whole number`;
    if (v < STAT_MIN || v > STAT_MAX) return `${label} must be ${STAT_MIN}-${STAT_MAX}`;
  }
  const spent = pointsSpent(s as Stats);
  if (spent !== CREATION_POINTS) return `Distribute exactly ${CREATION_POINTS} points (now ${spent})`;
  return null;
}

// ---------------- derived values ----------------

export const BASE_HP = 20;
export const HP_PER_ENDURANCE = 5;
export const UNARMED_ATTACK = 1;

/** Combat values of an item (missing = 0). */
export interface CombatItem {
  attack?: number;
  defense?: number;
  armor?: number;
}

export const maxHp = (stats: Stats) => BASE_HP + stats.endurance * HP_PER_ENDURANCE;

export const BASE_FATIGUE = 20;
export const FATIGUE_PER_ENDURANCE = 3;
/** Fatigue points: spent by attacking and blocking, slowly regenerating (see shared/combat.ts). */
export const maxFatigue = (stats: Stats) => BASE_FATIGUE + stats.endurance * FATIGUE_PER_ENDURANCE;

export const REGEN_FASTER_PER_ENDURANCE = 0.04;
/** Time between two regenerated fatigue points: base 2 s, each Endurance point makes it 4% (of 2 s) shorter. */
export const fatigueRegenMs = (stats: Stats) => FATIGUE_REGEN_MS * (1 - REGEN_FASTER_PER_ENDURANCE * stats.endurance);

export const SPEED_PER_AGILITY = 0.03;
/** Movement speed in pixels per second on normal ground: base speed + 3% per Agility point. */
export const moveSpeed = (stats: Stats) => PLAYER_SPEED * (1 + SPEED_PER_AGILITY * stats.agility);

/** Attack = weapon attack × (1 + 5% per Strength + 2% per Agility). */
export const attackValue = (weaponAttack: number, stats: Stats) =>
  weaponAttack * (1 + 0.05 * stats.strength + 0.02 * stats.agility);

/** Defense (when blocking) = weapon defense × (1 + 5% per Agility). */
export const defenseValue = (weaponDefense: number, stats: Stats) => weaponDefense * (1 + 0.05 * stats.agility);

export interface Derived {
  maxHp: number;
  weaponAttack: number;
  weaponDefense: number;
  attack: number;
  defense: number;
  armor: number;
  speed: number; // movement, px/s on normal ground
}

/**
 * All derived values for a bunny. `held` = items in the hands (best attack and best defense count;
 * empty hands fight with UNARMED_ATTACK), `worn` = items in the other outfit slots (their armor adds up).
 */
export function derive(stats: Stats, held: CombatItem[], worn: CombatItem[]): Derived {
  const weaponAttack = Math.max(UNARMED_ATTACK, ...held.map((i) => i.attack ?? 0));
  const weaponDefense = Math.max(0, ...held.map((i) => i.defense ?? 0));
  return {
    maxHp: maxHp(stats),
    weaponAttack,
    weaponDefense,
    attack: attackValue(weaponAttack, stats),
    defense: defenseValue(weaponDefense, stats),
    armor: worn.reduce((sum, i) => sum + (i.armor ?? 0), 0),
    speed: moveSpeed(stats),
  };
}

/**
 * Damage of one hit: the attack, minus the defender's defense if they blocked, minus their armor.
 * Rounded to whole HP, never negative.
 *   attack 8 vs defense 5 + armor 2: blocked -> 1, not blocked -> 6
 */
export function damage(attack: number, defense: number, armor: number, blocked: boolean): number {
  return Math.max(0, Math.round(attack - (blocked ? defense : 0) - armor));
}

/** Nicely formatted value: whole numbers stay whole, others get up to 2 decimals. */
export const fmt = (v: number) => String(Math.round(v * 100) / 100);
