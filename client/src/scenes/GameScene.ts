import Phaser from "phaser";
import { getStateCallbacks, Room } from "colyseus.js";
import { World, type MapData } from "../../../shared/world";
import mapJson from "../../../shared/map.json";
import { tileVariants, variantAt } from "../tiles";
import { FxLayer } from "../fx";
import { BubbleLayer } from "../bubbles";
import { BloodLayer } from "../blood";
import { MagicFx } from "../magicFx";
import { animateBunny, BUNNY_FRAMES, BUNNY_SCALE, knockOutBunny, loadBunny, resetBunny, setupBunny, viewOf, viewOfFacing } from "../bunnySprite";
import { SPELLS, tileCenter, type SpellId, type SpellSlot } from "../../../shared/magic";
import { enemyMaxHp } from "../../../shared/enemies";
import { itemView, type ItemView } from "../../../shared/items";
import { t, type TKey } from "../i18n";
import {
  ATTACK_COOLDOWN_MS,
  ATTACK_RANGE,
  ATTACK_WORD_COUNT,
  DEFEND_COOLDOWN_MS,
  FATIGUE_COST,
  type CombatFx,
} from "../../../shared/combat";

const world = new World(mapJson as MapData);

/** Killed enemies lie where they fell this long, then fade away over CORPSE_FADE_MS. */
const CORPSE_STAYS_MS = 60_000;
const CORPSE_FADE_MS = 3_000;

type Input = { left: boolean; right: boolean; up: boolean; down: boolean };

interface BunnyView {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  targetX: number; // latest position from the server
  targetY: number;
  snap?: boolean; // jump straight to the target (after a respawn)
  color: number; // the player's tint
  life: Life;
  countdown?: Phaser.GameObjects.Text; // seconds until waking up, over a knocked-out bunny
  blink?: Phaser.Tweens.Tween; // spawn protection: the bunny blinks
  state: any; // the synced Player (hp, maxHp, ...)
  drip: Drip;
  casting: boolean; // the magic scroll is open: glowing eyes
}

/** Where a wounded character last dripped blood (see BloodLayer.drips). */
interface Drip {
  x: number;
  y: number;
}

/** A rat (or later another enemy) drawn from the server's `enemies` list. */
interface EnemyView {
  sprite: Phaser.GameObjects.Sprite;
  targetX: number;
  targetY: number;
  dying?: boolean; // killed: plays its little death animation instead of vanishing
  state: any; // the synced Enemy (kind, hp, ...)
  label?: Phaser.GameObjects.Text; // King Arthur's name
  drip: Drip;
}

/** Alive, knocked out (x.x, waiting to respawn), or just respawned (protected, can't attack). */
type Life = { state: "alive" | "out" | "protected"; seconds: number };

export class GameScene extends Phaser.Scene {
  private bunnies = new Map<string, BunnyView>();
  private enemies = new Map<string, EnemyView>();
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  /** Eat / use an item (set by main.ts: the same thing the inventory's right-click does). */
  onUseItem?: (item: ItemView) => void;
  /** Called every frame with our bunny's position as a fraction of the world size (for the minimap). */
  onLocalMove?: (fx: number, fy: number) => void;
  private lastSent: Input = { left: false, right: false, up: false, down: false };
  private fx!: FxLayer;
  private bubbles!: BubbleLayer;
  private blood!: BloodLayer;
  private lastAttackAt = -Infinity;
  private lastDefendAt = -Infinity;
  /** Fatigue we spent that the server hasn't confirmed yet (so fast clicks can't overspend). */
  private pendingFatigue = 0;
  private lastServerFatigue = -1;
  private attackSeq = 0; // numbers our attacks so the server's luck result finds the right burst
  /** Our own knock-out / protection message in the middle of the screen (a DOM element). */
  private banner = document.createElement("div");
  private magic!: MagicFx;
  /** Our magic scroll is open: our bunny stands still (src/ui/scroll.ts). */
  private drawing = false;
  /** The spell slot we are aiming with (a target follows the pointer), if any. */
  private aiming: SpellSlot | null = null;
  private aimHint = document.createElement("div");
  /** Tells the HUD which spell slot is being aimed (to highlight it). */
  onAimChange?: (slot: SpellSlot | null) => void;

  constructor(private room: Room) {
    super("game");
  }

  /** Loads the tile pictures: one per terrain, or several numbered variants (see src/tiles.ts). */
  preload() {
    loadBunny(this); // src/assets/characters/bunny.png (see src/bunnySprite.ts)
    for (const [key, t] of Object.entries(world.map.terrain)) {
      tileVariants(t.name).forEach((url, i) => this.load.image(`terrain-${key}-${i}`, url));
    }
  }

  create() {
    setupBunny(this); // hopping animation + glowing eyes overlay
    makeRatTexture(this);
    makeCrusaderTextures(this);
    this.banner.id = "life-banner";
    this.banner.hidden = true;
    document.body.append(this.banner);
    this.aimHint.id = "aim-hint";
    this.aimHint.hidden = true;
    document.body.append(this.aimHint);
    this.events.once("destroy", () => {
      this.banner.remove();
      this.aimHint.remove();
    });
    this.createMap();

    // enableCapture = false: let letters still reach the inventory filter box when it has focus
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT", false) as Record<string, Phaser.Input.Keyboard.Key>;

    this.fx = new FxLayer(this);
    this.bubbles = new BubbleLayer(this);
    this.blood = new BloodLayer(this);
    this.magic = new MagicFx(this);
    // Other players' chat messages (our own are shown right away by chat())
    this.room.onMessage("chat", (m: { id: string; text: string }) => {
      const view = this.bunnies.get(m.id);
      if (view) this.bubbles.say(view.sprite, m.text);
    });
    this.setupCombat();
    // Esc cancels aiming (capture phase, so it doesn't also open the Options)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && this.aiming) {
        e.stopPropagation();
        this.stopAim();
      }
    };
    window.addEventListener("keydown", onKey, true);
    this.events.once("destroy", () => window.removeEventListener("keydown", onKey, true));

    this.cameras.main.setBounds(0, 0, world.pixelWidth, world.pixelHeight);
    this.cameras.main.setRoundPixels(true);

    // React to server state changes
    const $ = getStateCallbacks(this.room);
    $(this.room.state).players.onAdd((player: any, sessionId: string) => {
      const sprite = this.add.sprite(player.x, player.y, "bunny", BUNNY_FRAMES.idle).setScale(BUNNY_SCALE).setTint(player.color);
      const label = this.add
        .text(player.x, player.y, player.name, {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5, 1);
      const view: BunnyView = {
        sprite,
        label,
        targetX: player.x,
        targetY: player.y,
        color: player.color,
        life: { state: "alive", seconds: 0 },
        state: player,
        drip: { x: player.x, y: player.y },
        casting: false,
      };
      this.bunnies.set(sessionId, view);
      this.setLife(view, lifeOf(player));

      $(player).onChange(() => {
        view.targetX = player.x;
        view.targetY = player.y;
        // Teleports (respawn) or big corrections: jump instead of sliding across the map
        if (view.snap || Phaser.Math.Distance.Between(sprite.x, sprite.y, player.x, player.y) > 256) {
          sprite.setPosition(player.x, player.y);
          view.snap = false;
        }
        if (sessionId !== this.room.sessionId && view.life.state !== "out") sprite.setFlipX(player.facing === "left");
        this.setLife(view, lifeOf(player));
        if (!!player.casting !== view.casting) {
          view.casting = !!player.casting;
          this.magic.setCasting(sprite, view.casting); // red, sparkling eyes for everyone
        }
      });

      if (sessionId === this.room.sessionId) {
        this.cameras.main.startFollow(sprite, true, 0.15, 0.15);
      }
    });

    // Rats (server/src/rats.ts): the server moves them, we only slide them smoothly to where it says
    $(this.room.state).enemies.onAdd((enemy: any, id: string) => {
      const tall = enemy.kind === "king" || enemy.kind === "knight";
      const sprite = this.add.sprite(enemy.x, enemy.y, tall ? enemy.kind : "rat").setFlipX(enemy.faceLeft);
      // Crusaders are 1.5-2 tiles tall but stand on their feet: their position (and collision) is the
      // bottom quarter of the sprite, the rest of the body rises above it
      if (tall) sprite.setOrigin(0.5, 7 / 8);
      const view: EnemyView = { sprite, targetX: enemy.x, targetY: enemy.y, state: enemy, drip: { x: enemy.x, y: enemy.y } };
      if (enemy.kind === "king") {
        view.label = this.add
          .text(enemy.x, enemy.y, t("enemy.king"), { fontFamily: "monospace", fontSize: "13px", color: "#f2d36b", stroke: "#000000", strokeThickness: 3 })
          .setOrigin(0.5, 1);
      }
      this.enemies.set(id, view);
      $(enemy).onChange(() => {
        view.targetX = enemy.x;
        view.targetY = enemy.y;
        if (!view.dying) sprite.setFlipX(enemy.faceLeft);
      });
    });
    $(this.room.state).enemies.onRemove((_enemy: any, id: string) => {
      const view = this.enemies.get(id);
      this.enemies.delete(id);
      if (!view) return;
      this.bubbles.clear(view.sprite);
      view.label?.destroy();
      if (!view.dying) return view.sprite.destroy();
      // Killed: the body stays on the ground for a while (rats lie belly up, crusaders have fallen over),
      // then slowly fades. Only a picture: the server has already removed it, so nobody bumps into it.
      const body = view.sprite;
      this.tweens.killTweensOf(body);
      body.setAlpha(1).setDepth(-0.3); // on the ground: above scorch marks, under everyone still standing
      this.tweens.add({ targets: body, alpha: 0, delay: CORPSE_STAYS_MS, duration: CORPSE_FADE_MS, onComplete: () => body.destroy() });
    });

    $(this.room.state).players.onRemove((_player: any, sessionId: string) => {
      const view = this.bunnies.get(sessionId);
      if (view) this.bubbles.clear(view.sprite);
      if (view) this.magic.setCasting(view.sprite, false);
      view?.blink?.remove();
      view?.countdown?.destroy();
      view?.sprite.destroy();
      view?.label.destroy();
      this.bunnies.delete(sessionId);
    });
  }

  /**
   * Click on the map = attack toward the pointer, Shift+click = block toward the pointer.
   * Effects show right away for us; the server rate-limits and relays them to the other players.
   */
  private setupCombat() {
    this.input.mouse?.disableContextMenu(); // right-click on the map is ours (hand 2), not the browser's menu
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const right = pointer.rightButtonDown();
      if (!right && !pointer.leftButtonDown()) return;
      const me = this.bunnies.get(this.room.sessionId);
      if (!me || me.life.state === "out") return; // knocked out: can't do anything
      if (this.aiming) return this.throwSpell(me, pointer, right);
      const dx = pointer.worldX - me.sprite.x;
      const dy = pointer.worldY - me.sprite.y;
      const angle = Math.atan2(dy, dx);
      const dist = Math.min(ATTACK_RANGE, Math.hypot(dx, dy)); // reach: one tile

      if (right) return this.useHand2(me, angle, dist, dx);
      if (dx) me.sprite.setFlipX(dx < 0); // face the action
      if ((pointer.event as MouseEvent).shiftKey) this.block(me, angle);
      else this.attack(me, angle, dist);
    });
    // Attacks, blocks, hits and respawns reported by the server
    this.room.onMessage("fx", (m: CombatFx) => {
      const sprite = this.spriteOf(m.id); // a bunny or a rat
      if (!sprite) return;
      const mine = m.id === this.room.sessionId;
      switch (m.kind) {
        case "attack":
          if (mine) this.fx.upgradeAttack(m.seq, m); // we already show it: just add the luck
          else {
            sprite.setFlipX(Math.cos(m.angle) < 0);
            this.fx.attack(sprite, m.angle, m.dist, m.word, m);
          }
          break;
        case "defend":
          sprite.setFlipX(Math.cos(m.angle) < 0);
          this.fx.defend(sprite, m.angle);
          break;
        case "shout": // crusaders: "CHARGE!", "RETREAT!", ... in each player's own language
          this.bubbles.say(sprite, t(`shout.${m.line}` as TKey));
          break;
        case "bite":
          sprite.setFlipX(Math.cos(m.angle) < 0);
          this.fx.bite(sprite, m.angle);
          break;
        case "blocked": {
          const toward = this.angleToward(sprite, m.by);
          this.fx.blocked(sprite, toward, m.luck);
          if (m.bleed) this.blood.splat(bodyCenter(sprite), toward); // the block didn't stop all of it
          break;
        }
        case "hit":
          this.fx.hit(sprite); // no damage number: players have to guess
          if (m.bleed) this.blood.splat(bodyCenter(sprite), this.angleToward(sprite, m.by));
          break;
        case "death": {
          // Bunnies: shown from the synced state (setLife), which also covers players joining later.
          // Rats: belly up, then fades out when the server removes it.
          const enemy = this.enemies.get(m.id);
          if (enemy) {
            enemy.dying = true;
            this.blood.pool(sprite.x, sprite.y);
            this.tweens.killTweensOf(sprite);
            sprite.setAlpha(1);
            if (sprite.originY > 0.5) sprite.setAngle(sprite.flipX ? -90 : 90); // a crusader falls over (90° keeps the pixels crisp)
            else sprite.setFlipY(true); // a rat: belly up
          }
          break;
        }
        case "fireball": {
          // Start from where we see the caster (the server's position may be a few pixels behind)
          const from = this.bunnies.get(m.id)?.sprite ?? { x: m.x, y: m.y };
          const to = tileCenter(m.tx, m.ty);
          if (to.x !== from.x) sprite.setFlipX(to.x < from.x); // face the throw
          this.magic.fireball(from.x, from.y, m.tx, m.ty, m.ms);
          break;
        }
        case "heal": {
          const to = tileCenter(m.tx, m.ty);
          if (to.x !== sprite.x) sprite.setFlipX(to.x < sprite.x); // the caster faces the tile
          const healed = m.healed.map((id) => this.bunnies.get(id)?.sprite).filter((s): s is Phaser.GameObjects.Sprite => !!s);
          this.magic.heal(m.tx, m.ty, healed);
          break;
        }
        case "respawn": {
          const view = this.bunnies.get(m.id);
          if (view) view.snap = true; // jump to the start town instead of sliding across the map
          break;
        }
      }
    });
  }

  /** Other characters our bunny can't walk into (same list the server uses: knocked-out bunnies don't count). */
  private bodiesAround(me: Phaser.GameObjects.Sprite): { x: number; y: number }[] {
    const bodies: { x: number; y: number }[] = [];
    this.bunnies.forEach((v) => { if (v.sprite !== me && v.life.state !== "out") bodies.push({ x: v.targetX, y: v.targetY }); });
    this.enemies.forEach((v) => { if (!v.dying) bodies.push({ x: v.targetX, y: v.targetY }); });
    return bodies;
  }

  /** Click: attack toward the pointer (shown right away; the server decides what it hits). */
  private attack(me: BunnyView, angle: number, dist: number) {
    if (me.life.state === "protected") return this.fx.say(me.sprite, t("fx.protected")); // just respawned
    const now = this.time.now;
    if (now - this.lastAttackAt < ATTACK_COOLDOWN_MS) return; // max 3 attacks per second
    if (!this.spendFatigue(FATIGUE_COST.attack)) return this.fx.tired(me.sprite);
    this.lastAttackAt = now;
    const word = Phaser.Math.Between(0, ATTACK_WORD_COUNT - 1); // index: shown in each player's language
    const seq = ++this.attackSeq;
    this.fx.attack(me.sprite, angle, dist, word, undefined, seq); // show right away, luck comes from the server
    this.room.send("attack", { angle, dist, word, seq });
  }

  /** Shift+click: block toward the pointer. */
  private block(me: BunnyView, angle: number) {
    const now = this.time.now;
    if (now - this.lastDefendAt < DEFEND_COOLDOWN_MS) return;
    if (!this.spendFatigue(FATIGUE_COST.defend)) return this.fx.tired(me.sprite);
    this.lastDefendAt = now;
    this.fx.defend(me.sprite, angle);
    this.room.send("defend", { angle });
  }

  /**
   * Right-click on the map: use what is in hand 2 (hotbar slot 2), toward the pointer.
   * Food is eaten, a weapon attacks, a shield (anything with defense) blocks.
   */
  private useHand2(me: BunnyView, angle: number, dist: number, dx: number) {
    const item = this.itemInSlot("hot2");
    if (!item) return this.fx.say(me.sprite, t("fx.emptyHand"));
    const action = handAction(item);
    if (action === "eat") return this.onUseItem?.(item);
    if (action === "none") return this.fx.say(me.sprite, t("fx.nothingHappens"));
    if (dx) me.sprite.setFlipX(dx < 0); // face the action
    if (action === "attack") this.attack(me, angle, dist);
    else this.block(me, angle);
  }

  // ---------------- magic ----------------

  /** Our magic scroll opened / closed (src/ui/scroll.ts): our bunny stands still while drawing. */
  setDrawing(on: boolean) {
    this.drawing = on;
    if (on) this.stopAim();
  }

  /**
   * X / C / V / B (or a click on the spell slot): start aiming that slot's spell; a target follows the
   * pointer until we click (throw) or cancel. Pressing the same key again cancels too.
   */
  aimSpell(slot: SpellSlot) {
    const me = this.bunnies.get(this.room.sessionId);
    if (!me || me.life.state === "out" || this.drawing) return;
    if (this.aiming === slot) return this.stopAim();
    const charged = this.myState()?.spells?.get(slot);
    if (!charged) return;
    const hostile = SPELLS[charged.spell as SpellId]?.hostile;
    if (hostile && me.life.state === "protected") return this.fx.say(me.sprite, t("fx.protected")); // just respawned: no attacking
    this.aiming = slot;
    this.aimHint.textContent = t("magic.aimHint", { spell: t(`spell.${charged.spell}` as TKey) });
    this.aimHint.hidden = false;
    this.onAimChange?.(slot);
  }

  stopAim() {
    if (!this.aiming) return;
    this.aiming = null;
    this.aimHint.hidden = true;
    this.magic.showAim(null);
    this.onAimChange?.(null);
  }

  /** A click while aiming: left = throw at the tile under the pointer (if in reach), right = cancel. */
  private throwSpell(me: BunnyView, pointer: Phaser.Input.Pointer, right: boolean) {
    const slot = this.aiming!;
    if (right) return this.stopAim();
    const target = this.showAim(me, pointer.worldX, pointer.worldY);
    if (!target) return;
    if (!target.ok) return this.fx.say(me.sprite, t("magic.tooFar"));
    this.stopAim();
    this.room.send("spell", { slot, tx: target.tx, ty: target.ty });
  }

  /** Draws the target of the spell being aimed (its area and color) under (x, y); returns the tile. */
  private showAim(me: BunnyView, x: number, y: number) {
    const spell = SPELLS[this.myState()?.spells?.get(this.aiming)?.spell as SpellId] ?? SPELLS.fireball;
    return this.magic.showAim(me.sprite, x, y, spell.radius, spell.color);
  }

  private myState(): any {
    return (this.room.state as any).players?.get(this.room.sessionId);
  }

  /** The item in one of our outfit / hotbar slots (from the synced state), if any. */
  private itemInSlot(slot: string): ItemView | undefined {
    const me = (this.room.state as any).players?.get(this.room.sessionId);
    const itemId: string | undefined = me?.equipment?.get(slot);
    if (!me || !itemId) return undefined;
    let found: ItemView | undefined;
    me.inventory?.forEach((it: any) => {
      if (it.id === itemId) found = itemView(it.id, it.defId, it.quantity);
    });
    return found;
  }

  /** Direction from `sprite` toward the character `id` (where a hit came from); 0 if it's gone. */
  private angleToward(sprite: Phaser.GameObjects.Sprite, id: string): number {
    const by = this.spriteOf(id);
    return by ? Math.atan2(by.y - sprite.y, by.x - sprite.x) : 0;
  }

  /** Badly wounded characters leave drops behind as they walk (only on the high blood settings). */
  private bleedTrail(sprite: Phaser.GameObjects.Sprite, drip: Drip, hpShare: number) {
    if (Math.hypot(sprite.x - drip.x, sprite.y - drip.y) < 22) return; // one drop every ~22 px walked
    drip.x = sprite.x;
    drip.y = sprite.y;
    if (this.blood.drips(hpShare)) this.blood.drip(sprite.x, sprite.y);
  }

  /** The sprite of a bunny (session id) or an enemy (e.g. "rat12"). */
  private spriteOf(id: string): Phaser.GameObjects.Sprite | undefined {
    return this.bunnies.get(id)?.sprite ?? this.enemies.get(id)?.sprite;
  }

  /** Our own chat message: shown in a speech bubble right away, and sent to the others. */
  chat(text: string) {
    const me = this.bunnies.get(this.room.sessionId);
    if (me) this.bubbles.say(me.sprite, text);
    this.room.send("chat", { text });
  }

  /** A short message floating up over our own bunny (e.g. "Not hungry!"). */
  say(message: string) {
    const me = this.bunnies.get(this.room.sessionId);
    if (me) this.fx.say(me.sprite, message);
  }

  /** Checks (and reserves) fatigue for an action; the server makes the final decision. */
  private spendFatigue(cost: number): boolean {
    const me = (this.room.state as any).players?.get(this.room.sessionId);
    const serverFatigue: number = me?.fatigue ?? 0;
    if (serverFatigue !== this.lastServerFatigue) {
      // The server's number already includes what we spent so far
      this.lastServerFatigue = serverFatigue;
      this.pendingFatigue = 0;
    }
    if (serverFatigue - this.pendingFatigue < cost) return false;
    this.pendingFatigue += cost;
    return true;
  }

  update(_time: number, deltaMs: number) {
    const k = this.keys;
    // Knocked out, or drawing on the magic scroll: can't move
    const out = this.bunnies.get(this.room.sessionId)?.life.state === "out" || this.drawing;
    const input: Input = {
      left: !out && (k.A.isDown || k.LEFT.isDown),
      right: !out && (k.D.isDown || k.RIGHT.isDown),
      up: !out && (k.W.isDown || k.UP.isDown),
      down: !out && (k.S.isDown || k.DOWN.isDown),
    };

    // Only send input when it changes, which keeps bandwidth tiny
    if (JSON.stringify(input) !== JSON.stringify(this.lastSent)) {
      this.room.send("input", input);
      this.lastSent = input;
    }

    const dt = Math.min(deltaMs / 1000, 0.1);
    this.bunnies.forEach((view, id) => {
      const s = view.sprite;
      if (id === this.room.sessionId) {
        // Client-side prediction with the same rules as the server, so our bunny responds instantly
        const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
        const mySpeed: number | undefined = (this.room.state as any).players?.get(this.room.sessionId)?.speed;
        const next = world.step(s.x, s.y, dx, dy, dt, mySpeed, this.bodiesAround(s)); // same rules as the server
        s.setPosition(next.x, next.y);
        if (dx) s.setFlipX(dx < 0);
        // hop while walking: front when going down (also diagonally), side for left/right and up+left/right, back for up
        if (view.life.state !== "out") animateBunny(s, !!(dx || dy), dx || dy ? viewOf(dx, dy) : undefined);

        // Gently correct toward the server's position (snap if we are way off)
        const err = Phaser.Math.Distance.Between(s.x, s.y, view.targetX, view.targetY);
        const correction = err > 96 ? 1 : dx || dy ? 0.02 : 0.15;
        s.x = Phaser.Math.Linear(s.x, view.targetX, correction);
        s.y = Phaser.Math.Linear(s.y, view.targetY, correction);
      } else {
        // Other players: smooth interpolation toward their latest server position
        s.x = Phaser.Math.Linear(s.x, view.targetX, 0.25);
        s.y = Phaser.Math.Linear(s.y, view.targetY, 0.25);
        // the server says whether they walk, and which way they face
        if (view.life.state !== "out") animateBunny(s, !!view.state.moving, viewOfFacing(view.state.facing));
      }
      s.setDepth(s.y); // simple y-sorting so bunnies overlap correctly
      if (view.life.state !== "out" && view.state.maxHp > 0) this.bleedTrail(s, view.drip, view.state.hp / view.state.maxHp);
      const top = s.y - s.displayHeight / 2;
      view.label.setPosition(s.x, top - 2).setDepth(100000);
      view.countdown?.setPosition(s.x, top - 20).setDepth(100000);
    });

    // Rats: smooth interpolation like other players (most of them stand still most of the time)
    this.enemies.forEach((view) => {
      const s = view.sprite;
      if (view.dying) return;
      s.x = Phaser.Math.Linear(s.x, view.targetX, 0.25);
      s.y = Phaser.Math.Linear(s.y, view.targetY, 0.25);
      s.setDepth(s.y);
      view.label?.setPosition(s.x, s.y - s.displayHeight * s.originY - 2).setDepth(100000);
      this.bleedTrail(s, view.drip, view.state.hp / enemyMaxHp(view.state.kind));
    });

    this.fx.update(); // keep bursts and shields next to their bunnies
    this.magic.update(this.time.now); // glowing eyes and their sparkles
    this.bubbles.update(); // and speech bubbles above them

    // Our own knock-out countdown / protection message
    const me = this.bunnies.get(this.room.sessionId);
    const text = !me || me.life.state === "alive" ? ""
      : t(me.life.state === "out" ? "life.knockedOut" : "life.protected", { n: me.life.seconds });
    if (this.banner.textContent !== text) this.banner.textContent = text;
    this.banner.hidden = !text;
    this.banner.className = me?.life.state ?? "";

    // Aiming a spell: the target follows the pointer (which stays put on screen while the camera moves)
    if (this.aiming) {
      const charged = this.myState()?.spells?.get(this.aiming);
      const hostile = SPELLS[charged?.spell as SpellId]?.hostile;
      if (!me || me.life.state === "out" || (hostile && me.life.state !== "alive") || !charged) this.stopAim(); // knocked out, or the spell faded
      else {
        const p = this.input.activePointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        this.showAim(me, p.x, p.y);
      }
    }

    // Tell the minimap where we are
    if (me) this.onLocalMove?.(me.sprite.x / world.pixelWidth, me.sprite.y / world.pixelHeight);
  }

  /**
   * Shows a bunny's life state: knocked out = x.x face, greyed, with a countdown over it;
   * protected = blinking. Called on every server update, so it only acts when something changed.
   */
  private setLife(view: BunnyView, life: Life) {
    const prev = view.life;
    view.life = life;
    const s = view.sprite;
    if (life.state !== prev.state) {
      view.blink?.remove();
      view.blink = undefined;
      this.tweens.killTweensOf(s);
      s.setAlpha(1);
      if (life.state === "out") {
        if (prev.state !== "out" && view.state.hp === 0) this.blood.pool(s.x, s.y);
        knockOutBunny(s); // stays upright so the pixel x.x stays crisp
        s.setTint(greyed(view.color));
        this.tweens.add({ targets: s, alpha: { from: 0.2, to: 1 }, duration: 120, repeat: 2 }); // knock-out flash
        view.countdown ??= this.add
          .text(s.x, s.y, "", { fontFamily: "monospace", fontSize: "18px", fontStyle: "bold", color: "#ffffff", stroke: "#000000", strokeThickness: 4 })
          .setOrigin(0.5, 1);
      } else {
        resetBunny(s);
        s.setTint(view.color);
        view.countdown?.destroy();
        view.countdown = undefined;
        if (life.state === "protected") {
          view.blink = this.tweens.add({ targets: s, alpha: 0.35, duration: 250, yoyo: true, repeat: -1 });
        }
      }
    }
    view.countdown?.setText(String(life.seconds));
  }

  /** Builds the terrain layer (from the tile pictures) and a transparent road layer on top of it. */
  private createMap() {
    const { tileSize: ts, terrain, rows, roads } = world.map;

    // --- terrain: all loaded tile pictures side by side in one small tileset strip ---
    // The map itself is just indices into this strip, so memory stays tiny however big the map is.
    // Terrains with several pictures (grass1, grass2, ...) get several entries in the strip.
    const keys = Object.keys(terrain);
    const counts = keys.map((key) => Math.max(1, tileVariants(terrain[key].name).length));
    const first: Record<string, { index: number; count: number }> = {};
    let total = 0;
    keys.forEach((key, i) => {
      first[key] = { index: total, count: counts[i] };
      total += counts[i];
    });

    const tex = this.textures.createCanvas("terrain", ts * total, ts)!;
    const ctx = tex.getContext();
    keys.forEach((key) => {
      const { index, count } = first[key];
      for (let v = 0; v < count; v++) {
        const textureKey = `terrain-${key}-${v}`;
        if (this.textures.exists(textureKey)) {
          const img = this.textures.get(textureKey).getSourceImage() as CanvasImageSource;
          ctx.drawImage(img, (index + v) * ts, 0, ts, ts);
        } else {
          ctx.fillStyle = terrain[key].color; // no picture for this terrain: plain color
          ctx.fillRect((index + v) * ts, 0, ts, ts);
        }
      }
    });
    tex.refresh();

    // Each tile picks one of its terrain's pictures from its position + the map seed (deterministic)
    const data = rows.map((row, y) =>
      [...row].map((c, x) => {
        const f = first[c] ?? first[keys[0]];
        return f.index + variantAt(x, y, world.map.seed, f.count);
      })
    );
    const map = this.make.tilemap({ data, tileWidth: ts, tileHeight: ts });
    map.createLayer(0, map.addTilesetImage("terrain")!, 0, 0)!.setDepth(-2);

    // --- roads: 16 transparent tiles, one per combination of arms (N=1 E=2 S=4 W=8) ---
    makeRoadTexture(this, ts, world.map.road.color);
    const BIT = { N: 1, E: 2, S: 4, W: 8 };
    const roadData = roads.map((row, ty) =>
      [...row].map((_c, tx) => {
        const mask = world.roadArms(tx, ty).reduce((m, d) => m | BIT[d], 0);
        return mask || -1; // -1 = empty (fully transparent)
      })
    );
    // insertNull: empty cells stay null instead of becoming Tile objects (most of the map has no road)
    const roadMap = this.make.tilemap({ data: roadData, tileWidth: ts, tileHeight: ts, insertNull: true });
    roadMap.createLayer(0, roadMap.addTilesetImage("roads")!, 0, 0)!.setDepth(-1);
  }
}

/**
 * Draws all 16 road tiles side by side. Straight pieces and junctions are bands from the tile
 * center to each edge; two arms at a right angle (e.g. bottom + right) become a curve.
 */
function makeRoadTexture(scene: Phaser.Scene, ts: number, color: string) {
  const tex = scene.textures.createCanvas("roads", ts * 16, ts)!;
  const ctx = tex.getContext();
  const half = ts / 2;
  const width = ts / 4;
  const ends = [
    [half, 0], // N
    [ts, half], // E
    [half, ts], // S
    [0, half], // W
  ];
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  for (let mask = 1; mask < 16; mask++) {
    const ox = mask * ts;
    const arms = [0, 1, 2, 3].filter((i) => mask & (1 << i));
    ctx.beginPath();
    const isCurve = arms.length === 2 && (arms[1] - arms[0]) % 2 === 1;
    if (isCurve) {
      const [a, b] = arms.map((i) => ends[i]);
      ctx.moveTo(ox + a[0], a[1]);
      ctx.quadraticCurveTo(ox + half, half, ox + b[0], b[1]);
      ctx.stroke();
    } else {
      for (const i of arms) {
        ctx.moveTo(ox + half, half);
        ctx.lineTo(ox + ends[i][0], ends[i][1]);
      }
      ctx.stroke();
      ctx.fillRect(ox + half - width / 2, half - width / 2, width, width); // fill the joint
    }
  }
  tex.refresh();
}

/** The middle of a character's body (tall crusaders stand on their feet, so it's above their position). */
function bodyCenter(s: Phaser.GameObjects.Sprite) {
  return { x: s.x, y: s.y - s.displayHeight * (s.originY - 0.5) };
}

/** What using an item in hand does: food is eaten, weapons attack, anything with defense blocks. */
function handAction(item: ItemView): "eat" | "attack" | "block" | "none" {
  if (item.food > 0) return "eat";
  if (item.itemType === "weapon") return "attack";
  if (item.defense > 0) return "block";
  return "none";
}

/** A little grey rat (side view, facing right), drawn in code like the bunny, 3x scale. */
function makeRatTexture(scene: Phaser.Scene) {
  const S = 3;
  const rows = [
    "...........PP...",
    ".....GGGGGGGPG..",
    "...GGGGGGGGGGKG.",
    "P.GGGGGGGGGGGGGP",
    ".PGGGGGGGGGGGG..",
    "..PGGGGGGGGGG...",
    "....P.P...P.P...",
  ];
  const palette: Record<string, number> = { G: 0x8d8790, P: 0xe8a0a8, K: 0x1a1a1a };
  const g = scene.make.graphics({}, false);
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (palette[c] === undefined) return;
      g.fillStyle(palette[c]);
      g.fillRect(x * S, y * S, S, S);
    })
  );
  g.generateTexture("rat", 16 * S, rows.length * S);
  g.destroy();
}

/**
 * Crusaders, drawn in code like the bunny (3x scale): a knight in a great helm and a white tabard with
 * a red cross (14 x 34 pixels, about 1.6 tiles tall), and the king: crown, blue and gold tabard and a
 * purple cape (about 1.8 tiles tall).
 */
function makeCrusaderTextures(scene: Phaser.Scene) {
  const S = 3;
  const knight = [
    "....HHHHHH....",
    "...HHHHHHHH...",
    "...HHHHHHHH...",
    "...HDDDDDDH...",
    "...HHHHHHHH...",
    "...HHHDHHHH...",
    "...HHHHHHHH...",
    "....MMMMMM....",
    "..MMWWWWWWMM..",
    ".MMWWWRRWWWMM.",
    ".MMWWWRRWWWMM.",
    ".MMWRRRRRRWMM.",
    ".MMWRRRRRRWMM.",
    ".MMWWWRRWWWMMK",
    ".MMWWWRRWWWMMS",
    ".MMWWWRRWWWMMS",
    ".MMWWWRRWWWMMS",
    ".MBBBBBBBBBBMS",
    ".M.WWWRRWWW.MS",
    ".M.WWWWWWWW.MS",
    "...WWWWWWWW..S",
    "...WWWWWWWW..S",
    "...WWW..WWW..S",
    "...MMM..MMM..S",
    "...MMM..MMM..S",
    "...MMM..MMM...",
    "...MMM..MMM...",
    "...MMM..MMM...",
    "...MMM..MMM...",
    "...MMM..MMM...",
    "...MMM..MMM...",
    "...BBB..BBB...",
    "..BBBB..BBBB..",
    "..BBBB..BBBB..",
  ];
  // The king: same armor, blue tabard with a gold cross, a purple cape at his sides and a crown on top
  const king = [
    "...Y.Y..Y.Y...",
    "...YYYYYYYY...",
    ...knight.map((row, y) =>
      [...row]
        .map((c, x) => (c === "W" ? "U" : c === "R" ? "Y" : c === "." && y >= 8 && y <= 30 && (x === 0 || x === 13) ? "P" : c))
        .join("")
    ),
  ];
  const palette: Record<string, number> = {
    H: 0xa8adb5, D: 0x2b2b2b, M: 0x7d838c, W: 0xeeeeee, R: 0xc8202a, B: 0x5a3a22, K: 0x3a2a1a, S: 0xd8dde3,
    U: 0x2d4fa3, Y: 0xf2c230, P: 0x6b3fa0,
  };
  for (const [key, art] of [["knight", knight], ["king", king]] as const) {
    const g = scene.make.graphics({}, false);
    art.forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (palette[c] === undefined) return;
        g.fillStyle(palette[c]);
        g.fillRect(x * S, y * S, S, S);
      })
    );
    g.generateTexture(key, 14 * S, art.length * S);
    g.destroy();
  }
}

/** A player's life state from the synced fields (see the server's Player schema). */
function lifeOf(player: any): Life {
  if (player.respawnIn > 0) return { state: "out", seconds: player.respawnIn };
  if (player.protectedFor > 0) return { state: "protected", seconds: player.protectedFor };
  return { state: "alive", seconds: 0 };
}

/** The player's color, faded halfway to grey (knocked out). */
const greyed = (c: number) => ((c >> 1) & 0x7f7f7f) + 0x404040;
