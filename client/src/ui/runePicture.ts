// A rune drawn in red ink on a small square of parchment (the Spellbook and the Help's Magic topic).
import { RUNE_SHAPES, type RuneId } from "../../../shared/runes";

export function runePicture(id: RuneId, size: number): HTMLCanvasElement {
  const dpr = window.devicePixelRatio || 1;
  const c = document.createElement("canvas");
  c.className = "rune-picture";
  c.width = c.height = Math.round(size * dpr);
  c.style.width = c.style.height = `${size}px`;
  const ctx = c.getContext("2d")!;
  const strokes = RUNE_SHAPES[id];
  const pts = strokes.flat();
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const pad = c.width * 0.18;
  const scale = (c.width - 2 * pad) / Math.max(maxX - minX, maxY - minY);
  const ox = (c.width - (maxX - minX) * scale) / 2;
  const oy = (c.height - (maxY - minY) * scale) / 2;
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, c.width * 0.07);
  ctx.strokeStyle = "#b3121c";
  for (const s of strokes) {
    ctx.beginPath();
    s.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](ox + (p.x - minX) * scale, oy + (p.y - minY) * scale));
    ctx.stroke();
  }
  return c;
}
