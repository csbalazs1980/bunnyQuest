// Minimap window: a small picture of the whole world with a red dot for our bunny.
import type { MapData } from "../../../shared/world";
import { UiWindow } from "./window";

const SIZE = 200; // on-screen size in pixels

export class Minimap {
  readonly window: UiWindow;
  private dot: HTMLDivElement;

  constructor(map: MapData) {
    this.window = new UiWindow({ id: "minimap", titleKey: "window.map", hotkey: "M" });

    const frame = document.createElement("div");
    frame.className = "minimap-frame";
    // Fits in SIZE x SIZE keeping the map's shape (a 600 x 800 map gives a 150 x 200 minimap)
    const longest = Math.max(map.width, map.height);
    frame.style.width = `${Math.round((SIZE * map.width) / longest)}px`;
    frame.style.height = `${Math.round((SIZE * map.height) / longest)}px`;
    frame.append(drawMap(map));
    this.dot = document.createElement("div");
    this.dot.className = "minimap-dot";
    this.dot.hidden = true;
    frame.append(this.dot);
    this.window.body.append(frame);
  }

  /** Position of our bunny as a fraction of the world size (0..1 on each axis). */
  setPlayer(fx: number, fy: number) {
    this.dot.hidden = false;
    this.dot.style.left = `${fx * 100}%`;
    this.dot.style.top = `${fy * 100}%`;
  }
}

/**
 * Renders the map at roughly SIZE x SIZE pixels. One minimap pixel covers f x f tiles; roads,
 * cities and rivers win over other terrain in that block so thin features don't disappear.
 */
function drawMap(map: MapData): HTMLCanvasElement {
  const { width, height, terrain, rows, roads, road } = map;
  const f = Math.max(1, Math.ceil(Math.max(width, height) / SIZE));
  const w = Math.ceil(width / f);
  const h = Math.ceil(height / f);
  const priority = (t: string) => ({ C: 3, R: 2 } as Record<string, number>)[t] ?? 0;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.className = "minimap-canvas";
  const ctx = canvas.getContext("2d")!;
  for (let my = 0; my < h; my++) {
    for (let mx = 0; mx < w; mx++) {
      let color = "#000";
      let best = -1;
      for (let ty = my * f; ty < Math.min(height, (my + 1) * f); ty++) {
        for (let tx = mx * f; tx < Math.min(width, (mx + 1) * f); tx++) {
          const p = roads[ty][tx] !== "." ? 4 : priority(rows[ty][tx]);
          if (p > best) {
            best = p;
            color = p === 4 ? road.color : terrain[rows[ty][tx]].color;
          }
        }
      }
      ctx.fillStyle = color;
      ctx.fillRect(mx, my, 1, 1);
    }
  }
  return canvas;
}
