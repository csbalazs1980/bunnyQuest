import { itemDef } from "../../shared/items";

// Item pictures: client/src/assets/equipments/<name>.png, found at build time. <name> is the item's
// `image` field in ITEM_DEFS (shared/items.ts), or its id. Items without a picture show their emoji.

const FILES = import.meta.glob("./assets/equipments/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const URLS: Record<string, string> = {};
for (const [path, url] of Object.entries(FILES)) {
  const name = (path.split("/").pop() ?? "").replace(/\.png$/i, "");
  URLS[name] = url;
}

/** URL of an item's picture, or undefined if there is none (then the emoji is used). */
export const itemIconUrl = (defId: string): string | undefined => URLS[itemDef(defId).image ?? defId];
