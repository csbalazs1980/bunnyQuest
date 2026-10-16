// Help: a round "?" button under Options (or H) opens a large modal. Topics on the left, text on the right.
// Topic texts live in the translation files (help.<topic>.title / help.<topic>.body) and use a tiny markup:
//   ## Heading        a sub-heading
//   - item            a bullet (consecutive bullets form one list)
//   **bold**          bold text
//   [W]               a key cap
//   (blank line)      starts a new paragraph
import { onLanguageChange, t, type TKey } from "../i18n";

const TOPICS = ["controls", "combat", "stats"] as const;
type Topic = (typeof TOPICS)[number];
const STORAGE_KEY = "bq-help-topic";

export class HelpPanel {
  private button: HTMLButtonElement;
  private overlay: HTMLDivElement;
  private panel: HTMLDivElement;
  private nav: HTMLElement;
  private article: HTMLElement;
  private topic: Topic = "controls";

  constructor() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (TOPICS as readonly string[]).includes(saved)) this.topic = saved as Topic;
    } catch {
      /* storage unavailable */
    }

    this.button = document.createElement("button");
    this.button.id = "help-button";
    this.button.textContent = "?";
    this.button.onclick = () => this.toggle();

    this.overlay = document.createElement("div");
    this.overlay.id = "help-overlay";
    this.overlay.hidden = true;
    this.overlay.onclick = (e) => {
      if (e.target === this.overlay) this.toggle(false); // click outside the panel closes it
    };

    this.panel = document.createElement("div");
    this.panel.id = "help";
    this.panel.setAttribute("role", "dialog");
    this.panel.innerHTML = `
      <div class="help-head"><h2 class="help-title"></h2><button class="help-close">✕</button></div>
      <div class="help-main"><nav class="help-nav"></nav><article class="help-text"></article></div>`;
    this.nav = this.panel.querySelector(".help-nav")!;
    this.article = this.panel.querySelector(".help-text")!;
    this.panel.querySelector<HTMLButtonElement>(".help-close")!.onclick = () => this.toggle(false);
    for (const topic of TOPICS) {
      const b = document.createElement("button");
      b.className = "help-topic";
      b.dataset.topic = topic;
      b.onclick = () => this.show(topic);
      this.nav.append(b);
    }
    this.overlay.append(this.panel);
    document.body.append(this.button, this.overlay);

    // H opens / closes the help; Esc closes it. Capture phase, so Esc doesn't also open the Options.
    window.addEventListener(
      "keydown",
      (e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
        if (e.key === "Escape" && !this.overlay.hidden) {
          e.stopPropagation();
          this.toggle(false);
        } else if (e.code === "KeyH" && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
          this.toggle();
        }
      },
      true
    );

    this.relabel();
    onLanguageChange(() => this.relabel());
  }

  toggle(open = this.overlay.hidden) {
    this.overlay.hidden = !open;
    if (open) this.article.scrollTop = 0;
  }

  private show(topic: Topic) {
    this.topic = topic;
    try {
      localStorage.setItem(STORAGE_KEY, topic);
    } catch {
      /* storage unavailable */
    }
    this.nav.querySelectorAll<HTMLElement>(".help-topic").forEach((b) => b.classList.toggle("active", b.dataset.topic === topic));
    this.article.innerHTML = render(t(`help.${topic}.body` as TKey));
    this.article.scrollTop = 0;
  }

  private relabel() {
    this.button.title = t("help.button");
    this.panel.querySelector(".help-title")!.textContent = t("help.title");
    this.panel.querySelector<HTMLElement>(".help-close")!.title = t("options.close");
    this.nav.querySelectorAll<HTMLElement>(".help-topic").forEach((b) => {
      b.textContent = t(`help.${b.dataset.topic as Topic}.title` as TKey);
    });
    this.show(this.topic);
  }
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Inline markup: **bold** and [Key] caps (the text is escaped first). */
const inline = (s: string) =>
  escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]\s][^\]]{0,11})\]/g, "<kbd>$1</kbd>");

/** Turns the help markup (see the top of this file) into HTML. */
export function render(src: string): string {
  const out: string[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    if (list.length) out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join("")}</ul>`);
    para = [];
    list = [];
  };
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line) flush();
    else if (line.startsWith("## ")) {
      flush();
      out.push(`<h3>${inline(line.slice(3))}</h3>`);
    } else if (line.startsWith("- ")) {
      if (para.length) flush();
      list.push(line.slice(2));
    } else {
      if (list.length) flush();
      para.push(line);
    }
  }
  flush();
  return out.join("");
}
