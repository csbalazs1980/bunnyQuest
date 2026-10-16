// Terrain tile pictures: discovered at build time, picked per tile deterministically.
//
// Put PNGs (64x64) in client/src/assets/tiles/, named after the terrain (see "name" in map.json):
//   grass.png                      -> used for every grass tile
//   grass1.png, grass2.png, ...    -> if any numbered ones exist, each grass tile uses one of them
//                                     (the plain grass.png is then ignored)
//   nothing at all                 -> the terrain's plain color from map.json is drawn instead
// New files are picked up automatically (no code or map changes needed).

/** Every PNG in src/assets/tiles, found by Vite when it builds the game: { "../assets/tiles/grass1.png": url } */
export const TILE_FILES = import.meta.glob("./assets/tiles/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

/** URLs of the pictures for one terrain name, in order (grass1, grass2, ...), or [] if there are none. */
export function tileVariants(name: string, files: Record<string, string> = TILE_FILES): string[] {
  const numbered: [number, string][] = [];
  let plain: string | undefined;
  for (const [path, url] of Object.entries(files)) {
    const file = (path.split("/").pop() ?? "").replace(/\.png$/i, "").toLowerCase();
    if (file === name.toLowerCase()) plain = url;
    else if (file.startsWith(name.toLowerCase())) {
      const rest = file.slice(name.length);
      if (/^\d+$/.test(rest)) numbered.push([Number(rest), url]);
    }
  }
  numbered.sort((a, b) => a[0] - b[0]);
  return numbered.length ? numbered.map(([, url]) => url) : plain ? [plain] : [];
}

/**
 * Which of `count` variants tile (x, y) uses. A hash of the position and the map seed: looks random,
 * but is the same for every player and every reload.
 */
export function variantAt(x: number, y: number, seed: number, count: number): number {
  if (count <= 1) return 0;
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) % count;
}
