// Cartoon speech bubbles over bunnies: white rounded box, black outline, black text, a tail.
// Each bunny can have several; the newest sits right above the name tag and pushes older ones up.
import Phaser from "phaser";
import { CHAT_MAX_BUBBLES, chatDurationMs } from "../../shared/chat";

interface Bubble {
  container: Phaser.GameObjects.Container;
  box: Phaser.GameObjects.Graphics;
  width: number;
  height: number;
  hasTail: boolean;
}

const DEPTH = 150000; // above bunnies and names, below combat effects
const MAX_TEXT_WIDTH = 210;
const PAD_X = 9;
const PAD_Y = 7;
const TAIL = 8; // tail height
const GAP = 4; // space between stacked bubbles
const FADE_MS = 250;
/** Bundled readable font (see @font-face in index.html), emoji fall back to the system emoji font. */
const FONT_FAMILY = "BunnyChat, 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";

export class BubbleLayer {
  private bubbles = new Map<Phaser.GameObjects.Sprite, Bubble[]>();

  constructor(private scene: Phaser.Scene) {
    // Load the font before the first bubble; text drawn before it is ready would stay in a fallback font
    document.fonts?.load("600 15px BunnyChat").catch(() => {});
  }

  /** Shows a message over a bunny for 5, 10 or 20 seconds depending on its length. */
  say(target: Phaser.GameObjects.Sprite, message: string) {
    const text = this.scene.add
      .text(0, 0, message, {
        fontFamily: FONT_FAMILY,
        fontSize: "15px",
        fontStyle: "600",
        color: "#000000",
        wordWrap: { width: MAX_TEXT_WIDTH, useAdvancedWrap: true },
        align: "center",
      })
      .setOrigin(0.5, 0.5)
      // Sharp on high-DPI / scaled displays (Windows 125%, 150%, ...)
      .setResolution(Math.max(1, Math.ceil(window.devicePixelRatio || 1)));
    // The game uses pixel-art (blocky) scaling; text looks much better smoothed
    text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const width = Math.max(28, text.width + PAD_X * 2);
    const height = text.height + PAD_Y * 2;
    const box = this.scene.add.graphics();
    const container = this.scene.add.container(target.x, target.y, [box, text]).setDepth(DEPTH);
    const bubble: Bubble = { container, box, width, height, hasTail: false };

    const list = this.bubbles.get(target) ?? [];
    list.push(bubble); // newest last (lowest, right above the bunny)
    // Too many? The oldest (top) bubbles fade out right away
    while (list.length > CHAT_MAX_BUBBLES) {
      const oldest = list.shift()!;
      this.scene.tweens.killTweensOf(oldest.container);
      this.scene.tweens.add({ targets: oldest.container, alpha: 0, duration: 150, onComplete: () => oldest.container.destroy() });
    }
    this.bubbles.set(target, list);
    this.redrawTails(list);
    this.update();

    // Pop in, stay, fade out, then remove
    container.setScale(0.6);
    this.scene.tweens.add({ targets: container, scale: 1, duration: 140, ease: "Back.easeOut" });
    this.scene.time.delayedCall(chatDurationMs(message) - FADE_MS, () => {
      if (!container.active) return; // already pushed out by newer messages
      this.scene.tweens.add({ targets: container, alpha: 0, duration: FADE_MS, onComplete: () => this.remove(target, bubble) });
    });
  }

  /** Removes all bubbles of a bunny (e.g. when that player leaves). */
  clear(target: Phaser.GameObjects.Sprite) {
    this.bubbles.get(target)?.forEach((b) => b.container.destroy());
    this.bubbles.delete(target);
  }

  /** Keeps the bubbles stacked above their (possibly moving) bunny; call every frame. */
  update() {
    for (const [target, list] of this.bubbles) {
      if (!target.active) {
        this.clear(target);
        continue;
      }
      // Bottom of the lowest bubble: just above the name tag
      let bottom = target.y - target.displayHeight * target.originY - 22; // above the head (tall sprites stand on their feet)
      for (let i = list.length - 1; i >= 0; i--) {
        const b = list[i];
        const tail = b.hasTail ? TAIL : 0;
        b.container.setPosition(target.x, bottom - tail - b.height / 2);
        bottom -= tail + b.height + GAP;
      }
    }
  }

  private remove(target: Phaser.GameObjects.Sprite, bubble: Bubble) {
    if (bubble.container.active) bubble.container.destroy();
    const list = (this.bubbles.get(target) ?? []).filter((b) => b !== bubble);
    if (list.length) {
      this.bubbles.set(target, list);
      this.redrawTails(list);
    } else this.bubbles.delete(target);
  }

  /** Only the newest (lowest) bubble has the little tail pointing at the bunny. */
  private redrawTails(list: Bubble[]) {
    list.forEach((b, i) => {
      const tail = i === list.length - 1;
      if (tail === b.hasTail && b.box.commandBuffer.length) return;
      b.hasTail = tail;
      const g = b.box.clear();
      const w = b.width;
      const h = b.height;
      g.fillStyle(0xffffff).lineStyle(2, 0x000000);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 9).strokeRoundedRect(-w / 2, -h / 2, w, h, 9);
      if (tail) {
        // A small triangle under the box, drawn over the outline so it joins the bubble
        g.fillTriangle(-6, h / 2 - 1, 6, h / 2 - 1, 0, h / 2 + TAIL);
        g.beginPath();
        g.moveTo(-6, h / 2);
        g.lineTo(0, h / 2 + TAIL);
        g.lineTo(6, h / 2);
        g.strokePath();
      }
    });
  }
}
