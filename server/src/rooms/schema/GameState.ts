import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";

/**
 * One owned item. Only the definition id and the quantity are stored and synced; the name, icon,
 * stats etc. come from ITEM_DEFS in shared/items.ts (see itemView there).
 */
export class Item extends Schema {
  @type("string") id = ""; // instance id, unique per player
  @type("string") defId = ""; // e.g. "sword"
  @type("number") quantity = 1;
}

/** A spell charged by drawing its runes on the magic scroll, waiting in a hotbar spell slot (shared/magic.ts). */
export class ChargedSpell extends Schema {
  @type("string") spell = "fireball";
  @type("number") secondsLeft = 0; // whole seconds until it fades away unused

  until = 0; // server only: when it fades away
}

/** The six base stats chosen at character creation (1-10 each, see shared/stats.ts). */
export class Stats extends Schema {
  @type("number") strength = 1;
  @type("number") agility = 1;
  @type("number") intelligence = 1;
  @type("number") charm = 1;
  @type("number") endurance = 1;
  @type("number") luck = 1;
}

/** One bunny in the world. Every field marked with @type is synced to all clients automatically. */
export class Player extends Schema {
  @type("string") name = "Bunny";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") color = 0xffffff;
  @type("string") facing: "up" | "down" | "left" | "right" = "down";
  @type("boolean") moving = false;
  @type([Item]) inventory = new ArraySchema<Item>();
  @type({ map: "string" }) equipment = new MapSchema<string>(); // slot id -> item id (shared/equipment.ts)
  @type(Stats) stats = new Stats();
  @type("number") hp = 0;
  @type("number") maxHp = 0;
  @type("number") fatigue = 0; // spent by attacking / blocking, regenerates (shared/combat.ts)
  @type("number") maxFatigue = 0;
  @type("number") speed = 200; // movement px/s on normal ground (base + 3% per Agility)
  @type("number") hunger = 50; // 0-50, 50 = full (shared/survival.ts)
  @type("number") respawnIn = 0; // knocked out: whole seconds until waking up (0 = alive)
  @type("number") protectedFor = 0; // just woke up: whole seconds of protection left (can't hurt / be hurt)
  @type("boolean") casting = false; // the magic scroll is open: everyone sees the eyes glow red
  @type(["string"]) runes = new ArraySchema<string>(); // runes this bunny knows (shared/runes.ts)
  @type({ map: ChargedSpell }) spells = new MapSchema<ChargedSpell>(); // spell slot ("X", "C", "V", "B") -> charged spell

  // Server-only combat bookkeeping (no @type, so not sent to clients)
  lastAttackAt = 0;
  lastDefendAt = 0;
  blockUntil = 0;
  blockAngle = 0;
  fatigueRegenMs = 0; // time collected toward the next regenerated point
  fatigueRegenEveryMs = 2000; // set from Endurance on join (shared/stats.ts)
  hungerDecayMs = 0; // time collected toward the next hunger point lost
  hpChange = 0; // fractional HP collected from hunger (regeneration or starvation)
  lastChatAt = 0;
  deadUntil = 0; // knocked out until this time (0 = alive)
  protectedUntil = 0; // can't be hurt and can't attack until this time
  lastCastAt = 0; // last time a scroll was read (rate limit)
}

/**
 * An enemy: "rat", a crusader ("king" / "knight"), or a zombie raised with Necromancy ("zrat", "zknight",
 * "zking", serving the bunny `owner`), see shared/enemies.ts. Positions are whole pixels to keep updates small.
 */
export class Enemy extends Schema {
  @type("string") kind = "rat";
  @type("string") owner = ""; // zombies: the session id of the bunny they serve
  @type("number") x = 0;
  @type("number") y = 0;
  @type("boolean") faceLeft = false;
  @type("number") hp = 0;

  // Server-only AI state (server/src/rats.ts)
  fx = 0; // exact position (x / y above are rounded)
  fy = 0;
  dirX = 0; // current walking direction (0, 0 = resting)
  dirY = 0;
  until = 0; // when to pick a new direction / rest (zombies: when they crumble)
  target = ""; // session id of the bunny it is chasing ("" = none)
  lastBiteAt = 0;
  band = -1; // crusaders: which band it marches with (server/src/crusaders.ts)
  shoutAt = 0; // crusaders: when it may shout again (or when to say `pendingShout`)
  pendingShout = ""; // crusaders: a line to say at `shoutAt` (victory cheers, one after the other)
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("boolean") friendlyFire = true; // chosen when the room is created: can bunnies hurt each other?
  @type({ map: Enemy }) enemies = new MapSchema<Enemy>();
}
