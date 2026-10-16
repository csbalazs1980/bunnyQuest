// Chat input: press T, type (max 200 characters), Enter sends, Esc cancels.
import { CHAT_MAX_LENGTH, cleanChat } from "../../../shared/chat";
import { onLanguageChange, t } from "../i18n";

export interface ChatOptions {
  onSend(text: string): void;
  /** Turns game keyboard controls off while typing. */
  setGameInput(enabled: boolean): void;
}

export class ChatBox {
  private box: HTMLDivElement;
  private input: HTMLInputElement;
  private counter: HTMLSpanElement;

  constructor(private opts: ChatOptions) {
    this.box = document.createElement("div");
    this.box.id = "chat";
    this.box.hidden = true;
    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.maxLength = CHAT_MAX_LENGTH;
    this.input.autocomplete = "off";
    this.counter = document.createElement("span");
    this.counter.className = "chat-count";
    this.box.append(this.input, this.counter);
    document.body.append(this.box);

    this.input.oninput = () => this.updateCounter();
    this.input.onkeydown = (e) => {
      e.stopPropagation(); // keys typed here are not game shortcuts
      if (e.key === "Enter") {
        const text = cleanChat(this.input.value);
        if (text) this.opts.onSend(text);
        this.close();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      }
    };
    this.input.onblur = () => this.close();

    // T opens the chat (unless you are already typing somewhere)
    window.addEventListener("keydown", (e) => {
      if (e.code !== "KeyT" || e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      e.preventDefault(); // don't type the "t" into the box
      this.open();
    });

    this.relabel();
    onLanguageChange(() => this.relabel());
  }

  open() {
    if (!this.box.hidden) return;
    this.box.hidden = false;
    this.input.value = "";
    this.updateCounter();
    this.opts.setGameInput(false);
    this.input.focus();
  }

  close() {
    if (this.box.hidden) return;
    this.box.hidden = true;
    this.input.value = "";
    this.input.blur();
    this.opts.setGameInput(true);
  }

  private updateCounter() {
    this.counter.textContent = `${Array.from(this.input.value).length}/${CHAT_MAX_LENGTH}`;
  }

  private relabel() {
    this.input.placeholder = t("chat.placeholder");
  }
}
