// Rats: wander around looking for food, chase bunnies that come within 4 tiles and bite them.
// Called by GameRoom every tick. Numbers: shared/enemies.ts.
import { MapSchema } from "@colyseus/schema";
import { Enemy, Player } from "./rooms/schema/GameState.js";
import { RAT, RAT_SPAWN_TERRAIN } from "../../shared/enemies.js";
import type { Body, World } from "../../shared/world.js";

export class Rats {
  private nextId = 1;
  private respawns: number[] = []; // times when dead rats come back

  constructor(
    private world: World,
    private enemies: MapSchema<Enemy>,
    /** A rat bites a bunny (the room decides block / damage and shows the effects). */
    private bite: (ratId: string, rat: Enemy, targetId: string, target: Player) => void
  ) {
    for (let i = 0; i < RAT.count; i++) this.spawn();
  }

  /** A rat in a random place on grass / trees / hills / swamp, away from the start town. */
  private spawn() {
    const { world } = this;
    const ts = world.map.tileSize;
    const town = { x: (world.map.spawn.x + 0.5) * ts, y: (world.map.spawn.y + 0.5) * ts };
    for (let tries = 0; tries < 500; tries++) {
      const x = Math.random() * world.pixelWidth;
      const y = Math.random() * world.pixelHeight;
      if (!RAT_SPAWN_TERRAIN.has(world.tileAt(x, y)) || !world.canStand(x, y)) continue;
      if (Math.hypot(x - town.x, y - town.y) < RAT.minSpawnDistance) continue;
      const rat = new Enemy();
      rat.kind = "rat";
      rat.hp = RAT.hp;
      rat.fx = x;
      rat.fy = y;
      rat.x = Math.round(x);
      rat.y = Math.round(y);
      this.enemies.set(`rat${this.nextId++}`, rat);
      return;
    }
  }

  /** Takes HP from a rat; at 0 it dies and another one appears somewhere after a while. Returns true if it died. */
  hurt(id: string, dmg: number): boolean {
    const rat = this.enemies.get(id);
    if (!rat || dmg <= 0) return false;
    rat.hp = Math.max(0, rat.hp - dmg);
    if (rat.hp > 0) return false;
    this.enemies.delete(id);
    this.respawns.push(Date.now() + RAT.respawnMs);
    return true;
  }

  /** One tick. `bodies`: every living character (bunnies and rats), which rats can't walk into. */
  update(dt: number, now: number, players: MapSchema<Player>, bodies: readonly Body[] = []) {
    // Dead rats coming back
    const due = this.respawns.filter((t) => t <= now).length;
    if (due) {
      this.respawns = this.respawns.filter((t) => t > now);
      for (let i = 0; i < due; i++) this.spawn();
    }

    this.enemies.forEach((rat, id) => {
      if (rat.kind !== "rat") return; // crusaders have their own brain (crusaders.ts)
      // Keep chasing the current target while it's in reach, else look for the nearest bunny nearby
      let target = rat.target ? players.get(rat.target) : undefined;
      if (target && (!fair(target, now) || dist(rat, target) > RAT.giveUpRange)) target = undefined;
      if (!target) {
        rat.target = "";
        let best = RAT.aggroRange;
        for (const [pid, p] of players.entries()) {
          const d = dist(rat, p);
          if (d <= best && fair(p, now)) {
            best = d;
            target = p;
            rat.target = pid;
          }
        }
      }

      let dx = 0;
      let dy = 0;
      let speed = RAT.wanderSpeed;
      if (target) {
        // Chase, and bite when close enough
        const d = dist(rat, target);
        if (d > RAT.biteRange * 0.8) {
          dx = target.x - rat.fx;
          dy = target.y - rat.fy;
          speed = RAT.chaseSpeed;
        }
        if (d <= RAT.biteRange && now - rat.lastBiteAt >= RAT.biteCooldownMs) {
          rat.lastBiteAt = now;
          rat.faceLeft = target.x < rat.fx;
          this.bite(id, rat, rat.target, target);
        }
      } else {
        // Wander: walk a bit in a random direction, rest a bit, repeat. Towns smell of bunnies: keep out.
        if (now >= rat.until) {
          const walk = Math.random() < 0.6;
          const a = Math.random() * Math.PI * 2;
          rat.dirX = walk ? Math.cos(a) : 0;
          rat.dirY = walk ? Math.sin(a) : 0;
          rat.until = now + (walk ? 1000 + Math.random() * 2500 : 1500 + Math.random() * 3500);
        }
        dx = rat.dirX;
        dy = rat.dirY;
        if (dx || dy) {
          const ahead = this.world.tileAt(rat.fx + dx * 40, rat.fy + dy * 40);
          if (ahead === "C") rat.until = 0; // pick another direction next tick
        }
      }

      if (dx || dy) {
        const next = this.world.step(rat.fx, rat.fy, dx, dy, dt, speed, bodies, rat);
        if (next.x === rat.fx && next.y === rat.fy && !target) rat.until = 0; // stuck (water, cliff): turn
        rat.fx = next.x;
        rat.fy = next.y;
        if (Math.abs(dx) > 0.2) rat.faceLeft = dx < 0;
      }
      // Rounded positions: changes smaller than a pixel aren't sent to the players
      const rx = Math.round(rat.fx);
      const ry = Math.round(rat.fy);
      if (rat.x !== rx) rat.x = rx;
      if (rat.y !== ry) rat.y = ry;
    });
  }
}

const dist = (rat: Enemy, p: { x: number; y: number }) => Math.hypot(p.x - rat.fx, p.y - rat.fy);

/** Rats leave knocked-out and freshly respawned (protected) bunnies alone. */
const fair = (p: Player, now: number) => !p.deadUntil && p.protectedUntil <= now;
