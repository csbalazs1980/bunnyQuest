// Tiny translation layer. t("key", { param }) returns the text in the current language.
// Add a language: create a file like hu.ts (typed as Dict, so no key can be missing) and list it below.
import { en, type Dict } from "./en";
import { sr } from "./sr";
import { hu } from "./hu";
import { ro } from "./ro";
import { itemDef } from "../../../shared/items";

export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "sr", name: "Српски" },
  { code: "hu", name: "Magyar" },
  { code: "ro", name: "Română" },
] as const;
export type Lang = (typeof LANGUAGES)[number]["code"];
export type TKey = keyof Dict;

const DICTS: Record<Lang, Dict> = { en, sr, hu, ro };
const STORAGE_KEY = "bq-lang";

function initialLanguage(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in DICTS) return saved as Lang;
  } catch {
    /* storage unavailable */
  }
  // First visit: follow the browser's language when we have it
  const browser = (navigator.language || "en").slice(0, 2).toLowerCase();
  return (browser in DICTS ? browser : "en") as Lang;
}

let current: Lang = initialLanguage();
const listeners = new Set<() => void>();

export const getLanguage = () => current;

export function setLanguage(lang: Lang) {
  if (lang === current || !(lang in DICTS)) return;
  current = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((fn) => fn());
}

/** Call `fn` whenever the language changes (UI parts re-label themselves). Returns an unsubscribe function. */
export function onLanguageChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The text for `key` in the current language, with {placeholders} filled in. Falls back to English. */
export function t(key: TKey, params?: Record<string, string | number>): string {
  let text = DICTS[current][key] ?? en[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) text = text.split(`{${k}}`).join(String(v));
  return text;
}

/** A "|"-separated list (e.g. the comic attack words). */
export const tList = (key: TKey) => t(key).split("|");

/** Item display name by item id (ITEM_DEFS in shared/items.ts); falls back to the English name there. */
export function tItem(defId: string): string {
  const key = `item.${defId}` as TKey;
  return key in en ? t(key) : itemDef(defId).name === "Unknown item" ? t("item.unknown") : itemDef(defId).name;
}

/** Item type label ("weapon" -> "Weapon"). */
export const tType = (typeId: string) => {
  const key = `type.${typeId}` as TKey;
  return key in en ? t(key) : typeId;
};

/** Stat name and help text. */
export const tStat = (key: string) => t(`stat.${key}` as TKey);
export const tStatHelp = (key: string) => t(`statHelp.${key}` as TKey);

/** Outfit / hotbar slot name and the short label shown inside an empty slot square. */
export function tSlot(slotId: string): { label: string; short: string } {
  const num = /(\d+)$/.exec(slotId)?.[1];
  if (slotId.startsWith("earring")) return { label: t("slot.earring", { n: num! }), short: t("slot.earringShort", { n: num! }) };
  if (slotId === "hot1" || slotId === "hot2") return { label: t("slot.hand", { n: num! }), short: t("slot.handShort", { n: num! }) };
  if (slotId.startsWith("hot")) {
    const pocket = Number(num) - 2;
    return { label: t("slot.pocket", { n: pocket }), short: String(Number(num)) };
  }
  const base = `slot.${slotId}` as TKey;
  if (!(base in en)) return { label: slotId, short: slotId };
  return { label: t(base), short: t(`slot.${slotId}Short` as TKey) };
}

document.documentElement.lang = current;
