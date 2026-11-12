// English: the master dictionary. Every key used in the game must exist here; the other languages
// are type-checked against it (a missing key there is a compile error).
// Placeholders look like {name}. Lists are separated with "|".
export const en = {
  // start screen
  "lobby.namePlaceholder": "Your name",
  "lobby.create": "Create game",
  "lobby.join": "Join game",
  "lobby.joinFailed": "Could not join — the game may be full or closed. You can start your own with “Create game”.",
  "lobby.serverDown": "Could not reach the server at {url}. Is it running?",
  "lobby.invalidCharacter": "This character is not valid. Spend all points (each stat 1–10).",
  "lobby.spendFirst": "Spend all points first ({n} left)",
  "lobby.friendlyFire": "Friendly fire",
  "lobby.friendlyFireHint": "On: bunnies can hurt each other. Off: only animals can hurt you.",
  "join.ffOn": "Friendly fire is ON: other bunnies can hurt you. You're safe for your first 10 seconds.",
  "join.ffOff": "Friendly fire is OFF: bunnies can't hurt each other.",
  "lobby.language": "Language",

  // character creation
  "creation.stats": "Stats",
  "creation.pointsLeft": "Points left:",
  "creation.preview": "HP {hp} · Attack {attack} · Defense {defense} (with the Sword) · Speed {speed}%",

  // stats
  "stat.strength": "Strength",
  "stat.agility": "Agility",
  "stat.intelligence": "Intelligence",
  "stat.charm": "Charm",
  "stat.endurance": "Endurance",
  "stat.luck": "Luck",
  "statHelp.strength": "Affects attack",
  "statHelp.agility": "Affects attack, defense and movement speed",
  "statHelp.intelligence": "Makes your spells stronger, gives you more spell slots and makes spells last longer. Together with Charm it helps you guess what items are worth",
  "statHelp.charm": "Together with Intelligence it is your business sense: how well you can guess what items are worth when trading",
  "statHelp.endurance": "Affects health, stamina (fatigue) and how fast you recover",
  "statHelp.luck": "Lucky hits and lucky blocks happen more often",

  // HUD windows
  "window.hint": "Click or press {key} to minimize · drag to move · right-click to reset position",
  "window.map": "Map",
  "window.inventory": "Inventory",
  "window.outfit": "Outfit",
  "window.stats": "Stats",
  "window.spellbook": "Spellbook",

  // trading (Q menu, trade window: src/ui/actionMenu.ts, src/ui/trade.ts)
  "actions.title": "Actions",
  "actions.tradeWith": "Trade with…",
  "actions.back": "Back",
  "actions.busy": "You are already trading.",
  "actions.nobody": "No bunny within {n} tiles. Walk closer to someone first.",
  "actions.tiles": "{n} tiles",
  "inv.silverHint": "Your money. Use it in trades (Q → Trade with…).",
  "trade.title": "Trade with {name}",
  "trade.close": "Close (cancels the trade)",
  "trade.silver": "Silver",
  "trade.yourInventory": "Your inventory",
  "trade.theirInventory": "Their inventory",
  "trade.give": "↓ You give (sell)",
  "trade.take": "↓ You get (buy)",
  "trade.giveSilver": "Silver you give",
  "trade.takeSilver": "Silver you want",
  "trade.offer": "Offer",
  "trade.counter": "Counter-offer",
  "trade.accept": "Accept",
  "trade.acceptChangedHint": "You changed their offer: send it back with Counter-offer, or undo your changes to accept it.",
  "trade.status.waiting": "Waiting for {name}…",
  "trade.status.first": "Drag what you sell and what you want into the lower boxes, then press Offer.",
  "trade.status.changed": "You changed the offer: press Counter-offer to send it back.",
  "trade.status.theirOffer": "{name} made an offer: accept it, or change it and send a counter-offer.",
  "trade.rowHint": "Drag it down (or double-click) to put it into the offer",
  "trade.rowOfferHint": "Drag it back up (or double-click / right-click) to take it out",
  "trade.dropGive": "Drag your items here",
  "trade.dropTake": "Drag their items here",
  "trade.popup.request": "{name} would like to trade with you.",
  "trade.popup.accept": "Accept",
  "trade.popup.reject": "Reject",
  "trade.popup.waitAnswer": "Waiting for {name} to answer…",
  "trade.popup.waitOffer": "Trading with {name}: waiting for their offer…",
  "trade.popup.cancel": "Cancel",
  "trade.end.done": "Trade with {name} done!",
  "trade.end.rejected": "{name} doesn't want to trade now.",
  "trade.end.cancelled": "{name} cancelled the trade.",
  "trade.end.tooFar": "You walked too far apart: the trade with {name} is cancelled.",
  "trade.end.attacked": "{name} was attacked: the trade is cancelled.",
  "trade.end.attackedMe": "You were attacked: the trade with {name} is cancelled.",
  "trade.end.knockedOut": "{name} was knocked out: the trade is cancelled.",
  "trade.end.knockedOutMe": "You were knocked out: the trade with {name} is cancelled.",
  "trade.end.left": "{name} left the game: the trade is cancelled.",
  "trade.end.expired": "{name} didn't answer the trade request.",
  "trade.end.busy": "{name} is trading with someone else right now.",
  "trade.end.unavailable": "{name} can't trade right now.",
  "trade.error.changed": "Their items or silver changed since the offer: it can't be accepted. Send a counter-offer instead.",
  "trade.error.invalid": "That offer isn't possible (some items or silver are missing).",
  "trade.giveWorth": "You offer: worth {range} 🪙",
  "trade.takeWorth": "You ask for: worth {range} 🪙",
  "trade.worthHint": "What you think it's all worth, silver included. Your guesses get better with business sense ({n}/{max}).",
  "trade.valueHint": "What you think it's worth (business sense {n}/{max})",
  "trade.valueHintEach": "What you think one of them is worth (business sense {n}/{max})",
  "trade.sense": "Business sense",
  "trade.senseHint": "Charm + Intelligence. The higher it is, the better you can guess what items are worth: at 20 you know it exactly, at 2 you have no clue (and may be completely wrong).",
  "stats.business": "Business sense",
  "help.trade.title": "Trading",
  "help.trade.body": `## Starting a trade
Walk up to another bunny (at most **7 tiles** away), press [Q], pick **Trade with…** and click their name. They get a popup at the top of the screen and can **Accept** or **Reject** it.

## Making offers
- The trade window shows both of you with your silver: your inventory on the left, theirs on the right.
- Drag your items down into **You give** and their items into **You get** (or double-click them). Drag a row back up, or double-click / right-click it, to take it out; − and + change how many of a stack.
- Type how much silver you give and how much you want.
- Whoever started the trade makes the first offer. Then it's the other bunny's turn: **Accept** the offer as it is, or change it and send a **Counter-offer**. You take turns until one of you accepts.
- Items you trade away also leave your hands and outfit.

## When a trade is cancelled
- Either of you closes the window (✕).
- You walk more than 7 tiles apart.
- Either of you is attacked or knocked out, or leaves the game.
- A request nobody answers expires after 30 seconds.

## What is it worth?
Every row shows what *you think* one piece is worth, like 20–40🪙, and under both lower boxes you see the guessed total of what you offer and what you ask for (silver included). How good your guesses are depends on your **business sense = Charm + Intelligence**: at 2 you have no clue at all and your guess may even miss the real price completely, around 10 you can tell treasure from garbage, and the closer you get to 20 the more exact you are. Your guesses are made when the trade starts and stay the same until it ends.

Every new bunny starts with **100 silver**; yours is shown under the inventory list.`,

  // inventory
  "inv.filter": "filter…",
  "inv.name": "Name",
  "inv.type": "Type",
  "inv.empty": "No items",
  "inv.equippedIn": "Equipped: {slot}",
  "inv.rowHint":
    "Click it, then Shift+E to wear it or Shift+1..N for a hotbar slot\nOr drag it onto a slot · double-click: selected hotbar slot\nRight-click: use (eat) · E: use the selected hotbar slot",

  // item types
  "type.weapon": "Weapon",
  "type.armor": "Armor",
  "type.clothes": "Clothes",
  "type.potion": "Potion",
  "type.food": "Food",
  "type.material": "Material",
  "type.quest": "Quest",
  "type.misc": "Misc.",

  // items (keys are the ids in ITEM_DEFS, shared/items.ts)
  "item.sword": "Sword",
  "item.wooden_shield": "Wooden shield",
  "item.straw_hat": "Straw hat",
  "item.linen_shirt": "Linen shirt",
  "item.leather_vest": "Leather vest",
  "item.work_trousers": "Work trousers",
  "item.old_boots": "Old boots",
  "item.belt": "Belt",
  "item.adventurers_belt": "Adventurer's belt",
  "item.gold_earring": "Gold earring",
  "item.silver_earring": "Silver earring",
  "item.carrot": "Carrot",
  "item.health_potion": "Health potion",
  "item.house_key": "House key",
  "item.unknown": "Unknown item",

  // outfit / hotbar slots
  "slot.earring": "Earring {n}",
  "slot.earringShort": "E{n}",
  "slot.head": "Hat / Helmet",
  "slot.headShort": "Hat",
  "slot.shirt": "Shirt",
  "slot.shirtShort": "Shirt",
  "slot.armor": "Upper armor",
  "slot.armorShort": "Armor",
  "slot.hand": "Hand {n}",
  "slot.handShort": "H{n}",
  "slot.belt": "Belt",
  "slot.beltShort": "Belt",
  "slot.trousers": "Trousers",
  "slot.trousersShort": "Pants",
  "slot.boots": "Boots",
  "slot.bootsShort": "Boots",
  "slot.pocket": "Belt pocket {n}",
  "slot.empty": "empty",
  "slot.hint": "{slot}: {item}\nDrag items here · drag out to move/swap · Shift+click or right-click to remove",

  // stats window and vitals
  "stats.hp": "HP",
  "stats.fatigue": "Fatigue",
  "stats.attack": "Attack",
  "stats.defense": "Defense",
  "stats.armor": "Armor",
  "stats.speed": "Speed",
  "stats.spellSlots": "Spell slots",
  "stats.spellSlotsHint": "The hotbar slots where your charged spells wait. More Intelligence gives you more of them.",
  "stats.spellTime": "Spell lasts",
  "stats.spellTimeHint": "How long a charged spell waits in its slot before it fades. Intelligence makes it last longer.",
  "stats.hunger": "Hunger",
  "stats.hpHint": "Health. Endurance gives you more.",
  "stats.fatigueHint":
    "Stamina for fighting: attacking and blocking tire you, it slowly comes back. Endurance gives you more and helps it come back faster.",
  "stats.attackHint": "How hard you hit. Depends on your weapon, Strength and Agility.",
  "stats.defenseHint": "How much a block stops. Depends on what you hold and your Agility.",
  "stats.armorHint": "Protection from what you wear. Softens every hit.",
  "stats.speedHint": "How fast you move. Agility makes you quicker; roads help, rough terrain slows you.",
  "stats.hungerHint":
    "How full you are. While you are not hungry you slowly heal (the fuller, the faster); when it runs low you start losing health. Eat to fill it.",
  "stats.note": "Blocking and armor soften the hits you take.",
  "vitals.hpHint": "Health",
  "vitals.fatigueHint": "Fatigue: attacking and blocking tire you; it slowly comes back",
  "vitals.hungerHint": "Hunger: eat to stay healthy (right-click food in the inventory, or E for the selected hotbar slot)",

  // combat effects
  "fx.words": "BAM!|POW!|POOF!",
  "fx.tooTired": "Too tired!",
  "fx.notHungry": "Not hungry!",
  "fx.bite": "Chomp!",
  "fx.emptyHand": "Hand 2 is empty",
  "fx.nothingHappens": "Nothing happens…",
  "shout.charge": "CHARGE!",
  "shout.aaa": "AAAAAAA!!!",
  "shout.retreat": "RETREAT!",
  "shout.run": "RUN FOR YOUR LIVES!",
  "shout.victory": "Victory is ours!",
  "shout.fineDay": "This was a fine day!",
  "shout.lostMen": "We lost many men, but we killed the monster.",
  "shout.triumph": "We triumphed again!",
  "enemy.king": "King Arthur",
  "fx.protected": "Not yet!",
  "life.knockedOut": "Knocked out! Back on your feet in {n}…",
  "life.protected": "Protected for {n} s, but you can't attack yet",

  // magic (shared/magic.ts, shared/runes.ts, src/ui/scroll.ts)
  "spell.fireball": "Fireball",
  "spell.fireball.desc": "Explodes on a tile and the 8 tiles around it. Intelligence makes it stronger; armor softens it.",
  "rune.ka": "Ka",
  "rune.ka.meaning": "create",
  "rune.ash": "Ash",
  "rune.ash.meaning": "fire",
  "rune.dom": "Dom",
  "rune.dom.meaning": "burst",
  "spell.healing": "Healing",
  "spell.healing.desc": "Heals every bunny standing on one tile, you too. Intelligence makes it heal more.",
  "rune.ul": "Ul",
  "rune.ul.meaning": "life",
  "rune.tor": "Tor",
  "rune.tor.meaning": "give",
  "rune.sel": "Sel",
  "rune.sel.meaning": "mend",
  "spell.necromancy": "Necromancy",
  "spell.necromancy.desc": "The dead body closest to you (within 2 tiles) rises as a zombie and serves you for 10 minutes. Not aimed: press its key next to a body.",
  "rune.mor": "Mor",
  "rune.mor.meaning": "death",
  "magic.scrollHint": "Draw the runes from top to bottom · let go of F to cast · right-click wipes the scroll",
  "magic.reading": "Reading the runes…",
  "magic.ready": "{spell}! Let go of F to cast it",
  "magic.unknown": "?",
  "magic.charged": "{spell}! Press {key} to use it",
  "magic.fail.empty": "The scroll is empty",
  "magic.fail.unreadable": "The runes are too smudged to read",
  "magic.fail.unknownRune": "You don't know that rune",
  "magic.fail.noSpell": "These runes make no spell",
  "magic.fail.busy": "Not now!",
  "magic.aimHint": "{spell}: click a tile to cast it there · right-click or Esc to cancel",
  "magic.tooFar": "Too far!",
  "magic.noBody": "No dead body close enough!",
  "army.none": "You have no undead to command",
  "army.aimHint": "Undead army: click a tile to send them there · walk up to them to call them back · right-click or Esc to cancel",
  "army.button": "Your undead army: {n} [N]\nPress N or click, then click a tile: they attack anybody on it or around it.\nWalk up to them to make them follow you again.",
  "slot.spell": "{spell} [{key}]: fades in {n} s\nPress {key} or click to aim it",
  "spellbook.pick": "Pick a spell to see how to cast it",
  "spellbook.howTo": "Draw on the scroll, top to bottom:",
  "spellbook.hint": "Hold F and draw a spell's runes on the scroll from top to bottom, then let go of F.",
  "spellbook.none": "You don't know any runes yet.",
  "spellbook.missing": "You don't know all of its runes yet",
  "fx.boom": "KABOOM!",

  "chat.placeholder": "Say something… (Enter: send · Esc: cancel)",

  // options
  "options.button": "Options",
  "options.title": "Options",
  "options.copyInvite": "Copy invite link",
  "options.copied": "Copied!",
  "options.inviteHint": "Send this link to friends so they can join your game.",
  "options.language": "Language",
  "options.exit": "Exit to main menu",
  "options.close": "Close",
  "options.blood": "Blood",
  "options.bloodHint": "How graphic hits look: from no blood at all to maximum splatter. Only changes what you see.",
  "blood.off": "Off",
  "blood.low": "Low blood",
  "blood.medium": "Medium",
  "blood.high": "High",
  "blood.max": "Maximum blood",

  // help (src/ui/help.ts). Markup: "## " heading, "- " bullet, **bold**, [Key], blank line = new paragraph
  "help.button": "Help (H)",
  "help.title": "Help",
  "help.controls.title": "Controls",
  "help.controls.body": `## Moving
Walk with [W] [A] [S] [D] or the arrow keys. Roads make you faster. Forests, hills, rivers, swamps and snowy summits slow you down, and nobody can swim across the sea. You can't walk through other bunnies or animals: everyone keeps about half a tile apart.

## Windows
- [M] map, [I] inventory (with your outfit), [K] stats, [P] spellbook: press the key or click the title bar to fold a window up, and again to open it.
- Drag a title bar to move its window. Right-click the title bar to put the window back in its usual place.
- [Esc] opens the options, [H] opens this help.

## Inventory
- Type in the filter box to search by name, or click a type icon to see only that kind of item. Click **Name** or **Type** to sort the list.
- Click an item to pick it; it turns gold.
- [Shift]+[E] wears the picked item in its matching outfit slot.
- [Shift]+[1], [Shift]+[2]… puts the picked item in that hotbar slot. Double-click puts it in the selected hotbar slot.
- Drag an item from the inventory or from any slot onto another slot. If the slot is taken, the two items swap. While dragging, a slot glows green if the item fits there and red if it doesn't.
- [Shift]+click or right-click a slot to take its item off.

## Hotbar
- Hotbar slots 1 and 2 are your two hands. A belt gives you extra pockets (the dashed slots).
- **Right-click** on the map uses what is in hand 2, toward the pointer: a weapon attacks, a shield blocks, food gets eaten.
- Press [1], [2]… or click a slot to select it. [E] uses the selected item, for example eats a carrot.
- You can also right-click food in the inventory to eat it.

## Hunger
The green hunger bar slowly empties. A well-fed bunny heals over time; a starving one loses health. Eat when it gets low, but you can't eat when you are already full.

## Magic
Hold [F] to open your magic scroll and draw runes on it; spells you charge appear in the [X] [C] [V] [B] slots. See the **Magic** topic. Press [N] to send your undead army (raised with Necromancy) to a tile.

## Trading
Press [Q], pick **Trade with…** and click a bunny's name (see the **Trading** topic).

## Chat
Press [T], type your message and press [Enter]. It pops up in a bubble over your bunny for everyone to see. [Esc] cancels.`,
  "help.combat.title": "Combat",
  "help.combat.body": `## Attacking
**Click** on the map to attack in that direction. **Right-click** uses your second hand instead: with a shield there it blocks, with a second weapon it attacks. The attack reaches about one tile and hits the bunnies in front of you. You can only swing a few times a second, so aim well.

## Blocking
Hold [Shift] and **click** to raise your guard toward that side for a moment. A block only stops attacks coming from the side you are guarding. Click again to keep the guard up.

## Damage
- Hits take health (HP). No numbers are shown: watch your HP bar and guess.
- The things in your hands decide your attack and defense: the best attack and the best defense of your two hands count, so a sword and a shield work well together. Empty paws hit very weakly.
- A block soaks up part of a hit. Armor you wear (vest, boots…) softens every hit, blocked or not.
- At 0 HP you are knocked out: your bunny lies there with x.x eyes for 10 seconds, then wakes up in the start town with full health. For the next 10 seconds nobody can hurt you (you blink), but you can't attack either.

## Fatigue
Attacking and blocking tire you out, and stopping a hit with a block costs a little extra. Fatigue comes back slowly by itself. When you are too tired you can't attack or block, and a tired defender can't stop a hit.

## Luck
Sometimes fortune smiles on you. A lucky attack hits harder (bigger burst) or even double (a "2x" badge). A lucky block stops the hit completely (bigger shield), and the luckiest blocks also exhaust the attacker. Several lucky things can happen at once.

## Rats
Rats wander the wild looking for food. Come within a few steps and they run at you and bite ("Chomp!"). They are weak: a couple of sword hits finish one, a block stops their bites, and they are slower than you, so you can always run away. They stay out of towns. A dead rat is soon replaced by another one somewhere else.

## Your stats in combat
- **Strength** makes your attacks stronger.
- **Agility** makes your blocks sturdier and helps your attacks a little.
- **Endurance** gives you more health and more fatigue, and lets you recover faster.
- **Luck** makes lucky hits and blocks happen more often.`,
  "help.stats.title": "Stats",
  "help.stats.body": `When you create your bunny, you spread 20 points over six stats, each between 1 and 10. There is no perfect build: a strong fighter, a quick runner, a tough survivor or a lucky rascal can all do well. You can see your stats any time in the Stats window ([K]).

## Strength
Raw power. Strength is the main source of your attack: the higher it is, the more every hit with your weapon hurts. It doesn't help you block or run. Choose it if you want to end fights quickly.

## Agility
Quickness and balance. Agility helps in three ways: you move faster everywhere on the map, your blocks get sturdier, and your attacks get a little stronger too. It is the most all-round stat, good for fighting and for exploring the big island.

## Intelligence
Cleverness, and the source of magic. Intelligence makes your spells stronger (the higher it is, the more a fireball hurts), gives you more spell slots on the hotbar (1 slot at first, 2 from Intelligence 3, 3 from 6, all 4 from 8) and lets charged spells wait longer before they fade. Choose it if you want to fight from a distance.

## Charm
Wit and good looks. It doesn't do anything yet either; it will also matter later.

## Endurance
Toughness. Endurance gives you more health and more fatigue, and makes your fatigue come back faster. A bunny with high Endurance survives long fights and can keep swinging and blocking when others are out of breath.

## Luck
Fortune. Luck makes lucky moments in combat happen more often: harder or double hits when you attack, and complete or even perfect blocks when you defend. With little Luck they are rare; with a lot they happen noticeably often.

## Bars and values
- **HP**: your health. At 0 you go back to the start town. Endurance raises it.
- **Fatigue**: your stamina for fighting. Endurance raises it and speeds up its recovery.
- **Hunger**: how full you are. Stay well fed to heal over time.
- **Attack** and **Defense**: come from what you hold in your hands, boosted by your stats.
- **Armor**: comes from everything you wear; it softens every hit.
- **Speed**: how fast you move. Agility helps; roads speed you up and rough terrain slows you down.`,
  "help.magic.title": "Magic",
  "help.magic.body": `## The magic scroll
Hold [F] and a big magic scroll opens in front of you. Only you can see it: everyone else just sees your bunny's eyes glow red and sparkle (and they will know something is coming). While the scroll is open you stand still.

## Drawing runes
- Draw a spell's runes with the mouse, **from top to bottom** in the right order. Where you draw them from left to right doesn't matter.
- Leave a little space between two runes so they don't touch from top to bottom; a rune can be made of several lines.
- The runes don't have to be perfect, just recognisable. Big or small, a bit crooked: it all works.
- **Right-click** wipes the scroll if you want to start again.
- Let go of [F] to read the scroll. For a moment it shows which rune it saw where (a "?" means it couldn't read that one).
- You can only use runes you know. In the **Spellbook** ([P]) pick a spell from the list to see its runes in order. The runes you know are at the bottom of this page.

## Spell slots
A spell that works goes into a free spell slot on the hotbar: [X], then [C], [V] and [B]. How many of these slots you have depends on your **Intelligence**: 1 at first, 2 from Intelligence 3, 3 from 6 and all 4 from 8. A spell waits in its slot for **1 minute plus 6 seconds per Intelligence point**, then fades away. Press the slot's key (or click it) to use it; each charge works once. If all your slots are full, a new spell replaces the one that would fade first. Getting knocked out drops your scroll and every charged spell.

## Fireball
Runes: **Ka** (create), **Ash** (fire), **Dom** (burst). Press its key and a target appears on the ground: move it with the mouse and **click** to throw. The fireball flies there and explodes on that tile and the 8 tiles around it, hurting everyone and everything standing there, **you too** if you are that close (when friendly fire is on), so keep your distance. It reaches about 8 tiles; the target turns red when it is too far. **Right-click** or [Esc] cancels.
- Its damage grows with your **Intelligence**. Armor softens it, but it can't be blocked with a shield.
- With friendly fire off, it doesn't hurt any bunny, you included.

## Healing
Runes: **Ul** (life, two parallel lines leaning like \\), **Tor** (give, a T) and **Sel** (mend, a long / with a short \\ against its lower half). Aim it like the fireball, but the target is a single tile: click to cast it on that tile. Every bunny standing there gets health back, and that includes you, so aim at your own tile to heal yourself.
- The more **Intelligence** you have, the more it heals. It never heals more than a bunny's full health.
- It works on friends and foes alike (but not on animals), and you can use it even while you are still protected after waking up.

## Necromancy
Runes: **Mor** (death, a post with a branch rising to the right), **Ul** (life) and **Ka** (create). It isn't aimed: stand next to a fallen rat or crusader (killed ones lie on the ground for a minute) and press its key. The closest body within 2 tiles rises as a zombie that serves you for **10 minutes**, then crumbles to dust. No body close enough: the spell stays in its slot.
- Your zombies follow you around. When you or one of them is attacked, they go for the attacker.
- Press [N] (or click the 🧟 button by the spell slots) and click a tile: your whole army marches there and attacks anybody on that tile or the 8 around it. They hold that place until you walk up to them; then they follow you again.
- A zombie fights as well as it did alive. Rats and crusaders fight zombies too, and a fallen zombie can be raised again.
- With friendly fire off, zombies never hurt bunnies or other bunnies' zombies. Bunnies walk through zombies, so your army can't box you in. If you leave the game, your zombies crumble.

## Your runes
These are the runes you know, with what they mean. A spell needs all of its runes.

{{runes}}`,
};

export type Dict = Record<keyof typeof en, string>;
