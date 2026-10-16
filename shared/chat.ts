// Chat messages ("speech bubbles"), shared by the client (display) and the server (validation).

export const CHAT_MAX_LENGTH = 200;
/** At most this many bubbles over one bunny; a new one makes the oldest (top) one disappear. */
export const CHAT_MAX_BUBBLES = 5;
/** Minimum time between two messages from one player (anti-flood). */
export const CHAT_COOLDOWN_MS = 400;

/** How long a bubble stays up: short messages 5 s, medium 10 s, long 20 s. */
export function chatDurationMs(text: string): number {
  const len = Array.from(text).length; // count characters, not UTF-16 units (emoji, Cyrillic, ...)
  if (len < 50) return 7_000;
  if (len <= 100) return 15_000;
  return 20_000;
}

// Control characters (C0, DEL, C1) and the Unicode line/paragraph separators (U+2028, U+2029)
const CONTROL_CHARS = new RegExp(
  "[" + String.fromCharCode(0) + "-" + String.fromCharCode(0x1f) + String.fromCharCode(0x7f) + "-" +
    String.fromCharCode(0x9f) + String.fromCharCode(0x2028) + String.fromCharCode(0x2029) + "]+",
  "g"
);

/**
 * Cleans a message from a player: text only, no control characters or line breaks, trimmed,
 * at most CHAT_MAX_LENGTH characters. Returns "" if nothing is left.
 */
export function cleanChat(input: unknown): string {
  if (typeof input !== "string") return "";
  const text = input.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
  return Array.from(text).slice(0, CHAT_MAX_LENGTH).join("").trim();
}
