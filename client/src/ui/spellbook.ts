// Spellbook window (hotkey P, starts minimized): pick a spell from the drop-down to see how to cast it
// (its runes top to bottom, as on the scroll). The runes you know are listed in the Help (Magic topic).
import { UiWindow } from "./window";
import { onLanguageChange, t, type TKey } from "../i18n";
import { SPELL_IDS, SPELLS, type SpellId } from "../../../shared/magic";
import { runePicture } from "./runePicture";

const STORAGE_KEY = "bq-spellbook-spell";

export class Spellbook {
  readonly window: UiWindow;
  private select: HTMLSelectElement;
  private details: HTMLDivElement;
  private known: string[] = [];
  private spell: SpellId = SPELL_IDS[0];

  constructor() {
    this.window = new UiWindow({ id: "spellbook", titleKey: "window.spellbook", hotkey: "P", defaultOpen: false });
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (SPELL_IDS as string[]).includes(saved)) this.spell = saved as SpellId;
    } catch {
      /* storage unavailable */
    }
    const body = el("div", "spellbook");
    this.select = document.createElement("select");
    this.select.className = "lang-select spellbook-select";
    this.select.onchange = () => {
      this.spell = this.select.value as SpellId;
      try {
        localStorage.setItem(STORAGE_KEY, this.spell);
      } catch {
        /* storage unavailable */
      }
      this.renderDetails();
      this.select.blur(); // back to the game: letters typed next shouldn't pick options
    };
    this.details = el("div", "spellbook-details");
    body.append(this.select, this.details);
    this.window.body.append(body);
    onLanguageChange(() => this.render());
    this.render();
  }

  /** The runes our bunny knows (from the server); redraws only when they change. */
  setRunes(known: string[]) {
    if (known.join() === this.known.join()) return;
    this.known = [...known];
    this.render();
  }

  private ready = (id: SpellId) => SPELLS[id].runes.every((r) => this.known.includes(r));

  private render() {
    this.select.replaceChildren(
      ...SPELL_IDS.map((id) => new Option(`${SPELLS[id].icon} ${t(`spell.${id}` as TKey)}${this.ready(id) ? "" : " 🔒"}`, id))
    );
    this.select.value = this.spell;
    this.select.title = t("spellbook.pick");
    this.renderDetails();
  }

  /** The selected spell: what it does and its runes in order, top to bottom, like on the scroll. */
  private renderDetails() {
    const id = this.spell;
    const spell = SPELLS[id];
    const column = el("div", "spellbook-column");
    for (const rune of spell.runes) {
      const row = el("div", `spellbook-step${this.known.includes(rune) ? "" : " missing"}`);
      row.append(runePicture(rune, 44), el("span", "", `${t(`rune.${rune}` as TKey)} · ${t(`rune.${rune}.meaning` as TKey)}`));
      column.append(row);
    }
    this.details.replaceChildren(
      el("div", "spellbook-name", `${spell.icon} ${t(`spell.${id}` as TKey)}`),
      el("div", "spellbook-desc", t(`spell.${id}.desc` as TKey)),
      el("div", "spellbook-title", t("spellbook.howTo")),
      column,
      ...(this.ready(id) ? [] : [el("div", "spellbook-desc spellbook-missing", t("spellbook.missing"))]),
      el("div", "spellbook-hint", t("spellbook.hint"))
    );
  }
}

function el(tag: string, className: string, text = ""): HTMLDivElement {
  const e = document.createElement(tag) as HTMLDivElement;
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}
