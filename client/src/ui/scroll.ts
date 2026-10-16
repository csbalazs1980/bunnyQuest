// The magic scroll: hold F to open it, draw runes on it with the mouse from top to bottom, let go of
// F to cast. Only the caster sees the scroll (other players see glowing eyes, src/magicFx.ts).
// The drawing is sent to the server, which reads it (shared/runes.ts) and answers with what it saw;
// the scroll then shows that for a moment: each rune's name next to it (or "?"), and the outcome.
import { onLanguageChange, t, type TKey } from "../i18n";
import { MAX_POINTS, MAX_STROKES, SCROLL_ASPECT, type RuneId, type Stroke } from "../../../shared/runes";
import type { CastFail, SpellId } from "../../../shared/magic";

/** The server's answer to a cast (GameRoom.readScroll). */
export interface CastResult {
  fail: CastFail | null;
  spell?: SpellId;
  slot?: string;
  runes: { rune: RuneId | null; top: number; bottom: number }[];
}

export interface ScrollOptions {
  /** May the scroll open now? (not while knocked out) */
  canOpen(): boolean;
  onOpen(): void;
  /** Closed without casting (window lost focus, knocked out, nothing drawn). */
  onCancel(): void;
  /** F released: read these strokes (scroll coordinates: width 1, height SCROLL_ASPECT). */
  onCast(strokes: Stroke[]): void;
}

const MIN_STEP = 0.004; // a new point only every so far (share of the width): keeps messages small
const RESULT_MS = 1300; // how long the reading stays on the scroll
const ANSWER_TIMEOUT_MS = 2000; // give up waiting for the server

type State = "closed" | "drawing" | "reading" | "result";

export class MagicScroll {
  private overlay: HTMLDivElement;
  private paper: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private labels: HTMLDivElement;
  private hint: HTMLDivElement;
  private status: HTMLDivElement;
  private strokes: Stroke[] = [];
  private current: Stroke | null = null;
  private points = 0;
  private state: State = "closed";
  private timer = 0;

  constructor(private opts: ScrollOptions) {
    this.overlay = document.createElement("div");
    this.overlay.id = "scroll-overlay";
    this.overlay.hidden = true;
    this.overlay.innerHTML = `
      <div class="scroll">
        <div class="scroll-rod"></div>
        <div class="scroll-paper"><canvas></canvas><div class="scroll-labels"></div></div>
        <div class="scroll-rod"></div>
        <div class="scroll-status"></div>
        <div class="scroll-hint"></div>
      </div>`;
    this.paper = this.overlay.querySelector(".scroll-paper")!;
    this.canvas = this.paper.querySelector("canvas")!;
    this.ctx = this.canvas.getContext("2d")!;
    this.labels = this.overlay.querySelector(".scroll-labels")!;
    this.hint = this.overlay.querySelector(".scroll-hint")!;
    this.status = this.overlay.querySelector(".scroll-status")!;
    document.body.append(this.overlay);

    this.setupDrawing();
    // Hold F: open; let go: cast. e.code is the physical key, so it works on any keyboard layout.
    window.addEventListener("keydown", (e) => {
      if (e.code !== "KeyF" || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      if (!e.repeat) this.open();
    });
    window.addEventListener("keyup", (e) => {
      if (e.code === "KeyF") this.finish();
    });
    window.addEventListener("blur", () => this.cancel()); // the key-up would never arrive
    window.addEventListener("resize", () => this.fit());

    this.relabel();
    onLanguageChange(() => this.relabel());
  }

  get isOpen() {
    return this.state === "drawing";
  }

  private open() {
    if (this.state === "drawing" || !this.opts.canOpen()) return;
    clearTimeout(this.timer);
    this.strokes = [];
    this.current = null;
    this.points = 0;
    this.state = "drawing";
    this.overlay.hidden = false;
    this.overlay.className = "drawing";
    this.labels.replaceChildren();
    this.status.textContent = "";
    this.fit();
    this.opts.onOpen();
  }

  /** F released: send the drawing to be read (or just close if nothing was drawn). */
  private finish() {
    if (this.state !== "drawing") return;
    this.endStroke();
    if (!this.strokes.length) return this.cancel();
    this.state = "reading";
    this.overlay.className = "reading";
    this.status.className = "scroll-status";
    this.status.textContent = t("magic.reading");
    this.opts.onCast(this.strokes);
    this.timer = window.setTimeout(() => this.close(), ANSWER_TIMEOUT_MS);
  }

  /** Closes without casting (e.g. knocked out while drawing). */
  cancel() {
    if (this.state === "closed") return;
    const wasDrawing = this.state === "drawing";
    this.close();
    if (wasDrawing) this.opts.onCancel();
  }

  private close() {
    clearTimeout(this.timer);
    this.state = "closed";
    this.current = null;
    this.overlay.hidden = true;
  }

  /** The server read the scroll: label each rune where it was drawn, show the outcome, then close. */
  showResult(r: CastResult) {
    if (this.state !== "reading") return;
    clearTimeout(this.timer);
    this.state = "result";
    this.overlay.className = r.fail ? "result fail" : "result ok";
    const w = this.canvas.clientWidth;
    this.labels.replaceChildren(
      ...r.runes.map((g) => {
        const label = document.createElement("div");
        label.className = g.rune ? "scroll-rune" : "scroll-rune unknown";
        label.textContent = g.rune ? t(`rune.${g.rune}` as TKey) : t("magic.unknown");
        label.style.top = `${((g.top + g.bottom) / 2) * w}px`;
        return label;
      })
    );
    this.status.className = `scroll-status ${r.fail ? "fail" : "ok"}`;
    this.status.textContent = r.fail
      ? t(`magic.fail.${r.fail}` as TKey)
      : t("magic.charged", { spell: t(`spell.${r.spell}` as TKey), key: r.slot ?? "" });
    this.timer = window.setTimeout(() => this.close(), RESULT_MS);
  }

  private relabel() {
    this.hint.textContent = t("magic.scrollHint");
  }

  // ---------------- drawing ----------------

  private setupDrawing() {
    const c = this.canvas;
    c.oncontextmenu = (e) => e.preventDefault();
    c.onpointerdown = (e) => {
      if (this.state !== "drawing") return;
      e.preventDefault();
      if (e.button === 2) {
        // Right-click: wipe the scroll and start again
        this.strokes = [];
        this.current = null;
        this.points = 0;
        return this.redraw();
      }
      if (e.button !== 0 || this.strokes.length >= MAX_STROKES) return;
      c.setPointerCapture(e.pointerId);
      this.current = [];
      this.strokes.push(this.current);
      this.addPoint(e);
    };
    c.onpointermove = (e) => {
      if (this.current && this.state === "drawing") this.addPoint(e);
    };
    c.onpointerup = c.onpointercancel = () => this.endStroke();
  }

  private addPoint(e: PointerEvent) {
    const s = this.current!;
    const r = this.canvas.getBoundingClientRect();
    const p = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.width }; // both in widths
    p.x = Math.max(0, Math.min(1, p.x));
    p.y = Math.max(0, Math.min(SCROLL_ASPECT, p.y));
    const last = s[s.length - 1];
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < MIN_STEP) return;
    if (this.points >= MAX_POINTS) return;
    this.points++;
    s.push(p);
    this.redraw();
  }

  private endStroke() {
    if (!this.current) return;
    if (this.current.length < 2) this.strokes.pop(); // a single tap: nothing to read
    this.current = null;
  }

  /** Sizes the canvas to the paper (sharp on high-DPI screens) and redraws the ink. */
  private fit() {
    if (this.overlay.hidden) return;
    const w = this.paper.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(w * SCROLL_ASPECT * dpr);
    this.redraw();
  }

  private redraw() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    ctx.clearRect(0, 0, w, canvas.height);
    ctx.lineCap = ctx.lineJoin = "round";
    // Two passes: a soft glow, then the red ink on top
    for (const pass of [
      { width: 0.03, color: "rgba(255, 70, 40, 0.18)" },
      { width: 0.012, color: "#b3121c" },
    ]) {
      ctx.lineWidth = pass.width * w;
      ctx.strokeStyle = pass.color;
      for (const s of this.strokes) {
        if (!s.length) continue;
        ctx.beginPath();
        ctx.moveTo(s[0].x * w, s[0].y * w);
        for (const p of s.slice(1)) ctx.lineTo(p.x * w, p.y * w);
        if (s.length === 1) ctx.lineTo(s[0].x * w + 0.1, s[0].y * w);
        ctx.stroke();
      }
    }
  }
}
