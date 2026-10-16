// English: the master dictionary. Every key used in the game must exist here; the other languages
// are type-checked against it (a missing key there is a compile error).
// Placeholders look like {name}. Lists are separated with "|".
export const en = {
  // start screen
  "lobby.namePlaceholder": "Your name",
  "lobby.create": "Create game",
  "lobby.join": "Join game",
  "lobby.joinFailed": "Could not join — the game may be full or closed.",
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
  "statHelp.intelligence": "Makes your spells stronger",
  "statHelp.charm": "Will matter later",
  "statHelp.endurance": "Affects health, stamina (fatigue) and how fast you recover",
  "statHelp.luck": "Lucky hits and lucky blocks happen more often",

  // HUD windows
  "window.hint": "Click or press {key} to minimize · drag to move · right-click to reset position",
  "window.map": "Map",
  "window.inventory": "Inventory",
  "window.outfit": "Outfit",
  "window.stats": "Stats",
  "window.spellbook": "Spellbook",

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
  "magic.scrollHint": "Draw the runes from top to bottom · let go of F to cast · right-click wipes the scroll",
  "magic.reading": "Reading the runes…",
  "magic.unknown": "?",
  "magic.charged": "{spell}! Press {key} to use it",
  "magic.fail.empty": "The scroll is empty",
  "magic.fail.unreadable": "The runes are too smudged to read",
  "magic.fail.unknownRune": "You don't know that rune",
  "magic.fail.noSpell": "These runes make no spell",
  "magic.fail.busy": "Not now!",
  "magic.aimHint": "{spell}: click a tile to throw it · right-click or Esc to cancel",
  "magic.tooFar": "Too far!",
  "slot.spell": "{spell} [{key}]: fades in {n} s\nPress {key} or click to aim it",
  "spellbook.spells": "Spells",
  "spellbook.runes": "Known runes",
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
- [M] map, [I] inventory, [O] outfit, [K] stats, [P] spellbook: press the key or click the title bar to fold a window up, and again to open it.
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
Hold [F] to open your magic scroll and draw runes on it; spells you charge appear in the [X] [C] [V] [B] slots. See the **Magic** topic.

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
Cleverness, and the source of magic. Intelligence makes your spells stronger: the higher it is, the more a fireball hurts. Choose it if you want to fight from a distance.

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
- You can only use runes you know. The **Spellbook** ([P]) shows your runes and the spells you can make with them.

## Spell slots
A spell that works goes into a spell slot on the hotbar: [X], then [C], [V] and [B]. It waits there for **1 minute**, then fades away. Press the slot's key (or click it) to use it; each charge works once. If all four are full, a new spell replaces the one that would fade first. Getting knocked out drops your scroll and every charged spell.

## Fireball
Runes: **Ka** (create), **Ash** (fire), **Dom** (burst). Press its key and a target appears on the ground: move it with the mouse and **click** to throw. The fireball flies there and explodes on that tile and the 8 tiles around it, hurting everyone and everything standing there (except you). It reaches about 8 tiles; the target turns red when it is too far. **Right-click** or [Esc] cancels.
- Its damage grows with your **Intelligence**. Armor softens it, but it can't be blocked with a shield.
- With friendly fire off, it doesn't hurt other bunnies.`,
};

export type Dict = Record<keyof typeof en, string>;
