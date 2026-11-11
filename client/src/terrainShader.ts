// Smooth terrain: the ground is drawn by a WebGL shader, so neighbouring terrains melt into each
// other along wavy, natural-looking borders instead of meeting at hard square tile edges.
//
// What the shader does for every pixel on screen (on the graphics card):
//  1. It looks at the 4 tiles whose centres surround the pixel.
//  2. For each terrain among them it works out a "presence": how much of that terrain is around the
//     pixel (a bilinear blend of the 4 tiles). It is 1 deep inside a terrain, 0.5 exactly on a
//     straight border, and low in the corners of a lone tile, so corners and single tiles come out
//     rounded instead of square.
//  3. Each terrain gets its own smooth noise added, so the borders wander a little. The strongest
//     terrain wins the pixel, with a few pixels of soft blending where two are nearly equal.
//  4. The winner's picture is drawn: the pixel's own tile if it is of that terrain, otherwise the
//     neighbouring tile's picture continued (mirrored) across the border, so there is no seam.
// Different pictures of the same terrain (grass1, grass2, ...) still meet at the tile edge, as before.
//
// Only the look changes: walking speed, collisions and spell targets still use the exact tiles.
// Without WebGL (Phaser fell back to the canvas renderer) the caller keeps the plain tilemap.

import Phaser from "phaser";

/** How the borders look. Tweak freely: nothing else depends on these. */
export const TERRAIN_BLEND = {
  wobble: 0.3, // how far borders wander from the tile grid (about this share of a tile at most)
  waves: 1.6, // how wavy: bumps per tile along a border
  soft: 0.1, // how soft the edge is (0 = hard pixel edge; 0.1 = a few pixels of blending)
  /**
   * Terrains (by name, see map.json) that hold their ground against their neighbours: they keep
   * more of their tiles, so e.g. the houses of a small town aren't clipped. 0 = normal, up to ~0.5.
   */
  firmness: { city: 0.3 } as Record<string, number>,
};

export interface SmoothTerrainOptions {
  tileSize: number;
  width: number; // map size in tiles
  height: number;
  /** Texture key of the tile pictures, all side by side in one row (tileSize x tileSize each). */
  atlasKey: string;
  atlasCount: number; // how many pictures are in that row
  /** Tile (x, y): which picture of the row it shows, and which terrain it is (0, 1, 2, ...). */
  cell(x: number, y: number): { picture: number; terrain: number };
  /** Name of terrain number i (to look up its firmness). */
  terrainName(i: number): string;
}

const VERTEX = `
precision highp float;
uniform mat4 uProjectionMatrix;
uniform mat4 uViewMatrix;
uniform float uTileSize;
attribute vec2 inPosition;
varying vec2 vTile;
void main () {
  gl_Position = uProjectionMatrix * uViewMatrix * vec4(inPosition, 1.0, 1.0);
  vTile = inPosition / uTileSize; // position on the map, in tiles
}`;

const FRAGMENT = `
precision highp float;
uniform sampler2D iChannel0; // the tile pictures, side by side
uniform sampler2D iChannel1; // the map, one texel per tile: r = picture, g = terrain, b = firmness
uniform vec2 uMapSize;
uniform float uAtlasCount;
uniform float uTileSize;
uniform float uWobble;
uniform float uWaves;
uniform float uSoft;
varying vec2 vTile;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// Smooth noise, about -1..1, different for every terrain
float wobble(vec2 p, float terrain) {
  vec2 q = p * uWaves + vec2(terrain * 37.13, terrain * 11.71);
  return (noise(q) * 0.65 + noise(q * 2.13 + 5.2) * 0.35) * 2.0 - 1.0;
}
vec4 cellAt(vec2 t) {
  t = clamp(t, vec2(0.0), uMapSize - 1.0);
  return floor(texture2D(iChannel1, (t + 0.5) / uMapSize) * 255.0 + 0.5);
}
// A tile picture at local position (0..1 inside the tile); mirrored beyond its edges, so a
// picture continued into the neighbouring tile has no seam.
vec3 picture(float index, vec2 local) {
  vec2 m = 1.0 - abs(mod(local, 2.0) - 1.0);
  m = clamp(m, 0.5 / uTileSize, 1.0 - 0.5 / uTileSize);
  return texture2D(iChannel0, vec2((index + m.x) / uAtlasCount, m.y)).rgb;
}

void main () {
  vec2 p = vTile;
  vec2 own = floor(p);
  vec2 base = floor(p - 0.5); // the 4 tiles whose centres surround p
  vec2 f = p - 0.5 - base;

  vec2 pos[4];
  vec4 cell[4];
  float w[4];
  float rank[4];
  float score[4];
  pos[0] = base;
  pos[1] = base + vec2(1.0, 0.0);
  pos[2] = base + vec2(0.0, 1.0);
  pos[3] = base + vec2(1.0, 1.0);
  w[0] = (1.0 - f.x) * (1.0 - f.y);
  w[1] = f.x * (1.0 - f.y);
  w[2] = (1.0 - f.x) * f.y;
  w[3] = f.x * f.y;
  for (int k = 0; k < 4; k++) {
    cell[k] = cellAt(pos[k]);
    // Which tile speaks for its terrain here: the pixel's own tile first, then the closest one
    rank[k] = w[k] + (all(equal(pos[k], own)) ? 2.0 : 0.0) + float(k) * 0.0001;
  }

  float best = -10.0;
  for (int k = 0; k < 4; k++) {
    float presence = 0.0;
    bool speaks = true;
    for (int j = 0; j < 4; j++) {
      if (cell[j].g == cell[k].g) {
        presence += w[j];
        if (rank[j] > rank[k]) speaks = false;
      }
    }
    score[k] = speaks ? presence + cell[k].b / 255.0 + uWobble * wobble(p, cell[k].g) : -10.0;
    best = max(best, score[k]);
  }

  vec3 color = vec3(0.0);
  float total = 0.0;
  for (int k = 0; k < 4; k++) {
    float a = max(score[k] - best + uSoft, 0.0);
    if (a > 0.0) {
      color += a * picture(cell[k].r, p - pos[k]);
      total += a;
    }
  }
  gl_FragColor = vec4(color / total, 1.0);
}`;

/** Sharp pixels, and no wrapping (the textures are not power-of-two sized, which WebGL 1 needs for repeat). */
const nearest = () => ({ magFilter: "nearest", minFilter: "nearest", wrapS: "clamp_to_edge", wrapT: "clamp_to_edge" });

/**
 * Draws the whole map as one shader quad (top-left at 0, 0). Returns null without WebGL, or if the
 * map has more pictures or terrains than fit in one byte; then use the plain tilemap instead.
 */
export function createSmoothTerrain(scene: Phaser.Scene, o: SmoothTerrainOptions): Phaser.GameObjects.Shader | null {
  if (scene.renderer.type !== Phaser.WEBGL || o.atlasCount > 255) return null;

  // The map as a tiny texture: one pixel per tile
  const cells = scene.textures.createCanvas("terrain-cells", o.width, o.height)!;
  const ctx = cells.getContext();
  const img = ctx.createImageData(o.width, o.height);
  for (let y = 0; y < o.height; y++) {
    for (let x = 0; x < o.width; x++) {
      const { picture, terrain } = o.cell(x, y);
      const i = (y * o.width + x) * 4;
      img.data[i] = picture;
      img.data[i + 1] = terrain;
      img.data[i + 2] = Math.round(Math.min(1, TERRAIN_BLEND.firmness[o.terrainName(terrain)] ?? 0) * 255);
      img.data[i + 3] = 255; // opaque, so the browser stores the values exactly
    }
  }
  ctx.putImageData(img, 0, 0);
  cells.refresh();

  const base = new Phaser.Display.BaseShader("smooth-terrain", FRAGMENT, VERTEX, {
    uMapSize: { type: "2f", value: { x: o.width, y: o.height } },
    uAtlasCount: { type: "1f", value: o.atlasCount },
    uTileSize: { type: "1f", value: o.tileSize },
    uWobble: { type: "1f", value: TERRAIN_BLEND.wobble },
    uWaves: { type: "1f", value: TERRAIN_BLEND.waves },
    uSoft: { type: "1f", value: TERRAIN_BLEND.soft },
  });
  const shader = scene.add.shader(base, 0, 0, o.width * o.tileSize, o.height * o.tileSize);
  shader.setOrigin(0, 0);
  shader.setChannel0(o.atlasKey, nearest());
  shader.setChannel1("terrain-cells", nearest());
  return shader;
}
