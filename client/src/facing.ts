// Which way a character is seen (bunnies, rats, crusaders, zombies), and its standing / walking frames.
//
// The rule, for every character: walking down (also down+left and down+right) shows the front, walking
// straight up shows the back, walking left or right (also up+left and up+right) shows that side. Left and
// right have their own pictures (nothing is mirrored), so each side can be shaded on its own.
// Animals and crusaders walk in any direction: it is rounded to the nearest of the 8 directions first.
import Phaser from "phaser";

export type Facing = "front" | "back" | "left" | "right";

/** The view for a walking direction (dx, dy: any numbers, y grows downward); undefined when not moving. */
export function facingOf(dx: number, dy: number): Facing | undefined {
  if (!dx && !dy) return undefined;
  const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)); // 0 right, 2 down, -2 up, ±4 left
  if (octant >= 1 && octant <= 3) return "front"; // down-right, down, down-left
  if (octant === -2) return "back"; // straight up
  return Math.abs(octant) >= 3 ? "left" : "right"; // left, up-left / right, up-right
}

/** The view for a direction given as an angle (radians): e.g. toward where an attack goes. */
export const facingOfAngle = (angle: number) => facingOf(Math.cos(angle), Math.sin(angle))!;

/** The view for a bunny's synced `facing` ("up" | "down" | "left" | "right", set by the server). */
export function facingOfServer(facing: string): Facing {
  return facing === "left" || facing === "right" ? facing : facing === "up" ? "back" : "front";
}

/** Where a view's frames are in a sprite sheet: the standing one, and the walk cycle. */
export interface ViewFrames {
  idle: number;
  walk: { start: number; end: number };
}

/** Creates the looping walk animations `${prefix}-front`, `-back`, `-left`, `-right` for a sprite sheet. */
export function createWalkAnims(scene: Phaser.Scene, texture: string, prefix: string, frames: Record<Facing, ViewFrames>, fps: number) {
  for (const facing of Object.keys(frames) as Facing[]) {
    const key = `${prefix}-${facing}`;
    if (scene.anims.exists(key)) continue;
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(texture, frames[facing].walk), frameRate: fps, repeat: -1 });
  }
}

/** Turns a character to `facing` (kept until it walks or turns again). */
export const face = (sprite: Phaser.GameObjects.Sprite, facing: Facing) => sprite.setData("facing", facing);
export const facingNow = (sprite: Phaser.GameObjects.Sprite): Facing => sprite.getData("facing") ?? "front";

/**
 * Plays the walk animation of the way the character faces while it moves, otherwise shows that view's
 * standing frame. `facing` turns it first (leave it out to keep the current view). Call every frame.
 */
export function animateFacing(
  sprite: Phaser.GameObjects.Sprite,
  prefix: string,
  frames: Record<Facing, ViewFrames>,
  moving: boolean,
  facing?: Facing
) {
  if (facing) face(sprite, facing);
  const f = facingNow(sprite);
  if (moving) sprite.play(`${prefix}-${f}`, true); // keeps playing if it already is; switches when the view changes
  else if (sprite.anims.isPlaying || Number(sprite.frame.name) !== frames[f].idle) {
    sprite.anims.stop();
    sprite.setFrame(frames[f].idle);
  }
}
