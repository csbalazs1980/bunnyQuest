// The enemies' pictures: sprite sheets in src/assets/characters that you can edit in any pixel-art editor,
// like the bunny (src/bunnySprite.ts). Drawn ENEMY_SCALE times bigger.
//
//   rat.png, knight.png, king.png  and their zombies  zrat.png, zknight.png, zking.png
//   20 frames each, left to right (each frame ENEMY_SHEETS[kind].w × .h pixels):
//      0  front: standing      1-4  front: walking   (walking down, also down+left/right)
//      5  back: standing       6-9  back: walking    (walking straight up)
//     10  right: standing    11-14  right: walking   (walking right, also up+right)
//     15  left: standing     16-19  left: walking    (walking left, also up+left)
//   The walk cycles: step, stand, other step, stand.
//
// Which way they face comes from how they move (src/facing.ts: the same rule as the bunny), and they
// turn toward whoever they attack. Changing a frame size? Update ENEMY_SHEETS; moving frames? ENEMY_FRAMES.
import Phaser from "phaser";
import { animateFacing, createWalkAnims, type Facing, type ViewFrames } from "./facing";
import { baseKind } from "../../shared/enemies";
import ratUrl from "./assets/characters/rat.png";
import zratUrl from "./assets/characters/zrat.png";
import knightUrl from "./assets/characters/knight.png";
import zknightUrl from "./assets/characters/zknight.png";
import kingUrl from "./assets/characters/king.png";
import zkingUrl from "./assets/characters/zking.png";

export const ENEMY_SCALE = 3;

/** Each sheet's picture and frame size (pixels, before scaling). */
export const ENEMY_SHEETS: Record<string, { url: string; w: number; h: number }> = {
  rat: { url: ratUrl, w: 16, h: 9 },
  zrat: { url: zratUrl, w: 16, h: 9 },
  knight: { url: knightUrl, w: 14, h: 34 },
  zknight: { url: zknightUrl, w: 14, h: 34 },
  king: { url: kingUrl, w: 14, h: 36 },
  zking: { url: zkingUrl, w: 14, h: 36 },
};

export const ENEMY_FRAMES: Record<Facing, ViewFrames> = {
  front: { idle: 0, walk: { start: 1, end: 4 } },
  back: { idle: 5, walk: { start: 6, end: 9 } },
  right: { idle: 10, walk: { start: 11, end: 14 } },
  left: { idle: 15, walk: { start: 16, end: 19 } },
};

/** Walk cycle speed (frames per second): rats scurry, crusaders march. */
const WALK_FPS: Record<string, number> = { rat: 12, knight: 7, king: 7 };

export function loadEnemies(scene: Phaser.Scene) {
  for (const [kind, s] of Object.entries(ENEMY_SHEETS)) scene.load.spritesheet(kind, s.url, { frameWidth: s.w, frameHeight: s.h });
}

/** Call once in create(): the walk animations of every enemy kind, in every direction. */
export function setupEnemies(scene: Phaser.Scene) {
  for (const kind of Object.keys(ENEMY_SHEETS)) createWalkAnims(scene, kind, `${kind}-walk`, ENEMY_FRAMES, WALK_FPS[baseKind(kind)] ?? 8);
}

/** Walks (or stands) the way the enemy faces; `facing` turns it first. Call every frame. */
export function animateEnemy(sprite: Phaser.GameObjects.Sprite, kind: string, moving: boolean, facing?: Facing) {
  animateFacing(sprite, `${kind}-walk`, ENEMY_FRAMES, moving, facing);
}

/**
 * Killed: lies on the ground as seen from the side it faced (front and back fall to the right). Crusaders
 * fall over (turned 90°, which keeps the pixels crisp), rats flip belly up.
 */
export function fallDead(sprite: Phaser.GameObjects.Sprite, tall: boolean, facing: Facing) {
  const left = facing === "left";
  sprite.anims.stop();
  sprite.setFrame(ENEMY_FRAMES[left ? "left" : "right"].idle);
  if (tall) sprite.setAngle(left ? -90 : 90);
  else sprite.setFlipY(true);
}
