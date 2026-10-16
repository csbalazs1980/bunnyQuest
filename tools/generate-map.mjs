// Generates shared/map.json: a simple island world made of 5 terrain types.
// Usage: node tools/generate-map.mjs [seed] [size]   e.g. "42 400" (same seed + size => same map)
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const seed = Number(process.argv[2] ?? 1337);
const W = Number(process.argv[3] ?? 400), H = W;

// Everything below scales with the map size (K = 1 for a 100x100 map, 4 for 400x400)
const K = W / 100;
const CITY_COUNT = Math.round(15 * K); // 60 on a 400x400 map
const CITY_SPACING = 16 * Math.sqrt(K); // minimum distance between city centers, in tiles
const RIVER_COUNT = Math.round(3 * K);
const RIVER_SPACING = 25 * Math.sqrt(K);
const SWAMP_COUNT = 2;
const SWAMP_RADIUS = 6 * K; // tiles; edges are ragged
const SUMMIT_COUNT = 5;
const SUMMIT_SPACING = 30; // tiles between peaks
const SUMMIT_RADIUS = 2 * K; // average snowcap radius in tiles

// Small binary min-heap of [priority, value] pairs (used by rivers and road pathfinding)
class MinHeap {
  items = [];
  get size() { return this.items.length; }
  push(p, v) {
    const h = this.items; h.push([p, v]);
    for (let i = h.length - 1; i > 0;) { const q = (i - 1) >> 1; if (h[q][0] <= h[i][0]) break; [h[q], h[i]] = [h[i], h[q]]; i = q; }
  }
  pop() {
    const h = this.items, top = h[0], last = h.pop();
    if (h.length) {
      h[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < h.length && h[l][0] < h[m][0]) m = l;
        if (r < h.length && h[r][0] < h[m][0]) m = r;
        if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m;
      }
    }
    return top;
  }
}

// ---- tiny seeded RNG + value noise -------------------------------------
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(seed);

function makeNoise(cell) {
  const gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2;
  const grid = Array.from({ length: gw * gh }, rand);
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const gx = x / cell, gy = y / cell;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const tx = smooth(gx - x0), ty = smooth(gy - y0);
    const g = (i, j) => grid[(j * gw + i) % grid.length];
    const a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * tx;
    const b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * tx;
    return a + (b - a) * ty;
  };
}
// Big shapes scale with the map, the finer octaves add coastline/terrain detail at any size
const octaves = [[20 * K, 0.5], [9 * K, 0.25], [4 * K, 0.13], [6, 0.08], [3, 0.04]].map(([cell, w]) => [makeNoise(cell), w]);
const fbm = (x, y) => octaves.reduce((sum, [n, w]) => sum + n(x, y) * w, 0);
const forestNoise = makeNoise(11 * Math.sqrt(K)), forestDetail = makeNoise(4);

// ---- elevation: noise shaped into an island ----------------------------
const elev = [];
for (let y = 0; y < H; y++) {
  elev.push([]);
  for (let x = 0; x < W; x++) {
    const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
    const edge = Math.max(Math.abs(dx), Math.abs(dy)) ** 3 * 0.6 + Math.hypot(dx, dy) * 0.35;
    elev[y].push(fbm(x, y) + 0.35 - edge);
  }
}

// Thresholds by percentage so every seed gives a similar mix of terrain
const sorted = elev.flat().sort((a, b) => a - b);
const pct = (p) => sorted[Math.floor(sorted.length * p)];
const SEA_LEVEL = pct(0.38); // ~38% water
const HILL_LEVEL = pct(0.9); // ~10% hills (the highest ground)

// G = grass, T = trees, H = hills, W = sea (R = river is added below)
const forestValue = (x, y) => forestNoise(x, y) * 0.75 + forestDetail(x, y) * 0.25;
const lowland = [];
elev.forEach((row, y) => row.forEach((e, x) => { if (e >= SEA_LEVEL && e <= HILL_LEVEL) lowland.push(forestValue(x, y)); }));
lowland.sort((a, b) => a - b);
const FOREST_LEVEL = lowland[Math.floor(lowland.length * 0.75)]; // ~25% of lowland is forest

const tiles = elev.map((row, y) =>
  row.map((e, x) => {
    if (e < SEA_LEVEL) return "W";
    if (e > HILL_LEVEL) return "H";
    return forestValue(x, y) > FOREST_LEVEL ? "T" : "G";
  })
);

// ---- rivers: start in the hills and always flow down to the sea ----------------------
// "Height above sea" for every tile: the cheapest path cost to the sea, where each step costs
// 1 + noise. Following it strictly downhill always ends at the coast, and the noise makes the
// rivers meander instead of running in straight lines.
const meander = makeNoise(6);
const seaDist = new Float64Array(W * H).fill(Infinity);
{
  const heap = new MinHeap();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tiles[y][x] === "W") { seaDist[y * W + x] = 0; heap.push(0, y * W + x); }
  while (heap.size) {
    const [d, i] = heap.pop();
    if (d > seaDist[i]) continue;
    const x = i % W, y = (i - x) / W;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const nd = d + 1 + meander(nx, ny) * 4;
      if (nd < seaDist[ny * W + nx]) { seaDist[ny * W + nx] = nd; heap.push(nd, ny * W + nx); }
    }
  }
}

function carveRiver(sx, sy) {
  let x = sx, y = sy;
  while (tiles[y][x] !== "W") {
    if (tiles[y][x] === "R" && (x !== sx || y !== sy)) return; // joined another river
    tiles[y][x] = "R";
    let best = null;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (!best || seaDist[ny * W + nx] < seaDist[best[1] * W + best[0]]) best = [nx, ny];
    }
    [x, y] = best;
  }
}
const hillTiles = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tiles[y][x] === "H") hillTiles.push([x, y]);
hillTiles.sort((a, b) => elev[b[1]][b[0]] - elev[a[1]][a[0]]);
const sources = [];
for (const [x, y] of hillTiles) {
  if (sources.length >= RIVER_COUNT) break;
  if (Math.hypot(x - W / 2, y - H / 2) < 8) continue; // keep the spawn area dry
  if (sources.some(([sx, sy]) => Math.hypot(x - sx, y - sy) < RIVER_SPACING)) continue; // spread rivers out
  sources.push([x, y]);
}
sources.forEach(([x, y]) => carveRiver(x, y));

// ---- summits: a few separate snow-capped peaks on the hills ------------------------------
// Pick the highest hill points that are far enough apart, then put a ragged snowcap on each.
const peakNoise = makeNoise(3);
const hillTiles2 = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tiles[y][x] === "H") hillTiles2.push([x, y]);
hillTiles2.sort((a, b) => elev[b[1]][b[0]] - elev[a[1]][a[0]]);
const peaks = [];
for (const [x, y] of hillTiles2) {
  if (peaks.length >= SUMMIT_COUNT) break;
  if (peaks.some((p) => Math.hypot(p.x - x, p.y - y) < SUMMIT_SPACING)) continue;
  peaks.push({ x, y, r: SUMMIT_RADIUS * (0.6 + rand() * 0.8) }); // peaks of different sizes
}
for (const p of peaks) {
  for (let y = Math.floor(p.y - p.r * 1.5); y <= p.y + p.r * 1.5; y++)
    for (let x = Math.floor(p.x - p.r * 1.5); x <= p.x + p.r * 1.5; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H || tiles[y][x] !== "H") continue;
      if (Math.hypot(x - p.x, y - p.y) / p.r + (peakNoise(x, y) - 0.5) * 0.8 < 1) tiles[y][x] = "N";
    }
}

// ---- swamps: SWAMP_COUNT irregular blobs on low, flat ground away from the middle ---------
const swampNoise = makeNoise(4);
const swamps = [];
for (let tries = 0; swamps.length < SWAMP_COUNT && tries < 5000; tries++) {
  const x = Math.floor(rand() * W), y = Math.floor(rand() * H);
  if (!"GT".includes(tiles[y][x]) || elev[y][x] > SEA_LEVEL + (HILL_LEVEL - SEA_LEVEL) * 0.35) continue; // lowland only
  if (Math.hypot(x - W / 2, y - H / 2) < W * 0.15) continue; // not next to the spawn town
  if (swamps.some((s) => Math.hypot(s.x - x, s.y - y) < W * 0.3)) continue; // far from each other
  swamps.push({ x, y });
}
for (const s of swamps) {
  for (let y = Math.floor(s.y - SWAMP_RADIUS * 1.5); y <= s.y + SWAMP_RADIUS * 1.5; y++)
    for (let x = Math.floor(s.x - SWAMP_RADIUS * 1.5); x <= s.x + SWAMP_RADIUS * 1.5; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H || !"GT".includes(tiles[y][x])) continue;
      // Distance from the center, made ragged with noise
      if (Math.hypot(x - s.x, y - s.y) / SWAMP_RADIUS + (swampNoise(x, y) - 0.5) * 0.9 < 1) tiles[y][x] = "S";
    }
}

// ---- cities: CITY_COUNT grey blobs of 1-8 tiles, the first one in the middle is the spawn town ----
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N E S W
const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const isLand = (x, y) => inMap(x, y) && "GTH".includes(tiles[y][x]);

// Only build on land connected to the middle of the island (no cities on tiny islets)
const reachable = new Set();
{
  let sx = W / 2, sy = H / 2;
  while (!isLand(sx, sy)) sx++;
  const queue = [[sx, sy]];
  reachable.add(`${sx},${sy}`);
  while (queue.length) {
    const [x, y] = queue.pop();
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (inMap(nx, ny) && tiles[ny][nx] !== "W" && !reachable.has(k)) { reachable.add(k); queue.push([nx, ny]); }
    }
  }
}

const cities = [];
function placeCity(x, y, size) {
  const cells = [[x, y]];
  tiles[y][x] = "C";
  for (let tries = 0; cells.length < size && tries < 200; tries++) {
    const [bx, by] = cells[Math.floor(rand() * cells.length)];
    const [dx, dy] = DIRS[Math.floor(rand() * 4)];
    if (isLand(bx + dx, by + dy)) { tiles[by + dy][bx + dx] = "C"; cells.push([bx + dx, by + dy]); }
  }
  cities.push({ x, y, size: cells.length, cells });
}

const candidates = [...reachable].map((k) => k.split(",").map(Number)).filter(([x, y]) => isLand(x, y));
let spawnTile = candidates.reduce((a, b) => (Math.hypot(b[0] - W / 2, b[1] - H / 2) < Math.hypot(a[0] - W / 2, a[1] - H / 2) ? b : a));
placeCity(spawnTile[0], spawnTile[1], 8);
for (let tries = 0; cities.length < CITY_COUNT && tries < 20000; tries++) {
  const [x, y] = candidates[Math.floor(rand() * candidates.length)];
  if (!isLand(x, y) || cities.some((c) => Math.hypot(c.x - x, c.y - y) < CITY_SPACING)) continue;
  placeCity(x, y, 1 + Math.floor(rand() * 8));
}

// ---- roads: cheapest paths between cities (a minimum spanning tree) -----------------------
// Roads go in a separate overlay layer. '.' = no road.
const roadBits = Array.from({ length: H }, () => new Array(W).fill(0)); // N=1 E=2 S=4 W=8
const COST = { G: 1, C: 1, T: 2.5, H: 3, R: 6, S: 5, N: 10 }; // rivers are crossed by bridges, but rarely
const TURN_PENALTY = 0.6; // keeps roads straight instead of zig-zagging

function findPath(from, to) {
  // Dijkstra over (tile, heading) so turns can cost extra
  const key = (x, y, d) => (y * W + x) * 4 + d;
  const dist = new Float64Array(W * H * 4).fill(Infinity);
  const prev = new Int32Array(W * H * 4).fill(-1);
  const heap = new MinHeap();
  const isTarget = (x, y) => to.cells.some(([cx, cy]) => cx === x && cy === y);
  for (let d = 0; d < 4; d++) { dist[key(from.x, from.y, d)] = 0; heap.push(0, key(from.x, from.y, d)); }
  while (heap.size) {
    const [c, k] = heap.pop();
    if (c > dist[k]) continue;
    const d = k % 4, t = (k - d) / 4, x = t % W, y = (t - x) / W;
    if (isTarget(x, y)) {
      const path = [];
      for (let cur = k; cur !== -1; cur = prev[cur]) { const tt = Math.floor(cur / 4); path.push([tt % W, Math.floor(tt / W)]); }
      return path.reverse();
    }
    DIRS.forEach(([dx, dy], nd) => {
      const nx = x + dx, ny = y + dy;
      if (!inMap(nx, ny) || tiles[ny][nx] === "W") return;
      const step = roadBits[ny][nx] ? 0.3 : COST[tiles[ny][nx]]; // reuse existing roads
      const nc = c + step + (nd !== d ? TURN_PENALTY : 0);
      const nk = key(nx, ny, nd);
      if (nc < dist[nk]) { dist[nk] = nc; prev[nk] = k; heap.push(nc, nk); }
    });
  }
  return null;
}

// Prim's algorithm: always connect the closest unconnected city to the network
const connected = [cities[0]];
const pending = cities.slice(1);
while (pending.length) {
  let best = null;
  for (const a of connected) for (const b of pending) {
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (!best || d < best.d) best = { a, b, d };
  }
  const path = findPath(best.a, best.b);
  if (path) {
    for (let i = 0; i + 1 < path.length; i++) {
      const [x1, y1] = path[i], [x2, y2] = path[i + 1];
      const dir = DIRS.findIndex(([dx, dy]) => dx === x2 - x1 && dy === y2 - y1);
      roadBits[y1][x1] |= 1 << dir;
      roadBits[y2][x2] |= 1 << ((dir + 2) % 4);
    }
  }
  connected.push(best.b);
  pending.splice(pending.indexOf(best.b), 1);
}

// Bits -> road characters. Cities themselves get no road overlay.
const ROAD_CHAR = { 10: "-", 5: "|", 6: "┌", 12: "┐", 3: "└", 9: "┘", 2: "-", 8: "-", 1: "|", 4: "|" };
const roads = roadBits.map((row, y) =>
  row.map((bits, x) => (!bits || tiles[y][x] === "C" ? "." : ROAD_CHAR[bits] ?? "+")).join("")
);

const out = {
  width: W,
  height: H,
  tileSize: 64,
  seed,
  // Terrain rules shared by client (colors) and server (movement). speed: 1 = normal, 0 = blocked.
  // Tile pictures are found by name in client/src/assets/tiles/ (grass.png or grass1.png, grass2.png ...).
  terrain: {
    G: { name: "grass", color: "#4caf50", speed: 1 },
    T: { name: "trees", color: "#1b5e20", speed: 0.5 },
    H: { name: "hills", color: "#8d673e", speed: 0.6 },
    W: { name: "sea", color: "#1e5aaa", speed: 0 },
    R: { name: "river", color: "#5aa0e6", speed: 0.5 },
    C: { name: "city", color: "#9e9e9e", speed: 1 },
    S: { name: "swamp", color: "#4a3a24", speed: 0.3 },
    N: { name: "summit", color: "#f2f4f7", speed: 0.2 },
  },
  // Road overlay: any road tile moves at this speed, whatever terrain is underneath.
  // Shapes: - | + and curves ┌ ┐ └ ┘ (e.g. ┌ joins the bottom-center to the right-center).
  road: { color: "#d2b48c", speed: 1.2 },
  spawn: { x: spawnTile[0], y: spawnTile[1] },
  cities: cities.map(({ x, y, size }) => ({ x, y, size })),
  rows: tiles.map((r) => r.join("")),
  roads,
};
const file = join(dirname(fileURLToPath(import.meta.url)), "..", "shared", "map.json");
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, JSON.stringify(out, null, 1));
const counts = {};
(out.rows.join("") + out.roads.join("").replace(/\./g, "")).split("").forEach((c) => (counts[c] = (counts[c] ?? 0) + 1));
console.log(`Wrote ${file} (seed ${seed}), ${cities.length} cities`, counts);
