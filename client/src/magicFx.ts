// Magic effects drawn in the game world: glowing red, sparkling eyes while a bunny draws on its scroll,
// the fireball (flight, explosion on 3×3 tiles, scorch marks), healing (a beam of green light) and the
// target shown while aiming a spell.
import Phaser from "phaser";
import { TILE_SIZE } from "../../shared/combat";
import { FIREBALL, inSpellRange, tileCenter } from "../../shared/magic";
import { t } from "./i18n";
import { eyeOffsets } from "./bunnySprite";

const FX_DEPTH = 200000; // above characters (their depth is their y position), like src/fx.ts
const SCORCH_MS = 8000; // how long the burnt ground stays

interface Glow {
  sprite: Phaser.GameObjects.Sprite;
  eyes: Phaser.GameObjects.Image;
  nextSparkAt: number;
}

export class MagicFx {
  private glows = new Map<Phaser.GameObjects.Sprite, Glow>();
  private aim: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene) {
    this.aim = scene.add.graphics().setDepth(-0.4).setVisible(false); // on the ground, under the characters
  }

  /** A bunny opened (or closed) its magic scroll: its eyes glow red and sparkle. Everyone sees this. */
  setCasting(sprite: Phaser.GameObjects.Sprite, on: boolean) {
    const glow = this.glows.get(sprite);
    if (on && !glow) {
      const eyes = this.scene.add.image(sprite.x, sprite.y, "bunny-eyes", sprite.frame.name); // made in src/bunnySprite.ts
      this.glows.set(sprite, { sprite, eyes, nextSparkAt: 0 });
    } else if (!on && glow) {
      glow.eyes.destroy();
      this.glows.delete(sprite);
    }
  }

  /** Keeps the glowing eyes on their bunnies and spawns sparkles; call every frame. */
  update(time: number) {
    for (const g of this.glows.values()) {
      const s = g.sprite;
      if (!s.active) {
        this.setCasting(s, false);
        continue;
      }
      g.eyes
        .setFrame(s.frame.name) // the eyes move with the hopping frames
        .setPosition(s.x, s.y)
        .setFlipX(s.flipX)
        .setDepth(s.depth + 0.5)
        .setAlpha(0.8 + 0.2 * Math.sin(time / 110));
      if (time < g.nextSparkAt) continue;
      g.nextSparkAt = time + 35;
      // Sparkles rise from one of the eyes (mirrored when the bunny faces left)
      const eye = Phaser.Utils.Array.GetRandom(eyeOffsets[Number(s.frame.name)] ?? [{ x: 0, y: 0 }]) ?? { x: 0, y: 0 };
      const eyeX = eye.x * (s.flipX ? -1 : 1);
      // (no additive blending: it would vanish on white bunnies)
      const color = Phaser.Utils.Array.GetRandom([0xff2020, 0xff5a1a, 0xffa020, 0xffe040]);
      const size = Math.random() < 0.35 ? 4 : 3;
      const spark = this.scene.add
        .rectangle(s.x + eyeX + Phaser.Math.Between(-3, 3), s.y + eye.y + Phaser.Math.Between(-2, 2), size, size, color)
        .setDepth(s.depth + 0.6);
      this.scene.tweens.add({
        targets: spark,
        x: spark.x + Phaser.Math.Between(-10, 10),
        y: spark.y - Phaser.Math.Between(10, 26),
        alpha: 0,
        duration: Phaser.Math.Between(350, 650),
        onComplete: () => spark.destroy(),
      });
    }
  }

  /**
   * The target while aiming a spell: the tiles it would cover (`radius` tiles around the one under the
   * pointer) in the spell's color, red when out of reach. Null hides it.
   */
  showAim(
    from: { x: number; y: number } | null,
    worldX = 0,
    worldY = 0,
    radius = 1,
    spellColor = 0xff8a2a,
    range?: number // how far the target may be (default: a spell's reach)
  ): { tx: number; ty: number; ok: boolean } | null {
    this.aim.clear();
    this.aim.setVisible(!!from);
    if (!from) return null;
    const tx = Math.floor(worldX / TILE_SIZE);
    const ty = Math.floor(worldY / TILE_SIZE);
    const ok = inSpellRange(from.x, from.y, tx, ty, range);
    const color = ok ? spellColor : 0xe03030;
    const r = radius;
    const x0 = (tx - r) * TILE_SIZE;
    const y0 = (ty - r) * TILE_SIZE;
    const size = (2 * r + 1) * TILE_SIZE;
    const pulse = 0.5 + 0.5 * Math.sin(this.scene.time.now / 140);
    this.aim.fillStyle(color, 0.16 + 0.08 * pulse).fillRect(x0, y0, size, size);
    this.aim.fillStyle(color, 0.22).fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE); // the tile it lands on
    this.aim.lineStyle(2, color, 0.9).strokeRect(x0 + 1, y0 + 1, size - 2, size - 2);
    this.aim.lineStyle(1, color, 0.5);
    for (let i = 1; i < 2 * r + 1; i++) {
      this.aim.lineBetween(x0 + i * TILE_SIZE, y0, x0 + i * TILE_SIZE, y0 + size);
      this.aim.lineBetween(x0, y0 + i * TILE_SIZE, x0 + size, y0 + i * TILE_SIZE);
    }
    return { tx, ty, ok };
  }

  /** A fireball flies from (x, y) to tile (tx, ty) in `ms`, in a little arc, then explodes. */
  fireball(x: number, y: number, tx: number, ty: number, ms: number) {
    const to = tileCenter(tx, ty);
    const ball = this.scene.add.container(x, y).setDepth(FX_DEPTH);
    const g = this.scene.add.graphics();
    g.fillStyle(0xff3a10, 0.4).fillCircle(0, 0, 15);
    g.fillStyle(0xff7a1a, 0.9).fillCircle(0, 0, 9);
    g.fillStyle(0xffe070, 1).fillCircle(0, 0, 5);
    ball.add(g);
    const lift = Math.min(70, Math.hypot(to.x - x, to.y - y) * 0.25); // the arc's height
    let lastTrail = 0;
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: Math.max(60, ms),
      onUpdate: (tw) => {
        const p = tw.getValue() ?? 0;
        ball.setPosition(Phaser.Math.Linear(x, to.x, p), Phaser.Math.Linear(y, to.y, p) - Math.sin(Math.PI * p) * lift);
        ball.setScale(0.9 + 0.2 * Math.sin(this.scene.time.now / 40));
        if (this.scene.time.now - lastTrail < 16) return;
        lastTrail = this.scene.time.now;
        this.ember(ball.x, ball.y, 0, 0, 3, 300); // a smoky, sparkling trail
      },
      onComplete: () => {
        ball.destroy();
        this.explode(tx, ty);
      },
    });
  }

  /** The blast: the 3×3 tiles flash, embers fly, a comic "KABOOM!", and the ground stays scorched a while. */
  explode(tx: number, ty: number) {
    const r = FIREBALL.radiusTiles;
    const c = tileCenter(tx, ty);
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const x = (tx + dx) * TILE_SIZE;
        const y = (ty + dy) * TILE_SIZE;
        const flash = this.scene.add
          .rectangle(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, dx || dy ? 0xff6a10 : 0xffc030, 0.75)
          .setDepth(FX_DEPTH - 1);
        this.scene.tweens.add({ targets: flash, alpha: 0, duration: 650, delay: 120 + 60 * (Math.abs(dx) + Math.abs(dy)), onComplete: () => flash.destroy() });
        this.scorch(x, y);
      }
    }
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = Phaser.Math.Between(40, 1.6 * TILE_SIZE);
      this.ember(c.x, c.y, Math.cos(a) * v, Math.sin(a) * v, Phaser.Math.Between(3, 6), Phaser.Math.Between(450, 900));
    }
    this.boom(c.x, c.y);
    // A little shake when it goes off on screen
    const cam = this.scene.cameras.main;
    if (Phaser.Geom.Rectangle.Contains(cam.worldView, c.x, c.y)) cam.shake(180, 0.004);
  }

  /**
   * Healing on tile (tx, ty): a beam of green light comes down on the tile, little green crosses rise
   * from it, and every healed bunny glows for a moment (how much it healed is not shown).
   */
  heal(tx: number, ty: number, healed: Phaser.GameObjects.Sprite[]) {
    const x = tx * TILE_SIZE;
    const y = ty * TILE_SIZE;
    const beamH = TILE_SIZE * 3;
    const beam = this.scene.add.graphics().setDepth(FX_DEPTH - 1);
    // The beam: stripes that are brightest in the middle, fading upward (pixel style, no blur)
    for (let i = 0; i < 8; i++) {
      const w = TILE_SIZE * (1 - i * 0.11);
      beam.fillStyle(i < 3 ? 0x9cf5a8 : 0xd8ffd8, 0.1 + i * 0.04);
      beam.fillRect(x + (TILE_SIZE - w) / 2, y + TILE_SIZE - beamH, w, beamH);
    }
    beam.fillStyle(0x5ee07a, 0.45).fillRect(x, y, TILE_SIZE, TILE_SIZE); // the tile itself
    beam.setAlpha(0).setScale(1, 1);
    this.scene.tweens.add({ targets: beam, alpha: 1, duration: 140, yoyo: true, hold: 380, onComplete: () => beam.destroy() });
    for (let i = 0; i < 14; i++) {
      this.scene.time.delayedCall(i * 45, () =>
        this.cross(x + Phaser.Math.Between(6, TILE_SIZE - 6), y + Phaser.Math.Between(TILE_SIZE / 2, TILE_SIZE - 4))
      );
    }
    for (const s of healed) {
      if (!s.active) continue;
      this.scene.tweens.add({ targets: s, scale: { from: 1.15, to: 1 }, duration: 380, ease: "Back.easeOut" });
      for (let i = 0; i < 5; i++) this.scene.time.delayedCall(120 + i * 90, () => s.active && this.cross(s.x + Phaser.Math.Between(-14, 14), s.y - 8));
    }
  }

  /**
   * Necromancy: a body rises at (x, y). Sickly green mist wells up from the ground, clods of earth fly,
   * and a few green wisps drift up.
   */
  raise(x: number, y: number) {
    const ground = this.scene.add.graphics().setDepth(-0.25);
    for (let i = 0; i < 18; i++) {
      ground.fillStyle(Phaser.Utils.Array.GetRandom([0x3a2a1a, 0x4a3a22, 0x2a1e12]), 0.75);
      ground.fillRect(x + Phaser.Math.Between(-22, 18), y + Phaser.Math.Between(-6, 10), 4 * Phaser.Math.Between(1, 2), 4);
    }
    this.scene.tweens.add({ targets: ground, alpha: 0, delay: 2500, duration: 1500, onComplete: () => ground.destroy() });
    for (let i = 0; i < 26; i++) {
      this.scene.time.delayedCall(i * 35, () => {
        const size = Phaser.Math.Between(3, 6);
        const color = Phaser.Utils.Array.GetRandom([0x9be04a, 0x6fae3a, 0xc8ff7a, 0x4a6a2a]);
        const m = this.scene.add.rectangle(x + Phaser.Math.Between(-20, 20), y + Phaser.Math.Between(-4, 8), size, size, color, 0.85).setDepth(FX_DEPTH);
        this.scene.tweens.add({
          targets: m, x: m.x + Phaser.Math.Between(-10, 10), y: m.y - Phaser.Math.Between(30, 70), alpha: 0,
          duration: Phaser.Math.Between(700, 1200), ease: "Sine.easeOut", onComplete: () => m.destroy(),
        });
      });
    }
    for (let i = 0; i < 8; i++) {
      const a = Math.PI + Math.random() * Math.PI; // clods fly up and out
      const v = Phaser.Math.Between(18, 40);
      const c = this.scene.add.rectangle(x, y + 4, 4, 4, 0x3a2a1a).setDepth(FX_DEPTH);
      this.scene.tweens.add({ targets: c, x: x + Math.cos(a) * v, y: y + 4 + Math.sin(a) * v * 0.7, alpha: 0, duration: 500, ease: "Quad.easeOut", onComplete: () => c.destroy() });
    }
  }

  /** A zombie's time is up: it crumbles into a puff of grey-brown dust. */
  crumble(x: number, y: number) {
    for (let i = 0; i < 22; i++) {
      const color = Phaser.Utils.Array.GetRandom([0x8a8070, 0x6a6050, 0xa89a80, 0x5f8a3a]);
      const d = this.scene.add.rectangle(x + Phaser.Math.Between(-12, 12), y - Phaser.Math.Between(0, 30), 4, 4, color).setDepth(FX_DEPTH);
      this.scene.tweens.add({
        targets: d, x: d.x + Phaser.Math.Between(-18, 18), y: y + Phaser.Math.Between(-4, 8), alpha: 0,
        duration: Phaser.Math.Between(500, 900), ease: "Quad.easeIn", onComplete: () => d.destroy(),
      });
    }
  }

  /** Where we just sent our undead army (only we see it): the 3×3 tiles blink a few times. */
  orderMark(tx: number, ty: number, radius: number) {
    const x0 = (tx - radius) * TILE_SIZE;
    const y0 = (ty - radius) * TILE_SIZE;
    const size = (2 * radius + 1) * TILE_SIZE;
    const g = this.scene.add.graphics().setDepth(-0.4);
    g.fillStyle(0x9be04a, 0.18).fillRect(x0, y0, size, size);
    g.lineStyle(3, 0x9be04a, 0.9).strokeRect(x0 + 1, y0 + 1, size - 2, size - 2);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 260, yoyo: true, repeat: 2, onComplete: () => g.destroy() });
  }

  /** A little green pixel cross floating up and fading. */
  private cross(x: number, y: number) {
    const c = this.scene.add.graphics().setDepth(FX_DEPTH);
    const color = Phaser.Utils.Array.GetRandom([0x5ee07a, 0x9cf5a8, 0xffffff]);
    c.fillStyle(0x1e6b2e, 1).fillRect(-4, -2, 8, 4).fillRect(-2, -4, 4, 8); // dark outline
    c.fillStyle(color, 1).fillRect(-3, -1, 6, 2).fillRect(-1, -3, 2, 6);
    c.setPosition(x, y);
    this.scene.tweens.add({ targets: c, y: y - Phaser.Math.Between(26, 44), alpha: 0, duration: Phaser.Math.Between(600, 900), onComplete: () => c.destroy() });
  }

  /** A pixel ember: moves by (vx, vy) over `ms` and fades. */
  private ember(x: number, y: number, vx: number, vy: number, size: number, ms: number) {
    const color = Phaser.Utils.Array.GetRandom([0xff3a10, 0xff7a1a, 0xffb040, 0xffe070]);
    const e = this.scene.add
      .rectangle(x + Phaser.Math.Between(-4, 4), y + Phaser.Math.Between(-4, 4), size, size, color)
      .setDepth(FX_DEPTH);
    this.scene.tweens.add({ targets: e, x: e.x + vx, y: e.y + vy - 12, alpha: 0, duration: ms, ease: "Quad.easeOut", onComplete: () => e.destroy() });
  }

  /** Burnt ground on one tile: dark pixel blotches that fade after SCORCH_MS. */
  private scorch(x: number, y: number) {
    const g = this.scene.add.graphics().setDepth(-0.5); // above the roads, under everything else
    const px = 4; // blotch pixel size
    for (let i = 0; i < 26; i++) {
      g.fillStyle(Math.random() < 0.7 ? 0x1a1410 : 0x3a2618, Phaser.Math.FloatBetween(0.25, 0.55));
      g.fillRect(x + Phaser.Math.Between(0, TILE_SIZE / px - 2) * px, y + Phaser.Math.Between(0, TILE_SIZE / px - 2) * px, px * Phaser.Math.Between(1, 3), px * Phaser.Math.Between(1, 2));
    }
    this.scene.tweens.add({ targets: g, alpha: 0, delay: SCORCH_MS - 1500, duration: 1500, onComplete: () => g.destroy() });
  }

  /** The comic "KABOOM!" over the blast, in the style of the attack bursts (src/fx.ts). */
  private boom(x: number, y: number) {
    const burst = this.scene.add.graphics();
    const points: Phaser.Math.Vector2[] = [];
    const spikes = 16;
    for (let i = 0; i < spikes * 2; i++) {
      const rr = i % 2 ? 26 : 46;
      const a = (i / (spikes * 2)) * Math.PI * 2;
      points.push(new Phaser.Math.Vector2(Math.cos(a) * rr * 1.3, Math.sin(a) * rr));
    }
    burst.fillStyle(0xffb020).fillPoints(points, true);
    burst.lineStyle(3, 0xc81e10).strokePoints(points, true);
    const text = this.scene.add
      .text(0, 0, t("fx.boom"), {
        fontFamily: "Impact, 'Arial Black', sans-serif",
        fontSize: "24px",
        fontStyle: "bold",
        color: "#c81e10",
        stroke: "#fff6c0",
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    const fx = this.scene.add.container(x, y - 10, [burst, text]).setDepth(FX_DEPTH + 1).setAngle(Phaser.Math.Between(-12, 12)).setScale(0.3);
    this.scene.tweens.add({ targets: fx, scale: 1, duration: 140, ease: "Back.easeOut" });
    this.scene.tweens.add({ targets: fx, alpha: 0, delay: 650, duration: 220, onComplete: () => fx.destroy() });
  }
}
