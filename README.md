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

Opening an invite link shows **Join game** and, under it, **Create game** (with the friendly fire checkbox),
so you can start your own room instead, e.g. after a reload when the old room is gone (restarting the
server closes every room).

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
- The game is in **English, Serbian (Cyrillic), Hungarian and Romanian**. Pick the language on the start page (top-right)
  or in Options; it switches instantly, even in the middle of a game, and is remembered. On the first visit
  the browser's language is used.
- Even the comic attack words are translated (BAM! / БАМ! / BUMM! / BUF!): the server only sends *which* word,
  each player sees it in their own language.

All texts live in `client/src/i18n/`: `en.ts` is the master list, `sr.ts`, `hu.ts` and `ro.ts` are typed against it,
so a missing or extra key in a translation is a compile error. In code, texts come from `t("key")`
(item names: `tItem(id)` using the ids in `ITEM_DEFS`). To add a language: copy `hu.ts`, translate it, and
add it to `LANGUAGES` in `client/src/i18n/index.ts`. To add a text: add the key to all four files.

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
empty hands attack with 1). The Sword is 5 attack / 4 defense. Intelligence powers magic: spell damage, number of spell slots and how long spells last (see **Magic** below); Charm does nothing yet.

The **Stats** window (hotkey **K**, starts minimized) shows your stats, HP, fatigue, speed and the current
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
  (like a click), anything else with defense (a shield) blocks (like Shift+click), food is eaten (like E);
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
- Killed rats flip over and lie there for 1 minute, then fade away over 3 s (crusaders too: they stay fallen
  over; `CORPSE_MS` in `shared/enemies.ts`, `CORPSE_FADE_MS` in `GameScene`). Meanwhile the server remembers
  the body, so **Necromancy** can raise it (see Magic). A new rat appears somewhere else after 60 s.
- Rats and crusaders also go for zombies (they count as foes, like bunnies).
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
- **Eating:** right-click food in the inventory, or put it on the hotbar and press **E** (uses the selected
  hotbar slot). Eating when full is refused ("Not hungry!"). Every bunny starts with **10 carrots**
  (each restores 15 hunger). Food items have a `food` value in `ITEM_DEFS`.
- Rules and numbers: `shared/survival.ts`. A full bunny without food reaches 0 hunger in 25 minutes.

## Magic
A rune-drawing system in the spirit of Arx Fatalis: you draw a spell's runes, and if they look right, you get the spell.

1. **Hold F**: a big magic scroll opens, for you only. Everyone else just sees your bunny's eyes glow red and
   sparkle. You stand still while it is open (and clicks go to the scroll, not into the world).
2. **Draw the runes with the mouse, top to bottom.** Only the order from top to bottom matters, not where
   they are from left to right. A rune can have several lines; leave a little vertical gap between runes.
   Right-click wipes the scroll.
3. **Let go of F.** The server reads the drawing (so it can't be cheated) and the scroll shows for a moment
   which rune it saw where ("?" = unreadable), plus the outcome.
4. A spell that works goes into the first free **spell slot** on the hotbar: **X**, then **C**, **V**, **B**.
   How many slots you have depends on **Intelligence**:

   | Intelligence | 1–2 | 3–5 | 6–7 | 8–10 |
   |---|---|---|---|---|
   | Spell slots | X | X, C | X, C, V | X, C, V, B |

   It waits there for **1 minute + 6 s × Intelligence** (Intelligence 5 → 90 s, 10 → 2 min; the countdown is
   in the slot, it blinks in the last 10 s), then fades. Each charge is used once. All your slots full: the
   new spell replaces the one closest to fading. The Stats window shows both values.
   Getting knocked out drops the scroll and every charged spell.

**Fireball** = **Ka** (create, a hook) + **Ash** (fire, a long "\\" with two short strokes) + **Dom** (burst, a dome).
Press its slot key: a 3×3 target follows the mouse (red when out of reach, max **8 tiles**); click to throw,
right-click / Esc / the same key again cancels. It flies there in an arc and explodes on the tile and the 8
around it. Damage = **2 + Intelligence − armor** (never below 0), for every bunny (if friendly fire is on),
rat and crusader standing there. It can't be blocked, and with friendly fire on it hurts the caster too if they
stand in the blast, so don't throw it at your feet.
Just-respawned (protected) bunnies can charge spells but can't throw them yet, like attacking.

**Healing** = **Ul** (life, two parallel "\\\\") + **Tor** (give, a "T") + **Sel** (mend, a long "/" with a short "\\"
against its lower half). Aimed like the fireball, but the target is **one tile** (green): every bunny standing
there that isn't knocked out, the caster included, gets back **5 + 2 × Intelligence HP** (never above max HP).
Friend or foe alike, but not animals. It isn't an attack, so protected (just-respawned) bunnies can use it.
Numbers: `HEALING` in `shared/magic.ts`; each spell's area (`radius`), whether it is an attack (`hostile`)
and aim color are in `SPELLS`; both spells reach `SPELL_RANGE_TILES` (8).

**Necromancy** = **Mor** (death, a post with a branch rising from its middle to the right) + **Ul** (life)
+ **Ka** (create). It isn't aimed (`self` in `SPELLS`): press its key next to a dead body. The body closest
to the caster within **2 tiles** (`NECROMANCY.reach`) rises from a green mist as a zombie that serves the
caster for **10 minutes**, then crumbles to dust. No body in reach: "No dead body close enough!" and the
spell stays charged. Zombie rat, zombie knight and zombie King Arthur: rotten, rusty and mossy, with glowing
green eyes (drawn in code in `GameScene`, textures `zrat`, `zknight`, `zking`).
- Zombies **follow** their master in a ring around it. When the master or one of them is attacked, they go
  for the attacker (a fight more than 8 tiles from the master is given up). A zombie that got far behind
  (e.g. its master woke up in the start town) rises again next to the master.
- **N** (or the 🧟 button, which shows how many you have, next to the spell slots) aims like a spell: click
  a tile up to 12 tiles away and the whole army marches there and attacks anybody on that tile or the 8
  around it. They **hold that place** (fighting whoever comes, and anything attacking them right there) until
  the master walks within **2 tiles** of them: then that squad follows again.
- A zombie fights like it did alive (same HP, attack, reach and swing speed). Killed zombies leave a body
  too, which can be raised again.
- Never against their master or its other zombies; other bunnies and their zombies only with friendly fire
  on (with it off a bunny can't hit other bunnies' zombies either). Bunnies and zombies walk through each
  other, so an army can't box you in; rats and crusaders bump into zombies as usual.
- If the master leaves the game, its zombies crumble.
- Numbers: `ZOMBIE`, `ARMY`, `CORPSE_MS` in `shared/enemies.ts`. Server: `server/src/zombies.ts` (follow /
  defend / order) and `GameRoom` (bodies, `raiseDead`, who may hurt whom: `canHarm`). Effects: `raise`,
  `crumble`, `orderMark` in `client/src/magicFx.ts`.

The **Spellbook** window (**P**, starts minimized) has a drop-down with every spell (🔒 = you don't know all
its runes yet); pick one to see what it does and its runes in order, top to bottom (the choice is
remembered). The runes you know, with pictures and meanings, are in **Help → Magic** (a `{{runes}}` line
in a help text shows them). For now every bunny starts knowing all seven runes (`STARTER_RUNES`).

**How a drawing is read** (`shared/runes.ts`): tiny strokes are dropped; strokes whose heights overlap are
grouped into one rune, and the groups are ordered top to bottom; each group is matched against every rune
with the [$P point-cloud recognizer](https://depts.washington.edu/acelab/proj/dollar/pdollar.html) (32 points,
size and position don't matter, stroke order and direction don't matter, orientation does), plus a penalty
when a sharp corner or a closed loop is missing or extra (that is what keeps the Ka hook and the Dom arc apart)
and when the lines run in different directions (so "=" isn't read as Tor's "T").
The closest rune wins if it is within `RUNE_TOLERANCE` and the stroke count fits (the model's count up to 2
more). Raise `RUNE_TOLERANCE` to be more forgiving. In a test with thousands of randomly distorted drawings
(wobbly, stretched, rotated, sloppily placed), about 98% of reasonable ones were read right, and plain lines,
circles, squares, zigzags and the like were rejected.

Adding things:
- **A rune:** add its model strokes to `RUNE_SHAPES` (any coordinates, only the shape counts) and its name /
  meaning to the translation files (`rune.<id>`, `rune.<id>.meaning`). Keep runes visually distinct.
- **A spell:** add it to `SPELLS` in `shared/magic.ts` (its runes and icon), its texts (`spell.<id>`,
  `spell.<id>.desc`), and what it does in `GameRoom` (the `spell` message, like `throwFireball`).
- Numbers: `spellSlotCount`, `SPELL_CHARGE_BASE_MS` / `SPELL_CHARGE_PER_INTELLIGENCE_MS`, `FIREBALL` (damage, radius, range, speed) in `shared/magic.ts`.
- Code: scroll `client/src/ui/scroll.ts`, spellbook `client/src/ui/spellbook.ts`, glowing eyes / fireball /
  target `client/src/magicFx.ts`, spell slots in `client/src/ui/hud.ts`, aiming in `GameScene`.

## The map
400×400 tiles, 64×64 pixels each (25,600×25,600 px world), stored in `shared/map.json`. The size isn't
fixed: the game, the server and the minimap read `width` and `height` from the map, so a 600×800 map
just works (the minimap keeps the map's shape).

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
same map). Add a size to change the map size: `npm run map -- 42 200` for 200×200, `npm run map -- 42 600 800`
for 600 wide × 800 tall; city and river counts scale with the size. Other settings (number of swamps,
summits, …) are at the top of `tools/generate-map.mjs`.

### Editing the map as pictures
The map can be painted pixel by pixel in any pixel-art editor (Aseprite, Piskel, GIMP, Krita, Paint.NET…):
one pixel = one tile.

```bash
npm run map:export   # shared/map.json -> map/terrain.png, map/roads.png, map/palette.gpl
# ... edit the pictures ...
npm run map:import   # map/terrain.png + map/roads.png -> shared/map.json (the dev server reloads)
```

- **`map/terrain.png`**: paint with the 8 terrain colors (the `color` values in the table above).
  **The picture's size is the map's size**: resize the canvas to 600×800 and the world becomes 600×800
  tiles. Transparent pixels become sea.
- **`map/roads.png`**: the same size, transparent; draw roads as 1-pixel lines in any color. Straight
  pieces, curves and junctions are worked out from the neighbouring road pixels, so keep parallel roads
  at least one pixel apart (touching ones join). Roads on town tiles are ignored (towns have no road
  overlay); a road ending next to a town connects into it; a road over water works as a bridge. In
  Aseprite you can stack it as a layer over the terrain while you work, then save each layer as its own PNG.
- **`map/palette.gpl`**: the colors as a palette (Aseprite, GIMP, Krita and Paint.NET can load it).
- Use a pencil, not a soft brush. A color that isn't exactly a terrain color is snapped to the closest one,
  and the import lists them (e.g. `#50aa46 -> grass: 1 pixel(s)`, plus where the first one is).
- The import also rebuilds the town list from the grey city pixels and keeps the spawn point, unless it
  is now off the map or on unwalkable ground: then it moves to the middle of the biggest town.
- Terrain names, colors and speeds still come from `map.json`. The pictures are just the editing format:
  the game itself only loads `map.json`. Commit both if you like; `map:import` always overwrites `map.json`.
- The converter needs nothing extra (`tools/map-png.mjs`, plain Node). Exporting and importing the
  current map gives back the same map (a handful of road ends may get a slightly different shape).

**Tile pictures:** each terrain is drawn from 64×64 PNGs in `client/src/assets/tiles/`, found by the
terrain's name (`grass`, `trees`, `hills`, `river`, `sea`, `city`, `swamp`, `summit`):
- `grass.png` → used for every grass tile
- `grass1.png`, `grass2.png`, … `grassN.png` → every grass tile uses one of them; a plain `grass.png`, if
  there is one, joins the rotation too. Which one is picked depends on the tile's position and the map
  seed, so it looks random but is the same for every player and every reload. Every picture comes up about
  equally often; to make one more common, add a copy of it under another number.
- **Forest:** `trees1`–`trees6`: the grass pictures with 3 to 8 small trees each (round leafy trees,
  pines, or both), plus a stump, mushrooms, rocks or a berry bush here and there; everything stays inside
  the tile so neighbouring tiles join cleanly. The old plain dark-green picture is kept as `trees-plain.png`
  (a name the game ignores); rename it back to `trees.png` to put it in the rotation again.
- **Hills:** `hills1`–`hills6`: flat 2D-map style on the brown ground, with soft lighter/darker patches:
  rounded hills seen from the side (dark outline, light rim on the left, shade on the right, a few grass
  blades on top), wavy contour strokes, small grass patches and tufts, a couple of boulders, and one tile
  with a cluster of rocky peaks. The plain brown picture is kept as `hills-plain.png` (ignored, like
  `trees-plain.png`).
- **City:** `city.png` (plain grey cobbles) plus `city2`–`city5` (houses: a red-roofed timber house, a thatched
  cottage with a flower garden, two narrow houses with a well, an inn with a sign), `city6` (a stone temple
  with a bell tower) and `city7` (a park with a fountain). Medieval pixel art, 64 × 64, with plain grey
  edges so they join each other seamlessly. They are only pictures: bunnies walk over them like any city tile.
- no picture → the terrain's `color` from `map.json` is drawn instead

New pictures are picked up automatically (the dev server reloads; for `npm run share` run it again).
The `color` values are also used for the minimap. The code is in `client/src/tiles.ts`.

## The bunny's picture
The bunny is a sprite sheet you can edit in any pixel-art editor (Aseprite, Piskel, Paint.NET…):
`client/src/assets/characters/bunny.png`. It is drawn 3× bigger in the game (`BUNNY_SCALE`), crisp.

- **Which way it looks:** walking **down** (also down+left, down+right) shows the front, walking straight
  **up** shows the back, walking **left or right** (also up+left, up+right) shows the side, mirrored for left.
  A bunny that stops keeps the view it last walked in; after a knock-out it stands facing front again.
- **Frames**, left to right, each 15 × 19 pixels (hopping = looped while moving, 10 frames per second):
  **0** front standing, **1–4** front hopping (ears swing, hop up, ears swing back, hop up),
  **5** knocked out (x.x eyes), **6** back standing, **7–10** back hopping (fluffy tail, same hop as
  the front), **11** side standing (facing right), **12–15** side hopping (ears back, leap, ears
  forward, leap).
- **Colors:** keep the fur **white**: every player's color is multiplied onto it (white becomes the
  player's color, pink becomes a tinted pink; the light grey shading of the tail a darker shade). The **eyes must stay exactly `#222222`**: the glowing red
  eyes of a bunny drawing on its magic scroll are found by that color, frame by frame.
- Leave the background transparent. Changing the frame size or the number of hopping frames? Update
  `BUNNY_FRAME_W`, `BUNNY_FRAME_H` and `BUNNY_FRAMES` in `client/src/bunnySprite.ts`.
- The bunny is about 25% bigger than the old one drawn in code; its collision and reach haven't changed.

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
- Replace the plain-color tiles with real pixel art
- Hand-build maps in Tiled and load them with `this.load.tilemapTiledJSON`
- Add NPCs, items, combat
