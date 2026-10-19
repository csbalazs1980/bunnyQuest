import Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import { SERVER_URL } from "./config";
import { GameScene } from "./scenes/GameScene";
import { Hud } from "./ui/hud";
import { Minimap } from "./ui/minimap";
import { CharacterCreator } from "./ui/creation";
import type { Stats } from "../../shared/stats";
import { itemView } from "../../shared/items";
import { onLanguageChange, t, type TKey } from "./i18n";
import { createLanguageSelect } from "./ui/language";
import { OptionsPanel } from "./ui/options";
import { HelpPanel } from "./ui/help";
import { ChatBox } from "./ui/chat";
import { MagicScroll, type CastResult } from "./ui/scroll";
import { Spellbook } from "./ui/spellbook";
import { packStrokes } from "../../shared/runes";
import type { SpellSlot } from "../../shared/magic";
import { HUNGER_MAX } from "../../shared/survival";
import type { MapData } from "../../shared/world";
import mapJson from "../../shared/map.json";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const client = new Client(SERVER_URL);
const roomId = new URLSearchParams(location.search).get("room");

const nameInput = $<HTMLInputElement>("name");
const playBtn = $<HTMLButtonElement>("play");
// Opened with an invite link: "Join game" first, and under it "Create game" to start your own room
// instead (handy when that room is gone, e.g. after restarting the server)
const newBtn = $<HTMLButtonElement>("new");
newBtn.hidden = !roomId;
// Friendly fire: chosen by whoever creates the game; remembered. With an invite link it sits under
// "Create game", since it only applies to a new game.
const ffBox = $<HTMLInputElement>("ff");
ffBox.checked = localStorageGet("bq-ff") !== "off";
if (roomId) newBtn.after($("ff-row"));
const err = $<HTMLDivElement>("err");

nameInput.value = localStorageGet("bq-name") ?? "";
$("lobby-lang").append(createLanguageSelect());

// The last error is kept as a translation key, so it is re-translated when the language changes
let lastError: { key: TKey; params?: Record<string, string> } | null = null;
const showError = (e: typeof lastError) => {
  lastError = e;
  err.textContent = e ? t(e.key, e.params) : "";
};

// Character creation: distribute the stat points (the last character is remembered)
let remembered: Stats | null = null;
try {
  remembered = JSON.parse(localStorageGet("bq-stats") ?? "null");
} catch {
  /* ignore */
}
const creator = new CharacterCreator(remembered, () => updatePlayButton());
playBtn.before(creator.el);
const updatePlayButton = () => {
  for (const b of [playBtn, newBtn]) {
    b.disabled = !creator.complete;
    b.title = creator.complete ? "" : t("lobby.spendFirst", { n: creator.pointsLeft });
  }
};

/** Start-screen texts in the current language. */
function relabelLobby() {
  nameInput.placeholder = t("lobby.namePlaceholder");
  playBtn.textContent = t(roomId ? "lobby.join" : "lobby.create");
  newBtn.textContent = t("lobby.create");
  $("ff-label").textContent = t("lobby.friendlyFire");
  $("ff-row").title = t("lobby.friendlyFireHint");
  updatePlayButton();
  showError(lastError);
}
relabelLobby();
onLanguageChange(relabelLobby);

playBtn.onclick = () => play(roomId);
newBtn.onclick = () => play(null);

/** Joins the room `joinId`, or creates a new game if it is null. */
async function play(joinId: string | null) {
  const name = nameInput.value.trim() || "Bunny";
  localStorageSet("bq-name", name);
  localStorageSet("bq-stats", JSON.stringify(creator.stats));
  localStorageSet("bq-ff", ffBox.checked ? "on" : "off");
  const stats = { ...creator.stats };
  playBtn.disabled = newBtn.disabled = true;
  showError(null);
  try {
    const room = joinId
      ? await client.joinById(joinId, { name, stats })
      : await client.create("game", { name, stats, friendlyFire: ffBox.checked });
    start(room);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : String(e);
    showError(
      message.includes("Invalid character")
        ? { key: "lobby.invalidCharacter" }
        : joinId
          ? { key: "lobby.joinFailed" }
          : { key: "lobby.serverDown", params: { url: SERVER_URL } }
    );
    updatePlayButton();
  }
}

/** A small message at the top of the screen that fades away after `ms`. */
function toast(text: string, ms: number) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.classList.add("gone"), ms);
  setTimeout(() => el.remove(), ms + 600);
}

function start(room: Room) {
  $("lobby").style.display = "none";

  // The invite link goes in the address bar and in the Options panel
  const url = `${location.origin}${location.pathname}?room=${room.roomId}`;
  history.replaceState(null, "", url);
  new OptionsPanel(url, async () => {
    // Exit to main menu: leave the game and reload the start page (without the ?room= link)
    try {
      await room.leave(true);
    } finally {
      location.assign(location.pathname);
    }
  });
  const help = new HelpPanel(); // "?" button under Options (or H)

  const scene = new GameScene(room);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    pixelArt: true, // crisp pixels, no smoothing
    backgroundColor: "#1d1b26",
    scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
    scene: [scene],
  });

  // HUD windows, docked on the right in this order: minimap, inventory, outfit, stats
  const minimap = new Minimap(mapJson as MapData);
  scene.onLocalMove = (fx, fy) => minimap.setPlayer(fx, fy);

  // Inventory + quick-access bar (HTML overlay)
  // Game keyboard controls off while typing (inventory filter, chat)
  const setGameInput = (enabled: boolean) => {
    const keyboard = game.scene.getScene("game")?.input.keyboard;
    if (!keyboard) return;
    keyboard.enabled = enabled;
    if (!enabled) keyboard.resetKeys(); // so the bunny doesn't keep walking while you type
  };
  // Eating (inventory right-click, E, or right-click on the map with food in hand 2)
  const useItem = (item: { id: string; food: number }) => {
    if (item.food <= 0) return; // only food can be used for now
    const me = room.state.players.get(room.sessionId);
    if (me && me.hunger >= HUNGER_MAX) return scene.say(t("fx.notHungry"));
    room.send("use", { itemId: item.id });
  };
  scene.onUseItem = useItem;
  const hud = new Hud({
    onEquip: (slotId, itemId) => room.send("equip", { slotId, itemId }),
    onUnequip: (slotId) => room.send("unequip", { slotId }),
    onUse: useItem,
    setGameInput,
    onSpell: (slot) => scene.aimSpell(slot),
  });
  scene.onAimChange = (slot) => hud.setAiming(slot);
  const spellbook = new Spellbook(); // P: pick a spell, see its runes; docks below the stats

  // Magic: hold F to draw runes on the scroll, let go to cast (the server reads the drawing)
  const scroll = new MagicScroll({
    canOpen: () => {
      const me = room.state.players.get(room.sessionId);
      return !!me && !me.respawnIn;
    },
    onOpen: () => {
      scene.setDrawing(true);
      room.send("scroll", { open: true }); // everyone sees our eyes glow
    },
    onCancel: () => {
      scene.setDrawing(false);
      room.send("scroll", { open: false });
    },
    onCast: (strokes) => {
      scene.setDrawing(false);
      room.send("cast", { strokes: packStrokes(strokes) });
    },
  });
  room.onMessage("castResult", (r: CastResult) => scroll.showResult(r));
  // Chat: T opens a box; Enter shows the text in a speech bubble over our bunny for everyone
  new ChatBox({ onSend: (text) => scene.chat(text), setGameInput });

  // When joining: a short note about friendly fire in this room (shown once, for 5 s)
  let ffNoted = false;
  room.onStateChange((state: any) => {
    if (!ffNoted) {
      ffNoted = true;
      toast(t(state.friendlyFire ? "join.ffOn" : "join.ffOff"), 5000);
    }
    const me = state.players.get(room.sessionId);
    if (!me) return;
    if (me.respawnIn > 0) scroll.cancel(); // knocked out: the scroll drops
    const spells: { slot: SpellSlot; spell: any; secondsLeft: number }[] = [];
    me.spells?.forEach((c: any, slot: string) => spells.push({ slot: slot as SpellSlot, spell: c.spell, secondsLeft: c.secondsLeft }));
    hud.setSpells(spells);
    const runes = Array.from(me.runes ?? []) as string[];
    spellbook.setRunes(runes);
    help.setRunes(runes); // Help → Magic lists the runes we know
    const equipment: Record<string, string> = {};
    me.equipment.forEach((itemId: string, slot: string) => (equipment[slot] = itemId));
    hud.setPlayer(
      // Only id + definition id + quantity come from the server; the rest is looked up in ITEM_DEFS
      Array.from(me.inventory as Iterable<any>).map((it) => itemView(it.id, it.defId, it.quantity)),
      equipment,
      {
        stats: {
          strength: me.stats.strength,
          agility: me.stats.agility,
          intelligence: me.stats.intelligence,
          charm: me.stats.charm,
          endurance: me.stats.endurance,
          luck: me.stats.luck,
        },
        hp: me.hp,
        fatigue: me.fatigue,
        hunger: me.hunger,
      }
    );
  });
}

function localStorageGet(k: string) {
  try { return localStorage.getItem(k); } catch { return null; }
}
function localStorageSet(k: string, v: string) {
  try { localStorage.setItem(k, v); } catch { /* ignore */ }
}
