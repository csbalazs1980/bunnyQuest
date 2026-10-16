// A small draggable HUD window with a consistent look:
//   [ Title                 [–] (K) ]   <- title bar: click = minimize/maximize, drag = move,
//   [ body ...                      ]      right-click = back to its default spot
// By default every window sits in a "dock" on the right side of the screen, stacked top to
// bottom in creation order. Dragging a window takes it out of the dock to float freely.
// Positions and minimized state are remembered per browser.

import { onLanguageChange, t, type TKey } from "../i18n";

export interface UiWindowOptions {
  id: string; // used for the DOM id and for remembering the position
  titleKey: TKey; // translated title
  hotkey: string; // single key, e.g. "M"
  defaultOpen?: boolean; // false = starts minimized (until the player opens it); default true
  onToggle?(open: boolean): void;
}

interface SavedState {
  open: boolean;
  floating?: { left: number; top: number };
}

const DRAG_THRESHOLD = 4; // pixels the pointer must move before a click becomes a drag
const EDGE = 4; // gap between a window and the edge of the drawing area, in pixels

/**
 * The browser's drawing area (the visible part of the page, without scrollbars).
 * It changes when the browser window is resized, so it is read fresh every time.
 */
export function drawingArea() {
  return { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
}

let dock: HTMLDivElement | null = null;
let windowCount = 0; // creation order = default stacking order in the dock
let topZ = 10; // the window you grab last is drawn on top of the others
function getDock() {
  if (!dock) {
    dock = document.createElement("div");
    dock.id = "ui-dock";
    document.body.append(dock);
  }
  return dock;
}

export class UiWindow {
  readonly el: HTMLDivElement;
  readonly body: HTMLDivElement;
  private toggleLabel: HTMLSpanElement;
  private titleEl: HTMLSpanElement;
  private bar: HTMLDivElement;
  private _open = true;
  private dockIndex: number;

  constructor(private opts: UiWindowOptions) {
    this.el = document.createElement("div");
    this.el.id = opts.id;
    this.el.className = "ui-window";

    const bar = (this.bar = document.createElement("div"));
    bar.className = "ui-window-bar";
    this.titleEl = document.createElement("span");
    this.toggleLabel = document.createElement("span");
    this.toggleLabel.className = "ui-window-toggle";
    bar.append(this.titleEl, this.toggleLabel);
    this.relabel();
    onLanguageChange(() => this.relabel());

    this.body = document.createElement("div");
    this.body.className = "ui-window-body";
    this.el.append(bar, this.body);

    const d = getDock();
    this.dockIndex = windowCount++;
    this.el.dataset.dockIndex = String(this.dockIndex);
    d.append(this.el);

    this.setupDragging(bar);
    bar.oncontextmenu = (e) => {
      e.preventDefault();
      this.redock();
    };

    window.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return; // combos are other shortcuts
      if (e.key.toLowerCase() === opts.hotkey.toLowerCase()) this.setOpen(!this._open);
    });
    window.addEventListener("resize", () => this.keepOnScreen()); // the drawing area changed
    // The window itself can grow too (content added, expanded, more items), so re-check then as well
    new ResizeObserver(() => this.keepOnScreen()).observe(this.el);

    // Restore what this browser remembered (if anything)
    const saved = load(opts.id);
    if (saved?.floating) this.float(saved.floating.left, saved.floating.top);
    this.setOpen(saved?.open ?? opts.defaultOpen ?? true);
  }

  /** Title and hint in the current language. */
  private relabel() {
    this.titleEl.textContent = t(this.opts.titleKey);
    this.bar.title = t("window.hint", { key: this.opts.hotkey });
  }

  get open() {
    return this._open;
  }

  setOpen(open: boolean) {
    this._open = open;
    this.el.classList.toggle("collapsed", !open);
    this.toggleLabel.textContent = `${open ? "[–]" : "[+]"} (${this.opts.hotkey})`;
    this.keepOnScreen();
    this.save();
    this.opts.onToggle?.(open);
  }

  /** Back to the default spot in the right-side dock. */
  redock() {
    this.el.classList.remove("floating");
    this.el.style.left = this.el.style.top = this.el.style.maxHeight = "";
    const d = getDock();
    // Re-insert in the original order so the stack looks the same as at the start
    const after = [...d.children].find((c) => Number((c as HTMLElement).dataset.dockIndex) > this.dockIndex);
    d.insertBefore(this.el, after ?? null);
    this.save();
  }

  private float(left: number, top: number) {
    if (!this.el.classList.contains("floating")) {
      this.el.classList.add("floating");
      document.body.append(this.el);
    }
    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
    this.keepOnScreen();
  }

  /**
   * Keeps a floating window completely inside the drawing area: all four borders are checked,
   * so it slides along an edge instead of leaving the screen. A window taller than the screen
   * is shrunk to fit (its list scrolls instead).
   */
  private keepOnScreen() {
    if (!this.el.classList.contains("floating")) return;
    const area = drawingArea();
    this.el.style.maxHeight = `${area.height - 2 * EDGE}px`; // never taller than the screen
    const r = this.el.getBoundingClientRect();
    const left = clamp(r.left, EDGE, area.width - r.width - EDGE);
    const top = clamp(r.top, EDGE, area.height - r.height - EDGE);
    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
  }

  private setupDragging(bar: HTMLElement) {
    // Move/up are tracked on the whole page: the window gets re-parented when it starts floating,
    // which would break pointer capture on the bar itself.
    bar.onpointerdown = (down) => {
      if (down.button !== 0) return;
      down.preventDefault();
      this.el.style.zIndex = String(++topZ); // bring to front
      const r = this.el.getBoundingClientRect();
      let dragging = false;

      const move = (e: PointerEvent) => {
        const dx = e.clientX - down.clientX;
        const dy = e.clientY - down.clientY;
        if (!dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        dragging = true;
        this.el.classList.add("dragging");
        this.float(r.left + dx, r.top + dy);
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        this.el.classList.remove("dragging");
        if (dragging) this.save();
        else this.setOpen(!this._open); // a plain click toggles
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    };
  }

  private save() {
    const floating = this.el.classList.contains("floating")
      ? { left: parseFloat(this.el.style.left), top: parseFloat(this.el.style.top) }
      : undefined;
    try {
      localStorage.setItem(`bq-window-${this.opts.id}`, JSON.stringify({ open: this._open, floating }));
    } catch {
      /* storage unavailable: positions just won't be remembered */
    }
  }
}

function load(id: string): SavedState | null {
  try {
    return JSON.parse(localStorage.getItem(`bq-window-${id}`) ?? "null");
  } catch {
    return null;
  }
}

/** Limits v to [min, max]; if the window is bigger than the area, it sticks to the top/left edge. */
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(v, max));
}
