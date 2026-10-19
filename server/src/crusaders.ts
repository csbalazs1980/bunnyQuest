// Crusaders (an easter egg): bands of five knights led by King Arthur. The king marches about, the
// knights follow him in a loose formation with a little sideways wobble and never stray more than
// 2 tiles from him. A bunny within 5 tiles gets charged ("CHARGE!"). Once three of a band have
// fallen, the survivors lose their nerve: they run from bunnies screaming "AAAAAAA!!!", "RETREAT!"
// and "RUN FOR YOUR LIVES!". If they knock out the bunny they were charging, they cheer instead
// ("Victory is ours!", ...). Numbers: CRUSADERS in shared/enemies.ts.
import { MapSchema } from "@colyseus/schema";
import { Enemy, Player } from "./rooms/schema/GameState.js";
import { CRUSADERS as C, RAT_SPAWN_TERRAIN, type Shout } from "../../shared/enemies.js";
import type { Body, World } from "../../shared/world.js";

interface Band {
  members: string[]; // enemy ids; [0] is the king. The first one still alive leads.
  state: "march" | "charge" | "flee";
  broken: boolean; // three are down: from now on they flee from bunnies instead of fighting
  fallen: number;
  target: string; // the bunny being charged
  heading: number; // where the leader last walked (the formation trails behind it)
  dirX: number; // marching direction (0, 0 = resting)
  dirY: number;
  until: number; // when to pick a new marching direction / rest
  chargeShoutAt: number;
}

/** Formation spots behind the leader (x: back, y: sideways), in pixels. All within the 2-tile leash. */
const SLOTS = [
  { back: 48, side: -36 },
  { back: 48, side: 36 },
  { back: 88, side: -24 },
  { back: 88, side: 24 },
];
/** The leader waits for knights further than this from him (the back spots are ~92 px away). */
const LAGGING = 112;

const FLEE_LINES: Shout[] = ["aaa", "retreat", "run"];
const VICTORY_LINES: Shout[] = ["victory", "fineDay", "triumph"];

export class Crusaders {
  private bands: Band[] = [];
  private respawns: { band: number; at: number }[] = [];

  constructor(
    private world: World,
    private enemies: MapSchema<Enemy>,
    /** A crusader swings at a bunny or a zombie (the room decides block / damage and shows the effects). */
    private strike: (id: string, e: Enemy, targetId: string, target: Body, attack: number) => void,
    /** A crusader shouts something (shown in a speech bubble, translated on each client). */
    private shout: (id: string, line: Shout) => void
  ) {
    for (let b = 0; b < C.groups; b++) this.spawnBand(b);
  }

  /** A band in a random place in the wild, far from the start town, with room for the formation. */
  private spawnBand(b: number) {
    const { world } = this;
    const ts = world.map.tileSize;
    const town = { x: (world.map.spawn.x + 0.5) * ts, y: (world.map.spawn.y + 0.5) * ts };
    for (let tries = 0; tries < 1000; tries++) {
      const x = Math.random() * world.pixelWidth;
      const y = Math.random() * world.pixelHeight;
      if (!RAT_SPAWN_TERRAIN.has(world.tileAt(x, y)) || Math.hypot(x - town.x, y - town.y) < C.minSpawnDistance) continue;
      const heading = Math.random() * Math.PI * 2;
      const spots = [{ x, y }, ...SLOTS.map((s) => slotPos({ fx: x, fy: y }, heading, s, 0))];
      if (!spots.every((p) => world.canStand(p.x, p.y))) continue;
      const band: Band = {
        members: [], state: "march", broken: false, fallen: 0, target: "",
        heading, dirX: 0, dirY: 0, until: 0, chargeShoutAt: 0,
      };
      spots.forEach((p, i) => {
        const e = new Enemy();
        e.kind = i === 0 ? "king" : "knight";
        e.hp = i === 0 ? C.king.hp : C.knight.hp;
        e.band = b;
        e.fx = p.x;
        e.fy = p.y;
        e.x = Math.round(p.x);
        e.y = Math.round(p.y);
        e.dirX = Math.random() * Math.PI * 2; // knights: wobble phase
        const id = `cr${b}-${i}`;
        this.enemies.set(id, e);
        band.members.push(id);
      });
      this.bands[b] = band;
      return;
    }
  }

  /** Takes HP from a crusader. Returns true if it died. Three down: the band breaks and flees. */
  hurt(id: string, dmg: number, now = Date.now()): boolean {
    const e = this.enemies.get(id);
    if (!e || dmg <= 0) return false;
    e.hp = Math.max(0, e.hp - dmg);
    if (e.hp > 0) return false;
    this.enemies.delete(id);
    const band = this.bands[e.band];
    if (!band) return true;
    band.fallen++;
    const alive = this.alive(band);
    if (!alive.length) {
      this.respawns.push({ band: e.band, at: now + C.respawnMs });
    } else if (band.fallen >= C.breakAfter && !band.broken) {
      band.broken = true;
      band.state = "flee";
      // everyone left screams, one after the other
      alive.forEach(([, m], i) => (m.shoutAt = now + i * 450));
    }
    return true;
  }

  private alive(band: Band): [string, Enemy][] {
    const out: [string, Enemy][] = [];
    for (const id of band.members) {
      const e = this.enemies.get(id);
      if (e) out.push([id, e]);
    }
    return out;
  }

  /**
   * One tick. `foes`: who they charge (bunnies that can be hurt right now, and zombies: unholy monsters),
   * by id; `players` to notice when the bunny they charged is knocked out (time to cheer).
   */
  update(dt: number, now: number, players: MapSchema<Player>, foes: ReadonlyMap<string, Body>, bodies: readonly Body[] = []) {
    for (const r of this.respawns.filter((r) => r.at <= now)) this.spawnBand(r.band);
    this.respawns = this.respawns.filter((r) => r.at > now);

    this.bands.forEach((band) => {
      const alive = this.alive(band);
      if (!alive.length) return;
      const [leaderId, leader] = alive[0];
      const near = nearestFoe(leader, foes);

      // ---- decide what the band does ----
      if (band.broken) {
        if (near && near.dist < C.fleeFrom) band.state = "flee";
        else if (band.state === "flee" && (!near || near.dist > C.safeAt)) band.state = "march";
      } else {
        if (band.state === "charge") {
          const t = foes.get(band.target);
          if (!t) {
            if (players.get(band.target)?.deadUntil) this.celebrate(band, alive, now); // the monster is down!
            band.state = "march";
          } else if (dist(leader, t) > C.giveUpRange) band.state = "march";
        }
        if (band.state === "march" && near && near.dist <= C.aggroRange) {
          band.state = "charge";
          band.target = near.id;
          if (leader.kind === "king") this.kingShouts(leaderId, leader, band, now, true);
        }
      }
      const target = band.state === "charge" ? foes.get(band.target) : undefined;

      // ---- the leader moves ----
      let dx = 0;
      let dy = 0;
      let speed = C.walkSpeed;
      if (band.state === "charge" && target) {
        if (dist(leader, target) > C.hitRange * 0.8) {
          dx = target.x - leader.fx;
          dy = target.y - leader.fy;
        }
        speed = C.chaseSpeed;
      } else if (band.state === "flee" && near) {
        dx = leader.fx - near.p.x;
        dy = leader.fy - near.p.y;
        speed = C.fleeSpeed;
      } else {
        // marching: walk a while, rest a while; wait for knights that fell behind; keep out of towns
        if (now >= band.until) {
          const walk = Math.random() < 0.7;
          const a = Math.random() * Math.PI * 2;
          band.dirX = walk ? Math.cos(a) : 0;
          band.dirY = walk ? Math.sin(a) : 0;
          band.until = now + (walk ? 3000 + Math.random() * 4000 : 1500 + Math.random() * 2500);
        }
        const lagging = alive.some(([, m], i) => i > 0 && dist(leader, { x: m.fx, y: m.fy }) > LAGGING);
        if (!lagging) {
          dx = band.dirX;
          dy = band.dirY;
        }
        if ((dx || dy) && this.world.tileAt(leader.fx + dx * 48, leader.fy + dy * 48) === "C") band.until = 0;
      }
      if (dx || dy) {
        const before = { x: leader.fx, y: leader.fy };
        let next = this.world.step(leader.fx, leader.fy, dx, dy, dt, speed, bodies, leader);
        if (next.x === before.x && next.y === before.y) {
          if (band.state === "flee") next = this.world.step(leader.fx, leader.fy, -dy, dx, dt, speed, bodies, leader); // cornered: sideways
          else if (band.state === "march") band.until = 0; // blocked: turn
        }
        this.moveTo(leader, next.x, next.y);
        const mx = next.x - before.x;
        const my = next.y - before.y;
        if (mx || my) band.heading = Math.atan2(my, mx);
      }

      // ---- the knights follow (or fight), never more than 2 tiles from the leader ----
      alive.forEach(([id, m], i) => {
        if (i === 0) return;
        const slotIndex = Math.max(0, band.members.indexOf(id) - 1) % SLOTS.length;
        let goal: { x: number; y: number };
        let max = Math.max(speed * C.followSpeed, 70);
        if (band.state === "charge" && target) {
          goal = { x: target.x, y: target.y }; // run at the bunny (the leash still holds)
          max = C.chaseSpeed;
        } else {
          const wobble = Math.sin(now / 650 + m.dirX) * 12; // a little sideways sway
          goal = slotPos(leader, band.heading, SLOTS[slotIndex], wobble);
        }
        const gx = goal.x - m.fx;
        const gy = goal.y - m.fy;
        const gd = Math.hypot(gx, gy);
        if (gd > (band.state === "charge" ? C.hitRange * 0.8 : 4)) {
          const stepSpeed = Math.min(max, gd * 4); // slow down near the spot instead of overshooting
          let next = this.world.step(m.fx, m.fy, gx, gy, dt, stepSpeed, bodies, m);
          if (Math.hypot(next.x - leader.fx, next.y - leader.fy) > C.leash) {
            // that would break the leash: head back toward the leader instead
            next = this.world.step(m.fx, m.fy, leader.fx - m.fx, leader.fy - m.fy, dt, max, bodies, m);
          }
          this.moveTo(m, next.x, next.y);
        }
        this.keepOnLeash(m, leader);
      });

      // ---- swings and shouts ----
      alive.forEach(([id, m]) => {
        if (band.state === "charge" && target && dist(m, target) <= C.hitRange && now - m.lastBiteAt >= C.hitCooldownMs) {
          m.lastBiteAt = now;
          m.faceLeft = target.x < m.fx;
          if (m.kind === "king") this.kingShouts(id, m, band, now, false);
          this.strike(id, m, band.target, target, m.kind === "king" ? C.king.attack : C.knight.attack);
        }
        if (m.pendingShout && now >= m.shoutAt) {
          this.shout(id, m.pendingShout as Shout);
          m.pendingShout = "";
        } else if (band.state === "flee" && now >= m.shoutAt) {
          m.shoutAt = now + 1800 + Math.random() * 1800;
          this.shout(id, FLEE_LINES[Math.floor(Math.random() * FLEE_LINES.length)]);
        }
      });
    });
  }

  /**
   * They knocked out the bunny they were charging: everyone left cheers, one after the other, each a
   * different line if possible. "We lost many men..." only if the band actually lost someone. Then
   * they stand around a moment, very pleased with themselves, before marching on.
   */
  private celebrate(band: Band, alive: [string, Enemy][], now: number) {
    const lines = [...VICTORY_LINES];
    alive.forEach(([, m], i) => {
      if (!lines.length) lines.push(...VICTORY_LINES);
      // the leader speaks first; after losses he's the one to say it
      m.pendingShout = i === 0 && band.fallen > 0 ? "lostMen" : lines.splice(Math.floor(Math.random() * lines.length), 1)[0];
      m.shoutAt = now + 400 + i * 900;
    });
    band.dirX = 0;
    band.dirY = 0;
    band.until = now + 2500 + alive.length * 900;
  }

  /** "CHARGE!" when the charge begins, and again on his swings (at most every 6 s). */
  private kingShouts(id: string, king: Enemy, band: Band, now: number, start: boolean) {
    if (!start && now < band.chargeShoutAt) return;
    band.chargeShoutAt = now + 6000;
    this.shout(id, "charge");
  }

  /** The 2-tile rule is absolute: a knight stuck behind trees or water is pulled back to the leader's side. */
  private keepOnLeash(m: Enemy, leader: Enemy) {
    const d = Math.hypot(m.fx - leader.fx, m.fy - leader.fy);
    if (d <= C.leash) return;
    for (const f of [0.9, 0.7, 0.5, 0.3]) {
      const x = leader.fx + ((m.fx - leader.fx) / d) * C.leash * f;
      const y = leader.fy + ((m.fy - leader.fy) / d) * C.leash * f;
      if (this.world.canStand(x, y)) return this.moveTo(m, x, y);
    }
    this.moveTo(m, leader.fx, leader.fy + 1); // nowhere else to stand: right next to him
  }

  private moveTo(e: Enemy, x: number, y: number) {
    if (Math.abs(x - e.fx) > 0.2) e.faceLeft = x < e.fx;
    e.fx = x;
    e.fy = y;
    const rx = Math.round(x);
    const ry = Math.round(y);
    if (e.x !== rx) e.x = rx; // whole pixels: tiny moves aren't sent to the players
    if (e.y !== ry) e.y = ry;
  }
}

/** A formation spot: `back` pixels behind the leader (against its heading), `side` to the side. */
function slotPos(leader: { fx: number; fy: number }, heading: number, s: { back: number; side: number }, wobble: number) {
  const bx = -Math.cos(heading);
  const by = -Math.sin(heading);
  const side = s.side + wobble;
  return { x: leader.fx + bx * s.back - by * side, y: leader.fy + by * s.back + bx * side };
}

const dist = (e: Enemy, p: { x: number; y: number }) => Math.hypot(p.x - e.fx, p.y - e.fy);

/** The closest of `foes` (bunnies that can be hurt right now, and zombies). */
function nearestFoe(e: Enemy, foes: ReadonlyMap<string, Body>) {
  let best: { id: string; p: Body; dist: number } | undefined;
  for (const [id, p] of foes) {
    const d = dist(e, p);
    if (!best || d < best.dist) best = { id, p, dist: d };
  }
  return best;
}
