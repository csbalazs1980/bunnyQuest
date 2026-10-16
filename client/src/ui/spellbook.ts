// Spellbook window (hotkey P, starts minimized): the spells and how to draw them (their runes top to
// bottom, as on the scroll), and every rune the bunny knows. Rune pictures come from shared/runes.ts.
import { UiWindow } from "./window";
import { onLanguageChange, t, type TKey } from "../i18n";
import { RUNE_SHAPES, type RuneId } from "../../../shared/runes";
import { SPELL_IDS, SPELLS } from "../../../shared/magic";

export class Spellbook {
  readonly window: UiWindow;
  private body: HTMLDivElement;
  private known: string[] = [];

  constructor() {
    this.window = new UiWindow({ id: "spellbook", titleKey: "window.spellbook", hotkey: "P", defaultOpen: false });
    this.body = document.createElement("div");
    this.body.className = "spellbook";
    this.window.body.append(this.body);
    onLanguageChange(() => this.render());
    this.render();
  }

  /** The runes our bunny knows (from the server); redraws only when they change. */
  setRunes(known: string[]) {
    if (known.join() === this.known.join()) return;
    this.known = [...known];
    this.render();
  }

  private render() {
    const hint = el("div", "spellbook-hint", t("spellbook.hint"));
    const spells = SPELL_IDS.map((id) => {
      const spell = SPELLS[id];
      const ready = spell.runes.every((r) => this.known.includes(r));
      const box = el("div", `spellbook-spell${ready ? "" : " missing"}`);
      box.append(
        el("div", "spellbook-name", `${spell.icon} ${t(`spell.${id}` as TKey)}`),
        el("div", "spellbook-desc", t(`spell.${id}.desc` as TKey))
      );
      // The runes in order, top to bottom, like on the scroll
      const column = el("div", "spellbook-column");
      for (const rune of spell.runes) {
        const row = el("div", "spellbook-step");
        row.append(runePicture(rune, 40), el("span", "", `${t(`rune.${rune}` as TKey)} · ${t(`rune.${rune}.meaning` as TKey)}`));
        column.append(row);
      }
      box.append(column);
      if (!ready) box.append(el("div", "spellbook-desc", t("spellbook.missing")));
      return box;
    });
    const runes = el("div", "spellbook-runes");
    for (const rune of this.known) {
      if (!(rune in RUNE_SHAPES)) continue;
      const cell = el("div", "spellbook-rune");
      cell.title = t(`rune.${rune}.meaning` as TKey);
      cell.append(runePicture(rune as RuneId, 34), el("span", "", t(`rune.${rune}` as TKey)));
      runes.append(cell);
    }
    if (!this.known.length) runes.append(el("div", "spellbook-desc", t("spellbook.none")));
    this.body.replaceChildren(
      hint,
      el("div", "spellbook-title", t("spellbook.spells")),
      ...spells,
      el("div", "spellbook-title", t("spellbook.runes")),
      runes
    );
  }
}

/** A rune drawn in red ink on a small square of parchment. */
function runePicture(id: RuneId, size: number): HTMLCanvasElement {
  const dpr = window.devicePixelRatio || 1;
  const c = document.createElement("canvas");
  c.className = "rune-picture";
  c.width = c.height = Math.round(size * dpr);
  c.style.width = c.style.height = `${size}px`;
  const ctx = c.getContext("2d")!;
  const strokes = RUNE_SHAPES[id];
  const pts = strokes.flat();
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const pad = c.width * 0.18;
  const scale = (c.width - 2 * pad) / Math.max(maxX - minX, maxY - minY);
  const ox = (c.width - (maxX - minX) * scale) / 2;
  const oy = (c.height - (maxY - minY) * scale) / 2;
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, c.width * 0.07);
  ctx.strokeStyle = "#b3121c";
  for (const s of strokes) {
    ctx.beginPath();
    s.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](ox + (p.x - minX) * scale, oy + (p.y - minY) * scale));
    ctx.stroke();
  }
  return c;
}

function el(tag: string, className: string, text = ""): HTMLDivElement {
  const e = document.createElement(tag) as HTMLDivElement;
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}
