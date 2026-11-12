// Trading between bunnies (later NPCs too): the rules and message shapes shared by the client and the server.
//
// Flow: the initiator picks a partner within TRADE_RANGE (Q -> "Trade with..."). The partner gets a
// popup to accept or reject. Then the two take turns: the one whose turn it is sends an offer ("I give
// these items + silver, I want those items + silver"); the other may accept it as it is, or change it and
// send it back as a counter-offer. The initiator makes the first offer (nothing to accept yet).
// Closing the window, walking more than TRADE_RANGE apart, being attacked, being knocked out or leaving
// the game cancels the trade. The server checks everything again when an offer is accepted.
import { TILE_SIZE } from "./combat.js";

/** Bunnies must stay this close (in pixels) to start and to keep trading. */
export const TRADE_RANGE_TILES = 7;
export const TRADE_RANGE = TRADE_RANGE_TILES * TILE_SIZE;
/** A trade request nobody answers expires after this. */
export const TRADE_REQUEST_MS = 30_000;
/** Silver every new bunny starts with. */
export const STARTING_SILVER = 100;
/** At most this many different item rows on one side of an offer. */
export const TRADE_MAX_ROWS = 40;

/** One item row in an offer: an item instance id (of its current owner) and how many of it. */
export interface TradeLine {
  itemId: string;
  quantity: number;
}

/**
 * An offer as seen by one party: `give` = my items and silver going to the partner,
 * `take` = the partner's items and silver coming to me.
 */
export interface TradeOffer {
  give: TradeLine[];
  giveSilver: number;
  take: TradeLine[];
  takeSilver: number;
}

/** What the server tells each party about their trade (message "trade"), from that party's point of view. */
export interface TradeView {
  partner: string; // session id of the other party
  partnerName: string;
  initiator: boolean; // did I start it?
  phase: "request" | "active"; // request: waiting for the partner's yes / no
  myTurn: boolean; // active: may I offer (and accept, if there is an offer)?
  round: number; // how many offers were made so far
  offer: TradeOffer | null; // the latest offer (from my point of view), null before the first one
  values: ValueGuesses; // what I think every kind of item is worth (rolled when the trade started)
  sense: number; // my business sense (Charm + Intelligence)
}

/** Why a trade ended (message "tradeEnd"); the client shows a translated note. */
export type TradeEndReason =
  | "done" // the offer was accepted and the items changed hands
  | "rejected" // the partner said no to the request
  | "cancelled" // someone closed the window
  | "tooFar" // they walked more than TRADE_RANGE apart
  | "attacked" // one of them was attacked
  | "knockedOut"
  | "left" // the partner left the game
  | "expired" // the request was not answered in time
  | "busy" // the partner is already trading
  | "unavailable"; // the partner can't trade right now (gone, knocked out, too far)

/** Cleans an offer received from a client; null if it is malformed. Ownership is checked separately. */
export function cleanOffer(raw: unknown): TradeOffer | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const lines = (v: unknown): TradeLine[] | null => {
    if (!Array.isArray(v) || v.length > TRADE_MAX_ROWS) return null;
    const seen = new Set<string>();
    const out: TradeLine[] = [];
    for (const l of v) {
      const itemId = (l as TradeLine)?.itemId;
      const quantity = (l as TradeLine)?.quantity;
      if (typeof itemId !== "string" || !itemId || seen.has(itemId)) return null;
      if (!Number.isInteger(quantity) || quantity < 1) return null;
      seen.add(itemId);
      out.push({ itemId, quantity });
    }
    return out;
  };
  const silver = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : null);
  const give = lines(o.give);
  const take = lines(o.take);
  const giveSilver = silver(o.giveSilver ?? 0);
  const takeSilver = silver(o.takeSilver ?? 0);
  if (!give || !take || giveSilver === null || takeSilver === null) return null;
  if (!give.length && !take.length && !giveSilver && !takeSilver) return null; // nothing at all
  return { give, giveSilver, take, takeSilver };
}

/** The same offer seen from the other party (what I give, they take). */
export const flipOffer = (o: TradeOffer): TradeOffer => ({
  give: o.take,
  giveSilver: o.takeSilver,
  take: o.give,
  takeSilver: o.giveSilver,
});

/** Do the items (id + quantity) and silver match exactly? (order of the rows doesn't matter) */
export function sameOffer(a: TradeOffer | null, b: TradeOffer | null): boolean {
  if (!a || !b) return a === b;
  const key = (ls: TradeLine[]) => ls.map((l) => `${l.itemId}:${l.quantity}`).sort().join(",");
  return key(a.give) === key(b.give) && key(a.take) === key(b.take) && a.giveSilver === b.giveSilver && a.takeSilver === b.takeSilver;
}

/** Can someone with these items and silver pay for these lines? */
export function canPay(items: Iterable<{ id: string; quantity: number }>, silver: number, lines: TradeLine[], silverNeeded: number): boolean {
  if (silverNeeded > silver) return false;
  const owned = [...items];
  return lines.every((l) => {
    const it = owned.find((i) => i.id === l.itemId);
    return !!it && l.quantity <= it.quantity;
  });
}

// ---------------- guessing what items are worth ----------------
// Every item has a value in silver (server/src/itemValues.ts: only the server knows the real numbers).
// Bunnies only guess it, and how well depends on their business sense = Charm + Intelligence (2-20).
// A guess is a range [low, high], rolled when a trade starts and kept until it ends.
//
// First the bunny's hunch is rolled (guessOdds): it either
//   - undervalues the item: both ends of the range fall below the real value,
//   - overvalues it: both ends fall above it, or
//   - has a fair guess: the low end is below the real value and the high end above it.
// At sense 2 the three are equally likely (1/3 each); the two wrong hunches fade out linearly until
// sense 10, from where the guess always contains the real value.
//
// Then the two ends are the real value times factors rolled from these bands (guessBands): a fair guess
// takes one from each; an undervalued one takes both from the low band, an overvalued one both from the
// high band (smaller one first).
//
//   sense   low band (below)   high band (above)
//     2     0 - 1              1 - 40           (no clue)
//    10     0.2 - 0.8          1.5 - 2.5        (tells treasure from garbage)
//    19     0.92 - 0.98        ~1.04 - 1.10     (almost exact)
//    20     1                  1                (knows it)
//
// In between the band edges slide smoothly: the low band's linearly, the high band's geometrically.
// Factors in the high band are rolled evenly on a log scale (1-2x is as likely as 20-40x), so a bunny
// that overvalues is as likely to be off by a little as by a lot.

export const BUSINESS_MIN = 2;
export const BUSINESS_MAX = 20;
const BUSINESS_MID = 10;

/** Business sense: Charm + Intelligence. */
export const businessSense = (stats: { charm: number; intelligence: number }) => stats.charm + stats.intelligence;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const geo = (a: number, b: number, t: number) => a * Math.pow(b / a, t);
const clampSense = (sense: number) => Math.max(BUSINESS_MIN, Math.min(BUSINESS_MAX, sense));

/** How likely each hunch is: undervalue, overvalue, or a fair guess around the real value. */
export function guessOdds(sense: number): { under: number; over: number; fair: number } {
  const k = clampSense(sense);
  const wrong = k >= BUSINESS_MID ? 0 : (1 / 3) * ((BUSINESS_MID - k) / (BUSINESS_MID - BUSINESS_MIN));
  return { under: wrong, over: wrong, fair: 1 - 2 * wrong };
}

/** The bands the factors are rolled from: `low` lies below 1 (the real value), `high` above it. */
export function guessBands(sense: number): { low: [number, number]; high: [number, number] } {
  const k = clampSense(sense);
  if (k <= BUSINESS_MID) {
    const t = (k - BUSINESS_MIN) / (BUSINESS_MID - BUSINESS_MIN);
    return { low: [lerp(0, 0.2, t), lerp(1, 0.8, t)], high: [geo(1, 1.5, t), geo(40, 2.5, t)] };
  }
  const t = (k - BUSINESS_MID) / (BUSINESS_MAX - BUSINESS_MID);
  return { low: [lerp(0.2, 1, t), lerp(0.8, 1, t)], high: [geo(1.5, 1, t), geo(2.5, 1, t)] };
}

/** One guess of an item's value (per piece): [low, high] in whole silver, smaller number first. */
export function guessValue(value: number, sense: number, random: () => number = Math.random): [number, number] {
  const odds = guessOdds(sense);
  const { low, high } = guessBands(sense);
  const below = () => lerp(low[0], low[1], random());
  const above = () => geo(high[0], high[1], random());
  const roll = random();
  const sorted = (a: number, b: number): [number, number] => (a <= b ? [a, b] : [b, a]);
  if (roll < odds.under) {
    // Undervalued: both ends below the real value (rounded down, so they stay below it)
    const [a, b] = sorted(below(), below());
    return [Math.floor(value * a), Math.min(Math.floor(value * b), Math.max(0, value - 1))];
  }
  if (roll < odds.under + odds.over) {
    // Overvalued: both ends above the real value (rounded up, so they stay above it)
    const [a, b] = sorted(above(), above());
    return value > 0 ? [Math.max(Math.ceil(value * a), value + 1), Math.ceil(value * b)] : [0, 0];
  }
  // A fair guess: the real value is inside
  return [Math.floor(value * below() + 1e-9), Math.ceil(value * above() - 1e-9)];
}

/** Item definition id -> guessed value range of one piece (sent with the trade, see TradeView.values). */
export type ValueGuesses = Record<string, [number, number]>;

/** The guessed worth of some items (+ an exact amount of silver). */
export function guessTotal(lines: { defId: string; quantity: number }[], guesses: ValueGuesses, silver = 0): [number, number] {
  let lo = silver;
  let hi = silver;
  for (const l of lines) {
    const g = guesses[l.defId] ?? [0, 0];
    lo += Math.min(g[0], g[1]) * l.quantity;
    hi += Math.max(g[0], g[1]) * l.quantity;
  }
  return [lo, hi];
}
