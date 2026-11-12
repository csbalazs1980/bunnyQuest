// What every item is really worth, in silver (per piece). Only the server knows these: the client
// gets each bunny's own guesses (shared/trade.ts guessValue, based on Charm + Intelligence), so
// nobody can read the real values out of the game's code. Adding an item to ITEM_DEFS without a value
// here is a compile error.
import type { ItemDefId } from "../../shared/items.js";

export const ITEM_VALUES = {
  sword: 30,
  wooden_shield: 15,
  straw_hat: 3,
  linen_shirt: 5,
  leather_vest: 25,
  work_trousers: 6,
  old_boots: 4,
  belt: 4,
  adventurers_belt: 12,
  gold_earring: 40,
  silver_earring: 20,
  carrot: 1,
  health_potion: 10,
  house_key: 1,
} satisfies Record<ItemDefId, number>;

/** The real value of one piece of an item (0 for unknown ids). */
export const itemValue = (defId: string): number => (ITEM_VALUES as Record<string, number>)[defId] ?? 0;
