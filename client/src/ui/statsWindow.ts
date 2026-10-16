// Stats window (hotkey K; C is a spell slot): base stats, HP, and the combat values derived from stats + equipment.
import { UiWindow } from "./window";
import { fmt, STAT_MAX, STATS, type Derived, type Stats } from "../../../shared/stats";
import { PLAYER_SPEED } from "../../../shared/world";
import { HUNGER_MAX } from "../../../shared/survival";
import { spellChargeMs, spellSlotsFor } from "../../../shared/magic";

import { t, tStat, tStatHelp } from "../i18n";

// Hover texts describe effects in words only; the exact formulas stay hidden (see shared/stats.ts).

export class StatsView {
  readonly window: UiWindow;
  private body: HTMLDivElement;

  constructor() {
    // Starts minimized: the right side is already busy; press K to open it
    this.window = new UiWindow({ id: "stats", titleKey: "window.stats", hotkey: "K", defaultOpen: false });
    this.body = document.createElement("div");
    this.body.className = "stats";
    this.window.body.append(this.body);
  }

  render(stats: Stats, hp: number, d: Derived, fatigue: number, maxFatigue: number, hunger: number) {
    const pips = (v: number) =>
      `<span class="pips">${Array.from({ length: STAT_MAX }, (_, i) => `<i class="${i < v ? "on" : ""}"></i>`).join("")}</span>`;
    const pct = (v: number, max: number) => (max ? Math.max(0, Math.min(100, (v / max) * 100)) : 0);
    const row = (label: string, value: string, hint: string) =>
      `<div class="stats-row" title="${esc(hint)}"><span>${esc(label)}</span><b>${value}</b></div>`;
    this.body.innerHTML = `
      <div class="stats-hp" title="${esc(t("stats.hpHint"))}">
        <span>${esc(t("stats.hp"))}</span><span class="hp-bar"><span style="width:${pct(hp, d.maxHp)}%"></span></span><b>${hp} / ${d.maxHp}</b>
      </div>
      <div class="stats-hp" title="${esc(t("stats.fatigueHint"))}">
        <span>${esc(t("stats.fatigue"))}</span><span class="hp-bar fatigue-bar"><span style="width:${pct(fatigue, maxFatigue)}%"></span></span><b>${fatigue} / ${maxFatigue}</b>
      </div>
      <div class="stats-hp" title="${esc(t("stats.hungerHint"))}">
        <span>${esc(t("stats.hunger"))}</span><span class="hp-bar hunger-bar"><span style="width:${pct(hunger, HUNGER_MAX)}%"></span></span><b>${hunger} / ${HUNGER_MAX}</b>
      </div>
      ${STATS.map(
        (s) =>
          `<div class="stats-row" title="${esc(tStat(s.key) + ": " + tStatHelp(s.key))}"><span>${esc(tStat(s.key))}</span>${pips(stats[s.key])}<b>${stats[s.key]}</b></div>`
      ).join("")}
      <div class="stats-sep"></div>
      ${row(t("stats.attack"), fmt(d.attack), t("stats.attackHint"))}
      ${row(t("stats.defense"), fmt(d.defense), t("stats.defenseHint"))}
      ${row(t("stats.armor"), fmt(d.armor), t("stats.armorHint"))}
      ${row(t("stats.speed"), `${Math.round((d.speed / PLAYER_SPEED) * 100)}%`, t("stats.speedHint"))}
      ${row(t("stats.spellSlots"), spellSlotsFor(stats.intelligence).join(" "), t("stats.spellSlotsHint"))}
      ${row(t("stats.spellTime"), `${Math.round(spellChargeMs(stats.intelligence) / 1000)} s`, t("stats.spellTimeHint"))}
      <div class="stats-note">${esc(t("stats.note"))}</div>`;
  }
}

/** Escapes text for use inside HTML. */
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
