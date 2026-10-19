// Hand-edit the world map as pictures, pixel by pixel (one pixel = one tile).
//
//   npm run map:export   shared/map.json -> map/terrain.png, map/roads.png, map/palette.gpl
//   npm run map:import   map/terrain.png + map/roads.png -> shared/map.json (what the game loads)
//
// terrain.png: every pixel is one tile, painted with the terrain colors of map.json ("terrain" section:
//   grass, trees, hills, sea, river, city, swamp, summit). The picture's size IS the map's size: paint a
//   600 x 800 picture and the world becomes 600 x 800 tiles.
// roads.png:   the same size, transparent; any non-transparent pixel is a road. Just draw 1-pixel lines;
//   straight pieces, curves and junctions are worked out from the neighbouring road pixels when
//   importing (so keep parallel roads at least one pixel apart, or they join). Roads on city tiles
//   are ignored (towns have no road overlay), a road may end right next to a town.
// palette.gpl: the terrain colors as a palette for Aseprite / GIMP / Krita / Paint.NET.
//
// Colors that aren't exactly one of the terrain colors (anti-aliasing, a soft brush, a wrong shade)
// are snapped to the closest one and reported. Use a pencil tool without smoothing.
// The spawn point and the terrain rules (names, colors, speeds) stay in map.json; if the spawn point
// ends up off the map or on unwalkable ground, it is moved to the middle of the biggest town.
// No dependencies: PNG reading and writing is done with Node's zlib.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAP_JSON = join(ROOT, "shared", "map.json");
const DIR = join(ROOT, "map");
const TERRAIN_PNG = join(DIR, "terrain.png");
const ROADS_PNG = join(DIR, "roads.png");
const PALETTE = join(DIR, "palette.gpl");

// ---------------- PNG ----------------
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** Writes an RGBA image (rgba: Uint8Array of w*h*4). */
function writePng(file, w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // no filter
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  writeFileSync(file, png);
}
/**
 * Reads a PNG into RGBA. Handles what pixel editors save: RGB / RGBA / grey / grey+alpha at 8 or 16
 * bits, and indexed (palette) images at 1, 2, 4 or 8 bits, with transparency. Not interlaced.
 */
function readPng(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file} is not a PNG`);
  let pos = 8, w = 0, h = 0, depth = 0, type = 0, interlace = 0, palette = null, trns = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const t = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (t === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; type = data[9]; interlace = data[12];
    } else if (t === "PLTE") palette = data;
    else if (t === "tRNS") trns = data;
    else if (t === "IDAT") idat.push(data);
    else if (t === "IEND") break;
    pos += 12 + len;
  }
  if (interlace) throw new Error(`${file}: interlaced PNGs aren't supported, save it without interlacing`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  if (!channels) throw new Error(`${file}: unknown PNG color type ${type}`);
  const bpp = Math.max(1, (channels * depth) >> 3); // bytes per pixel (for filtering)
  const stride = Math.ceil((w * channels * depth) / 8);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const lines = Buffer.alloc(stride * h);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = lines.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[i] = v & 0xff;
    }
    prev = out;
  }
  const rgba = new Uint8Array(w * h * 4);
  const sample = (y, idx) => {
    // the idx-th sample of row y, scaled to 0..255
    const line = y * stride;
    if (depth === 8) return lines[line + idx];
    if (depth === 16) return lines[line + idx * 2];
    const perByte = 8 / depth, byte = lines[line + Math.floor(idx / perByte)];
    const shift = 8 - depth * ((idx % perByte) + 1);
    return (byte >> shift) & ((1 << depth) - 1);
  };
  const scale = depth < 8 ? 255 / ((1 << depth) - 1) : 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (type === 3) {
        const i = sample(y, x);
        rgba[o] = palette[i * 3]; rgba[o + 1] = palette[i * 3 + 1]; rgba[o + 2] = palette[i * 3 + 2];
        rgba[o + 3] = trns && i < trns.length ? trns[i] : 255;
      } else if (type === 0 || type === 4) {
        const g = Math.round(sample(y, x * channels) * scale);
        rgba[o] = rgba[o + 1] = rgba[o + 2] = g;
        rgba[o + 3] = type === 4 ? sample(y, x * channels + 1) : 255;
      } else {
        rgba[o] = sample(y, x * channels); rgba[o + 1] = sample(y, x * channels + 1); rgba[o + 2] = sample(y, x * channels + 2);
        rgba[o + 3] = type === 6 ? sample(y, x * channels + 3) : 255;
      }
    }
  }
  return { w, h, rgba };
}

// ---------------- helpers ----------------
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (r, g, b) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
const loadMap = () => JSON.parse(readFileSync(MAP_JSON, "utf8"));

// Road characters <-> arms (N=1 E=2 S=4 W=8), the same as tools/generate-map.mjs and shared/world.ts
const ROAD_CHAR = { 10: "-", 5: "|", 6: "┌", 12: "┐", 3: "└", 9: "┘", 2: "-", 8: "-", 1: "|", 4: "|" };
const DIRS = [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]];

// ---------------- export ----------------
function exportPng() {
  const map = loadMap();
  const { width: w, height: h } = map;
  mkdirSync(DIR, { recursive: true });
  const terrain = new Uint8Array(w * h * 4);
  const roads = new Uint8Array(w * h * 4);
  const road = hex(map.road.color);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const t = map.terrain[map.rows[y][x]] ?? map.terrain.W;
      const [r, g, b] = hex(t.color);
      terrain.set([r, g, b, 255], o);
      if ((map.roads[y]?.[x] ?? ".") !== ".") roads.set([...road, 255], o);
    }
  }
  writePng(TERRAIN_PNG, w, h, terrain);
  writePng(ROADS_PNG, w, h, roads);
  const lines = ["GIMP Palette", "Name: bunnyQuest map", "Columns: 4", "#"];
  for (const [, t] of Object.entries(map.terrain)) lines.push(`${hex(t.color).map((v) => String(v).padStart(3)).join(" ")}\t${t.name}`);
  lines.push(`${road.map((v) => String(v).padStart(3)).join(" ")}\troad (roads.png)`);
  writeFileSync(PALETTE, lines.join("\n") + "\n");
  console.log(`Wrote ${TERRAIN_PNG}, ${ROADS_PNG} and ${PALETTE} (${w} x ${h} tiles)`);
}

// ---------------- import ----------------
function importPng() {
  const map = loadMap();
  if (!existsSync(TERRAIN_PNG)) throw new Error(`${TERRAIN_PNG} is missing (run "npm run map:export" first)`);
  const t = readPng(TERRAIN_PNG);
  const { w, h } = t;
  const keys = Object.keys(map.terrain);
  const colors = keys.map((k) => hex(map.terrain[k].color));
  const exact = new Map(keys.map((k, i) => [colors[i].join(","), k]));
  const snapped = new Map(); // "#rrggbb -> terrain" : count
  let firstSnap = null;
  const rows = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const [r, g, b, a] = t.rgba.subarray(o, o + 4);
      let k = a < 128 ? "W" : exact.get(`${r},${g},${b}`); // a transparent pixel is sea
      if (!k) {
        let best = 0, bestD = Infinity;
        colors.forEach(([cr, cg, cb], i) => {
          const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
          if (d < bestD) (bestD = d), (best = i);
        });
        k = keys[best];
        const label = `${toHex(r, g, b)} -> ${map.terrain[k].name}`;
        snapped.set(label, (snapped.get(label) ?? 0) + 1);
        firstSnap ??= `${x}, ${y}`;
      }
      row += k;
    }
    rows.push(row);
  }

  // Roads: any visible pixel; its shape comes from the neighbouring road pixels
  let isRoad = () => false;
  let roadsOnTowns = 0;
  if (existsSync(ROADS_PNG)) {
    const r = readPng(ROADS_PNG);
    if (r.w !== w || r.h !== h) throw new Error(`roads.png is ${r.w} x ${r.h}, but terrain.png is ${w} x ${h}: they must be the same size`);
    isRoad = (x, y) => x >= 0 && y >= 0 && x < w && y < h && r.rgba[(y * w + x) * 4 + 3] >= 128 && rows[y][x] !== "C";
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (r.rgba[(y * w + x) * 4 + 3] >= 128 && rows[y][x] === "C") roadsOnTowns++;
  } else console.warn(`No ${ROADS_PNG}: the map will have no roads`);
  const isTown = (x, y) => rows[y]?.[x] === "C";
  let roadsOnSea = 0;
  const roads = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      if (!isRoad(x, y)) { row += "."; continue; }
      if (rows[y][x] === "W") roadsOnSea++;
      let bits = 0, n = 0;
      for (const [dx, dy, bit] of DIRS) if (isRoad(x + dx, y + dy)) (bits |= bit), n++;
      // A road that ends at a town (or a lone pixel next to one) connects into it
      if (n < 2) for (const [dx, dy, bit] of DIRS) if (isTown(x + dx, y + dy)) bits |= bit;
      row += ROAD_CHAR[bits] ?? "+"; // 3-4 arms: a junction ("+" finds its arms itself, see shared/world.ts)
    }
    roads.push(row);
  }

  // Towns: groups of touching city tiles (the list is informational: the game reads the tiles)
  const seen = new Uint8Array(w * h);
  const cities = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rows[y][x] !== "C" || seen[y * w + x]) continue;
      const stack = [[x, y]];
      seen[y * w + x] = 1;
      let sx = 0, sy = 0, size = 0;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        sx += cx; sy += cy; size++;
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[ny * w + nx] || rows[ny][nx] !== "C") continue;
          seen[ny * w + nx] = 1;
          stack.push([nx, ny]);
        }
      }
      cities.push({ x: Math.round(sx / size), y: Math.round(sy / size), size });
    }
  }
  cities.sort((a, b) => b.size - a.size);

  // Spawn: keep it if it is still on walkable ground, otherwise the middle of the biggest town
  let spawn = map.spawn;
  const walkable = (p) => p && p.x >= 0 && p.y >= 0 && p.x < w && p.y < h && (map.terrain[rows[p.y][p.x]]?.speed ?? 0) > 0;
  if (!walkable(spawn)) {
    const town = cities[0];
    const tile = town && walkable(town) ? town : null;
    if (!tile) throw new Error("The spawn point is off the map or on unwalkable ground, and there is no town to move it to");
    console.warn(`The spawn point (${spawn?.x}, ${spawn?.y}) was off the map or on unwalkable ground: moved to the biggest town (${tile.x}, ${tile.y})`);
    spawn = { x: tile.x, y: tile.y };
  }

  const out = { ...map, width: w, height: h, spawn, cities, rows, roads };
  writeFileSync(MAP_JSON, JSON.stringify(out, null, 1));
  console.log(`Wrote ${MAP_JSON}: ${w} x ${h} tiles, ${cities.length} towns, ${roads.join("").replace(/\./g, "").length} road tiles, spawn (${spawn.x}, ${spawn.y})`);
  if (snapped.size) {
    console.warn(`Some pixels weren't exactly a terrain color and were snapped to the closest one (first at ${firstSnap}):`);
    for (const [label, n] of snapped) console.warn(`  ${label}: ${n} pixel(s)`);
  }
  if (roadsOnTowns) console.warn(`${roadsOnTowns} road pixel(s) on town tiles were ignored (towns have no road overlay)`);
  if (roadsOnSea) console.warn(`${roadsOnSea} road pixel(s) are on the sea: they work as bridges (roads are walkable on any terrain)`);
}

const cmd = process.argv[2];
if (cmd === "export") exportPng();
else if (cmd === "import") importPng();
else {
  console.log("Usage: node tools/map-png.mjs export | import");
  process.exit(1);
}
