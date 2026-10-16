// Options: a button in the top-left corner (or Esc) opens a small panel with the invite link,
// the language selector, how much blood to show, and "Exit to main menu".
import { onLanguageChange, t } from "../i18n";
import { createLanguageSelect } from "./language";
import { BLOOD_LEVELS, getBloodLevel, onBloodLevelChange, setBloodLevel, type BloodLevel } from "../blood";

export class OptionsPanel {
  private button: HTMLButtonElement;
  private overlay: HTMLDivElement;
  private panel: HTMLDivElement;

  constructor(private inviteUrl: string, private onExit: () => void) {
    this.button = document.createElement("button");
    this.button.id = "options-button";
    this.button.onclick = () => this.toggle();

    this.overlay = document.createElement("div");
    this.overlay.id = "options-overlay";
    this.overlay.hidden = true;
    this.overlay.onclick = (e) => {
      if (e.target === this.overlay) this.toggle(false); // click outside the panel closes it
    };

    this.panel = document.createElement("div");
    this.panel.id = "options";
    this.panel.innerHTML = `
      <h2 class="opt-title"></h2>
      <div class="opt-section">
        <button class="opt-copy"></button>
        <div class="opt-hint"></div>
        <div class="opt-url"></div>
      </div>
      <label class="opt-section opt-lang"><span class="opt-lang-label"></span></label>
      <label class="opt-section opt-lang"><span class="opt-blood-label"></span><select class="lang-select opt-blood"></select></label>
      <div class="opt-section opt-buttons">
        <button class="opt-exit"></button>
        <button class="opt-close"></button>
      </div>`;
    this.panel.querySelector(".opt-lang")!.append(createLanguageSelect());
    const blood = this.panel.querySelector<HTMLSelectElement>(".opt-blood")!;
    for (const lvl of BLOOD_LEVELS) blood.append(new Option(lvl, lvl));
    blood.value = getBloodLevel();
    blood.onchange = () => setBloodLevel(blood.value as BloodLevel);
    onBloodLevelChange(() => (blood.value = getBloodLevel()));
    this.panel.querySelector<HTMLElement>(".opt-url")!.textContent = inviteUrl;
    this.panel.querySelector<HTMLButtonElement>(".opt-copy")!.onclick = () => this.copyInvite();
    this.panel.querySelector<HTMLButtonElement>(".opt-exit")!.onclick = () => this.onExit();
    this.panel.querySelector<HTMLButtonElement>(".opt-close")!.onclick = () => this.toggle(false);
    this.overlay.append(this.panel);
    document.body.append(this.button, this.overlay);

    // Esc opens / closes the options (unless you are typing somewhere)
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      this.toggle();
    });

    this.relabel();
    onLanguageChange(() => this.relabel());
  }

  toggle(open = this.overlay.hidden) {
    this.overlay.hidden = !open;
  }

  private relabel() {
    this.button.textContent = `⚙ ${t("options.button")}`;
    const q = (sel: string) => this.panel.querySelector<HTMLElement>(sel)!;
    q(".opt-title").textContent = t("options.title");
    q(".opt-copy").textContent = t("options.copyInvite");
    q(".opt-hint").textContent = t("options.inviteHint");
    q(".opt-lang-label").textContent = t("options.language");
    q(".opt-blood-label").textContent = t("options.blood");
    q(".opt-blood").title = t("options.bloodHint");
    this.panel.querySelectorAll<HTMLOptionElement>(".opt-blood option").forEach((o) => {
      o.textContent = t(`blood.${o.value as BloodLevel}`);
    });
    q(".opt-exit").textContent = t("options.exit");
    q(".opt-close").textContent = t("options.close");
  }

  private async copyInvite() {
    const btn = this.panel.querySelector<HTMLButtonElement>(".opt-copy")!;
    try {
      await navigator.clipboard.writeText(this.inviteUrl);
    } catch {
      // Clipboard blocked (e.g. not https): select the link so it can be copied by hand
      const range = document.createRange();
      range.selectNodeContents(this.panel.querySelector(".opt-url")!);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
      return;
    }
    btn.textContent = t("options.copied");
    setTimeout(() => (btn.textContent = t("options.copyInvite")), 1500);
  }
}
