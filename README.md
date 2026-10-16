# 🐰 bunnyQuest

A small 2D pixel-art multiplayer RPG (8–16 friends per game, invite-link based).

- **client/**: Phaser 3 + TypeScript, bundled with Vite
- **server/**: Colyseus (Node + TypeScript), server-authoritative movement at 20 ticks/s
- **shared/**: the world map (`map.json`) and movement rules (`world.ts`) used by both sides
- **tools/**: the map generator

## Requirements
- Node.js 20+ (LTS): https://nodejs.org

## Run it
```bash
cd C:\project\bunnyQuest
npm install
npm run dev
```
- Game: http://localhost:5173
- Server: ws://localhost:2567

Enter a name, distribute your stat points, click **Create game**, then open **Options** (top-left, or Esc) → **Copy invite link** and open it in a
second browser tab to see two bunnies moving together. Move with WASD or the arrow keys.

## Options and languages
- **Friendly fire** (checkbox on the start page, only when creating a game; remembered): on = bunnies can
  hurt each other, off = their attacks simply pass through other bunnies (no hit, no blood, no damage);
  rats and crusaders still fight as usual. It is fixed for the room's lifetime (`friendlyFire` in `GameRoom`).
  Everyone joining sees a 5-second note at the top saying whether friendly fire is on. When it is on, new
  bunnies are protected for their first 10 s (they blink, can't be hurt and can't attack yet, like after a
  respawn; `JOIN_PROTECTION_MS` in `shared/combat.ts`).
- **Options** (button in the top-left corner, or **Esc**): copy the invite link, change the language, or
  **exit to the main menu** (leaves the game and goes back to the start page).
- **Help** (the round **?** button under Options, or **H**): a large window with topics on the left
  (Controls, Combat, Stats) and the text on the right. Esc or a click outside closes it; the last topic is
  remembered. The texts are in the translation files (`help.<topic>.title` / `help.<topic>.body`) and use a
  tiny markup: `## ` heading, `- ` bullet, `**bold**`, `[Key]` for a key cap, a blank line for a new
  paragraph. To add a topic, add it to `TOPICS` in `client/src/ui/help.ts` and its two texts to all three files.
- **Blood** (in Options): how graphic hits look, for you only (remembered in your browser). Blood shows only
  when a hit actually did damage, so it doubles as "that one landed" feedback; the server sends just a
  yes/no (`bleed`), never the amount.

  | Setting | What you see |
  |---|---|
  | Off | nothing |
  | Low blood | a small splat mark where the hit lands and a few droplets, gone within a second |
  | Medium (default) | more droplets and small stains on the ground that fade after 4 s |
  | High | a big spray, stains that stay 30 s, a pool under knocked-out bunnies and killed rats, drops trailing behind characters below 50% HP |
  | Maximum blood | comically over the top: every hit sprays big blobs 4–5 tiles around, huge stains and pools that stay 45 s, trailing splotches below 75% HP |

  All of it is pixel squares in the game's style; at most 400 stains at a time. Code and levels: `client/src/blood.ts`.
- The game is in **English, Serbian (Cyrillic) and Hungarian**. Pick the language on the start page (top-right)
  or in Options; it switches instantly, even in the middle of a game, and is remembered. On the first visit
  the browser's language is used.
- Even the comic attack words are translated (BAM! / БАМ! / BUMM!): the server only sends *which* word,
  each player sees it in their own language.

All texts live in `client/src/i18n/`: `en.ts` is the master list, `sr.ts` and `hu.ts` are typed against it,
so a missing or extra key in a translation is a compile error. In code, texts come from `t("key")`
(item names: `tItem(id)` using the ids in `ITEM_DEFS`). To add a language: copy `hu.ts`, translate it, and
add it to `LANGUAGES` in `client/src/i18n/index.ts`. To add a text: add the key to all three files.

## Chat
Press **T**, type a message (max 200 characters) and press **Enter**; **Esc** cancels. The message pops up
in a cartoon speech bubble over your bunny for everyone: **5 s** under 50 characters, **10 s** for 50–100,
**20 s** for longer ones. New messages push the older ones up; at most **5** bubbles per bunny (a new one
makes the oldest disappear). Bubbles move with their bunny. While typing, your bunny stands still.
Bubbles and the chat box use **Inter SemiBold**, bundled with the game (`client/public/fonts/`, a small subset
with Latin, Hungarian and Cyrillic letters; free under the SIL Open Font License, see `Inter-OFL.txt`).
The server cleans messages (trimmed, no line breaks or control characters, 200 characters max) and limits
how fast one player can post. Rules: `shared/chat.ts`; bubbles: `client/src/bubbles.ts`.

## Character and stats
Before joining, you create your bunny: a name plus **20 points** spread over six stats (each 1–10):
Strength, Agility, Intelligence, Charm, Endurance, Luck. The game can only start once all points are spent
(the server checks this too). Your last character is remembered on the start screen.

| Value | Formula |
|---|---|
| HP | 20 + 5 × Endurance |
| Fatigue | 20 + 3 × Endurance |
| Fatigue regeneration | 1 point every 2 s × (1 − 4% × Endurance) (Endurance 5 → every 1.6 s, 10 → every 1.2 s) |
| Movement speed | 200 px/s × (1 + 3% × Agility), then terrain / roads apply (Agility 5 → 230 px/s) |
| Attack | weapon attack × (1 + 5% × Strength + 2% × Agility) |
| Defense (when blocking) | weapon defense × (1 + 5% × Agility) |
| Armor | sum of the armor of everything worn (not in the hands) |
| Damage of a hit | attack − defense (only if blocked) − armor, rounded, never below 0 |

Example: attack 8 against defense 5 and armor 2 → 1 damage if blocked, 6 if not.
The weapon values come from what is in your hands (the best attack and the best defense of the two hands;
empty hands attack with 1). The Sword is 5 attack / 4 defense. Intelligence, Charm and Luck do nothing yet.

The **Stats** window (hotkey **C**, starts minimized) shows your stats, HP, fatigue, speed and the current
Attack / Defense / Armor, which change as you equip things. Players only see plain summaries of what each
stat affects (e.g. "Affects attack, defense and movement speed"); the exact math below stays in the code.

Code: all formulas are in `shared/stats.ts` (used by client and server); item combat values are in
`ITEM_DEFS` in `shared/items.ts` (placeholders for now: Wooden shield 1 / 6, Leather vest armor 2, Old boots armor 1).
Actually fighting other bunnies is not in the game yet.

### Attacking, blocking and fatigue
- **Click** on the map: attack toward the pointer. A comic burst (BAM! / POW! / POOF!) pops next to your
  bunny for 0.5 s. The attack reaches **1 tile** (64 px): the burst appears where you clicked if that is
  within a tile, otherwise one tile away in that direction. At most **3 attacks per second**.
- **Right-click** on the map: use what is in **hand 2** (hotbar slot 2) toward the pointer. A weapon attacks
  (like a click), anything else with defense (a shield) blocks (like Shift+click), food is eaten (like F);
  other items say "Nothing happens…", an empty hand says so. The browser's right-click menu is turned off
  on the map (it still works everywhere else). Code: `useHand2()` in `client/src/scenes/GameScene.ts`.
- **Shift+click**: block toward the pointer. A small shield shows on that side for **1 s** (blocking lasts
  longer than an attack); Shift+clicking again refreshes it.
- **Hits:** an attack hits bunnies within reach, up to 60° to either side of the attack direction. If the
  target is blocking toward the attacker, the block reduces it by their defense (the shield pops); otherwise
  the target blinks. **Hits take HP** (no damage numbers are shown, players have to guess from the HP bar;
  the amounts aren't even sent to other players); at 0 HP a bunny is knocked out (see below).
  Set `DAMAGE_ENABLED = false` in `shared/combat.ts` to make combat harmless.
- **Knock-out:** at 0 HP (beaten or starved) the bunny falls over where it stands with **x.x** eyes, greyed
  out, with a countdown over it; its owner sees "Knocked out! Back on your feet in 10…". For **10 s** it
  can't move, attack, block or eat, and can't be hit. Then it wakes up in the start town with full HP and
  fatigue and is **protected for 10 s** (it blinks): nobody can hurt it and it doesn't starve, but it can't
  attack yet (blocking and moving work). Times: `RESPAWN_DELAY_MS` / `SPAWN_PROTECTION_MS` in
  `shared/combat.ts`; the server syncs the remaining whole seconds (`respawnIn`, `protectedFor`).
- **Luck** (rolled by the server; lucky events can happen together and their effects stack):

  | When | Chance | Effect | Shows as |
  |---|---|---|---|
  | attacking | 1% × Luck | double damage | a "2x" badge next to the burst |
  | attacking | 3% × Luck | +2 damage | the burst is 25% bigger |
  | a block meets a hit | 1% × Luck | perfect block: no damage, the attacker loses half their fatigue | shield +50% |
  | a block meets a hit | 3% × Luck | full block: no damage | shield +25% (both: +75%) |

  Double damage applies first, then the +2. Your own burst shows instantly and grows / gets the "2x" a
  moment later, when the server's luck result arrives.
- **Fatigue** (bar above the hotbar, also in the Stats window): an attack costs **2**, a block **1**, and a
  successful block costs the defender another **2**. It regenerates **1 point every 2 seconds**, faster with more Endurance. Without
  enough fatigue the action doesn't happen ("Too tired!"); a defender who is too tired can't stop a hit.
- Everyone sees everyone's bursts, shields and hits. The server is the referee: it enforces the rate limits
  and fatigue, and decides hits and blocks.
- Timings, range, fatigue costs and hit/block rules are in `shared/combat.ts`; the effects are drawn in `client/src/fx.ts`.

## Rats
**100 rats** live in the wild (grass, forest, hills, swamps; never within 15 tiles of the start town).
- They wander: walk a little in a random direction, rest, walk again, as if looking for food. They turn
  back at towns and water.
- A bunny within **4 tiles** gets chased (rats run at 140 px/s, slower than any bunny, so fleeing works) and
  bitten when they touch: a small "Chomp!" and the usual hit or block. They give up beyond 7 tiles, and leave
  knocked-out and freshly respawned (protected) bunnies alone.
- Easy on purpose: 12 HP (two sword hits), bite attack 3 (≈3 HP without armor, nothing through a sword
  block), one bite per 1.2 s. They can't block.
- Killed rats flip over and fade; a new one appears somewhere else after 60 s.
- Everything runs on the server (`server/src/rats.ts`); positions are whole pixels so idle rats send nothing.
  All numbers are in `RAT` in `shared/enemies.ts`. The client draws them in `GameScene` (`makeRatTexture`).

## Crusaders (easter egg)
**30 bands** of five crusaders roam the wild (never within 20 tiles of the start town). Deliberately left
out of the in-game Help, so players find them on their own.
- **King Arthur** (crown, blue tabard, purple cape, his name in gold) leads; four knights (white tabards
  with a red cross) follow him in a loose formation with a little sideways sway, **never more than 2 tiles**
  from him. He marches a while, rests a while, waits for knights that fall behind, and avoids towns.
- They are tall (knights ≈1.6 tiles, the king ≈1.8) but stand on their feet: position and collision are the
  bottom quarter of the sprite.
- A bunny within **5 tiles** of the leader is charged: the king shouts **"CHARGE!"** (and again on his swings,
  at most every 6 s). Swords reach a bit further than rat teeth; a swing shows a comic burst and is a normal
  hit or block. They give up beyond 8 tiles and ignore knocked-out / protected bunnies.
- Rat-like toughness: knights 14 HP / attack 3, the king 20 HP / attack 4, one swing per 1.3 s, charging at
  125 px/s (slower than a bunny).
- When **3 of a band have fallen**, the rest flee from any bunny within 6 tiles (185 px/s), screaming
  **"AAAAAAA!!!"**, **"RETREAT!"** and **"RUN FOR YOUR LIVES!"** in speech bubbles until they are 9 tiles
  away; they never fight again. If the king dies, the next knight leads (but only the king shouts "CHARGE!").
  Shouts are translated on each player's screen.
- If they **knock out** the bunny they were charging, the survivors cheer one after the other: **"Victory is
  ours!"**, **"This was a fine day!"**, **"We triumphed again!"**; if the band lost someone in the fight, the
  leader opens with **"We lost many men, but we killed the monster."** Then they stand around pleased with themselves
  for a moment before marching on.
- A band wiped out completely comes back somewhere else after 2 minutes.
- Server: `server/src/crusaders.ts`; numbers: `CRUSADERS` in `shared/enemies.ts`; drawing:
  `makeCrusaderTextures` in `client/src/scenes/GameScene.ts`.

## Hunger
The **Hunger** bar (above the hotbar, and in the Stats window) goes from 0 to **50 = full**; the full part is
green, the missing part dark red. New bunnies start full.
- Hunger goes down by **1 every 30 seconds**.
- It decides whether you heal or waste away (linear in between):

  | Hunger | 50 | 30 | 10 | 5 | 0 |
  |---|---|---|---|---|---|
  | HP | +1 every 5 s | +1 every 10 s | no change | −1 every 30 s | −1 every 15 s |

- Starving to 0 HP knocks you out like a beating (hunger is topped up to at least 20 when you wake up).
- **Eating:** right-click food in the inventory, or put it on the hotbar and press **F** (uses the selected
  hotbar slot). Eating when full is refused ("Not hungry!"). Every bunny starts with **10 carrots**
  (each restores 15 hunger). Food items have a `food` value in `ITEM_DEFS`.
- Rules and numbers: `shared/survival.ts`. A full bunny without food reaches 0 hunger in 25 minutes.

## The map
400×400 tiles, 64×64 pixels each (25,600×25,600 px world), stored in `shared/map.json`.

**Terrain** (`rows`, one character per tile):

| Char | Terrain | Color | Movement |
|------|---------|-------|----------|
| `G` | grass | mid green | normal |
| `T` | trees | dark green | 50% speed |
| `H` | hills | brown | 60% speed |
| `R` | river | light blue | 50% speed (wade across) |
| `C` | city | grey | normal |
| `S` | swamp | dark brown | 30% speed |
| `N` | summit (snow) | white | 20% speed |
| `W` | sea | deep blue | blocked |

**Collision:** moving characters (bunnies, rats, later other animals and NPCs) can't get closer than
**half a tile** (32 px, `BODY_GAP` in `shared/world.ts`) to each other, center to center. `World.step()`
checks it per axis, so you slide around someone instead of sticking to them, and stop right at the gap.
Moving *away* is always allowed, so characters that start out overlapping (e.g. waking up in the same spot)
can separate. Knocked-out bunnies don't block anyone. The server enforces it; your own bunny predicts it
with the same code, so it doesn't jitter against others.

**Roads** (`roads`, a transparent overlay with the same grid; `.` = no road): `-` `|` `+` and the
curves `┌ ┐ └ ┘` (e.g. `┌` joins the bottom-center of the tile to the right-center). A road moves
you at 120% whatever the terrain underneath, so roads over rivers act as bridges.

The generator makes an island with forests, hills and rivers, then adds 2 swamps on low ground,
5 snow-capped summits on the highest hills and 60 cities of 1–8 tiles (players spawn in the big one in
the middle), and connects the cities with the cheapest road network it can find. Speeds live in the
`terrain` and `road` sections of `map.json`, so you can tweak them without touching code.

To make a new random island: `npm run map -- 42` (any number is a seed; the same seed always gives the
same map). Add a size to change the map size, e.g. `npm run map -- 42 200` for 200×200; city and river
counts scale with the size. Other settings (number of swamps, summits, …) are at the top of
`tools/generate-map.mjs`. You can also edit the `rows` and `roads` strings by hand.

**Tile pictures:** each terrain is drawn from 64×64 PNGs in `client/src/assets/tiles/`, found by the
terrain's name (`grass`, `trees`, `hills`, `river`, `sea`, `city`, `swamp`, `summit`):
- `grass.png` → used for every grass tile
- `grass1.png`, `grass2.png`, … `grassN.png` → if any numbered pictures exist, every grass tile uses one of
  them (the plain `grass.png` is then ignored). Which one is picked depends on the tile's position and the
  map seed, so it looks random but is the same for every player and every reload.
- no picture → the terrain's `color` from `map.json` is drawn instead

New pictures are picked up automatically (the dev server reloads; for `npm run share` run it again).
The `color` values are also used for the minimap. The code is in `client/src/tiles.ts`.

## HUD windows
The **Map** (minimap with a red dot for you) and the **Inventory** are small windows stacked on the right
side by default. They all work the same way:
- the title bar shows the window's hotkey on the right: click the bar or press the key (**M** / **I**) to
  minimize it to just the bar, and again to bring it back
- drag the title bar to move the window anywhere; right-click the title bar to put it back in its default spot
- windows always stay completely inside the browser's drawing area: while dragging, after resizing the
  browser, and when a minimized window is expanded near an edge (a window taller than the screen shrinks
  and its list scrolls). The window you grab last is drawn on top.
- positions and minimized state are remembered in your browser

To add another window, create a `UiWindow` (`client/src/ui/window.ts`) and put your content in its `body`.

## Inventory, outfit and hotbar
- **Inventory** (I): type in the filter box to search by name, click a type icon to show only that type
  (click it again to show everything), click **Name** / **Type** to sort. Esc clears the filter and
  returns to the game. Equipped items are green with a small badge showing where they are worn.
- **Outfit** (O): a mannequin bunny with slots, top to bottom: 4 earrings (two per ear), hat/helmet,
  shirt + upper armor (two layers), hand 1 + hand 2, belt, trousers, boots.
- **Hotbar** (bottom): hotbar slots 1 and 2 *are* your hands. Wearing a belt adds pockets as extra
  hotbar slots (dashed border): both belts add 2 (slots 3–4) for now; a belt can add up to 4 (`beltSlots` in `ITEM_DEFS`).
  Take the belt off and its pockets disappear (their items stay in the inventory).

How to move items around:
| Action | How |
|---|---|
| Wear an item in its matching slot | click it in the inventory (it turns gold), then **Shift+E** |
| Put an item in hotbar slot N | click it, then **Shift+1** … **Shift+N** |
| Move / swap | drag it from the inventory or from any slot onto another slot (e.g. between the 4 earring slots); if the target is taken, the two items swap |
| Take an item off | **Shift+click** (or right-click) its slot |
| Select a hotbar slot | press **1** … **N** or click it |

Slots only accept matching items (a hat can't go in the boots slot): while dragging, a slot turns green if
the item fits and red if it doesn't. Hands and belt pockets accept anything.

Code: the rules (slots, what fits where, swapping, belt pockets) are in `shared/equipment.ts` and are used
by both the client and the server. Equipped items are stored on the server in `Player.equipment` (slot → item).

### Items
All items are declared once in `ITEM_DEFS` in `shared/items.ts`, each under a snake_case id:
```ts
sword: { name: "Sword", type: "weapon", icon: "🗡️", equip: "hand", attack: 5, defense: 4 },
health_potion: { name: "Health potion", type: "potion", icon: "🧪", stackable: true },
```
- The **starting kit** is just a list of ids and counts (`STARTER_INVENTORY`, e.g. `{ item: "health_potion", count: 3 }`),
  plus `STARTER_EQUIPMENT` (slot → item id). Stackable items become one stack ("Health potion ×3"); others
  become one item per piece, so two identical earrings can be worn in two slots.
- The server only stores each owned item's instance id, definition id and quantity; names, icons and stats
  are always looked up from `ITEM_DEFS` (`itemView()`), so changing a definition changes it everywhere.
- Display names go through `itemName(id)`: the single place to plug in translations later (keyed by the id).
- To add an item: add an entry to `ITEM_DEFS`; to give it to new players, add it to `STARTER_INVENTORY`.
- **Pictures:** item slots show `client/src/assets/equipments/<id>.png` (16×16 pixel art works well; it is scaled
  up without blurring). If the file has a different name, point to it with `image`, e.g.
  `old_boots: { ..., image: "bootIcon" }`. Items without a picture show their `icon` emoji. New files are
  picked up by Vite automatically (restart `npm run dev` if one doesn't show up).

## Playing with friends (free Cloudflare tunnel)
One-time setup: install `cloudflared` (Windows: `winget install --id Cloudflare.cloudflared`).

Then, in two terminals:
```bash
npm run share    # builds the game and serves it + the game server on http://localhost:2567
npm run tunnel   # opens a free quick tunnel to port 2567
```
`npm run tunnel` prints a link like `https://something-random.trycloudflare.com`. Open it, create a
game, and send your friends the invite link (**Options → Copy invite link**; it already uses the tunnel address).
No account, port forwarding or firewall changes needed. The link changes every time you start the tunnel.

- `npm run dev` is still for development (hot reload on http://localhost:5173). For sharing use
  `npm run share`, which serves the built game from the game server, so one tunnel covers everything.
- Re-run `npm run share` after code changes so friends get the new version.
- **Same network only:** you can skip the tunnel and share `http://<your-LAN-IP>:2567` (allow Node through
  the Windows Firewall for port 2567).
- **Permanent hosting:** run the server on a VPS, or set `VITE_SERVER_URL=wss://your-server` when
  building the client if the game server lives somewhere else.

## How it works
1. Clients send only their keyboard state (`input` message) when it changes.
2. The server (`server/src/rooms/GameRoom.ts`) moves every player with `shared/world.ts` and syncs
   state via `@colyseus/schema` (`server/src/rooms/schema/GameState.ts`).
3. The client (`client/src/scenes/GameScene.ts`) runs the same `world.ts` rules to predict your own
   movement instantly, and interpolates other players smoothly.

## Next steps
- Replace the plain-color tiles and placeholder bunny with real pixel art (e.g. Aseprite → sprite sheets)
- Hand-build maps in Tiled and load them with `this.load.tilemapTiledJSON`
- Add NPCs, items, combat
