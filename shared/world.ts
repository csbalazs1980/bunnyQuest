// Map + movement rules shared by the client (for prediction) and the server (authoritative).
// Keeping this in one place guarantees both sides move bunnies exactly the same way.

export interface TerrainInfo {
  name: string;
  color: string; // CSS hex, e.g. "#4caf50" (minimap, and the tile itself if it has no picture)
  speed: number; // 1 = normal, 0 = impassable
}

export interface MapData {
  width: number; // in tiles
  height: number;
  tileSize: number; // pixels per tile
  seed: number;
  terrain: Record<string, TerrainInfo>;
  road: { color: string; speed: number };
  spawn: { x: number; y: number }; // tile coordinates
  cities: { x: number; y: number; size: number }[];
  rows: string[]; // terrain: one character per tile, see terrain keys
  roads: string[]; // road overlay: '.' none, - | + ┌ ┐ └ ┘
}

type Dir = "N" | "E" | "S" | "W";
const ROAD_ARMS: Record<string, Dir[]> = {
  "-": ["E", "W"],
  "|": ["N", "S"],
  "┌": ["S", "E"],
  "┐": ["S", "W"],
  "└": ["N", "E"],
  "┘": ["N", "W"],
  "+": ["N", "E", "S", "W"],
};
const STEP: Record<Dir, [number, number, Dir]> = { N: [0, -1, "S"], E: [1, 0, "W"], S: [0, 1, "N"], W: [-1, 0, "E"] };

export const PLAYER_SPEED = 200; // base pixels per second on normal ground (Agility adds to it, see shared/stats.ts)
export const PLAYER_RADIUS = 16; // collision half-size in pixels (against terrain)
/**
 * Body collision: moving characters (bunnies, rats, later other animals and NPCs) can't get closer
 * than this to each other, center to center: half a tile.
 */
export const BODY_GAP = 32;

export interface Body {
  x: number;
  y: number;
}

/**
 * Would moving from (x, y) to (nx, ny) take us closer than BODY_GAP to one of `others`?
 * Moving away is always allowed, so characters that start out overlapping (e.g. two bunnies
 * waking up at the same spot) can still walk apart. `self` is skipped if it is in the list.
 */
export function bumps(x: number, y: number, nx: number, ny: number, others: readonly Body[], self?: Body): boolean {
  const gap2 = BODY_GAP * BODY_GAP;
  for (const o of others) {
    if (o === self) continue;
    const after = (nx - o.x) ** 2 + (ny - o.y) ** 2;
    if (after < gap2 && after < (x - o.x) ** 2 + (y - o.y) ** 2) return true;
  }
  return false;
}

export class World {
  readonly pixelWidth: number;
  readonly pixelHeight: number;

  constructor(readonly map: MapData) {
    this.pixelWidth = map.width * map.tileSize;
    this.pixelHeight = map.height * map.tileSize;
  }

  /** Terrain key at a pixel position. Outside the map counts as sea. */
  tileAt(px: number, py: number): string {
    const tx = Math.floor(px / this.map.tileSize);
    const ty = Math.floor(py / this.map.tileSize);
    if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) return "W";
    return this.map.rows[ty][tx];
  }

  /** Road character at a pixel position ('.' = no road). */
  roadAt(px: number, py: number): string {
    const tx = Math.floor(px / this.map.tileSize);
    const ty = Math.floor(py / this.map.tileSize);
    return this.map.roads[ty]?.[tx] ?? ".";
  }

  /** Movement speed multiplier. A road overrides whatever terrain is underneath. */
  speedAt(px: number, py: number): number {
    if (this.roadAt(px, py) !== ".") return this.map.road.speed;
    return this.map.terrain[this.tileAt(px, py)]?.speed ?? 0;
  }

  /**
   * Which edges of tile (tx, ty) the road reaches. For '+' only the arms that actually
   * lead to another road or a city are returned, so T-junctions look right.
   */
  roadArms(tx: number, ty: number): Dir[] {
    const c = this.map.roads[ty]?.[tx] ?? ".";
    if (c !== "+") return ROAD_ARMS[c] ?? [];
    return ROAD_ARMS["+"].filter((d) => {
      const [dx, dy, back] = STEP[d];
      const n = this.map.roads[ty + dy]?.[tx + dx] ?? ".";
      return this.map.rows[ty + dy]?.[tx + dx] === "C" || (ROAD_ARMS[n] ?? []).includes(back);
    });
  }

  /** A bunny fits at (x, y) if all four corners of its box are on walkable ground. */
  canStand(x: number, y: number): boolean {
    const r = PLAYER_RADIUS;
    return (
      this.speedAt(x - r, y - r) > 0 &&
      this.speedAt(x + r, y - r) > 0 &&
      this.speedAt(x - r, y + r) > 0 &&
      this.speedAt(x + r, y + r) > 0
    );
  }

  /**
   * Moves a character by input direction (dx, dy in -1..1) for dt seconds at `speed` px/s on normal
   * ground. The terrain under its center scales that; each axis is checked separately so
   * characters slide along trees, coastlines and each other instead of getting stuck.
   * `others`: the other characters it can't walk into (see BODY_GAP); `self` is skipped in that list.
   */
  step(
    x: number,
    y: number,
    dx: number,
    dy: number,
    dt: number,
    speed = PLAYER_SPEED,
    others: readonly Body[] = [],
    self?: Body
  ): { x: number; y: number } {
    if (!dx && !dy) return { x, y };
    const len = Math.hypot(dx, dy);
    const dist = speed * this.speedAt(x, y) * dt;
    // Each axis: the full step, or if someone is in the way, a shorter one (so characters stop
    // right at BODY_GAP instead of a step early, the same on the client and the server)
    for (const f of [1, 0.5, 0.25]) {
      const nx = x + (dx / len) * dist * f;
      if (!this.canStand(nx, y)) break;
      if (!bumps(x, y, nx, y, others, self)) {
        x = nx;
        break;
      }
    }
    for (const f of [1, 0.5, 0.25]) {
      const ny = y + (dy / len) * dist * f;
      if (!this.canStand(x, ny)) break;
      if (!bumps(x, y, x, ny, others, self)) {
        y = ny;
        break;
      }
    }
    return { x, y };
  }

  /** A random point inside the spawn town (falls back to the center of the spawn tile). */
  spawnPoint(): { x: number; y: number } {
    const ts = this.map.tileSize;
    const cx = (this.map.spawn.x + 0.5) * ts;
    const cy = (this.map.spawn.y + 0.5) * ts;
    for (let i = 0; i < 20; i++) {
      const x = cx + (Math.random() - 0.5) * ts * 3;
      const y = cy + (Math.random() - 0.5) * ts * 3;
      if (this.tileAt(x, y) === "C" && this.canStand(x, y)) return { x, y };
    }
    return { x: cx, y: cy };
  }
}
