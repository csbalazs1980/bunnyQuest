// Trading (rules: shared/trade.ts, server: server/src/trades.ts). Two parts:
//
// - the popup at the top of the screen: "X wants to trade with you" [Accept] [Reject], or, for the
//   initiator, "Waiting for X to answer..." [Cancel];
// - the trade window (like the mockup):
//
//     [            Trade with X                         ✕ ]
//     [ me    | Your inventory   | Their inventory  | them ]
//     [ pic   |        ↓         |        ↓         | pic  ]
//     [ name  | You give (sell)  | You get (buy)    | name ]
//     [silver | silver [  ]      | silver [  ]      |silver]
//     [       | [Offer]          | [Accept]         |      ]
//
//   Drag your items down to sell them, drag their items down to ask for them (or double-click). Drag a
//   row back up (or double-click / right-click it) to take it out; − / + change how many of a stack.
//   The two take turns: the initiator makes the first offer (no Accept yet). On your turn you may accept
//   their offer as it is, or change it and send it back with Offer. Closing the window cancels the trade.
import { onLanguageChange, t, tItem, type TKey } from "../i18n";
import { itemType, type ItemView } from "../../../shared/items";
import { BUSINESS_MAX, guessTotal, sameOffer, type TradeEndReason, type TradeLine, type TradeOffer, type TradeView } from "../../../shared/trade";
import { itemIconUrl } from "../itemIcons";
import { BUNNY_FRAME_H, BUNNY_FRAME_W } from "../bunnySprite";
import bunnySheetUrl from "../assets/characters/bunny.png";
import { toast } from "./toast";

/** One side of the trade as the window needs it (read from the synced state). */
export interface TradeParty {
  name: string;
  color: number;
  silver: number;
  items: ItemView[];
}

export interface TradeUiOptions {
  /** The party with this session id (us or the partner), if they are still around. */
  party(id: string): TradeParty | undefined;
  /** Our own session id. */
  me(): string;
  send(type: "tradeRespond" | "tradeOffer" | "tradeAccept" | "tradeCancel", message?: unknown): void;
  /** Turns game keyboard controls off while typing an amount of silver. */
  setGameInput(enabled: boolean): void;
}

type Side = "give" | "take";
/** What we are putting together: item id -> quantity on each side, and silver. */
interface Draft {
  give: Map<string, number>;
  take: Map<string, number>;
  giveSilver: number;
  takeSilver: number;
}

const emptyDraft = (): Draft => ({ give: new Map(), take: new Map(), giveSilver: 0, takeSilver: 0 });
const draftOf = (o: TradeOffer): Draft => ({
  give: new Map(o.give.map((l) => [l.itemId, l.quantity])),
  take: new Map(o.take.map((l) => [l.itemId, l.quantity])),
  giveSilver: o.giveSilver,
  takeSilver: o.takeSilver,
});
const lines = (m: Map<string, number>): TradeLine[] => [...m].map(([itemId, quantity]) => ({ itemId, quantity }));

/** The row being dragged: whose inventory it comes from, and whether it's already in the offer. */
let dragging: { side: Side; itemId: string; fromOffer: boolean } | null = null;

export class TradeUi {
  private view: TradeView | null = null;
  private draft: Draft = emptyDraft();
  private popup: HTMLDivElement;
  private win: HTMLDivElement;
  private shown = ""; // signature of what the lists show (they aren't rebuilt while nothing changed)
  private q = <T extends HTMLElement>(sel: string) => this.win.querySelector<T>(sel)!;

  constructor(private opts: TradeUiOptions) {
    this.popup = el("div", { id: "trade-popup" });
    this.popup.hidden = true;

    this.win = el("div", { id: "trade" });
    this.win.hidden = true;
    this.win.innerHTML = `
      <div class="tr-bar"><span class="tr-title"></span><button class="tr-close">✕</button></div>
      <div class="tr-grid">
        <div class="tr-side tr-me"><canvas class="tr-pic"></canvas><div class="tr-name"></div><div class="tr-silver"></div><div class="tr-extra"></div></div>
        <div class="tr-panel tr-inv" data-side="give"><div class="tr-head tr-my-inv"></div><div class="tr-list"></div></div>
        <div class="tr-panel tr-inv" data-side="take"><div class="tr-head tr-their-inv"></div><div class="tr-list"></div></div>
        <div class="tr-side tr-them"><canvas class="tr-pic"></canvas><div class="tr-name"></div><div class="tr-silver"></div><div class="tr-extra"></div></div>
        <div class="tr-panel tr-offer" data-side="give">
          <div class="tr-head tr-give-head"></div><div class="tr-list"></div>
          <div class="tr-worth tr-give-worth"></div>
          <label class="tr-money"><span class="tr-coin">🪙</span><span class="tr-give-silver-label"></span><input type="number" min="0" step="1" class="tr-give-silver" /></label>
          <button class="tr-btn tr-offer-btn"></button>
        </div>
        <div class="tr-panel tr-offer" data-side="take">
          <div class="tr-head tr-take-head"></div><div class="tr-list"></div>
          <div class="tr-worth tr-take-worth"></div>
          <label class="tr-money"><span class="tr-coin">🪙</span><span class="tr-take-silver-label"></span><input type="number" min="0" step="1" class="tr-take-silver" /></label>
          <button class="tr-btn tr-accept-btn"></button>
        </div>
      </div>
      <div class="tr-status"></div>`;
    document.body.append(this.popup, this.win);

    this.q(".tr-close").onclick = () => this.cancel();
    this.q(".tr-offer-btn").onclick = () => this.sendOffer();
    this.q(".tr-accept-btn").onclick = () => this.accept();
    for (const side of ["give", "take"] as Side[]) {
      const input = this.q<HTMLInputElement>(`.tr-${side}-silver`);
      input.oninput = () => {
        const max = this.maxSilver(side);
        const v = Math.max(0, Math.min(max, Math.floor(Number(input.value) || 0)));
        this.draft[side === "give" ? "giveSilver" : "takeSilver"] = v;
        this.renderButtons();
      };
      input.onchange = () => (input.value = String(this.draft[side === "give" ? "giveSilver" : "takeSilver"])); // show the clamped value
      input.onfocus = () => this.opts.setGameInput(false);
      input.onblur = () => this.opts.setGameInput(true);
      input.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === "Escape") input.blur();
      };
    }
    // Drop zones: the offer panels take rows from the inventory above them; the inventories take them back
    this.win.querySelectorAll<HTMLElement>(".tr-panel").forEach((panel) => {
      const side = panel.dataset.side as Side;
      const toOffer = panel.classList.contains("tr-offer");
      const ok = () => !!dragging && dragging.side === side && dragging.fromOffer !== toOffer && this.editable();
      panel.ondragover = (e) => {
        if (!ok()) return;
        e.preventDefault();
        panel.classList.add("drop-ok");
      };
      panel.ondragleave = (e) => {
        if (!panel.contains(e.relatedTarget as Node)) panel.classList.remove("drop-ok");
      };
      panel.ondrop = (e) => {
        e.preventDefault();
        panel.classList.remove("drop-ok");
        if (!ok()) return;
        const { itemId } = dragging!;
        dragging = null;
        if (toOffer) this.put(side, itemId);
        else this.takeOut(side, itemId);
      };
    });
    this.setupDragging();
    this.relabel();
    onLanguageChange(() => this.relabel());
  }

  /** Are we trading (or asking / being asked) right now? */
  get busy() {
    return !!this.view;
  }

  /** The latest state of our trade from the server. */
  setView(view: TradeView) {
    const prev = this.view;
    this.view = view;
    // A new offer arrived (or a new trade started): start from it. Not our turn: show what we sent.
    if (!prev || prev.round !== view.round || prev.partner !== view.partner) {
      this.draft = view.offer ? draftOf(view.offer) : emptyDraft();
      if (prev?.phase === "request" || !prev) this.centerWindow();
    }
    this.render(true);
  }

  /** The trade is over (accepted, rejected, cancelled, too far, attacked, ...). */
  ended(reason: TradeEndReason, partnerName: string, byMe: boolean) {
    this.view = null;
    this.draft = emptyDraft();
    this.render(true);
    if (byMe && (reason === "cancelled" || reason === "rejected" || reason === "expired")) return; // our own doing: the popup just goes away
    const key = byMe && (reason === "attacked" || reason === "knockedOut") ? `trade.end.${reason}Me` : `trade.end.${reason}`;
    toast(t(key as TKey, { name: partnerName }), reason === "done" ? 4000 : 5000);
  }

  /** The server refused our offer or accept (items changed in the meantime). */
  error(reason: string) {
    toast(t(reason === "changed" ? "trade.error.changed" : "trade.error.invalid"), 5000);
  }

  /** Call when the synced state changed (inventories, silver, positions): redraws what changed. */
  refresh() {
    if (this.view) this.render();
  }

  // ---------------- actions ----------------

  private cancel() {
    if (!this.view) return;
    this.opts.send("tradeCancel");
    this.ended("cancelled", this.view.partnerName, true);
  }

  private sendOffer() {
    if (!this.canOffer()) return;
    const offer: TradeOffer = { give: lines(this.draft.give), giveSilver: this.draft.giveSilver, take: lines(this.draft.take), takeSilver: this.draft.takeSilver };
    this.opts.send("tradeOffer", offer);
  }

  private accept() {
    if (this.canAccept()) this.opts.send("tradeAccept");
  }

  /** Puts a whole row (all that's left of a stack) into the offer. */
  private put(side: Side, itemId: string) {
    const item = this.items(side).find((it) => it.id === itemId);
    if (!item || !this.editable()) return;
    this.draft[side].set(itemId, item.quantity);
    this.render(true);
  }

  private takeOut(side: Side, itemId: string) {
    if (!this.editable()) return;
    this.draft[side].delete(itemId);
    this.render(true);
  }

  /** − / + on a stack in the offer. */
  private change(side: Side, itemId: string, by: number) {
    const item = this.items(side).find((it) => it.id === itemId);
    const now = this.draft[side].get(itemId) ?? 0;
    if (!item || !this.editable()) return;
    const next = Math.max(1, Math.min(item.quantity, now + by));
    this.draft[side].set(itemId, next);
    this.render(true);
  }

  // ---------------- state ----------------

  private editable() {
    return !!this.view && this.view.phase === "active" && this.view.myTurn;
  }

  private current(): TradeOffer {
    return { give: lines(this.draft.give), giveSilver: this.draft.giveSilver, take: lines(this.draft.take), takeSilver: this.draft.takeSilver };
  }

  private changed() {
    return !sameOffer(this.current(), this.view?.offer ?? null);
  }

  private empty() {
    const d = this.draft;
    return !d.give.size && !d.take.size && !d.giveSilver && !d.takeSilver;
  }

  /** Offer: our turn, something in it, and different from what is on the table (otherwise: Accept). */
  private canOffer() {
    return this.editable() && !this.empty() && (!this.view!.offer || this.changed());
  }

  /** Accept: our turn, there is an offer from them, and we didn't change it. */
  private canAccept() {
    return this.editable() && !!this.view!.offer && !this.changed();
  }

  private items(side: Side): ItemView[] {
    const id = side === "give" ? this.opts.me() : this.view?.partner;
    return (id && this.opts.party(id)?.items) || [];
  }

  private maxSilver(side: Side) {
    const id = side === "give" ? this.opts.me() : this.view?.partner;
    return (id && this.opts.party(id)?.silver) || 0;
  }

  /** Drops offer rows whose items are gone, and trims quantities to what is still owned. */
  private fixDraft() {
    for (const side of ["give", "take"] as Side[]) {
      const items = this.items(side);
      for (const [id, q] of this.draft[side]) {
        const it = items.find((i) => i.id === id);
        if (!it) this.draft[side].delete(id);
        else if (q > it.quantity) this.draft[side].set(id, it.quantity);
      }
    }
    this.draft.giveSilver = Math.min(this.draft.giveSilver, this.maxSilver("give"));
    this.draft.takeSilver = Math.min(this.draft.takeSilver, this.maxSilver("take"));
  }

  // ---------------- drawing ----------------

  private render(force = false) {
    this.renderPopup();
    const v = this.view;
    // The window: the initiator gets it as soon as the partner said yes; the partner with the first offer
    const open = !!v && v.phase === "active" && (v.initiator || v.round > 0);
    this.win.hidden = !open;
    if (!open || !v) return;
    if (v.myTurn) this.fixDraft(); // (not our turn: we show the offer we sent, exactly as it is)
    const me = this.opts.party(this.opts.me());
    const them = this.opts.party(v.partner);
    const signature = JSON.stringify([v, me, them, [...this.draft.give], [...this.draft.take], this.draft.giveSilver, this.draft.takeSilver]);
    if (!force && signature === this.shown) return;
    this.shown = signature;

    this.q(".tr-title").textContent = t("trade.title", { name: v.partnerName });
    this.renderSide(this.q(".tr-me"), me);
    this.renderSide(this.q(".tr-them"), them);
    const lists = this.win.querySelectorAll<HTMLElement>(".tr-list");
    this.renderList(lists[0], "give", false);
    this.renderList(lists[1], "take", false);
    this.renderList(lists[2], "give", true);
    this.renderList(lists[3], "take", true);
    for (const side of ["give", "take"] as Side[]) {
      const input = this.q<HTMLInputElement>(`.tr-${side}-silver`);
      input.max = String(this.maxSilver(side));
      input.disabled = !this.editable();
      if (document.activeElement !== input) input.value = String(this.draft[side === "give" ? "giveSilver" : "takeSilver"]);
    }
    this.win.classList.toggle("waiting", !this.editable());
    this.renderButtons();
  }

  private renderButtons() {
    const v = this.view;
    if (!v) return;
    const offerBtn = this.q<HTMLButtonElement>(".tr-offer-btn");
    const acceptBtn = this.q<HTMLButtonElement>(".tr-accept-btn");
    offerBtn.disabled = !this.canOffer();
    offerBtn.textContent = t(v.offer ? "trade.counter" : "trade.offer");
    acceptBtn.hidden = !v.offer; // first round: nothing to accept yet
    acceptBtn.disabled = !this.canAccept();
    acceptBtn.title = v.myTurn && v.offer && this.changed() ? t("trade.acceptChangedHint") : "";
    // What it's all worth, as far as we can tell (our own guesses, silver included)
    for (const side of ["give", "take"] as Side[]) {
      const items = this.items(side);
      const lines = [...this.draft[side]].map(([id, quantity]) => ({ defId: items.find((i) => i.id === id)?.defId ?? "", quantity }));
      const silver = side === "give" ? this.draft.giveSilver : this.draft.takeSilver;
      const worth = this.q(`.tr-${side}-worth`);
      worth.textContent = t(side === "give" ? "trade.giveWorth" : "trade.takeWorth", { range: range(guessTotal(lines, v.values, silver)) });
      worth.title = t("trade.worthHint", { n: v.sense, max: BUSINESS_MAX });
    }
    let status: string;
    if (!v.myTurn) status = t("trade.status.waiting", { name: v.partnerName });
    else if (!v.offer) status = t("trade.status.first");
    else if (this.changed()) status = t("trade.status.changed");
    else status = t("trade.status.theirOffer", { name: v.partnerName });
    this.q(".tr-status").textContent = status;
  }

  private renderSide(box: HTMLElement, party: TradeParty | undefined) {
    const canvas = box.querySelector<HTMLCanvasElement>(".tr-pic")!;
    if (party && canvas.dataset.color !== String(party.color)) {
      canvas.dataset.color = String(party.color);
      drawPortrait(canvas, party.color);
    }
    box.querySelector(".tr-name")!.textContent = party?.name ?? "";
    box.querySelector(".tr-silver")!.textContent = `🪙 ${t("trade.silver")}: ${party?.silver ?? 0}`;
    // Our own business sense (how good our value guesses are); the partner's is their secret
    const extra = box.querySelector<HTMLElement>(".tr-extra")!;
    const mine = box.classList.contains("tr-me") && this.view;
    extra.textContent = mine ? `${t("trade.sense")}: ${this.view!.sense}/${BUSINESS_MAX}` : "";
    extra.title = mine ? t("trade.senseHint") : "";
  }

  /** An inventory (what's not in the offer yet) or an offer panel. */
  private renderList(list: HTMLElement, side: Side, offer: boolean) {
    const items = this.items(side);
    const rows: HTMLElement[] = [];
    const editable = this.editable();
    for (const it of items) {
      const inOffer = this.draft[side].get(it.id) ?? 0;
      const count = offer ? inOffer : it.quantity - inOffer;
      if (count <= 0) continue;
      const name = tItem(it.defId);
      const row = el("div", { className: "tr-row", title: offer ? t("trade.rowOfferHint") : t("trade.rowHint") });
      row.dataset.item = it.id;
      row.dataset.side = side;
      row.dataset.offer = offer ? "1" : "";
      row.draggable = editable;
      row.append(icon(it), el("span", { className: "tr-row-name", textContent: count > 1 || (offer && it.quantity > 1) ? `${name} ×${count}` : name }));
      const guess = this.view?.values[it.defId];
      if (guess) {
        const val = el("span", { className: "tr-val", textContent: `${range(guess)}🪙` });
        val.title = t(it.quantity > 1 ? "trade.valueHintEach" : "trade.valueHint", { n: this.view!.sense, max: BUSINESS_MAX });
        row.append(val);
      }
      if (offer && editable && it.quantity > 1) {
        const minus = el("button", { className: "tr-qty", textContent: "−" });
        const plus = el("button", { className: "tr-qty", textContent: "+" });
        minus.disabled = count <= 1;
        plus.disabled = count >= it.quantity;
        minus.onclick = () => this.change(side, it.id, -1);
        plus.onclick = () => this.change(side, it.id, 1);
        row.append(minus, plus);
      }
      row.ondblclick = () => (offer ? this.takeOut(side, it.id) : this.put(side, it.id));
      if (offer) {
        row.oncontextmenu = (e) => {
          e.preventDefault();
          this.takeOut(side, it.id);
        };
      }
      rows.push(row);
    }
    if (!rows.length) rows.push(el("div", { className: "tr-empty", textContent: t(offer ? (side === "give" ? "trade.dropGive" : "trade.dropTake") : "inv.empty") }));
    list.replaceChildren(...rows);
  }

  /** Drag start / end for every row (one listener: rows are rebuilt often). */
  private setupDragging() {
    this.win.addEventListener("dragstart", (e) => {
      const row = (e.target as HTMLElement).closest?.<HTMLElement>(".tr-row");
      if (!row || !this.editable()) return e.preventDefault();
      dragging = { side: row.dataset.side as Side, itemId: row.dataset.item!, fromOffer: !!row.dataset.offer };
      e.dataTransfer?.setData("text/plain", row.dataset.item!);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    });
    this.win.addEventListener("dragend", () => {
      dragging = null;
      this.win.querySelectorAll(".drop-ok").forEach((p) => p.classList.remove("drop-ok"));
    });
    // Move the window by its title bar
    const bar = this.q(".tr-bar");
    bar.onpointerdown = (down) => {
      if (down.button !== 0 || (down.target as HTMLElement).closest("button")) return;
      down.preventDefault();
      const r = this.win.getBoundingClientRect();
      const move = (e: PointerEvent) => this.place(r.left + e.clientX - down.clientX, r.top + e.clientY - down.clientY);
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
    window.addEventListener("resize", () => {
      const r = this.win.getBoundingClientRect();
      this.place(r.left, r.top);
    });
  }

  private centerWindow() {
    this.win.style.left = this.win.style.top = "";
    this.win.classList.remove("moved");
  }

  /** Moves the window, keeping it on screen. */
  private place(left: number, top: number) {
    if (this.win.hidden) return;
    const r = this.win.getBoundingClientRect();
    const w = document.documentElement.clientWidth;
    const h = document.documentElement.clientHeight;
    this.win.classList.add("moved");
    this.win.style.left = `${Math.max(4, Math.min(left, w - r.width - 4))}px`;
    this.win.style.top = `${Math.max(4, Math.min(top, h - r.height - 4))}px`;
  }

  /** The popup at the top of the screen: an incoming request, or waiting for an answer / the first offer. */
  private renderPopup() {
    const v = this.view;
    let text = "";
    const buttons: HTMLButtonElement[] = [];
    if (v?.phase === "request" && !v.initiator) {
      text = t("trade.popup.request", { name: v.partnerName });
      const yes = el("button", { className: "tr-yes", textContent: `✔ ${t("trade.popup.accept")}` });
      const no = el("button", { className: "tr-no", textContent: `✖ ${t("trade.popup.reject")}` });
      yes.onclick = () => this.opts.send("tradeRespond", { accept: true });
      no.onclick = () => {
        this.opts.send("tradeRespond", { accept: false });
        this.view = null;
        this.render(true);
      };
      buttons.push(yes, no);
    } else if (v && (v.phase === "request" || (!v.initiator && v.round === 0))) {
      text = t(v.phase === "request" ? "trade.popup.waitAnswer" : "trade.popup.waitOffer", { name: v.partnerName });
      const cancel = el("button", { className: "tr-no", textContent: t("trade.popup.cancel") });
      cancel.onclick = () => this.cancel();
      buttons.push(cancel);
    }
    const signature = `${text}|${buttons.length}`;
    this.popup.hidden = !text;
    if (this.popup.dataset.shown === signature) return;
    this.popup.dataset.shown = signature;
    const box = el("div", { className: "tr-popup-buttons" });
    box.append(...buttons);
    this.popup.replaceChildren(el("span", { textContent: text }), box);
  }

  private relabel() {
    const set = (sel: string, key: TKey) => (this.q(sel).textContent = t(key));
    set(".tr-my-inv", "trade.yourInventory");
    set(".tr-their-inv", "trade.theirInventory");
    set(".tr-give-head", "trade.give");
    set(".tr-take-head", "trade.take");
    set(".tr-give-silver-label", "trade.giveSilver");
    set(".tr-take-silver-label", "trade.takeSilver");
    set(".tr-accept-btn", "trade.accept");
    this.q(".tr-close").title = t("trade.close");
    this.popup.dataset.shown = "";
    this.render(true);
  }
}

/** A guessed value range, smaller number first: "12–40", or just "30" when we know it exactly. */
const range = ([a, b]: [number, number]) => (a === b ? `${a}` : `${Math.min(a, b)}–${Math.max(a, b)}`);

/** An item's picture (or emoji). */
function icon(it: ItemView): HTMLElement {
  const box = el("span", { className: "tr-icon" });
  const url = itemIconUrl(it.defId);
  if (url) box.append(Object.assign(document.createElement("img"), { src: url, alt: "", draggable: false }));
  else box.textContent = it.icon || itemType(it.itemType).icon;
  return box;
}

// ---------------- portraits ----------------

let sheet: HTMLImageElement | null = null;
const waiting: (() => void)[] = [];

/** The bunny's standing front frame, in the player's color (multiplied like Phaser's tint). */
function drawPortrait(canvas: HTMLCanvasElement, color: number) {
  if (!sheet) {
    sheet = new Image();
    sheet.onload = () => waiting.splice(0).forEach((fn) => fn());
    sheet.src = bunnySheetUrl;
  }
  const draw = () => {
    canvas.width = BUNNY_FRAME_W;
    canvas.height = BUNNY_FRAME_H;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, BUNNY_FRAME_W, BUNNY_FRAME_H);
    ctx.drawImage(sheet!, 0, 0, BUNNY_FRAME_W, BUNNY_FRAME_H, 0, 0, BUNNY_FRAME_W, BUNNY_FRAME_H);
    const img = ctx.getImageData(0, 0, BUNNY_FRAME_W, BUNNY_FRAME_H);
    const [r, g, b] = [(color >> 16) & 255, (color >> 8) & 255, color & 255];
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = (img.data[i] * r) / 255;
      img.data[i + 1] = (img.data[i + 1] * g) / 255;
      img.data[i + 2] = (img.data[i + 2] * b) / 255;
    }
    ctx.putImageData(img, 0, 0);
  };
  if (sheet.complete && sheet.naturalWidth) draw();
  else waiting.push(draw);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}): HTMLElementTagNameMap[K] {
  return Object.assign(document.createElement(tag), props);
}
