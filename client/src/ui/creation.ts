// Character creation: distribute CREATION_POINTS between the six stats (STAT_MIN..STAT_MAX each).
import {
  attackValue,
  baseStats,
  CREATION_POINTS,
  creationProblem,
  defenseValue,
  fmt,
  maxHp,
  moveSpeed,
  pointsSpent,
  STAT_MAX,
  STAT_MIN,
  STATS,
  type Stats,
} from "../../../shared/stats";
import { ITEM_DEFS } from "../../../shared/items";
import { PLAYER_SPEED } from "../../../shared/world";
import { onLanguageChange, t, tStat, tStatHelp } from "../i18n";

const SWORD = ITEM_DEFS.sword; // the starting weapon, for the preview

export class CharacterCreator {
  stats: Stats;
  readonly el: HTMLDivElement;
  private values = new Map<string, HTMLSpanElement>();
  private minus = new Map<string, HTMLButtonElement>();
  private plus = new Map<string, HTMLButtonElement>();
  private left: HTMLSpanElement;
  private preview: HTMLDivElement;
  private head: HTMLDivElement;
  private rows = new Map<string, { row: HTMLDivElement; label: HTMLSpanElement; note: HTMLSpanElement }>();

  constructor(initial: Stats | null, private onChange: () => void) {
    // Start from the remembered character if it is still valid, otherwise from all-minimum
    this.stats = initial && !creationProblem(initial) ? { ...initial } : baseStats();

    this.el = document.createElement("div");
    this.el.id = "creator";
    const head = (this.head = document.createElement("div"));
    head.className = "creator-head";
    head.innerHTML = `<span class="creator-title"></span><span><span class="creator-left-label"></span> <b class="creator-left"></b></span>`;
    this.left = head.querySelector(".creator-left")!;
    this.el.append(head);

    for (const s of STATS) {
      const row = document.createElement("div");
      row.className = "creator-row";
      const label = document.createElement("span");
      label.className = "creator-label";
      const minus = button("−", () => this.change(s.key, -1));
      const value = document.createElement("span");
      value.className = "creator-value";
      const plus = button("+", () => this.change(s.key, +1));
      const note = document.createElement("span");
      note.className = "creator-note";
      row.append(label, minus, value, plus, note);
      this.rows.set(s.key, { row, label, note });
      this.values.set(s.key, value);
      this.minus.set(s.key, minus);
      this.plus.set(s.key, plus);
      this.el.append(row);
    }

    this.preview = document.createElement("div");
    this.preview.className = "creator-preview";
    this.el.append(this.preview);
    this.relabel();
    onLanguageChange(() => this.relabel());
  }

  /** All texts in the current language. */
  private relabel() {
    this.head.querySelector(".creator-title")!.textContent = t("creation.stats");
    this.head.querySelector(".creator-left-label")!.textContent = t("creation.pointsLeft");
    for (const [key, { row, label, note }] of this.rows) {
      label.textContent = tStat(key);
      note.textContent = tStatHelp(key);
      row.title = tStatHelp(key);
    }
    this.render();
  }

  get pointsLeft() {
    return CREATION_POINTS - pointsSpent(this.stats);
  }

  get complete() {
    return creationProblem(this.stats) === null;
  }

  private change(key: keyof Stats, delta: number) {
    const v = this.stats[key] + delta;
    if (v < STAT_MIN || v > STAT_MAX || (delta > 0 && this.pointsLeft <= 0)) return;
    this.stats[key] = v;
    this.render();
    this.onChange();
  }

  private render() {
    for (const s of STATS) {
      const v = this.stats[s.key];
      this.values.get(s.key)!.textContent = String(v);
      this.minus.get(s.key)!.disabled = v <= STAT_MIN;
      this.plus.get(s.key)!.disabled = v >= STAT_MAX || this.pointsLeft <= 0;
    }
    this.left.textContent = String(this.pointsLeft);
    this.left.classList.toggle("done", this.pointsLeft === 0);
    this.preview.textContent = t("creation.preview", {
      hp: maxHp(this.stats),
      attack: fmt(attackValue(SWORD.attack ?? 0, this.stats)),
      defense: fmt(defenseValue(SWORD.defense ?? 0, this.stats)),
      speed: Math.round((moveSpeed(this.stats) / PLAYER_SPEED) * 100),
    });
  }
}

function button(text: string, onClick: () => void) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "creator-btn";
  b.textContent = text;
  b.onclick = onClick;
  return b;
}
