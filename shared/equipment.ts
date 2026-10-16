// Outfit / equipment rules shared by the client (instant feedback) and the server (authoritative).
// All functions are pure: they take the current equipment and return a new one (or null if not allowed).

export type SlotKind = "earring" | "head" | "shirt" | "armor" | "hand" | "belt" | "trousers" | "boots";

export interface SlotDef {
  id: string;
  kind: SlotKind;
  label: string; // shown in tooltips
  short: string; // shown inside an empty slot square
  beltIndex?: number; // hotbar slots 3+ only exist while a belt with enough pockets is worn
}

/** What the rules need to know about an item. */
export interface EquipItem {
  id: string;
  equip: string; // SlotKind it can be worn in, "" = can only be held in a hand / hotbar slot
  beltSlots: number; // belts only: extra hotbar slots it unlocks
}

/** slot id -> item id */
export type Equipment = Record<string, string>;

export const MAX_BELT_SLOTS = 4;

export const SLOTS: SlotDef[] = [
  { id: "earring1", kind: "earring", label: "Earring 1", short: "E1" },
  { id: "earring2", kind: "earring", label: "Earring 2", short: "E2" },
  { id: "earring3", kind: "earring", label: "Earring 3", short: "E3" },
  { id: "earring4", kind: "earring", label: "Earring 4", short: "E4" },
  { id: "head", kind: "head", label: "Hat / Helmet", short: "Hat" },
  { id: "shirt", kind: "shirt", label: "Shirt", short: "Shirt" },
  { id: "armor", kind: "armor", label: "Upper armor", short: "Armor" },
  // Hands are hotbar slots 1 and 2; belt pockets are hotbar slots 3+
  { id: "hot1", kind: "hand", label: "Hand 1", short: "H1" },
  { id: "hot2", kind: "hand", label: "Hand 2", short: "H2" },
  { id: "belt", kind: "belt", label: "Belt", short: "Belt" },
  { id: "trousers", kind: "trousers", label: "Trousers", short: "Pants" },
  { id: "boots", kind: "boots", label: "Boots", short: "Boots" },
  ...Array.from({ length: MAX_BELT_SLOTS }, (_, i) => ({
    id: `hot${i + 3}`,
    kind: "hand" as const,
    label: `Belt pocket ${i + 1}`,
    short: String(i + 3),
    beltIndex: i,
  })),
];

/** Hotbar slots in order: hands first, then belt pockets. */
export const HOTBAR_SLOTS = SLOTS.filter((s) => s.kind === "hand");

const slotById = new Map(SLOTS.map((s) => [s.id, s]));
export const slotDef = (id: string) => slotById.get(id);

const findItem = (items: EquipItem[], id: string | undefined) => (id ? items.find((i) => i.id === id) : undefined);

/** Number of belt pockets currently available (0 without a belt). */
export function beltSlotCount(eq: Equipment, items: EquipItem[]): number {
  return Math.min(MAX_BELT_SLOTS, Math.max(0, findItem(items, eq.belt)?.beltSlots ?? 0));
}

export function isUnlocked(slotId: string, eq: Equipment, items: EquipItem[]): boolean {
  const s = slotById.get(slotId);
  return !!s && (s.beltIndex === undefined || s.beltIndex < beltSlotCount(eq, items));
}

/** Hands (and belt pockets) can hold anything; every other slot needs the matching kind. */
export function fits(item: EquipItem, slotId: string): boolean {
  const s = slotById.get(slotId);
  return !!s && (s.kind === "hand" || item.equip === s.kind);
}

export function slotOf(eq: Equipment, itemId: string): string | undefined {
  return Object.keys(eq).find((k) => eq[k] === itemId);
}

/** Drops anything that is no longer valid: unknown slots, items not owned, pockets of a removed belt. */
export function normalize(eq: Equipment, items: EquipItem[]): Equipment {
  const owned = new Set(items.map((i) => i.id));
  const out: Equipment = {};
  for (const [slot, id] of Object.entries(eq)) if (slotById.has(slot) && owned.has(id) && id) out[slot] = id;
  for (const slot of Object.keys(out)) if (!isUnlocked(slot, out, items)) delete out[slot];
  return out;
}

/**
 * Puts an item into a slot. If the item was already in another slot it moves; if the target slot
 * was occupied, that item goes to the slot the moved item came from (a swap) when it fits there,
 * otherwise it simply goes back to the bag. Returns null if the move isn't allowed.
 */
export function place(eq: Equipment, items: EquipItem[], itemId: string, slotId: string): Equipment | null {
  const item = findItem(items, itemId);
  if (!item || !fits(item, slotId) || !isUnlocked(slotId, eq, items)) return null;
  const from = slotOf(eq, itemId);
  if (from === slotId) return eq;
  const occupant = findItem(items, eq[slotId]);
  const next: Equipment = { ...eq };
  if (from) delete next[from];
  next[slotId] = itemId;
  if (occupant && from && fits(occupant, from)) next[from] = occupant.id;
  return normalize(next, items);
}

export function remove(eq: Equipment, items: EquipItem[], slotId: string): Equipment {
  const next = { ...eq };
  delete next[slotId];
  return normalize(next, items);
}

/**
 * Splits worn items for combat: `held` = what is in the hands (hotbar 1-2), `worn` = everything in the
 * outfit slots (armor counts). Items in belt pockets are carried, not used.
 */
export function heldAndWorn<T extends { id: string }>(eq: Equipment, items: T[]): { held: T[]; worn: T[] } {
  const held: T[] = [];
  const worn: T[] = [];
  for (const [slotId, itemId] of Object.entries(eq)) {
    const item = items.find((i) => i.id === itemId);
    if (!item) continue;
    if (slotId === "hot1" || slotId === "hot2") held.push(item);
    else if (slotById.get(slotId)?.kind !== "hand") worn.push(item);
  }
  return { held, worn };
}

/**
 * The slot Shift+E puts an item into: the first free matching slot, or the first matching slot
 * if all are taken. Items that can't be worn go to the first free hand / belt pocket.
 * Returns null if the item is already equipped or there is no slot for it.
 */
export function autoSlot(eq: Equipment, items: EquipItem[], itemId: string): string | null {
  const item = findItem(items, itemId);
  if (!item || slotOf(eq, itemId)) return null;
  const kind = item.equip || "hand";
  const candidates = SLOTS.filter((s) => s.kind === kind && isUnlocked(s.id, eq, items));
  return (candidates.find((s) => !eq[s.id]) ?? candidates[0])?.id ?? null;
}
