// Item definitions shared by the client (icons, labels) and the server (starting inventory).

export interface ItemTypeInfo {
  id: string;
  label: string;
  icon: string; // emoji for the inventory filter buttons
}

/** The 8 item types shown as filter buttons in the inventory. */
export const ITEM_TYPES: ItemTypeInfo[] = [
  { id: "weapon", label: "Weapon", icon: "⚔️" },
  { id: "armor", label: "Armor", icon: "🛡️" },
  { id: "clothes", label: "Clothes", icon: "👕" },
  { id: "potion", label: "Potion", icon: "🧪" },
  { id: "food", label: "Food", icon: "🍖" },
  { id: "material", label: "Material", icon: "🪵" },
  { id: "quest", label: "Quest", icon: "📜" },
  { id: "misc", label: "Misc.", icon: "📦" },
];

export const itemType = (id: string): ItemTypeInfo =>
  ITEM_TYPES.find((t) => t.id === id) ?? ITEM_TYPES[ITEM_TYPES.length - 1];

// ---------------- item definitions ----------------
// Every kind of item is declared exactly once here, under a snake_case id. Players own *instances*
// that only store that id and a quantity; everything else is looked up from the definition.
// `name` is the English display name; later it can come from a translation table keyed by the id
// (see itemName below), without touching the rest of the game.

export interface ItemDef {
  name: string; // English display name (default text for translations)
  type: string; // one of ITEM_TYPES (inventory filter / fallback icon)
  icon?: string; // emoji, used when there is no picture; defaults to the item type's icon
  image?: string; // picture file in client/src/assets/equipments (without .png); defaults to the id
  stackable?: boolean; // several of them share one inventory row ("Health potion ×3")
  equip?: string; // outfit slot kind it can be worn in (see shared/equipment.ts); none = hand / hotbar only
  beltSlots?: number; // belts: extra hotbar slots unlocked while worn
  attack?: number; // weapons: attack value (see shared/stats.ts)
  defense?: number; // weapons / shields: defense value when blocking
  armor?: number; // worn items: reduces every hit
  food?: number; // eatable: hunger points it restores (see shared/survival.ts)
}

export const ITEM_DEFS = {
  // weapons and shields (held in the hands)
  sword: { name: "Sword", type: "weapon", icon: "🗡️", equip: "hand", attack: 5, defense: 4 },
  wooden_shield: { name: "Wooden shield", type: "armor", icon: "🛡️", equip: "hand", attack: 1, defense: 6 },
  // clothes and armor
  straw_hat: { name: "Straw hat", type: "clothes", icon: "👒", equip: "head" },
  linen_shirt: { name: "Linen shirt", type: "clothes", icon: "👕", equip: "shirt" },
  leather_vest: { name: "Leather vest", type: "armor", icon: "🦺", equip: "armor", armor: 2 },
  work_trousers: { name: "Work trousers", type: "clothes", icon: "👖", equip: "trousers" },
  old_boots: { name: "Old boots", type: "clothes", icon: "🥾", image: "bootIcon", equip: "boots", armor: 1 },
  belt: { name: "Belt", type: "clothes", icon: "🪢", equip: "belt", beltSlots: 2 },
  adventurers_belt: { name: "Adventurer's belt", type: "clothes", icon: "🎒", equip: "belt", beltSlots: 2 },
  // jewelry
  gold_earring: { name: "Gold earring", type: "misc", icon: "📿", image: "earringRightGold", equip: "earring" },
  silver_earring: { name: "Silver earring", type: "misc", icon: "💎", image: "earringRightSilver", equip: "earring" },
  // food and consumables
  carrot: { name: "Carrot", type: "food", icon: "🥕", stackable: true, food: 15 },
  health_potion: { name: "Health potion", type: "potion", icon: "🧪", image: "healthPotionIcon", stackable: true },
  house_key: { name: "House key", type: "misc", icon: "🗝️" },
} satisfies Record<string, ItemDef>;

export type ItemDefId = keyof typeof ITEM_DEFS;

const UNKNOWN_ITEM: ItemDef = { name: "Unknown item", type: "misc" };

/** The definition of an item id (an "Unknown item" placeholder for ids that don't exist). */
export function itemDef(id: string): ItemDef {
  return (ITEM_DEFS as Record<string, ItemDef>)[id] ?? UNKNOWN_ITEM;
}

export const isItemDefId = (id: string): id is ItemDefId => id in ITEM_DEFS;

/** Display name of an item. The single place to plug in translations later. */
export function itemName(id: string): string {
  return itemDef(id).name;
}

/**
 * Everything the game needs to know about one owned item: the instance (id + definition id +
 * quantity) combined with its definition. Used by both the client (inventory, outfit, stats)
 * and the server (equipment rules, combat).
 */
export interface ItemView {
  id: string; // instance id, unique per player (e.g. "item3")
  defId: string; // definition id, e.g. "sword"
  quantity: number;
  name: string;
  itemType: string;
  icon: string;
  equip: string;
  beltSlots: number;
  attack: number;
  defense: number;
  armor: number;
  food: number; // hunger it restores when eaten (0 = not eatable)
}

export function itemView(id: string, defId: string, quantity = 1): ItemView {
  const d = itemDef(defId);
  return {
    id,
    defId,
    quantity,
    name: itemName(defId),
    itemType: d.type,
    icon: d.icon ?? "",
    equip: d.equip ?? "",
    beltSlots: d.beltSlots ?? 0,
    attack: d.attack ?? 0,
    defense: d.defense ?? 0,
    armor: d.armor ?? 0,
    food: d.food ?? 0,
  };
}

// ---------------- starting kit ----------------

/** What every new bunny starts with: which items, and how many of each. */
export const STARTER_INVENTORY: { item: ItemDefId; count: number }[] = [
  { item: "sword", count: 1 },
  { item: "wooden_shield", count: 1 },
  { item: "health_potion", count: 3 },
  { item: "carrot", count: 10 },
  { item: "house_key", count: 1 },
  { item: "straw_hat", count: 1 },
  { item: "linen_shirt", count: 1 },
  { item: "leather_vest", count: 1 },
  { item: "work_trousers", count: 1 },
  { item: "old_boots", count: 1 },
  { item: "belt", count: 1 },
  { item: "adventurers_belt", count: 1 },
  { item: "gold_earring", count: 1 },
  { item: "silver_earring", count: 1 },
];

/** What is equipped at the start (slot id -> item id). Hands = hotbar slots 1 and 2. */
export const STARTER_EQUIPMENT: Record<string, ItemDefId> = { hot1: "sword", hot2: "health_potion" };

/**
 * Turns the starting kit into item instances: stackable items become one stack, others one
 * instance per piece (so e.g. two identical earrings can be worn in two slots).
 */
export function starterInstances(): { id: string; defId: ItemDefId; quantity: number }[] {
  const out: { id: string; defId: ItemDefId; quantity: number }[] = [];
  for (const { item, count } of STARTER_INVENTORY) {
    const pieces = itemDef(item).stackable ? [count] : Array.from({ length: count }, () => 1);
    for (const quantity of pieces) out.push({ id: `item${out.length + 1}`, defId: item, quantity });
  }
  return out;
}
