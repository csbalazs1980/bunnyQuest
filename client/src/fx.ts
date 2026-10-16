// Comic combat effects drawn in the game world: attack bursts ("BAM!") and block shields.
// Effects stay attached to their bunny while it moves.
import Phaser from "phaser";
import {
  ATTACK_FLASH_MS,
  burstScale,
  DEFEND_MS,
  shieldScale,
  type AttackLuck,
  type BlockLuck,
} from "../../shared/combat";
import { t, tList } from "./i18n";

interface LiveFx {
  obj: Phaser.GameObjects.Container | Phaser.GameObjects.Text;
  target: Phaser.GameObjects.Sprite;
  angle: number;
  dist: number;
  seq?: number; // our own attacks: to apply the server's luck result to the burst we already show
}

const FX_DEPTH = 200000; // above bunnies (their depth is their y position)

export class FxLayer {
  private live: LiveFx[] = [];

  constructor(private scene: Phaser.Scene) {}

  /** A starburst with a comic word, `dist` pixels from the bunny toward `angle`, for ATTACK_FLASH_MS. */
  attack(
    target: Phaser.GameObjects.Sprite,
    angle: number,
    dist: number,
    word: number, // index into the translated comic words ("fx.words")
    luck: AttackLuck = { double: false, bonus: false },
    seq?: number
  ) {
    const burst = this.scene.add.graphics();
    const spikes = 12;
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 ? 15 : 27;
      const a = (i / (spikes * 2)) * Math.PI * 2;
      points.push(new Phaser.Math.Vector2(Math.cos(a) * r * 1.25, Math.sin(a) * r));
    }
    burst.fillStyle(0xffe14d).fillPoints(points, true);
    burst.lineStyle(3, 0xd6262b).strokePoints(points, true);

    const text = this.scene.add
      .text(0, 0, tList("fx.words")[word] ?? tList("fx.words")[0], {
        fontFamily: "Impact, 'Arial Black', sans-serif",
        fontSize: "17px",
        fontStyle: "bold",
        color: "#d6262b",
        stroke: "#ffffff",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const fx = this.scene.add
      .container(0, 0, [burst, text])
      .setDepth(FX_DEPTH)
      .setAngle(Phaser.Math.Between(-15, 15))
      .setScale(0.4);
    this.track({ obj: fx, target, angle, dist: Math.max(30, dist), seq }, ATTACK_FLASH_MS);
    // Pop in (bigger for a lucky +2 hit), then fade out at the end
    this.scene.tweens.add({ targets: fx, scale: burstScale(luck), duration: 110, ease: "Back.easeOut" });
    this.scene.tweens.add({ targets: fx, alpha: 0, delay: ATTACK_FLASH_MS - 150, duration: 150 });
    if (luck.double) this.addDoubleBadge(fx);
  }

  /** The server rolled luck for one of our attacks: grow the burst we already show and/or add "2x". */
  upgradeAttack(seq: number, luck: AttackLuck) {
    const f = this.live.find((x) => x.seq === seq);
    if (!f || !(f.obj instanceof Phaser.GameObjects.Container)) return;
    if (luck.bonus) this.scene.tweens.add({ targets: f.obj, scale: burstScale(luck), duration: 120, ease: "Back.easeOut" });
    if (luck.double) this.addDoubleBadge(f.obj);
  }

  /** A little "2x" badge on the burst's corner: double damage. */
  private addDoubleBadge(burst: Phaser.GameObjects.Container) {
    if (burst.getByName("double")) return;
    const badge = this.scene.add
      .text(30, -20, "2x", {
        fontFamily: "Impact, 'Arial Black', sans-serif",
        fontSize: "15px",
        color: "#ffffff",
        backgroundColor: "#d6262b",
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5)
      .setName("double");
    burst.add(badge);
    this.scene.tweens.add({ targets: badge, scale: { from: 1.8, to: 1 }, duration: 160, ease: "Back.easeOut" });
  }

  /** A small shield on the bunny's side toward `angle`, for DEFEND_MS. */
  defend(target: Phaser.GameObjects.Sprite, angle: number) {
    // Replace this bunny's previous shield if it's still up (a new block refreshes it)
    this.live
      .filter((f) => f.target === target && f.obj instanceof Phaser.GameObjects.Text)
      .forEach((f) => this.remove(f));
    const shield = this.scene.add.text(0, 0, "🛡️", { fontSize: "24px" }).setOrigin(0.5).setDepth(FX_DEPTH);
    this.track({ obj: shield, target, angle, dist: 30 }, DEFEND_MS);
    this.scene.tweens.add({ targets: shield, alpha: 0.25, delay: DEFEND_MS - 200, duration: 200 });
  }

  /**
   * A block met a hit: the shield pops (or appears facing the attacker, if it isn't shown yet).
   * Lucky blocks make it bigger and the sizes stack: full +25%, perfect +50%, both +75%.
   */
  blocked(target: Phaser.GameObjects.Sprite, towardAttacker: number, luck: BlockLuck) {
    let shield = this.live.find((f) => f.target === target && f.obj instanceof Phaser.GameObjects.Text);
    if (!shield) {
      this.defend(target, towardAttacker);
      shield = this.live[this.live.length - 1];
    }
    const size = shieldScale(luck);
    shield.obj.setDepth(FX_DEPTH + 2); // in front of the attacker's burst, so the block is visible
    this.scene.tweens.add({ targets: shield.obj, scale: { from: size * 1.6, to: size }, duration: 240, ease: "Back.easeOut" });
  }

  /** A hit landed: the bunny blinks (how much it hurt is not shown). */
  hit(target: Phaser.GameObjects.Sprite) {
    this.scene.tweens.add({ targets: target, alpha: { from: 0.3, to: 1 }, duration: 90, repeat: 1 });
  }

  /** A rat bites toward `angle`: a small red "Chomp!" pops up between it and its victim. */
  bite(rat: Phaser.GameObjects.Sprite, angle: number) {
    const text = this.scene.add
      .text(0, 0, t("fx.bite"), {
        fontFamily: "Impact, 'Arial Black', sans-serif",
        fontSize: "13px",
        color: "#ffffff",
        stroke: "#b01e23",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(FX_DEPTH + 1)
      .setAngle(Phaser.Math.Between(-12, 12))
      .setScale(0.5);
    this.track({ obj: text, target: rat, angle, dist: 20 }, 400);
    this.scene.tweens.add({ targets: text, scale: 1, duration: 100, ease: "Back.easeOut" });
    this.scene.tweens.add({ targets: text, alpha: 0, delay: 280, duration: 120 });
  }

  /** Not enough fatigue for the action: a little grey "Too tired!" floats up. */
  tired(target: Phaser.GameObjects.Sprite) {
    this.say(target, t("fx.tooTired"));
  }

  /** A short message floating up over a bunny ("Too tired!", "Not hungry!", ...). */
  say(target: Phaser.GameObjects.Sprite, message: string) {
    const text = this.scene.add
      .text(target.x, target.y - 34, message, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#dddddd",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(FX_DEPTH);
    this.scene.tweens.add({ targets: text, y: text.y - 18, alpha: 0, duration: 700, onComplete: () => text.destroy() });
  }

  /** Keep effects next to their (possibly moving) bunny; call every frame. */
  update() {
    this.live = this.live.filter((f) => f.obj.active && f.target.active);
    for (const f of this.live) {
      f.obj.setPosition(f.target.x + Math.cos(f.angle) * f.dist, f.target.y + Math.sin(f.angle) * f.dist);
    }
  }

  private track(f: LiveFx, lifetimeMs: number) {
    this.live.push(f);
    this.update();
    this.scene.time.delayedCall(lifetimeMs, () => this.remove(f));
  }

  private remove(f: LiveFx) {
    this.scene.tweens.killTweensOf(f.obj);
    f.obj.destroy();
    this.live = this.live.filter((x) => x !== f);
  }
}
