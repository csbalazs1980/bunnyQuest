// The HUD: inventory window (I), outfit window (O) and the hotbar at the bottom, all HTML on top
// of the game canvas. Equipment rules come from shared/equipment.ts; the server has the final say.
import { ITEM_TYPES, type ItemView } from "../../../shared/items";
import { onLanguageChange, t, tItem, tSlot, tType } from "../i18n";
import {
  autoSlot,
  HOTBAR_SLOTS,
  heldAndWorn,
  isUnlocked,
  place,
  slotOf,
  type Equipment,
} from "../../../shared/equipment";
import { UiWindow } from "./window";
import { OutfitView } from "./outfit";
import { createSlot, endDrag, fillSlot, refuse, startDrag, type SlotHandlers } from "./slots";
import { StatsView } from "./statsWindow";
import { derive, maxFatigue, type Stats } from "../../../shared/stats";
import { HUNGER_MAX } from "../../../shared/survival";

/** An owned item as the HUD sees it: the instance combined with its definition (shared/items.ts). */
export type HudItem = ItemView;

/** Character values from the server. */
export interface HudCharacter {
  stats: Stats;
  hp: number;
  fatigue: number;
  hunger: number;
}

export interface HudOptions {
  /** Put an item into a slot (moves/swaps are handled by the server with the shared rules). */
  onEquip(slotId: string, itemId: string): void;
  /** Empty a slot. */
  onUnequip(slotId: string): void;
  /** Use an item (for now: eat food). */
  onUse(item: HudItem): void;
  /** Turns game keyboard controls off while the player is typing in the filter box. */
  setGameInput(enabled: boolean): void;
}

type SortKey = "name" | "type";

export class Hud {
  private items: HudItem[] = []; // with names in the current language
  private rawItems: HudItem[] = []; // as received (names are re-translated from these on a language change)
  private equipment: Equipment = {};
  private lastSignature = "";

  private filterText = "";
  private filterType: string | null = null;
  private sortKey: SortKey = "name";
  private sortAsc = true;
  private selectedHot = 0; // selected hotbar slot index
  private pickedItemId: string | null = null; // item clicked in the inventory list

  readonly inventory: UiWindow;
  readonly outfit: OutfitView;
  readonly statsView: StatsView;
  private character: HudCharacter | null = null;
  private filterInput: HTMLInputElement;
  private typeButtons: HTMLButtonElement[] = [];
  private sortButtons: Record<SortKey, HTMLButtonElement>;
  private list: HTMLDivElement;
  private hotbar: HTMLDivElement;
  private vitals: HTMLDivElement;
  private hotSlots: HTMLDivElement[] = [];

  constructor(private opts: HudOptions) {
    // ---------- inventory window ----------
    this.inventory = new UiWindow({
      id: "inventory",
      titleKey: "window.inventory",
      hotkey: "I",
      onToggle: (open) => {
        if (!open) this.filterInput?.blur();
      },
    });
    const body = this.inventory.body;

    this.filterInput = el("input", { className: "inv-filter", type: "search" });
    const applyFilter = () => {
      this.filterText = this.filterInput.value.trim().toLowerCase();
      this.renderList();
    };
    this.filterInput.oninput = applyFilter;
    this.filterInput.addEventListener("search", applyFilter); // the little "×" clear button
    this.filterInput.onfocus = () => opts.setGameInput(false);
    this.filterInput.onblur = () => opts.setGameInput(true);
    this.filterInput.onkeydown = (e) => {
      if (e.key === "Escape") {
        // Esc clears the filter and returns to the game; Enter keeps the filter and returns to the game
        e.preventDefault();
        this.filterInput.value = "";
        applyFilter();
      }
      if (e.key === "Escape" || e.key === "Enter") this.filterInput.blur();
    };

    const types = el("div", { className: "inv-types" });
    for (const type of ITEM_TYPES) {
      const b = el("button", { className: "inv-type", textContent: type.icon });
      b.onclick = () => {
        this.filterType = this.filterType === type.id ? null : type.id; // click again to show all
        this.renderList();
      };
      b.dataset.type = type.id;
      this.typeButtons.push(b);
      types.append(b);
    }

    const head = el("div", { className: "inv-row inv-head" });
    this.sortButtons = {
      name: el("button", { className: "inv-sort" }),
      type: el("button", { className: "inv-sort" }),
    };
    (Object.keys(this.sortButtons) as SortKey[]).forEach((key) => {
      this.sortButtons[key].onclick = () => {
        if (this.sortKey === key) this.sortAsc = !this.sortAsc;
        else (this.sortKey = key), (this.sortAsc = true);
        this.renderList();
      };
      head.append(this.sortButtons[key]);
    });

    this.list = el("div", { className: "inv-list" });
    body.append(this.filterInput, types, head, this.list);

    // ---------- outfit window (created after the inventory, so it docks below it) ----------
    this.outfit = new OutfitView((slotId) => this.slotHandlers(slotId));
    this.statsView = new StatsView(); // docks below the outfit, starts minimized

    // ---------- hotbar: hands (1, 2) + belt pockets (3+) ----------
    this.hotbar = el("div", { id: "hotbar" });
    // HP and fatigue, always visible just above the hotbar
    this.vitals = el("div", { id: "vitals" });
    this.vitals.innerHTML = `
      <div class="vital hp"><span class="vital-fill"></span><span class="vital-text"></span></div>
      <div class="vital fatigue">
        <span class="vital-fill"></span><span class="vital-text"></span></div>
      <div class="vital hunger"><span class="vital-fill"></span><span class="vital-text"></span></div>`;
    document.body.append(this.vitals, this.hotbar);

    // ---------- keyboard ----------
    //   1..N        select hotbar slot N
    //   Shift+1..N  put the item picked in the inventory into hotbar slot N
    //   Shift+E     wear the picked item in its matching outfit slot
    //   F           use the item in the selected hotbar slot (eat food)
    // e.code is the physical key, so this works on any keyboard layout.
    window.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement) return; // typing in the filter
      if (e.code === "KeyE" && e.shiftKey) {
        this.autoEquipPicked();
        return;
      }
      if (e.code === "KeyF" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        const itemId = this.equipment[this.hotSlots[this.selectedHot]?.dataset.slot ?? ""];
        const item = this.items.find((it) => it.id === itemId);
        if (item) this.opts.onUse(item);
        return;
      }
      const match = /^(?:Digit|Numpad)(\d)$/.exec(e.code);
      const n = match ? Number(match[1]) : NaN;
      if (!(n >= 1 && n <= this.hotSlots.length)) return;
      if (e.shiftKey) {
        if (this.pickedItem()) this.equip(`hot${n}`, this.pickedItemId!);
      } else {
        this.selectHot(n - 1);
      }
    });

    this.relabel();
    onLanguageChange(() => this.relabel());
  }

  /** Static texts in the current language, item names re-translated, then everything redrawn. */
  private relabel() {
    this.filterInput.placeholder = t("inv.filter");
    this.typeButtons.forEach((b) => (b.title = tType(b.dataset.type!)));
    this.vitals.querySelector<HTMLElement>(".hp")!.title = t("vitals.hpHint");
    this.vitals.querySelector<HTMLElement>(".fatigue")!.title = t("vitals.fatigueHint");
    this.vitals.querySelector<HTMLElement>(".hunger")!.title = t("vitals.hungerHint");
    this.items = this.rawItems.map((it) => ({ ...it, name: tItem(it.defId) }));
    this.renderAll();
  }

  /** Feed the latest inventory, equipment and character from the server. Cheap to call often. */
  setPlayer(items: HudItem[], equipment: Equipment, character: HudCharacter | null = null) {
    // HP / fatigue change often: only redraw the bars and stats for those
    if (JSON.stringify(character) !== JSON.stringify(this.character)) {
      this.character = character;
      this.renderStats();
    }
    const signature = JSON.stringify([items, equipment]);
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;
    this.rawItems = items;
    this.items = items.map((it) => ({ ...it, name: tItem(it.defId) }));
    this.equipment = equipment;
    if (this.pickedItemId && !this.pickedItem()) this.pickedItemId = null;
    this.renderAll();
  }

  // ---------------- actions ----------------

  private pickedItem() {
    return this.items.find((it) => it.id === this.pickedItemId);
  }

  /** Validates locally for instant feedback, then asks the server. */
  private equip(slotId: string, itemId: string) {
    if (!place(this.equipment, this.items, itemId, slotId)) {
      refuse(this.slotElement(slotId));
      return;
    }
    this.opts.onEquip(slotId, itemId);
  }

  private unequip(slotId: string) {
    if (this.equipment[slotId]) this.opts.onUnequip(slotId);
  }

  private autoEquipPicked() {
    const item = this.pickedItem();
    if (!item) return;
    const slotId = autoSlot(this.equipment, this.items, item.id);
    if (slotId) this.equip(slotId, item.id);
    else refuse(this.slotElement(slotOf(this.equipment, item.id) ?? "")); // already worn
  }

  private selectHot(i: number) {
    this.selectedHot = i;
    this.renderHotbar();
  }

  private slotHandlers(slotId: string): SlotHandlers {
    return {
      canDrop: (itemId) => place(this.equipment, this.items, itemId, slotId) !== null,
      drop: (itemId) => this.equip(slotId, itemId),
      clear: () => this.unequip(slotId),
      click: () => {
        const i = HOTBAR_SLOTS.findIndex((s) => s.id === slotId);
        if (i >= 0) this.selectHot(i);
      },
    };
  }

  private slotElement(slotId: string): HTMLElement | undefined {
    return this.outfit.slotElement(slotId) ?? this.hotSlots.find((s) => s.dataset.slot === slotId);
  }

  // ---------------- rendering ----------------

  private renderAll() {
    this.renderList();
    this.renderHotbar();
    this.outfit.render(this.equipment, this.items);
    this.renderStats();
  }

  /** Attack/defense come from what is in the hands, armor from everything else that is worn. */
  private renderStats() {
    if (!this.character) return;
    const { held, worn } = heldAndWorn(this.equipment, this.items);
    const c = this.character;
    const d = derive(c.stats, held, worn);
    const maxF = maxFatigue(c.stats);
    this.statsView.render(c.stats, c.hp, d, c.fatigue, maxF, c.hunger);
    setBar(this.vitals.querySelector(".hp")!, c.hp, d.maxHp, t("stats.hp"));
    setBar(this.vitals.querySelector(".fatigue")!, c.fatigue, maxF, t("stats.fatigue"));
    setBar(this.vitals.querySelector(".hunger")!, c.hunger, HUNGER_MAX, t("stats.hunger"));
  }

  private renderHotbar() {
    // Hands are always there; belt pockets only while a belt with enough pockets is worn
    const unlocked = HOTBAR_SLOTS.filter((s) => isUnlocked(s.id, this.equipment, this.items));
    if (unlocked.length !== this.hotSlots.length) {
      this.hotSlots = unlocked.map((s, i) => {
        const slot = createSlot(s.id, "", this.slotHandlers(s.id));
        (slot.querySelector(".slot-key") as HTMLElement).textContent = String(i + 1);
        if (s.beltIndex !== undefined) slot.classList.add("pocket");
        return slot;
      });
      this.hotbar.replaceChildren(...this.hotSlots);
    }
    this.selectedHot = Math.min(this.selectedHot, this.hotSlots.length - 1);
    this.hotSlots.forEach((slot, i) => {
      const item = this.items.find((it) => it.id === this.equipment[slot.dataset.slot!]);
      fillSlot(slot, item, t("slot.empty"));
      slot.classList.toggle("selected", i === this.selectedHot);
    });
  }

  private renderList() {
    const arrow = (key: SortKey) => (this.sortKey === key ? (this.sortAsc ? " ▲" : " ▼") : "");
    this.sortButtons.name.textContent = t("inv.name") + arrow("name");
    this.sortButtons.type.textContent = t("inv.type") + arrow("type");
    this.typeButtons.forEach((b) => b.classList.toggle("active", b.dataset.type === this.filterType));

    const visible = this.items
      .filter((it) => !this.filterType || it.itemType === this.filterType)
      .filter((it) => !this.filterText || it.name.toLowerCase().includes(this.filterText))
      .sort((a, b) => {
        const cmp =
          this.sortKey === "name"
            ? a.name.localeCompare(b.name)
            : tType(a.itemType).localeCompare(tType(b.itemType)) || a.name.localeCompare(b.name);
        return this.sortAsc ? cmp : -cmp;
      });

    this.list.replaceChildren(
      ...visible.map((it) => {
        const worn = slotOf(this.equipment, it.id);
        const row = el("div", {
          className: "inv-row",
          draggable: true,
          title: (worn ? t("inv.equippedIn", { slot: tSlot(worn).label }) + "\n" : "") + t("inv.rowHint"),
        });
        const name = el("span", { textContent: it.quantity > 1 ? `${it.name} ×${it.quantity}` : it.name });
        if (worn) name.append(el("span", { className: "inv-badge", textContent: tSlot(worn).short }));
        row.append(name, el("span", { textContent: tType(it.itemType) }));
        row.classList.toggle("equipped", !!worn);
        row.classList.toggle("picked", it.id === this.pickedItemId);
        row.ondragstart = (e) => startDrag(e, it.id);
        row.ondragend = endDrag;
        row.ondblclick = () => {
          const slot = this.hotSlots[this.selectedHot]?.dataset.slot;
          if (slot) this.equip(slot, it.id);
        };
        row.oncontextmenu = (e) => {
          e.preventDefault(); // right-click: use it (eat food)
          this.opts.onUse(it);
        };
        row.onclick = () => {
          // Update the highlight in place (re-rendering would break double-click)
          this.pickedItemId = it.id;
          this.list.querySelectorAll(".inv-row").forEach((r) => r.classList.toggle("picked", r === row));
        };
        return row;
      })
    );
    if (!visible.length) this.list.append(el("div", { className: "inv-empty", textContent: t("inv.empty") }));
  }
}

function setBar(bar: Element, value: number, max: number, label: string) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  (bar.querySelector(".vital-fill") as HTMLElement).style.width = `${pct}%`;
  bar.querySelector(".vital-text")!.textContent = `${label} ${Math.floor(value)} / ${max}`;
}

/** Tiny helper: create an element and set some of its properties. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}): HTMLElementTagNameMap[K] {
  return Object.assign(document.createElement(tag), props);
}
