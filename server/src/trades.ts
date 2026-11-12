// Trading between bunnies (rules and message shapes: shared/trade.ts). The server keeps every trade here,
// tells both parties what is going on ("trade" / "tradeEnd" messages, each from their own point of view),
// checks every offer against what they really own, and moves the items and silver when one is accepted.
// Later NPCs can join in: a trade only needs two parties with an inventory and silver.
import type { MapSchema } from "@colyseus/schema";
import { Item, type Player } from "./rooms/schema/GameState.js";
import { itemDef, ITEM_DEFS } from "../../shared/items.js";
import { ITEM_VALUES } from "./itemValues.js";
import {
  businessSense,
  canPay,
  cleanOffer,
  flipOffer,
  guessValue,
  TRADE_RANGE,
  TRADE_REQUEST_MS,
  type TradeEndReason,
  type TradeLine,
  type TradeOffer,
  type TradeView,
  type ValueGuesses,
} from "../../shared/trade.js";

interface Trade {
  a: string; // initiator (session id)
  b: string; // partner
  phase: "request" | "active";
  turn: string; // active: whose turn it is to offer / accept
  round: number;
  offer: { from: string; offer: TradeOffer } | null; // the latest offer, from its sender's point of view
  until: number; // request: when it expires
  guesses: Map<string, ValueGuesses>; // each party's guesses of what items are worth, for this whole trade
}

export interface TradeHooks {
  send(sessionId: string, type: string, message: unknown): void;
  /** Called after items left or arrived in a bunny's inventory (equipment must be fixed up). */
  inventoryChanged(p: Player): void;
}

export class Trades {
  private byPlayer = new Map<string, Trade>();

  constructor(private players: MapSchema<Player>, private hooks: TradeHooks) {}

  /** Is this bunny in a trade (or a trade request) right now? */
  busy(id: string) {
    return this.byPlayer.has(id);
  }

  /** "Trade with..." picked `targetId`: they get a popup to accept or reject. */
  request(fromId: string, targetId: unknown) {
    const p = this.players.get(fromId);
    if (!p || this.busy(fromId) || typeof targetId !== "string") return;
    const target = this.players.get(targetId);
    if (!target || targetId === fromId || !this.canTrade(p, target)) return this.tell(fromId, "unavailable", target?.name ?? "");
    if (this.busy(targetId)) return this.tell(fromId, "busy", target.name);
    const trade: Trade = {
      a: fromId, b: targetId, phase: "request", turn: fromId, round: 0, offer: null, until: Date.now() + TRADE_REQUEST_MS,
      guesses: new Map([[fromId, guessesFor(p)], [targetId, guessesFor(target)]]), // rolled once, kept until the trade ends
    };
    this.byPlayer.set(fromId, trade);
    this.byPlayer.set(targetId, trade);
    this.sendViews(trade);
  }

  /** The partner answered the request. Yes: the initiator makes the first offer. */
  respond(id: string, accept: boolean) {
    const trade = this.byPlayer.get(id);
    if (!trade || trade.phase !== "request" || trade.b !== id) return;
    if (!accept) return this.end(trade, "rejected", id);
    trade.phase = "active";
    trade.turn = trade.a;
    this.sendViews(trade);
  }

  /** An offer (or counter-offer) from the party whose turn it is; then it's the other one's turn. */
  offer(id: string, raw: unknown) {
    const trade = this.byPlayer.get(id);
    if (!trade || trade.phase !== "active" || trade.turn !== id) return;
    const offer = cleanOffer(raw);
    const me = this.players.get(id);
    const otherId = this.other(trade, id);
    const other = this.players.get(otherId);
    if (!offer || !me || !other) return this.hooks.send(id, "tradeError", { reason: "invalid" });
    if (!canPay(me.inventory, me.silver, offer.give, offer.giveSilver) || !canPay(other.inventory, other.silver, offer.take, offer.takeSilver)) {
      return this.hooks.send(id, "tradeError", { reason: "invalid" });
    }
    trade.offer = { from: id, offer };
    trade.turn = otherId;
    trade.round++;
    this.sendViews(trade);
  }

  /** The party whose turn it is accepts the latest offer as it is: items and silver change hands. */
  accept(id: string) {
    const trade = this.byPlayer.get(id);
    if (!trade || trade.phase !== "active" || trade.turn !== id || !trade.offer || trade.offer.from === id) return;
    const fromId = trade.offer.from;
    const from = this.players.get(fromId);
    const to = this.players.get(id);
    const { give, giveSilver, take, takeSilver } = trade.offer.offer;
    if (!from || !to) return this.end(trade, "left");
    // Something changed since the offer (an item eaten, ...): it can't be done, but they can counter-offer
    if (!canPay(from.inventory, from.silver, give, giveSilver) || !canPay(to.inventory, to.silver, take, takeSilver)) {
      return this.hooks.send(id, "tradeError", { reason: "changed" });
    }
    const toTo = takeItems(from, give);
    const toFrom = takeItems(to, take);
    addItems(to, toTo);
    addItems(from, toFrom);
    from.silver += takeSilver - giveSilver;
    to.silver += giveSilver - takeSilver;
    this.hooks.inventoryChanged(from);
    this.hooks.inventoryChanged(to);
    this.end(trade, "done");
  }

  /** Closed the window (or the request popup): the trade is off. */
  cancel(id: string) {
    const trade = this.byPlayer.get(id);
    if (trade) this.end(trade, "cancelled", id);
  }

  /** A bunny was attacked: its trade stops at once. */
  attacked(id: string) {
    const trade = this.byPlayer.get(id);
    if (trade) this.end(trade, "attacked", id);
  }

  knockedOut(id: string) {
    const trade = this.byPlayer.get(id);
    if (trade) this.end(trade, "knockedOut", id);
  }

  left(id: string) {
    const trade = this.byPlayer.get(id);
    if (trade) this.end(trade, "left", id);
  }

  /** Every tick: requests expire, and parties that walked too far apart stop trading. */
  update(now: number) {
    const seen = new Set<Trade>();
    for (const trade of this.byPlayer.values()) {
      if (seen.has(trade)) continue;
      seen.add(trade);
      const a = this.players.get(trade.a);
      const b = this.players.get(trade.b);
      if (!a || !b) this.end(trade, "left", a ? trade.b : trade.a);
      else if (trade.phase === "request" && now >= trade.until) this.end(trade, "expired", trade.b); // (b never answered)
      else if (Math.hypot(a.x - b.x, a.y - b.y) > TRADE_RANGE) this.end(trade, "tooFar");
    }
  }

  private canTrade(a: Player, b: Player) {
    return !a.deadUntil && !b.deadUntil && Math.hypot(a.x - b.x, a.y - b.y) <= TRADE_RANGE;
  }

  private other(trade: Trade, id: string) {
    return trade.a === id ? trade.b : trade.a;
  }

  /** Ends the trade and tells both parties why (`by`: who caused it, e.g. who closed the window). */
  private end(trade: Trade, reason: TradeEndReason, by?: string) {
    if (this.byPlayer.get(trade.a) === trade) this.byPlayer.delete(trade.a);
    if (this.byPlayer.get(trade.b) === trade) this.byPlayer.delete(trade.b);
    for (const id of [trade.a, trade.b]) {
      const partner = this.players.get(this.other(trade, id));
      this.hooks.send(id, "tradeEnd", { reason, partnerName: partner?.name ?? "", byMe: by === id });
    }
  }

  private tell(id: string, reason: TradeEndReason, partnerName: string) {
    this.hooks.send(id, "tradeEnd", { reason, partnerName, byMe: false });
  }

  private sendViews(trade: Trade) {
    for (const id of [trade.a, trade.b]) {
      const partner = this.other(trade, id);
      const offer = trade.offer ? (trade.offer.from === id ? trade.offer.offer : flipOffer(trade.offer.offer)) : null;
      const view: TradeView = {
        partner,
        partnerName: this.players.get(partner)?.name ?? "",
        initiator: trade.a === id,
        phase: trade.phase,
        myTurn: trade.turn === id,
        round: trade.round,
        offer,
        values: trade.guesses.get(id) ?? {},
        sense: businessSense(this.players.get(id)?.stats ?? { charm: 0, intelligence: 0 }),
      };
      this.hooks.send(id, "trade", view);
    }
  }
}

/** What a bunny thinks every kind of item is worth (each kind guessed once; better with Charm + Intelligence). */
function guessesFor(p: Player): ValueGuesses {
  const sense = businessSense(p.stats);
  const out: ValueGuesses = {};
  for (const defId of Object.keys(ITEM_DEFS)) out[defId] = guessValue(ITEM_VALUES[defId as keyof typeof ITEM_VALUES], sense);
  return out;
}

/** A bundle of items on its way to the other bunny. */
type Parcel = { defId: string; quantity: number };

/** Takes the offered items out of a bunny's inventory (a part of a stack, or whole items). */
function takeItems(p: Player, lines: TradeLine[]): Parcel[] {
  const out: Parcel[] = [];
  for (const { itemId, quantity } of lines) {
    const index = p.inventory.findIndex((it) => it.id === itemId);
    if (index < 0) continue;
    const item = p.inventory[index];
    const n = Math.min(quantity, item.quantity);
    out.push({ defId: item.defId, quantity: n });
    item.quantity -= n;
    if (item.quantity <= 0) p.inventory.splice(index, 1);
  }
  return out;
}

/** Puts items into a bunny's inventory: stackable ones join a stack of the same kind, others get new ids. */
function addItems(p: Player, parcels: Parcel[]) {
  for (const { defId, quantity } of parcels) {
    const stackable = !!itemDef(defId).stackable;
    const stack = stackable ? p.inventory.find((it) => it.defId === defId) : undefined;
    if (stack) {
      stack.quantity += quantity;
      continue;
    }
    for (const q of stackable ? [quantity] : Array.from({ length: quantity }, () => 1)) {
      const item = new Item();
      item.id = newItemId(p);
      item.defId = defId;
      item.quantity = q;
      p.inventory.push(item);
    }
  }
}

/** A fresh instance id for this bunny ("item15"), never reused, so nothing gets mixed up. */
function newItemId(p: Player): string {
  if (!p.nextItemNo) {
    for (const it of p.inventory) p.nextItemNo = Math.max(p.nextItemNo, Number(/^item(\d+)$/.exec(it.id)?.[1] ?? 0));
    p.nextItemNo++;
  }
  return `item${p.nextItemNo++}`;
}
