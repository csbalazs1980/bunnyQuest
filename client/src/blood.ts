// Blood: a little pixel splat when a hit does damage. Each player chooses how graphic it is in the
// Options ("Blood": off ... maximum); the choice is only visual and is remembered in the browser.
//
//   off      nothing
//   low      a small splat mark and a few droplets that vanish quickly
//   medium   more droplets, a small stain on the ground that fades after a few seconds
//   high     a big spray, large stains that stay for half a minute, badly hurt characters drip as
//            they walk (already at half health), and a pool where someone is knocked out
//   maximum  comically over the top: every hit sprays blood 4-5 tiles around, with huge stains
import Phaser from "phaser";

export const BLOOD_LEVELS = ["off", "low", "medium", "high", "max"] as const;
export type BloodLevel = (typeof BLOOD_LEVELS)[number];

const STORAGE_KEY = "bq-blood";
let level: BloodLevel = loadLevel();
const listeners = new Set<() => void>();

function loadLevel(): BloodLevel {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (BLOOD_LEVELS as readonly string[]).includes(saved)) return saved as BloodLevel;
  } catch {
    /* storage unavailable */
  }
  return "medium";
}

export const getBloodLevel = () => level;

export function setBloodLevel(next: BloodLevel) {
  if (next === level) return;
  level = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((fn) => fn());
}

export function onBloodLevelChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** What each level shows. */
const LOOK: Record<BloodLevel, {
  drops: number; // droplets flying off per hit
  spread: number; // how far they fly (px)
  stain: number; // ground stain size (0 = none)
  stainMs: number; // how long stains stay before fading
  dripBelow: number; // drip while walking below this share of HP (0 = never)
  pool: boolean; // a pool under knocked-out bunnies and killed rats
  mark: number; // size of the splat mark where the hit landed (0 = none)
  cone: number; // droplets fly within this angle (radians) to each side of "away from the hit"
  flightMs: number; // how long a droplet flies
  bigDrops: number; // share of droplets that are bigger (2-3 pixels)
}> = {
  off: { drops: 0, spread: 0, stain: 0, stainMs: 0, dripBelow: 0, pool: false, mark: 0, cone: 0, flightMs: 0, bigDrops: 0 },
  low: { drops: 5, spread: 18, stain: 0.6, stainMs: 600, dripBelow: 0, pool: false, mark: 1, cone: 0.9, flightMs: 380, bigDrops: 0.2 },
  medium: { drops: 8, spread: 24, stain: 1, stainMs: 4000, dripBelow: 0, pool: false, mark: 1.4, cone: 0.9, flightMs: 380, bigDrops: 0.25 },
  high: { drops: 22, spread: 44, stain: 2.2, stainMs: 30000, dripBelow: 0.5, pool: true, mark: 2.4, cone: 0.9, flightMs: 380, bigDrops: 0.25 },
  // 4-5 tiles (256-320 px) of spray, almost all around, in big blobs. Deliberately silly.
  max: { drops: 90, spread: 300, stain: 9, stainMs: 45000, dripBelow: 0.75, pool: true, mark: 6, cone: 1.6, flightMs: 650, bigDrops: 0.6 },
};

const COLORS = [0xb3201f, 0x9b1b1b, 0xc8302b, 0x7d1414];
const STAIN_COLOR = 0x6e1010;
const PX = 3; // one "pixel" of the pixel art
const MAX_STAINS = 400; // oldest stains disappear first
const GROUND_DEPTH = -0.5; // above the terrain and roads, below every character
const DROP_DEPTH = 200001; // flying droplets: above characters

export class BloodLayer {
  private stains: Phaser.GameObjects.Graphics[] = [];

  constructor(private scene: Phaser.Scene) {
    // Turning blood off (or down to low) clears what is already on the ground
    onBloodLevelChange(() => {
      if (level === "off" || level === "low") this.clearStains();
    });
  }

  /** A hit that did damage: droplets fly off `target`, away from `fromAngle` (the direction the hit came from). */
  splat(target: { x: number; y: number }, fromAngle: number) {
    const look = LOOK[level];
    if (!look.drops) return;
    const away = fromAngle + Math.PI;
    // The splat mark: a burst of pixels on the side where the hit landed, gone in a moment
    const hx = target.x + Math.cos(fromAngle) * 8;
    const hy = target.y - 4 + Math.sin(fromAngle) * 6;
    const mark = this.scene.add.graphics({ x: Math.round(hx), y: Math.round(hy) }).setDepth(DROP_DEPTH);
    const r = 4 * look.mark;
    for (let i = 0; i < 6 + look.mark * 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r;
      mark.fillStyle(Phaser.Utils.Array.GetRandom(COLORS)).fillRect(Math.round((Math.cos(a) * d) / PX) * PX, Math.round((Math.sin(a) * d) / PX) * PX, PX, PX);
    }
    mark.setScale(0.5);
    this.scene.tweens.add({ targets: mark, scale: 1, duration: 90, ease: "Back.easeOut" });
    this.scene.tweens.add({ targets: mark, alpha: 0, delay: 250 + 100 * look.mark, duration: 250, onComplete: () => mark.destroy() });

    // Droplets fly off the far side of the body, away from the hit
    const sx = target.x + Math.cos(away) * 10;
    const sy = target.y - 6 + Math.sin(away) * 6;
    for (let i = 0; i < look.drops; i++) {
      const a = away + Phaser.Math.FloatBetween(-look.cone, look.cone);
      const d = look.spread * Phaser.Math.FloatBetween(0.15, 1);
      const size = PX * (Math.random() < look.bigDrops ? Phaser.Math.Between(2, look.drops > 50 ? 4 : 2) : 1);
      const drop = this.scene.add.rectangle(sx, sy, size, size, Phaser.Utils.Array.GetRandom(COLORS)).setDepth(DROP_DEPTH);
      const tx = sx + Math.cos(a) * d;
      const ty = sy + Math.sin(a) * d * 0.6;
      // An arc: out, then down to the ground (far droplets fly a bit longer)
      const ms = look.flightMs * (0.6 + 0.4 * (d / look.spread));
      this.scene.tweens.add({ targets: drop, x: tx, duration: ms, ease: "Quad.easeOut" });
      this.scene.tweens.add({
        targets: drop,
        y: { from: drop.y, to: ty + 14 },
        duration: ms,
        ease: "Back.easeIn",
        onComplete: () => {
          drop.destroy();
          // landing stain (on maximum: as big as the blob that landed)
          const landing = level === "max" ? (size / PX) * 0.8 : Math.max(0.3, look.stain * 0.4);
          if (look.stain && Math.random() < 0.6) this.stain(tx, ty + 14, landing);
        },
      });
    }
    if (look.stain) this.stain(target.x, target.y + 12, look.stain);
  }

  /** A bigger puddle (knocked-out bunny, killed rat), only on the high levels. */
  pool(x: number, y: number) {
    if (!LOOK[level].pool) return;
    this.stain(x, y + 10, LOOK[level].stain * 2.2, 900);
  }

  /** Should a character with this much of its health left drip blood while it walks? */
  drips(hpShare: number): boolean {
    return hpShare > 0 && hpShare < LOOK[level].dripBelow;
  }

  /** One drop on the ground (dripping wound). */
  drip(x: number, y: number) {
    const size = LOOK[level].stain * 0.16; // high: a small drop, maximum: a splotch
    if (size) this.stain(x + Phaser.Math.Between(-6, 6), y + 14, size);
  }

  /** A blotch of pixel squares on the ground, fading away after a while. `growMs`: spreads out slowly. */
  private stain(x: number, y: number, size: number, growMs = 0) {
    const look = LOOK[level];
    const g = this.scene.add.graphics({ x: Math.round(x), y: Math.round(y) }).setDepth(GROUND_DEPTH);
    const blobs = Math.max(1, Math.round(4 * size));
    const radius = 4 * size;
    for (let i = 0; i < blobs; i++) {
      const bx = Math.round(Phaser.Math.FloatBetween(-radius, radius) / PX) * PX;
      const by = Math.round(Phaser.Math.FloatBetween(-radius, radius) * 0.5 / PX) * PX; // flat: it's on the ground
      // small stains: little dashes; big ones (maximum): chunky blobs instead of long stripes
      const w = PX * Phaser.Math.Between(1, Math.max(1, Math.round(Math.min(size, 3) * 1.5)));
      const h = w > PX ? PX * Phaser.Math.Between(1, Math.max(2, Math.round(w / PX / 2))) : PX;
      g.fillStyle(i % 3 ? STAIN_COLOR : COLORS[1], 0.75).fillRect(bx, by, w, h);
    }
    if (growMs) {
      g.setScale(0.3);
      this.scene.tweens.add({ targets: g, scale: 1, duration: growMs, ease: "Quad.easeOut" });
    }
    const fade = Math.min(1500, look.stainMs); // low: a quick fade
    this.scene.tweens.add({ targets: g, alpha: 0, delay: look.stainMs, duration: fade, onComplete: () => this.removeStain(g) });
    this.stains.push(g);
    if (this.stains.length > MAX_STAINS) this.removeStain(this.stains[0]);
  }

  private removeStain(g: Phaser.GameObjects.Graphics) {
    this.scene.tweens.killTweensOf(g);
    g.destroy();
    this.stains = this.stains.filter((s) => s !== g);
  }

  private clearStains() {
    [...this.stains].forEach((g) => this.removeStain(g));
  }
}
