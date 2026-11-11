// The effects' pictures: sprite sheets in src/assets/effects/, sorted by what they are for, that you can
// edit in any pixel-art editor like the characters. How they move (pop, fly, fade) stays in the code:
// combat in src/fx.ts, magic in src/magicFx.ts, blood in src/blood.ts.
//
//   combat/burst.png            the comic starburst behind an attack word ("BAM!"; the word is text)
//   combat/shield.png           the shield of a block
//   magic/casting-eyes.png      glowing red eyes while drawing on the magic scroll: one frame per bunny.png
//                               frame, laid over the bunny (keep it in step with bunny.png)
//   magic/casting-sparkle.png   sparkles rising from those eyes (dots: one color per frame)
//   magic/fireball.png          the fireball in flight (a looping flicker)
//   magic/fireball-ember.png    its trail and the explosion's sparks (dots)
//   magic/fireball-explosion.png  the blast flashing on the tiles: 0 = the middle tile, 1 = the 8 around it
//   magic/fireball-kaboom.png   the comic burst behind "KABOOM!" (the word is text)
//   magic/fireball-scorch.png   burnt ground on a blasted tile (a random one, sometimes mirrored)
//   magic/healing-beam.png      the beam of light: one tile wide, three tall; its bottom square is the tile
//   magic/healing-cross.png     little crosses floating up (a random one)
//   magic/necromancy-earth.png  the disturbed ground where a body rises
//   magic/necromancy-mist.png   the green mist welling up (dots)
//   magic/necromancy-clod.png   clods of earth flying (dots)
//   magic/necromancy-dust.png   a zombie crumbling to dust (dots)
//   blood/drop.png              flying droplets (dots)
//   blood/splat.png             where a hit lands: frames 0-1 small, 2-3 medium, 4-5 big
//   blood/stain.png             stains on the ground: frames 0-2 tiny, 3-5 small, 6-8 medium, 9-11 large,
//                               12-14 huge (pools use the large and huge ones)
//
// "Dots" are 1 × 1 pixel frames, one color each: the code draws them a few screen pixels big. Every
// other picture is drawn `scale` times bigger. Changing a picture's size: update EFFECTS below.
import Phaser from "phaser";
import { BUNNY_FRAME_H, BUNNY_FRAME_W, BUNNY_SCALE } from "./bunnySprite";
import burstUrl from "./assets/effects/combat/burst.png";
import shieldUrl from "./assets/effects/combat/shield.png";
import eyesUrl from "./assets/effects/magic/casting-eyes.png";
import sparkleUrl from "./assets/effects/magic/casting-sparkle.png";
import fireballUrl from "./assets/effects/magic/fireball.png";
import emberUrl from "./assets/effects/magic/fireball-ember.png";
import explosionUrl from "./assets/effects/magic/fireball-explosion.png";
import kaboomUrl from "./assets/effects/magic/fireball-kaboom.png";
import scorchUrl from "./assets/effects/magic/fireball-scorch.png";
import beamUrl from "./assets/effects/magic/healing-beam.png";
import crossUrl from "./assets/effects/magic/healing-cross.png";
import earthUrl from "./assets/effects/magic/necromancy-earth.png";
import mistUrl from "./assets/effects/magic/necromancy-mist.png";
import clodUrl from "./assets/effects/magic/necromancy-clod.png";
import dustUrl from "./assets/effects/magic/necromancy-dust.png";
import dropUrl from "./assets/effects/blood/drop.png";
import splatUrl from "./assets/effects/blood/splat.png";
import stainUrl from "./assets/effects/blood/stain.png";

/** Each sheet: its picture, frame size (pixels), and how many times bigger it is drawn. */
export const EFFECTS = {
  "combat-burst": { url: burstUrl, w: 24, h: 20, scale: 3 },
  "combat-shield": { url: shieldUrl, w: 9, h: 10, scale: 3 },
  "casting-eyes": { url: eyesUrl, w: BUNNY_FRAME_W, h: BUNNY_FRAME_H, scale: BUNNY_SCALE },
  "casting-sparkle": { url: sparkleUrl, w: 1, h: 1, scale: 3 },
  fireball: { url: fireballUrl, w: 11, h: 11, scale: 3 },
  "fireball-ember": { url: emberUrl, w: 1, h: 1, scale: 3 },
  "fireball-explosion": { url: explosionUrl, w: 21, h: 21, scale: 3 },
  "fireball-kaboom": { url: kaboomUrl, w: 42, h: 32, scale: 3 },
  "fireball-scorch": { url: scorchUrl, w: 21, h: 21, scale: 3 },
  "healing-beam": { url: beamUrl, w: 21, h: 64, scale: 3 },
  "healing-cross": { url: crossUrl, w: 5, h: 5, scale: 2 },
  "necromancy-earth": { url: earthUrl, w: 15, h: 6, scale: 3 },
  "necromancy-mist": { url: mistUrl, w: 1, h: 1, scale: 4 },
  "necromancy-clod": { url: clodUrl, w: 1, h: 1, scale: 4 },
  "necromancy-dust": { url: dustUrl, w: 1, h: 1, scale: 4 },
  "blood-drop": { url: dropUrl, w: 1, h: 1, scale: 3 },
  "blood-splat": { url: splatUrl, w: 17, h: 17, scale: 3 },
  "blood-stain": { url: stainUrl, w: 60, h: 32, scale: 3 },
} satisfies Record<string, { url: string; w: number; h: number; scale: number }>;
export type EffectKey = keyof typeof EFFECTS;

/** Frames per second of the fireball's flicker. */
const FIREBALL_FPS = 12;

export function loadEffects(scene: Phaser.Scene) {
  for (const [key, s] of Object.entries(EFFECTS)) scene.load.spritesheet(key, s.url, { frameWidth: s.w, frameHeight: s.h });
}

/** Call once in create(): the looping animations. */
export function setupEffects(scene: Phaser.Scene) {
  if (!scene.anims.exists("fireball-fly")) {
    scene.anims.create({ key: "fireball-fly", frames: scene.anims.generateFrameNumbers("fireball", {}), frameRate: FIREBALL_FPS, repeat: -1 });
  }
}

/** How many frames a sheet has. */
export const frameCount = (scene: Phaser.Scene, key: EffectKey) => Math.max(1, scene.textures.get(key).frameTotal - 1);

/** A random frame of a sheet, or a random one of frames `from`..`to`. */
export function randomFrame(scene: Phaser.Scene, key: EffectKey, from = 0, to = frameCount(scene, key) - 1) {
  return Phaser.Math.Between(from, Math.min(to, frameCount(scene, key) - 1));
}

/** An effect picture at (x, y), drawn at its scale; `frame`: which one (default: a random one). */
export function effectImage(scene: Phaser.Scene, key: EffectKey, x: number, y: number, frame?: number) {
  return scene.add.image(x, y, key, frame ?? randomFrame(scene, key)).setScale(EFFECTS[key].scale);
}

/** A dot (a random color from a 1 × 1 sheet), `size` screen pixels big. */
export function dot(scene: Phaser.Scene, key: EffectKey, x: number, y: number, size: number) {
  return scene.add.image(x, y, key, randomFrame(scene, key)).setScale(size);
}
