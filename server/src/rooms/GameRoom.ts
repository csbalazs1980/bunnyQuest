import { Client, Room } from "colyseus";
import { ChargedSpell, Enemy, GameState, Item, Player } from "./schema/GameState.js";
import { Rats } from "../rats.js";
import { Crusaders } from "../crusaders.js";
import { Zombies } from "../zombies.js";
import { creationProblem, damage, derive, fatigueRegenMs, maxFatigue, maxHp, moveSpeed, STATS, type Stats } from "../../../shared/stats.js";
import {
  ATTACK_COOLDOWN_MS,
  ATTACK_WORD_COUNT,
  attackHits,
  blockFaces,
  cleanAim,
  DAMAGE_ENABLED,
  DEFEND_COOLDOWN_MS,
  DEFEND_MS,
  FATIGUE_COST,
  hitDamage,
  NO_BLOCK_LUCK,
  JOIN_PROTECTION_MS,
  RESPAWN_DELAY_MS,
  SPAWN_PROTECTION_MS,
  rollAttackLuck,
  rollBlockLuck,
  type AttackLuck,
  type CombatFx,
} from "../../../shared/combat.js";
import { World, type Body, type MapData } from "../../../shared/world.js";
import { itemView, STARTER_EQUIPMENT, starterInstances } from "../../../shared/items.js";
import { heldAndWorn, normalize, place, remove, type Equipment, type EquipItem } from "../../../shared/equipment.js";
import { CHAT_COOLDOWN_MS, cleanChat } from "../../../shared/chat.js";
import { HUNGER_AFTER_RESPAWN, HUNGER_DECAY_MS, HUNGER_MAX, HUNGER_START, hpPerSecond } from "../../../shared/survival.js";
import { ARMY, baseKind, CORPSE_MS, isZombie, RAT, type LivingKind } from "../../../shared/enemies.js";
import { readRunes, unpackStrokes } from "../../../shared/runes.js";
import {
  CAST_COOLDOWN_MS,
  fireballFlightMs,
  fireballPower,
  healAmount,
  inArea,
  inBlast,
  inSpellRange,
  NECROMANCY,
  SPELLS,
  spellChargeMs,
  spellSlotsFor,
  spellOf,
  STARTER_RUNES,
  type CastFail,
  type SpellSlot,
} from "../../../shared/magic.js";
import mapJson from "../../../shared/map.json" with { type: "json" };

const TICK_RATE = 20; // server simulation ticks per second
const world = new World(mapJson as MapData);

type Input = { left: boolean; right: boolean; up: boolean; down: boolean };

const COLORS = [0xffffff, 0xf5c98a, 0xb0b0b0, 0x8a6a4a, 0xf2a7c3, 0xa7d8f2, 0xc8f2a7, 0xe0c0ff];

export class GameRoom extends Room<GameState> {
  maxClients = 16;
  private inputs = new Map<string, Input>();
  private rats!: Rats;
  private crusaders!: Crusaders;
  private zombies!: Zombies;
  /** Bodies of killed enemies (by the enemy's id), which Necromancy can raise until `until`. */
  private corpses = new Map<string, { kind: LivingKind; x: number; y: number; until: number }>();

  onCreate(options: { friendlyFire?: boolean }) {
    this.setState(new GameState());
    this.state.friendlyFire = options?.friendlyFire !== false; // the creator's choice, fixed for the room's life
    this.rats = new Rats(world, this.state.enemies, (ratId, rat, targetId) => this.ratBite(ratId, rat, targetId));
    this.crusaders = new Crusaders(
      world,
      this.state.enemies,
      (id, e, targetId, _target, attack) => this.crusaderSwing(id, e, targetId, attack),
      (id, line) => this.broadcast("fx", { kind: "shout", id, line } satisfies CombatFx)
    );
    this.zombies = new Zombies(
      world,
      this.state.enemies,
      (id, z, targetId, attack) => this.zombieStrike(id, z, targetId, attack),
      (id, z) => this.broadcast("fx", { kind: "crumble", id, x: z.x, y: z.y } satisfies CombatFx)
    );

    this.onMessage("input", (client, input: Input) => {
      this.inputs.set(client.sessionId, {
        left: !!input.left,
        right: !!input.right,
        up: !!input.up,
        down: !!input.down,
      });
    });

    // Outfit / hotbar: put one of your items into a slot (moves or swaps if needed), or empty a slot.
    // The rules are in shared/equipment.ts, the same code the client uses for instant feedback.
    this.onMessage("equip", (client, msg: { itemId: string; slotId: string }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || typeof msg?.itemId !== "string" || typeof msg?.slotId !== "string") return;
      const next = place(equipmentOf(p), equipItemsOf(p), msg.itemId, msg.slotId);
      if (next) setEquipment(p, next);
    });
    // Chat: a short text shown in a speech bubble over the speaker (cleaned and rate-limited here)
    this.onMessage("chat", (client, msg: { text: string }) => {
      const p = this.state.players.get(client.sessionId);
      const now = Date.now();
      const text = cleanChat(msg?.text);
      if (!p || !text || now - p.lastChatAt < CHAT_COOLDOWN_MS) return;
      p.lastChatAt = now;
      this.broadcast("chat", { id: client.sessionId, text }, { except: client }); // the sender already shows it
    });

    // Use an item: for now that means eating food (fills hunger, uses up one from the stack)
    this.onMessage("use", (client, msg: { itemId: string }) => {
      const p = this.state.players.get(client.sessionId);
      const index = p ? p.inventory.findIndex((it) => it.id === msg?.itemId) : -1;
      if (!p || index < 0 || p.deadUntil) return; // knocked-out bunnies can't eat
      const item = p.inventory[index];
      const food = itemView(item.id, item.defId, item.quantity).food;
      if (food <= 0 || p.hunger >= HUNGER_MAX) return; // not eatable, or not hungry
      p.hunger = Math.min(HUNGER_MAX, p.hunger + food);
      item.quantity -= 1;
      if (item.quantity <= 0) {
        p.inventory.splice(index, 1);
        setEquipment(p, normalize(equipmentOf(p), equipItemsOf(p))); // empty its hotbar slot
      }
    });
    this.onMessage("unequip", (client, msg: { slotId: string }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || typeof msg?.slotId !== "string") return;
      setEquipment(p, remove(equipmentOf(p), equipItemsOf(p), msg.slotId));
    });

    // Combat: click = attack, Shift+click = block, both toward the pointer. Both cost fatigue.
    // The server rate-limits them, finds who gets hit, and tells everyone (no damage yet).
    this.onMessage("attack", (client, msg: { angle: number; dist: number; word: number; seq: number }) => {
      const p = this.state.players.get(client.sessionId);
      const aim = cleanAim(msg?.angle, msg?.dist);
      const now = Date.now();
      if (!p || !aim || now - p.lastAttackAt < ATTACK_COOLDOWN_MS - 30) return; // 30 ms slack for network jitter
      if (p.deadUntil || p.protectedUntil > now) return; // knocked out, or just woke up (protected)
      if (p.fatigue < FATIGUE_COST.attack) return; // too tired
      p.lastAttackAt = now;
      p.fatigue -= FATIGUE_COST.attack;

      // Luck is rolled here on the server (so it can't be cheated) and sent to everyone, the attacker too
      const luck = rollAttackLuck(p.stats.luck);
      // Which comic word (BAM!/POW!/POOF!) to show; each player sees it in their own language
      const word = Number.isInteger(msg?.word) && msg.word >= 0 && msg.word < ATTACK_WORD_COUNT ? msg.word : 0;
      const seq = Number.isInteger(msg?.seq) ? msg.seq : 0;
      this.broadcast("fx", { kind: "attack", id: client.sessionId, ...aim, word, seq, ...luck } satisfies CombatFx);

      // Who is in reach? Other bunnies (they may block) and rats (they can't).
      const attack = combatOf(p).attack;
      this.state.players.forEach((target, targetId) => {
        if (!this.state.friendlyFire) return; // friendly fire off: bunnies can't hurt each other
        if (targetId === client.sessionId || !attackHits(p, aim.angle, target)) return;
        if (target.deadUntil || target.protectedUntil > now) return; // can't hurt them (knocked out / protected)
        this.strike(client.sessionId, p, attack, luck, targetId, target, () => (p.fatigue = Math.floor(p.fatigue / 2)));
      });
      this.state.enemies.forEach((rat, ratId) => {
        if (!attackHits(p, aim.angle, rat) || !this.canHarm(client.sessionId, ratId)) return; // (not your own zombies)
        const dmg = hitDamage(attack, luck, 0, 0, false, NO_BLOCK_LUCK, damage);
        const bleed = DAMAGE_ENABLED && dmg > 0;
        this.broadcast("fx", { kind: "hit", id: ratId, by: client.sessionId, bleed } satisfies CombatFx);
        this.hurtEnemy(ratId, dmg, client.sessionId, now);
      });
    });
    this.onMessage("defend", (client, msg: { angle: number }) => {
      const p = this.state.players.get(client.sessionId);
      const aim = cleanAim(msg?.angle, 0);
      const now = Date.now();
      if (!p || !aim || now - p.lastDefendAt < DEFEND_COOLDOWN_MS - 30) return;
      if (p.deadUntil) return; // knocked out
      if (p.fatigue < FATIGUE_COST.defend) return; // too tired
      p.lastDefendAt = now;
      p.fatigue -= FATIGUE_COST.defend;
      p.blockUntil = now + DEFEND_MS;
      p.blockAngle = aim.angle;
      const fx: CombatFx = { kind: "defend", id: client.sessionId, angle: aim.angle };
      this.broadcast("fx", fx, { except: client });
    });

    // Magic (shared/magic.ts, shared/runes.ts): holding F opens the scroll (the bunny stands still and
    // its eyes glow for everyone); letting go sends the drawing, which is read here so nobody can cheat.
    this.onMessage("scroll", (client, msg: { open: boolean }) => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.casting = !!msg?.open && !p.deadUntil;
    });
    this.onMessage("cast", (client, msg: { strokes: unknown }) => this.readScroll(client, msg?.strokes));
    // Use a charged spell on a tile: the fireball is thrown there, healing heals whoever stands there
    this.onMessage("spell", (client, msg: { slot: string; tx: number; ty: number }) => {
      const p = this.state.players.get(client.sessionId);
      const now = Date.now();
      if (!p || p.deadUntil) return; // knocked out
      const charged = typeof msg?.slot === "string" ? p.spells.get(msg.slot) : undefined;
      const { tx, ty } = msg ?? {};
      if (!charged || !Number.isInteger(tx) || !Number.isInteger(ty)) return;
      const spell = SPELLS[charged.spell as keyof typeof SPELLS];
      if (!spell || (spell.hostile && p.protectedUntil > now)) return; // just woke up: no attacking yet
      if (charged.spell === "necromancy") return this.raiseDead(client, p, msg.slot, now); // not aimed
      if (tx < 0 || ty < 0 || tx >= world.map.rows[0].length || ty >= world.map.rows.length) return;
      if (!inSpellRange(p.x, p.y, tx, ty)) return; // (the client checks this too, with the same rule)
      p.spells.delete(msg.slot); // one charge, one cast
      if (charged.spell === "fireball") this.throwFireball(client.sessionId, p, tx, ty);
      else if (charged.spell === "healing") this.heal(client.sessionId, p, tx, ty);
    });

    // The undead army (N): all your zombies go to a tile and attack anybody there or around it
    this.onMessage("order", (client, msg: { tx: number; ty: number }) => {
      const p = this.state.players.get(client.sessionId);
      const { tx, ty } = msg ?? {};
      if (!p || p.deadUntil || !Number.isInteger(tx) || !Number.isInteger(ty)) return;
      if (tx < 0 || ty < 0 || tx >= world.map.rows[0].length || ty >= world.map.rows.length) return;
      if (!inSpellRange(p.x, p.y, tx, ty, ARMY.orderRange)) return;
      this.zombies.order(client.sessionId, tx, ty);
    });

    // Server is authoritative: it moves everyone based on their latest input.
    this.setSimulationInterval((dt) => this.update(dt / 1000), 1000 / TICK_RATE);
    this.setPatchRate(1000 / TICK_RATE);
  }

  onJoin(client: Client, options: { name?: string; stats?: Stats }) {
    // Character creation: the stats must follow the rules (1-10 each, exactly 20 points)
    const problem = creationProblem(options?.stats);
    if (problem) throw new Error(`Invalid character: ${problem}`); // the join is refused

    const p = new Player();
    p.name = (options?.name || "Bunny").slice(0, 16);
    for (const { key } of STATS) p.stats[key] = options.stats![key];
    p.maxHp = maxHp(options.stats!);
    p.hp = p.maxHp;
    p.maxFatigue = maxFatigue(options.stats!);
    p.fatigue = p.maxFatigue;
    p.speed = moveSpeed(options.stats!);
    p.fatigueRegenEveryMs = fatigueRegenMs(options.stats!);
    p.hunger = HUNGER_START;
    const spawn = world.spawnPoint();
    p.x = spawn.x;
    p.y = spawn.y;
    p.color = COLORS[this.state.players.size % COLORS.length];
    for (const { id, defId, quantity } of starterInstances()) {
      const item = new Item();
      item.id = id;
      item.defId = defId;
      item.quantity = quantity;
      p.inventory.push(item);
    }
    for (const rune of STARTER_RUNES) p.runes.push(rune);
    for (const [slot, defId] of Object.entries(STARTER_EQUIPMENT)) {
      const item = p.inventory.find((it) => it.defId === defId);
      if (item) p.equipment.set(slot, item.id);
    }
    // Friendly fire on: new bunnies get a few safe seconds (they blink, and can't attack yet either)
    if (this.state.friendlyFire) {
      p.protectedUntil = Date.now() + JOIN_PROTECTION_MS;
      p.protectedFor = Math.ceil(JOIN_PROTECTION_MS / 1000);
    }
    this.state.players.set(client.sessionId, p);
    console.log(`[${this.roomId}] ${p.name} joined (${this.clients.length}/${this.maxClients})`);
  }

  onLeave(client: Client) {
    this.zombies.disband(client.sessionId); // nobody to serve: they crumble
    this.state.players.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
  }

  /**
   * Reads a drawing from the magic scroll. If it spells something the bunny knows, the spell goes into
   * the first free spell slot the bunny has (X, C, V, B: how many depends on Intelligence); all full:
   * the one that would fade first is replaced. It waits 1 minute + 6 s per Intelligence point.
   * The caster gets the reading back either way, so the scroll can show which runes it saw.
   */
  private readScroll(client: Client, raw: unknown) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    p.casting = false;
    const now = Date.now();
    const reply = (fail: CastFail | null, guesses: ReturnType<typeof readRunes> = [], spell?: string, slot?: string) =>
      client.send("castResult", {
        fail,
        spell,
        slot,
        runes: guesses.map((g) => ({ rune: g.rune, top: g.top, bottom: g.bottom })),
      });
    if (p.deadUntil || now - p.lastCastAt < CAST_COOLDOWN_MS) return reply("busy");
    p.lastCastAt = now;
    const strokes = unpackStrokes(raw);
    if (!strokes) return reply("unreadable");
    const guesses = readRunes(strokes);
    if (!guesses.length) return reply("empty", guesses);
    if (guesses.some((g) => !g.rune)) return reply("unreadable", guesses);
    if (guesses.some((g) => !p.runes.includes(g.rune!))) return reply("unknownRune", guesses);
    const spell = spellOf(guesses.map((g) => g.rune));
    if (!spell) return reply("noSpell", guesses);

    const slots = spellSlotsFor(p.stats.intelligence);
    let slot: SpellSlot | undefined = slots.find((s) => !p.spells.has(s));
    if (!slot) {
      // All of them are charged: replace the one closest to fading away
      slot = slots.reduce((a, b) => (p.spells.get(a)!.until <= p.spells.get(b)!.until ? a : b));
    }
    const charged = new ChargedSpell();
    const ms = spellChargeMs(p.stats.intelligence);
    charged.spell = spell;
    charged.until = now + ms;
    charged.secondsLeft = Math.ceil(ms / 1000);
    p.spells.set(slot, charged);
    reply(null, guesses, spell, slot);
  }

  /**
   * A fireball flies to tile (tx, ty) and explodes there and on the 8 tiles around it. Everyone sees it
   * fly; the damage (2 + the caster's Intelligence, minus each target's armor; it can't be blocked)
   * happens when it lands. With friendly fire on it hurts the caster too if they stand in the blast.
   */
  private throwFireball(casterId: string, p: Player, tx: number, ty: number) {
    const ms = fireballFlightMs(p.x, p.y, tx, ty);
    this.broadcast("fx", { kind: "fireball", id: casterId, x: Math.round(p.x), y: Math.round(p.y), tx, ty, ms } satisfies CombatFx);
    const power = fireballPower(p.stats.intelligence); // the caster's Intelligence when casting counts
    this.clock.setTimeout(() => {
      const now = Date.now();
      this.state.players.forEach((target, targetId) => {
        if (!this.state.friendlyFire) return; // friendly fire off: bunnies are safe, the caster too
        if (target.deadUntil || target.protectedUntil > now || !inBlast(target.x, target.y, tx, ty)) return;
        const dmg = damage(power, 0, combatOf(target).armor, false);
        this.broadcast("fx", { kind: "hit", id: targetId, by: casterId, bleed: DAMAGE_ENABLED && dmg > 0 } satisfies CombatFx);
        this.applyDamage(target, targetId, dmg);
      });
      this.state.enemies.forEach((e, id) => {
        if (!inBlast(e.fx, e.fy, tx, ty) || !this.canHarm(casterId, id)) return; // your own zombies are spared
        const dmg = damage(power, 0, 0, false); // enemies wear no armor
        this.broadcast("fx", { kind: "hit", id, by: casterId, bleed: DAMAGE_ENABLED && dmg > 0 } satisfies CombatFx);
        this.hurtEnemy(id, dmg, casterId, now);
      });
    }, ms);
  }

  /**
   * Healing on tile (tx, ty): every bunny standing there that isn't knocked out (the caster too) gets back
   * 5 + 2 × the caster's Intelligence HP, up to its maximum. Animals aren't healed.
   */
  private heal(casterId: string, p: Player, tx: number, ty: number) {
    const amount = healAmount(p.stats.intelligence);
    const healed: string[] = [];
    this.state.players.forEach((target, id) => {
      if (target.deadUntil || !inArea(target.x, target.y, tx, ty, SPELLS.healing.radius)) return;
      target.hp = Math.min(target.maxHp, target.hp + amount);
      healed.push(id);
    });
    this.broadcast("fx", { kind: "heal", id: casterId, tx, ty, healed } satisfies CombatFx);
  }

  /**
   * Necromancy: the dead body closest to the caster (within NECROMANCY.reach) rises as a zombie serving
   * the caster. No body in reach: the spell stays charged and the caster is told so.
   */
  private raiseDead(client: Client, p: Player, slot: string, now: number) {
    let best: string | undefined;
    let bestDist = NECROMANCY.reach + 16; // a little slack: the client checked with the position it sees
    this.corpses.forEach((c, id) => {
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d <= bestDist) (bestDist = d), (best = id);
    });
    if (!best) return client.send("spellFail", { reason: "noBody" });
    const body = this.corpses.get(best)!;
    this.corpses.delete(best);
    p.spells.delete(slot);
    const zombie = this.zombies.raise(client.sessionId, body.kind, body.x, body.y, now);
    this.broadcast("fx", { kind: "raise", id: client.sessionId, corpse: best, zombie } satisfies CombatFx);
  }

  /**
   * May `attackerId` (a bunny, or the master of a zombie) hurt `targetId`? Never itself or its own
   * zombies; other bunnies and their zombies only with friendly fire on, and only bunnies that can be hurt
   * right now; animals and crusaders always.
   */
  private canHarm(attackerId: string, targetId: string, now = Date.now()): boolean {
    if (targetId === attackerId) return false;
    const p = this.state.players.get(targetId);
    if (p) return this.state.friendlyFire && !p.deadUntil && p.protectedUntil <= now;
    const e = this.state.enemies.get(targetId);
    if (!e) return false;
    if (isZombie(e.kind)) return e.owner !== attackerId && this.state.friendlyFire;
    return true;
  }

  /** The bunny behind an attacker: a zombie's master, else the attacker itself. */
  private masterOf(id: string): string {
    const e = this.state.enemies.get(id);
    return e && isZombie(e.kind) ? e.owner : id;
  }

  /**
   * Takes HP from an enemy (rat, crusader or zombie) hit by `byId`. A killed one leaves a body that
   * Necromancy can raise for CORPSE_MS. A zombie that survives calls its army to fight back.
   */
  private hurtEnemy(id: string, dmg: number, byId: string, now: number) {
    const e = this.state.enemies.get(id);
    if (!e || !DAMAGE_ENABLED) return;
    const { kind, fx, fy, owner } = e;
    const died = isZombie(kind) ? this.zombies.hurt(id, dmg) : kind === "rat" ? this.rats.hurt(id, dmg) : this.crusaders.hurt(id, dmg, now);
    if (died) {
      this.corpses.set(id, { kind: baseKind(kind), x: fx, y: fy, until: now + CORPSE_MS });
      this.broadcast("fx", { kind: "death", id } satisfies CombatFx);
    } else if (isZombie(kind)) {
      this.zombies.provoke(owner, byId, this.canHarm(owner, byId, now) && this.masterOf(byId) !== owner, id);
    }
  }

  /** A rat, crusader or zombie hits an enemy (no blocks, no armor). */
  private hitEnemy(byId: string, targetId: string, attack: number) {
    const dmg = damage(attack, 0, 0, false);
    this.broadcast("fx", { kind: "hit", id: targetId, by: byId, bleed: DAMAGE_ENABLED && dmg > 0 } satisfies CombatFx);
    this.hurtEnemy(targetId, dmg, byId, Date.now());
  }

  /** A zombie attacks a bunny or an enemy: a bite (rats) or a sword swing (knights), then the usual hit or block. */
  private zombieStrike(id: string, z: Enemy, targetId: string, attack: number) {
    const target = this.state.players.get(targetId);
    const pos = target ?? this.state.enemies.get(targetId);
    if (!pos) return;
    const angle = Math.atan2(pos.y - z.fy, pos.x - z.fx);
    if (baseKind(z.kind) === "rat") this.broadcast("fx", { kind: "bite", id, angle } satisfies CombatFx);
    else {
      const word = Math.floor(Math.random() * ATTACK_WORD_COUNT);
      this.broadcast("fx", { kind: "attack", id, angle, dist: 34, word, seq: 0, double: false, bonus: false } satisfies CombatFx);
    }
    if (target) this.strike(id, { x: z.fx, y: z.fy }, attack, { double: false, bonus: false }, targetId, target);
    else this.hitEnemy(id, targetId, attack);
  }

  /** Charged spells fade away after spellChargeMs(Intelligence); the synced whole seconds only change once a second. */
  private updateSpells(p: Player, now: number) {
    const gone: string[] = [];
    p.spells.forEach((c, slot) => {
      if (now >= c.until) gone.push(slot);
      else {
        const s = Math.ceil((c.until - now) / 1000);
        if (c.secondsLeft !== s) c.secondsLeft = s;
      }
    });
    gone.forEach((slot) => p.spells.delete(slot));
  }

  /**
   * One hit on a bunny, from another bunny or a rat. A block facing the attacker reduces it (or with
   * luck stops it) if the defender can pay the fatigue; a perfect block calls `onPerfectBlock`.
   */
  private strike(byId: string, by: { x: number; y: number }, attack: number, luck: AttackLuck, targetId: string, target: Player, onPerfectBlock?: () => void) {
    // The bunny's zombies (if it has any) go for the attacker
    this.zombies.provoke(targetId, byId, this.canHarm(targetId, byId) && this.masterOf(byId) !== targetId);
    const t = combatOf(target);
    const blocking = target.blockUntil > Date.now() && blockFaces(target, target.blockAngle, by);
    if (blocking && target.fatigue >= FATIGUE_COST.successfulDefense) {
      target.fatigue -= FATIGUE_COST.successfulDefense;
      const blockLuck = rollBlockLuck(target.stats.luck);
      if (blockLuck.perfect) onPerfectBlock?.(); // the attacker is thrown off balance
      const dmg = hitDamage(attack, luck, t.defense, t.armor, true, blockLuck, damage);
      this.broadcast("fx", { kind: "blocked", id: targetId, by: byId, luck: blockLuck, bleed: DAMAGE_ENABLED && dmg > 0 } satisfies CombatFx);
      this.applyDamage(target, targetId, dmg);
    } else {
      const dmg = hitDamage(attack, luck, t.defense, t.armor, false, NO_BLOCK_LUCK, damage);
      this.broadcast("fx", { kind: "hit", id: targetId, by: byId, bleed: DAMAGE_ENABLED && dmg > 0 } satisfies CombatFx);
      this.applyDamage(target, targetId, dmg);
    }
  }

  /** A rat bites a bunny or a zombie next to it (rats have no luck and can't be thrown off balance). */
  private ratBite(ratId: string, rat: Enemy, targetId: string) {
    const target = this.state.players.get(targetId);
    const pos = target ?? this.state.enemies.get(targetId);
    if (!pos) return;
    const angle = Math.atan2(pos.y - rat.fy, pos.x - rat.fx);
    this.broadcast("fx", { kind: "bite", id: ratId, angle } satisfies CombatFx);
    if (target) this.strike(ratId, { x: rat.fx, y: rat.fy }, RAT.attack, { double: false, bonus: false }, targetId, target);
    else this.hitEnemy(ratId, targetId, RAT.attack);
  }

  /** A crusader swings his sword at a bunny or a zombie: a comic burst like a bunny's attack, then the usual hit or block. */
  private crusaderSwing(id: string, e: Enemy, targetId: string, attack: number) {
    const target = this.state.players.get(targetId);
    const pos = target ?? this.state.enemies.get(targetId);
    if (!pos) return;
    const angle = Math.atan2(pos.y - e.fy, pos.x - e.fx);
    const word = Math.floor(Math.random() * ATTACK_WORD_COUNT);
    this.broadcast("fx", { kind: "attack", id, angle, dist: 34, word, seq: 0, double: false, bonus: false } satisfies CombatFx);
    if (target) this.strike(id, { x: e.fx, y: e.fy }, attack, { double: false, bonus: false }, targetId, target);
    else this.hitEnemy(id, targetId, attack);
  }

  /** Takes HP (if damage is enabled); at 0 HP the bunny is knocked out. */
  private applyDamage(p: Player, id: string, dmg: number) {
    if (!DAMAGE_ENABLED || dmg <= 0 || p.deadUntil) return;
    p.hp = Math.max(0, p.hp - dmg);
    if (p.hp <= 0) this.knockOut(p, id);
  }

  /** Out of HP (beaten or starved): lies where it fell (x.x) for RESPAWN_DELAY_MS, then respawn(). */
  private knockOut(p: Player, id: string) {
    p.hp = 0;
    p.deadUntil = Date.now() + RESPAWN_DELAY_MS;
    p.respawnIn = Math.ceil(RESPAWN_DELAY_MS / 1000);
    p.protectedUntil = 0;
    p.protectedFor = 0;
    p.blockUntil = 0;
    p.moving = false;
    p.hpChange = 0;
    p.casting = false; // the scroll drops...
    p.spells.clear(); // ...and charged spells fade
    this.broadcast("fx", { kind: "death", id } satisfies CombatFx);
  }

  /** Wakes up in the start town with full HP and fatigue, protected (and unable to attack) for a while. */
  private respawn(p: Player, id: string) {
    const spawn = world.spawnPoint();
    p.x = spawn.x;
    p.y = spawn.y;
    p.hp = p.maxHp;
    p.fatigue = p.maxFatigue;
    p.hunger = Math.max(p.hunger, HUNGER_AFTER_RESPAWN); // don't starve again right away
    p.hpChange = 0;
    p.blockUntil = 0;
    p.deadUntil = 0;
    p.respawnIn = 0;
    p.protectedUntil = Date.now() + SPAWN_PROTECTION_MS;
    p.protectedFor = Math.ceil(SPAWN_PROTECTION_MS / 1000);
    this.broadcast("fx", { kind: "respawn", id } satisfies CombatFx);
  }

  /** Knock-out countdown and spawn protection; the synced whole seconds only change once a second. */
  private updateLife(p: Player, id: string, now: number) {
    if (p.deadUntil) {
      if (now >= p.deadUntil) this.respawn(p, id);
      else p.respawnIn = Math.ceil((p.deadUntil - now) / 1000);
    }
    if (p.protectedUntil) {
      if (now >= p.protectedUntil) {
        p.protectedUntil = 0;
        p.protectedFor = 0;
      } else p.protectedFor = Math.ceil((p.protectedUntil - now) / 1000);
    }
  }

  /** Hunger goes down over time; health regenerates or drains depending on it (shared/survival.ts). */
  private updateHunger(p: Player, id: string, dt: number) {
    p.hungerDecayMs += dt * 1000;
    while (p.hungerDecayMs >= HUNGER_DECAY_MS) {
      p.hungerDecayMs -= HUNGER_DECAY_MS;
      p.hunger = Math.max(0, p.hunger - 1);
    }
    p.hpChange += hpPerSecond(p.hunger) * dt; // fractions of an HP collect here
    if (p.hp >= p.maxHp && p.hpChange > 0) p.hpChange = 0; // full health: nothing to heal
    while (p.hpChange >= 1) {
      p.hpChange -= 1;
      p.hp = Math.min(p.maxHp, p.hp + 1);
    }
    if (p.protectedUntil && p.hpChange < 0) p.hpChange = 0; // protected: can't starve either
    while (p.hpChange <= -1) {
      p.hpChange += 1;
      p.hp -= 1;
      if (p.hp <= 0) return this.knockOut(p, id); // starved
    }
  }

  private update(dt: number) {
    const now = Date.now();
    // Everyone who takes up space (knocked-out bunnies don't: you can step over them). Bunnies and
    // zombies walk through each other (an army around you would box you in, and you'd block it);
    // rats and crusaders bump into everyone.
    const bodies: Body[] = [];
    const bunnyBodies: Body[] = [];
    const zombieBodies: Body[] = [];
    this.state.players.forEach((p) => { if (!p.deadUntil) bodies.push(p), bunnyBodies.push(p); });
    this.state.enemies.forEach((e) => {
      bodies.push(e);
      zombieBodies.push(e);
      if (!isZombie(e.kind)) bunnyBodies.push(e);
    });
    // Who animals and crusaders go for: bunnies that can be hurt right now, and zombies
    const foes = new Map<string, Body>();
    this.state.players.forEach((p, id) => { if (!p.deadUntil && p.protectedUntil <= now) foes.set(id, p); });
    this.state.enemies.forEach((e, id) => { if (isZombie(e.kind)) foes.set(id, e); });
    this.rats.update(dt, now, foes, bodies);
    this.crusaders.update(dt, now, this.state.players, foes, bodies);
    this.zombies.update(dt, now, this.state.players, {
      posOf: (id) => {
        const p = this.state.players.get(id);
        if (p) return !p.deadUntil && p.protectedUntil <= now ? p : undefined;
        return this.state.enemies.get(id);
      },
      canHarm: (master, id) => this.canHarm(master, id, now),
      everyone: () => [...foes.entries(), ...[...this.state.enemies.entries()].filter(([, e]) => !isZombie(e.kind))],
    }, zombieBodies);
    // Bodies nobody raised fade away
    for (const [id, c] of this.corpses) if (now >= c.until) this.corpses.delete(id);
    this.state.players.forEach((p, id) => {
      this.updateLife(p, id, now);
      this.updateSpells(p, now);
      if (p.deadUntil) return; // knocked out: no regeneration, no hunger, no moving

      // Fatigue regenerates 1 point every fatigueRegenEveryMs (faster with more Endurance)
      if (p.fatigue < p.maxFatigue) {
        p.fatigueRegenMs += dt * 1000;
        while (p.fatigueRegenMs >= p.fatigueRegenEveryMs && p.fatigue < p.maxFatigue) {
          p.fatigueRegenMs -= p.fatigueRegenEveryMs;
          p.fatigue += 1;
        }
      } else {
        p.fatigueRegenMs = 0;
      }
      this.updateHunger(p, id, dt);

      const input = this.inputs.get(id);
      if (!input || p.casting) return void (p.moving = false); // drawing on the magic scroll: standing still
      const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      p.moving = dx !== 0 || dy !== 0;
      if (!p.moving) return;
      const next = world.step(p.x, p.y, dx, dy, dt, p.speed, bunnyBodies, p);
      p.x = next.x;
      p.y = next.y;
      // down (also down+left/right) faces the front, left/right and up+left/right show the side, up the back
      p.facing = dy > 0 ? "down" : dx ? (dx > 0 ? "right" : "left") : "up";
    });
  }
}

/** A player's items combined with their definitions (name, equip slot, combat values, ...). */
const itemsOf = (p: Player) => p.inventory.map((it) => itemView(it.id, it.defId, it.quantity));

const equipItemsOf = (p: Player): EquipItem[] => itemsOf(p);

function equipmentOf(p: Player): Equipment {
  const eq: Equipment = {};
  p.equipment.forEach((itemId, slot) => (eq[slot] = itemId));
  return eq;
}

/** Writes only the slots that changed, so clients get small updates. */
function setEquipment(p: Player, next: Equipment) {
  const stale: string[] = [];
  p.equipment.forEach((_id, slot) => { if (!(slot in next)) stale.push(slot); });
  stale.forEach((slot) => p.equipment.delete(slot));
  for (const [slot, itemId] of Object.entries(next)) if (p.equipment.get(slot) !== itemId) p.equipment.set(slot, itemId);
}

/** Attack / defense / armor of a player right now (stats + what they hold and wear). */
function combatOf(p: Player) {
  const stats = Object.fromEntries(STATS.map(({ key }) => [key, p.stats[key]])) as Stats;
  const { held, worn } = heldAndWorn(equipmentOf(p), itemsOf(p));
  return derive(stats, held, worn);
}
