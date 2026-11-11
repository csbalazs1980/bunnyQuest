// The bunny's picture: a sprite sheet in src/assets/characters/bunny.png that you can edit in any
// pixel-art editor (Aseprite, Piskel, Paint.NET...). It is white so every player's color can tint it.
//
//   frames, left to right, each BUNNY_FRAME_W × BUNNY_FRAME_H pixels:
//     0  front: standing             (walking down, also down+left/right, and the default)
//     1-4  front: hopping (played in a loop while moving: ears swing, hop up, ears swing back, hop up)
//     5  knocked out (x.x eyes)
//     6  back: standing              (walking straight up)
//     7-10  back: hopping
//     11  right side: standing       (walking right, also up+right)
//     12-15  right side: hopping
//     16  left side: standing        (walking left, also up+left; its own frames, nothing is mirrored)
//     17-20  left side: hopping
//   colors: white = fur (tinted), light grey = fur shading (tail), pink = inner ears / nose / cheeks,
//     #222222 = the eyes
//     (the eyes must stay exactly #222222: that's where a spellcaster's sparkles rise from; the red glow
//     is assets/effects/magic/casting-eyes.png, one frame per frame here: move the eyes, move the glow)
//   Which view shows when: src/facing.ts (the same rule for every character).
//
// The picture is drawn BUNNY_SCALE times bigger. Changing the size of the frames? Update the two numbers
// below; adding or moving frames? Update BUNNY_FRAMES.
import Phaser from "phaser";
import bunnySheetUrl from "./assets/characters/bunny.png";
import { animateFacing, createWalkAnims, face, type Facing, type ViewFrames } from "./facing";

export const BUNNY_FRAME_W = 15;
export const BUNNY_FRAME_H = 19;
export const BUNNY_SCALE = 3;
export const BUNNY_FRAMES = {
  idle: 0,
  knockedOut: 5,
  views: {
    front: { idle: 0, walk: { start: 1, end: 4 } },
    back: { idle: 6, walk: { start: 7, end: 10 } },
    right: { idle: 11, walk: { start: 12, end: 15 } },
    left: { idle: 16, walk: { start: 17, end: 20 } },
  } satisfies Record<Facing, ViewFrames>,
};
/** Hopping speed (frames per second). */
const WALK_FPS = 10;
const EYE_COLOR = 0x222222;

export function loadBunny(scene: Phaser.Scene) {
  scene.load.spritesheet("bunny", bunnySheetUrl, { frameWidth: BUNNY_FRAME_W, frameHeight: BUNNY_FRAME_H });
}

/** Call once in create(): the hopping animations, and where the eyes are (for a spellcaster's sparkles). */
export function setupBunny(scene: Phaser.Scene) {
  createWalkAnims(scene, "bunny", "bunny-walk", BUNNY_FRAMES.views, WALK_FPS);
  findEyes(scene);
}

/**
 * Hops the way the bunny faces while it moves, otherwise shows that view's standing frame. `facing`
 * turns it first; without it the bunny keeps its view (one that stops walking up keeps showing its back).
 */
export function animateBunny(sprite: Phaser.GameObjects.Sprite, moving: boolean, facing?: Facing) {
  animateFacing(sprite, "bunny-walk", BUNNY_FRAMES.views, moving, facing);
}

/** Back to standing, seen from the front (after a knock-out). */
export function resetBunny(sprite: Phaser.GameObjects.Sprite) {
  face(sprite, "front");
  sprite.anims.stop();
  sprite.setFrame(BUNNY_FRAMES.idle);
}

/** Shows the knocked-out frame (x.x). */
export function knockOutBunny(sprite: Phaser.GameObjects.Sprite) {
  sprite.anims.stop();
  sprite.setFrame(BUNNY_FRAMES.knockedOut);
}

/** Where the eyes are in each frame, relative to the sprite's center, in screen pixels (for the sparkles). */
export const eyeOffsets: { x: number; y: number }[][] = [];

/**
 * Finds the eyes (#222222 pixels) in every bunny frame, for the sparkles of a spellcaster's glowing eyes.
 * The glow itself is a picture: assets/effects/magic/casting-eyes.png (src/effectSprites.ts).
 */
function findEyes(scene: Phaser.Scene) {
  if (eyeOffsets.length) return;
  const S = BUNNY_SCALE;
  const frames = scene.textures.get("bunny").frameTotal - 1; // frameTotal counts the whole image ("__BASE") too
  for (let f = 0; f < frames; f++) {
    const eyes: { x: number; y: number }[] = [];
    for (let y = 0; y < BUNNY_FRAME_H; y++) {
      for (let x = 0; x < BUNNY_FRAME_W; x++) {
        const c = scene.textures.getPixel(x, y, "bunny", f);
        if (c && c.alpha > 0 && c.color === EYE_COLOR) {
          eyes.push({ x: (x + 0.5) * S - (BUNNY_FRAME_W * S) / 2, y: (y + 0.5) * S - (BUNNY_FRAME_H * S) / 2 });
        }
      }
    }
    eyeOffsets[f] = eyes;
  }
}
