// The action menu: Q opens a small window in the middle of the screen. For now it has one entry,
// "Trade with...", which lists the bunnies close enough to trade with (TRADE_RANGE_TILES, shared/trade.ts).
// Later NPCs will show up in the same list. Q, Esc or a click outside closes it.
import { onLanguageChange, t } from "../i18n";
import { TRADE_RANGE_TILES } from "../../../shared/trade";

export interface Nearby {
  id: string;
  name: string;
  tiles: number; // distance in tiles (rounded)
}

export interface ActionMenuOptions {
  /** Can the menu open at all (e.g. not while knocked out)? */
  canOpen(): boolean;
  /** Who we could trade with right now, closest first. */
  nearby(): Nearby[];
  /** Are we already in a trade (or waiting for an answer)? */
  busy(): boolean;
  /** A partner was picked. */
  onTrade(id: string): void;
}

export class ActionMenu {
  private el: HTMLDivElement;
  private page: "main" | "trade" = "main";
  private timer = 0;
  private shown = ""; // what the menu shows now (the list isn't rebuilt while nothing changed, so clicks aren't lost)

  constructor(private opts: ActionMenuOptions) {
    this.el = document.createElement("div");
    this.el.id = "action-menu";
    this.el.hidden = true;
    document.body.append(this.el);

    // Capture phase, so Esc closes this instead of opening the Options
    window.addEventListener(
      "keydown",
      (e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
        if (e.code === "KeyQ" && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault(); // (the physical key, so it works on any keyboard layout)
          this.toggle();
        } else if (e.key === "Escape" && !this.el.hidden) {
          e.stopPropagation();
          this.toggle(false);
        }
      },
      true
    );
    window.addEventListener("pointerdown", (e) => {
      if (!this.el.hidden && !this.el.contains(e.target as Node)) this.toggle(false);
    });
    onLanguageChange(() => this.render(true));
  }

  toggle(open = this.el.hidden) {
    if (open && !this.opts.canOpen()) return;
    this.el.hidden = !open;
    clearInterval(this.timer);
    if (!open) return;
    this.page = "main";
    this.render(true);
    // Bunnies move: keep the list fresh while it is open
    this.timer = window.setInterval(() => this.page === "trade" && this.render(), 500);
  }

  private render(force = false) {
    if (this.el.hidden) return;
    const people = this.page === "trade" && !this.opts.busy() ? this.opts.nearby() : [];
    const shown = JSON.stringify([this.page, this.opts.busy(), people]);
    if (!force && shown === this.shown) return;
    this.shown = shown;
    const head = el("div", { className: "am-head" });
    const body = el("div", { className: "am-body" });
    if (this.page === "main") {
      head.append(el("span", { textContent: t("actions.title") }), el("span", { className: "am-key", textContent: "Q" }));
      const trade = el("button", { className: "am-item", textContent: `🤝 ${t("actions.tradeWith")}` });
      trade.onclick = () => {
        this.page = "trade";
        this.render();
      };
      body.append(trade);
    } else {
      const back = el("button", { className: "am-back", textContent: "‹", title: t("actions.back") });
      back.onclick = () => {
        this.page = "main";
        this.render();
      };
      head.append(back, el("span", { textContent: t("actions.tradeWith") }), el("span"));
      if (this.opts.busy()) body.append(el("div", { className: "am-note", textContent: t("actions.busy") }));
      else {
        if (!people.length) body.append(el("div", { className: "am-note", textContent: t("actions.nobody", { n: TRADE_RANGE_TILES }) }));
        for (const p of people) {
          const b = el("button", { className: "am-item" });
          b.append(el("span", { textContent: `🐰 ${p.name}` }), el("span", { className: "am-dist", textContent: t("actions.tiles", { n: p.tiles }) }));
          b.onclick = () => {
            this.toggle(false);
            this.opts.onTrade(p.id);
          };
          body.append(b);
        }
      }
    }
    this.el.replaceChildren(head, body);
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}): HTMLElementTagNameMap[K] {
  return Object.assign(document.createElement(tag), props);
}
