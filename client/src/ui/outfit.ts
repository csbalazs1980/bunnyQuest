// Outfit window (hotkey O): a mannequin bunny outline with equipment slots around it.
import { UiWindow } from "./window";
import { createSlot, fillSlot, type SlotHandlers, type SlotItem } from "./slots";
import { tSlot } from "../i18n";

/** Slot positions on the 200 x 292 mannequin (left, top of each 30 x 30 square), top to bottom. */
const LAYOUT: Record<string, [number, number]> = {
  earring1: [4, 12], earring2: [36, 12], // left ear
  earring3: [134, 12], earring4: [166, 12], // right ear
  head: [85, 58],
  shirt: [66, 120], armor: [104, 120], // two layers on the body
  hot1: [8, 160], hot2: [162, 160], // hands = hotbar slots 1 and 2
  belt: [85, 180],
  trousers: [85, 218],
  boots: [85, 256],
};

const MANNEQUIN_SVG = `
<svg class="outfit-mannequin" viewBox="0 0 200 292" width="200" height="292" aria-hidden="true">
  <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
    <ellipse cx="78" cy="38" rx="10" ry="30"/><ellipse cx="122" cy="38" rx="10" ry="30"/>
    <circle cx="100" cy="88" r="26"/>
    <ellipse cx="100" cy="158" rx="36" ry="46"/>
    <path d="M70 135 L28 172"/><path d="M130 135 L172 172"/>
    <path d="M88 200 L86 262"/><path d="M112 200 L114 262"/>
    <ellipse cx="82" cy="270" rx="14" ry="7"/><ellipse cx="118" cy="270" rx="14" ry="7"/>
  </g>
</svg>`;

export class OutfitView {
  readonly window: UiWindow;
  private slots = new Map<string, HTMLDivElement>();

  constructor(handlersFor: (slotId: string) => SlotHandlers) {
    this.window = new UiWindow({ id: "outfit", titleKey: "window.outfit", hotkey: "O" });
    const stage = document.createElement("div");
    stage.className = "outfit";
    stage.innerHTML = MANNEQUIN_SVG;
    for (const [slotId, [left, top]] of Object.entries(LAYOUT)) {
      const slot = createSlot(slotId, "small", handlersFor(slotId));
      slot.style.left = `${left}px`;
      slot.style.top = `${top}px`;
      this.slots.set(slotId, slot);
      stage.append(slot);
    }
    this.window.body.append(stage);
  }

  slotElement(slotId: string) {
    return this.slots.get(slotId);
  }

  render(equipment: Record<string, string>, items: SlotItem[]) {
    for (const [slotId, el] of this.slots) {
      fillSlot(el, items.find((it) => it.id === equipment[slotId]), tSlot(slotId).short);
    }
  }
}
