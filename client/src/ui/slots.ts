// Slot squares used by the hotbar and the outfit window: show an item, accept drops, can be dragged.
import { itemType } from "../../../shared/items";
import { t, tSlot } from "../i18n";
import { itemIconUrl } from "../itemIcons";

export interface SlotItem {
  id: string;
  name: string;
  itemType: string;
  icon?: string;
  quantity?: number;
  defId?: string;
}

export interface SlotHandlers {
  /** Can this item be dropped here? (used to color the slot while dragging) */
  canDrop(itemId: string): boolean;
  drop(itemId: string): void;
  /** Shift+click or right-click: take the item out of the slot. */
  clear(): void;
  /** Plain click (hotbar: select the slot). */
  click?(): void;
}

/** The item currently being dragged (dragover events can't read the drag data). */
let draggingItemId: string | null = null;
export const startDrag = (e: DragEvent, itemId: string) => {
  draggingItemId = itemId;
  e.dataTransfer?.setData("text/plain", itemId);
};
export const endDrag = () => (draggingItemId = null);

export function createSlot(slotId: string, className: string, h: SlotHandlers): HTMLDivElement {
  const slot = document.createElement("div");
  slot.className = `slot ${className}`;
  slot.dataset.slot = slotId;
  slot.innerHTML = `<span class="slot-key"></span><span class="slot-icon"></span><span class="slot-label"></span>`;

  slot.onclick = (e) => (e.shiftKey ? h.clear() : h.click?.());
  slot.oncontextmenu = (e) => {
    e.preventDefault();
    h.clear();
  };
  slot.ondragstart = (e) => {
    const id = slot.dataset.item;
    if (id) startDrag(e, id);
    else e.preventDefault();
  };
  slot.ondragend = endDrag;
  slot.ondragover = (e) => {
    if (!draggingItemId) return;
    const ok = h.canDrop(draggingItemId);
    slot.classList.toggle("drop-ok", ok);
    slot.classList.toggle("drop-bad", !ok);
    if (ok) e.preventDefault(); // only allowed drops fire the drop event
  };
  slot.ondragleave = () => slot.classList.remove("drop-ok", "drop-bad");
  slot.ondrop = (e) => {
    e.preventDefault();
    slot.classList.remove("drop-ok", "drop-bad");
    const id = e.dataTransfer?.getData("text/plain") || draggingItemId;
    endDrag();
    if (id) h.drop(id);
  };
  return slot;
}

/** Shows an item (or the empty-slot label) in a slot square. */
export function fillSlot(slot: HTMLElement, item: SlotItem | undefined, emptyLabel: string) {
  slot.classList.toggle("empty", !item);
  slot.draggable = !!item;
  if (item) slot.dataset.item = item.id;
  else delete slot.dataset.item;
  setIcon(slot.querySelector(".slot-icon") as HTMLElement, item);
  (slot.querySelector(".slot-label") as HTMLElement).textContent = item
    ? (item.quantity ?? 1) > 1
      ? `${item.name} ×${item.quantity}`
      : item.name
    : emptyLabel;
  slot.title = t("slot.hint", { slot: tSlot(slot.dataset.slot ?? "").label, item: item ? item.name : t("slot.empty") });
}

/** Brief red flash when something isn't allowed. */
export function refuse(slot: HTMLElement | null | undefined) {
  if (!slot) return;
  slot.classList.remove("refused");
  void slot.offsetWidth; // restart the animation
  slot.classList.add("refused");
}

/** Shows the item's picture (assets/equipments/<id>.png) or, if it has none, its emoji. */
function setIcon(el: HTMLElement, item: SlotItem | undefined) {
  const url = item?.defId ? itemIconUrl(item.defId) : undefined;
  const current = el.querySelector("img");
  if (url) {
    if (current?.getAttribute("src") === url) return; // already showing it
    const img = document.createElement("img");
    img.src = url;
    img.alt = item!.name;
    img.draggable = false; // drag the slot, not the picture
    el.replaceChildren(img);
  } else {
    el.textContent = item ? item.icon || itemType(item.itemType).icon : "";
  }
}
