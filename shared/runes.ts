// Runes: the shapes you draw on the magic scroll, and the code that reads a drawing.
// Used by the client (spellbook pictures) and the server (it reads every cast; the client can't cheat).
//
// How a drawing is read:
//   1. Tiny strokes (taps, specks) are dropped.
//   2. Strokes are grouped into runes from top to bottom: strokes whose heights overlap (or almost
//      touch) belong to the same rune. Left-right position doesn't matter at all, only the order
//      from top to bottom.
//   3. Each group is compared with every rune using the "$P point-cloud recognizer" (Vatavu, Anthony
//      and Wobbrock, 2012): both shapes are resampled to 32 points, scaled to the same size and matched
//      point to point. It doesn't care about stroke order or which way a line was drawn, and it is
//      forgiving about wobbly lines, but the orientation matters (a "\" is not a "/").
//   4. How sharp the sharpest corner is counts too, because the point matching alone mixes up shapes
//      like the Ka hook (a sharp corner) and the Dom arc (smooth): a difference in sharpness adds up to
//      CORNER_PENALTY to the distance.
//      Closed loops (a circle, a box) are counted the same way (LOOP_PENALTY), so a circle isn't read
//      as an arc.
//   5. The closest rune wins if it is close enough (RUNE_TOLERANCE) and the group has about as many
//      strokes as the rune (a rune with three lines can't be drawn with one).
//
// To add a rune: add it to RUNE_SHAPES (any coordinates: they are scaled, only the shape counts), give it
// a name and meaning in the translation files ("rune.<id>" / "rune.<id>.meaning") and use it in a spell
// (shared/magic.ts). Similar-looking runes make each other harder to draw, so keep them distinct.

export interface Pt {
  x: number;
  y: number;
}
export type Stroke = Pt[];

/** A semicircle-like arc (for the shapes below): center, radii, from angle a0 to a1 (radians). */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, steps = 16): Stroke {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
  });
}
const line = (...pts: [number, number][]): Stroke => pts.map(([x, y]) => ({ x, y }));

/**
 * The runes, each as the strokes of a model drawing (y grows downward, like on the screen).
 * Fireball = Ka (create) + Ash (fire) + Dom (burst).
 */
export const RUNE_SHAPES = {
  // A hook: up the left side, across the top and curving down to the right
  ka: [line([137, 207], [137, 140], [160, 142], [178, 150], [190, 163], [198, 183], [204, 210])],
  // A long "\" with two short parallel strokes hanging off its lower-left side
  ash: [line([133, 237], [215, 310]), line([152, 271], [127, 300]), line([172, 284], [144, 316])],
  // A dome: a half circle, open at the bottom
  dom: [arc(170, 410, 48, 56, Math.PI, Math.PI * 2)],
} satisfies Record<string, Stroke[]>;

export type RuneId = keyof typeof RUNE_SHAPES;
export const RUNE_IDS = Object.keys(RUNE_SHAPES) as RuneId[];

// ---------------- tuning ----------------
/** How far a drawing may be from the rune (average point distance, as a share of the rune's size). Higher = more forgiving. */
export const RUNE_TOLERANCE = 0.12;
/** Added to the distance when a smooth rune is drawn with a sharp corner, or the other way round. */
export const CORNER_PENALTY = 0.08;
/** Turns (degrees, within a few points of a line) up to this are smooth curves; from SHARP_TURN on they are corners. */
export const SMOOTH_TURN = 50;
export const SHARP_TURN = 80;
/** Added to the distance for every closed loop (a stroke ending where it started) the drawing has more or fewer than the rune. */
export const LOOP_PENALTY = 0.08;
/** A rune may be drawn with up to this many strokes more than the model (lifting the mouse mid-line is fine). */
export const EXTRA_STROKES_ALLOWED = 2;
/** Strokes shorter than this (share of the scroll's width) are ignored: taps and specks. */
export const MIN_STROKE_LENGTH = 0.02;
/** Two strokes belong to the same rune if their heights overlap or are less than this apart (share of the scroll's width). */
export const RUNE_GAP = 0.015;
/** Groups smaller than this (share of the scroll's width) are specks, not runes. */
export const MIN_RUNE_SIZE = 0.04;

const N = 32; // points per resampled shape

interface CloudPt extends Pt {
  s: number; // stroke index
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export function strokeLength(s: Stroke): number {
  let len = 0;
  for (let i = 1; i < s.length; i++) len += dist(s[i - 1], s[i]);
  return len;
}

/** All strokes resampled to N evenly spaced points, scaled to a unit box (aspect kept), centered on their centroid. */
export function normalize(strokes: Stroke[]): CloudPt[] | null {
  const pts: CloudPt[] = [];
  strokes.forEach((s, si) => s.forEach((p) => pts.push({ x: p.x, y: p.y, s: si })));
  const total = strokes.reduce((sum, s) => sum + strokeLength(s), 0);
  if (pts.length < 2 || total <= 0) return null;

  // resample
  const interval = total / (N - 1);
  const out: CloudPt[] = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].s !== pts[i - 1].s) continue; // no line between two strokes
    let prev = pts[i - 1];
    let d = dist(prev, pts[i]);
    while (acc + d >= interval && out.length < N) {
      const t = (interval - acc) / d;
      const q = { x: prev.x + t * (pts[i].x - prev.x), y: prev.y + t * (pts[i].y - prev.y), s: pts[i].s };
      out.push(q);
      prev = q;
      d = dist(prev, pts[i]);
      acc = 0;
    }
    acc += d;
  }
  while (out.length < N) out.push(pts[pts.length - 1]); // rounding: pad with the last point

  // scale to a unit box, keeping the aspect ratio
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of out) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const size = Math.max(maxX - minX, maxY - minY) || 1;
  let cx = 0, cy = 0;
  const scaled = out.map((p) => ({ x: (p.x - minX) / size, y: (p.y - minY) / size, s: p.s }));
  scaled.forEach((p) => ((cx += p.x), (cy += p.y)));
  cx /= N;
  cy /= N;
  return scaled.map((p) => ({ x: p.x - cx, y: p.y - cy, s: p.s }));
}

/** $P: greedy point matching from one cloud to the other, starting at `start`; earlier matches weigh more. */
function cloudDistance(a: CloudPt[], b: CloudPt[], start: number): number {
  const matched = new Array<boolean>(N).fill(false);
  let sum = 0;
  let i = start;
  do {
    let best = -1;
    let min = Infinity;
    for (let j = 0; j < N; j++) {
      if (matched[j]) continue;
      const d = dist(a[i], b[j]);
      if (d < min) (min = d), (best = j);
    }
    matched[best] = true;
    const weight = 1 - ((i - start + N) % N) / N;
    sum += weight * min;
    i = (i + 1) % N;
  } while (i !== start);
  return sum / ((N + 1) / 2); // ≈ average distance between matched points (unit-box units)
}

function cloudMatch(a: CloudPt[], b: CloudPt[]): number {
  const step = Math.floor(Math.sqrt(N));
  let min = Infinity;
  for (let i = 0; i < N; i += step) min = Math.min(min, cloudDistance(a, b, i), cloudDistance(b, a, i));
  return min;
}

/**
 * How sharp the sharpest corner of a drawing is, from 0 (smooth: only gentle curves) to 1 (a real
 * corner): the biggest turn a stroke makes within three points (about a tenth of the line).
 * Stroke ends don't count.
 */
export function sharpness(cloud: CloudPt[]): number {
  // Direction of travel at each point (toward the next distinct point of the same stroke)
  const heading = cloud.map((p, i) => {
    for (let j = i + 1; j < cloud.length && cloud[j].s === p.s; j++) {
      const dx = cloud[j].x - p.x;
      const dy = cloud[j].y - p.y;
      if (Math.hypot(dx, dy) > 1e-6) return Math.atan2(dy, dx);
    }
    return null; // the end of a stroke
  });
  const turn = cloud.map((p, i) => {
    const a = heading[i - 1];
    const b = heading[i];
    if (i === 0 || a == null || b == null || cloud[i - 1].s !== p.s) return 0;
    let d = Math.abs(b - a) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
  });
  let max = 0;
  for (let i = 0; i < cloud.length; i++) max = Math.max(max, (turn[i - 1] ?? 0) + turn[i] + (turn[i + 1] ?? 0));
  const deg = (max * 180) / Math.PI;
  return Math.max(0, Math.min(1, (deg - SMOOTH_TURN) / (SHARP_TURN - SMOOTH_TURN)));
}

/** Strokes that end about where they started (a circle, a box), relative to the whole rune's size. */
export function countLoops(strokes: Stroke[]): number {
  const pts = strokes.flat();
  const size = Math.max(
    Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x)),
    Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y))
  );
  return strokes.filter((s) => s.length > 2 && strokeLength(s) > 1.5 * size && dist(s[0], s[s.length - 1]) < 0.25 * size).length;
}

const MODELS = RUNE_IDS.map((id) => {
  const cloud = normalize(RUNE_SHAPES[id])!;
  return { id, strokes: RUNE_SHAPES[id].length, cloud, sharpness: sharpness(cloud), loops: countLoops(RUNE_SHAPES[id]) };
});

export interface RuneGuess {
  rune: RuneId | null; // null: doesn't look like any rune
  score: number; // distance to the closest rune (lower is better)
  closest: RuneId; // the closest rune, even if it was too far
  top: number; // where the group starts on the scroll (to label it)
  bottom: number;
}

/** Reads one rune (a group of strokes). */
export function readRune(strokes: Stroke[]): Omit<RuneGuess, "top" | "bottom"> {
  const cloud = normalize(strokes);
  let best = { id: MODELS[0].id, score: Infinity };
  if (cloud) {
    const sharp = sharpness(cloud);
    const loops = countLoops(strokes);
    for (const m of MODELS) {
      if (strokes.length < m.strokes || strokes.length > m.strokes + EXTRA_STROKES_ALLOWED) continue;
      const score = cloudMatch(cloud, m.cloud) + CORNER_PENALTY * Math.abs(sharp - m.sharpness) +
        LOOP_PENALTY * Math.abs(loops - m.loops);
      if (score < best.score) best = { id: m.id, score };
    }
  }
  return { rune: best.score <= RUNE_TOLERANCE ? best.id : null, score: best.score, closest: best.id };
}

/** Splits a drawing into runes, top to bottom (see the top of this file). Coordinates: scroll width = 1. */
export function groupRunes(strokes: Stroke[]): Stroke[][] {
  const kept = strokes
    .filter((s) => s.length >= 2 && strokeLength(s) >= MIN_STROKE_LENGTH)
    .map((s) => ({ s, top: Math.min(...s.map((p) => p.y)), bottom: Math.max(...s.map((p) => p.y)) }))
    .sort((a, b) => a.top - b.top);
  const groups: { strokes: Stroke[]; bottom: number }[] = [];
  for (const k of kept) {
    const g = groups[groups.length - 1];
    if (g && k.top <= g.bottom + RUNE_GAP) {
      g.strokes.push(k.s);
      g.bottom = Math.max(g.bottom, k.bottom);
    } else groups.push({ strokes: [k.s], bottom: k.bottom });
  }
  return groups.map((g) => g.strokes).filter((g) => boxSize(g) >= MIN_RUNE_SIZE);
}

/** Reads a whole drawing: one guess per rune, top to bottom. */
export function readRunes(strokes: Stroke[]): RuneGuess[] {
  return groupRunes(strokes).map((g) => {
    const ys = g.flatMap((s) => s.map((p) => p.y));
    return { ...readRune(g), top: Math.min(...ys), bottom: Math.max(...ys) };
  });
}

function boxSize(strokes: Stroke[]): number {
  const pts = strokes.flat();
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

// ---------------- sending drawings over the network ----------------
/** The scroll's drawing area: 1 wide, this tall. */
export const SCROLL_ASPECT = 1.6;
export const MAX_STROKES = 40;
export const MAX_POINTS = 4000; // in all strokes together

/** Strokes as flat number lists [x0, y0, x1, y1, ...], rounded to 3 decimals (small messages). */
export const packStrokes = (strokes: Stroke[]): number[][] =>
  strokes.map((s) => s.flatMap((p) => [Math.round(p.x * 1000) / 1000, Math.round(p.y * 1000) / 1000]));

/** Checks and unpacks strokes sent by a client. Returns null if the message is malformed or too big. */
export function unpackStrokes(raw: unknown): Stroke[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_STROKES) return null;
  let points = 0;
  const strokes: Stroke[] = [];
  for (const flat of raw) {
    if (!Array.isArray(flat) || flat.length % 2) return null;
    points += flat.length / 2;
    if (points > MAX_POINTS) return null;
    const s: Stroke = [];
    for (let i = 0; i < flat.length; i += 2) {
      const x = flat[i];
      const y = flat[i + 1];
      if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) return null;
      if (x < -0.1 || x > 1.1 || y < -0.1 || y > SCROLL_ASPECT + 0.1) return null;
      s.push({ x, y });
    }
    strokes.push(s);
  }
  return strokes;
}
