// The bunny's picture: a sprite sheet in src/assets/characters/bunny.png that you can edit in any
// pixel-art editor (Aseprite, Piskel, Paint.NET...). It is white so every player's color can tint it.
//
//   frames, left to right, each BUNNY_FRAME_W × BUNNY_FRAME_H pixels:
//     0  front: standing             (walking down, also down+left/right, and the default)
//     1-4  front: hopping (played in a loop while moving: ears swing, hop up, ears swing back, hop up)
//     5  knocked out (x.x eyes)
//     6  back: standing              (walking straight up)
//     7-10  back: hopping
//     11  side: standing, facing right (flipped for left; walking left/right, also up+left/right)
//     12-15  side: hopping
//   colors: white = fur (tinted), light grey = fur shading (tail), pink = inner ears / nose / cheeks,
//     #222222 = the eyes
//     (the eyes must stay exactly #222222: that's how the glowing red eyes of a spellcaster find them)
//
// The picture is drawn BUNNY_SCALE times bigger. Changing the size of the frames? Update the two numbers
// below; adding or moving frames? Update BUNNY_FRAMES.
import Phaser from "phaser";
import bunnySheetUrl from "./assets/characters/bunny.png";

export const BUNNY_FRAME_W = 15;
export const BUNNY_FRAME_H = 19;
export const BUNNY_SCALE = 3;
export const BUNNY_FRAMES = {
  idle: 0,
  walk: { start: 1, end: 4 },
  knockedOut: 5,
  back: { idle: 6, walk: { start: 7, end: 10 } },
  side: { idle: 11, walk: { start: 12, end: 15 } },
};

/** Which way the bunny is seen: from the front (walking down), the back (walking up) or the side. */
export type BunnyFacing = "front" | "back" | "side";

const VIEW_FRAMES: Record<BunnyFacing, { idle: number; walk: { start: number; end: number } }> = {
  front: BUNNY_FRAMES,
  back: BUNNY_FRAMES.back,
  side: BUNNY_FRAMES.side,
};

/** The view for a walking direction: down (also down+left/right) = front, left/right and up+left/right = side, up = back. */
export function viewOf(dx: number, dy: number): BunnyFacing {
  return dy > 0 ? "front" : dx ? "side" : "back";
}

/** The view for a server-side `facing` ("up" | "down" | "left" | "right"). */
export function viewOfFacing(facing: string): BunnyFacing {
  return facing === "left" || facing === "right" ? "side" : facing === "up" ? "back" : "front";
}
/** Hopping speed (frames per second). */
const WALK_FPS = 10;
const EYE_COLOR = 0x222222;

export function loadBunny(scene: Phaser.Scene) {
  scene.load.spritesheet("bunny", bunnySheetUrl, { frameWidth: BUNNY_FRAME_W, frameHeight: BUNNY_FRAME_H });
}

/** Call once in create(): the hopping animations and the glowing-eyes overlay (see src/magicFx.ts). */
export function setupBunny(scene: Phaser.Scene) {
  for (const view of Object.keys(VIEW_FRAMES) as BunnyFacing[]) {
    const key = `bunny-walk-${view}`;
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers("bunny", VIEW_FRAMES[view].walk),
      frameRate: WALK_FPS,
      repeat: -1,
    });
  }
  makeEyesTexture(scene);
}

/**
 * Plays the hopping animation of `view` while moving, otherwise shows its standing frame. Without a view
 * it keeps the last one (a bunny that stops walking up keeps showing its back). The side view faces
 * right: flip the sprite for left.
 */
export function animateBunny(sprite: Phaser.GameObjects.Sprite, moving: boolean, view?: BunnyFacing) {
  if (view) sprite.setData("view", view);
  const v: BunnyFacing = sprite.getData("view") ?? "front";
  if (moving) {
    sprite.play(`bunny-walk-${v}`, true); // keeps playing if it already is; switches when the view changes
  } else if (sprite.anims.isPlaying || Number(sprite.frame.name) !== VIEW_FRAMES[v].idle) {
    sprite.anims.stop();
    sprite.setFrame(VIEW_FRAMES[v].idle);
  }
}

/** Back to standing, seen from the front (after a knock-out). */
export function resetBunny(sprite: Phaser.GameObjects.Sprite) {
  sprite.setData("view", "front");
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
 * "bunny-eyes": for every frame of the bunny sheet, the eye pixels (#222222) in bright red with a soft
 * glow around them, BUNNY_SCALE times bigger, so it can be laid over a bunny frame by frame.
 */
function makeEyesTexture(scene: Phaser.Scene) {
  if (scene.textures.exists("bunny-eyes")) return;
  const S = BUNNY_SCALE;
  const sheet = scene.textures.get("bunny");
  const frames = sheet.frameTotal - 1; // frameTotal counts the whole image ("__BASE") too
  const tex = scene.textures.createCanvas("bunny-eyes", BUNNY_FRAME_W * S * frames, BUNNY_FRAME_H * S)!;
  const ctx = tex.getContext();
  for (let f = 0; f < frames; f++) {
    const ox = f * BUNNY_FRAME_W * S;
    const eyes: { x: number; y: number }[] = [];
    for (let y = 0; y < BUNNY_FRAME_H; y++) {
      for (let x = 0; x < BUNNY_FRAME_W; x++) {
        const c = scene.textures.getPixel(x, y, "bunny", f);
        if (!c || c.alpha === 0 || c.color !== EYE_COLOR) continue;
        eyes.push({ x: (x + 0.5) * S - (BUNNY_FRAME_W * S) / 2, y: (y + 0.5) * S - (BUNNY_FRAME_H * S) / 2 });
        const px = ox + x * S;
        const py = y * S;
        ctx.fillStyle = "rgba(255, 48, 48, 0.3)"; // a soft glow in a "+" shape...
        ctx.fillRect(px - 2 * S, py, 5 * S, S);
        ctx.fillRect(px, py - 2 * S, S, 5 * S);
        ctx.fillStyle = "rgba(255, 32, 32, 0.45)"; // ...brighter near the eye
        ctx.fillRect(px - S, py - S, 3 * S, 3 * S);
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(px, py, S, S);
        ctx.fillStyle = "#ffe0a0"; // a hot glint
        ctx.fillRect(px + 1, py + 1, 1, 1);
      }
    }
    eyeOffsets[f] = eyes;
    tex.add(f, 0, ox, 0, BUNNY_FRAME_W * S, BUNNY_FRAME_H * S);
  }
  tex.refresh();
}
