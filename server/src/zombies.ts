// Zombies: enemies raised from their bodies with Necromancy (shared/magic.ts). Each serves the bunny that
// raised it (its master) for ZOMBIE.lifeMs, then crumbles to dust. Called by GameRoom every tick.
//
//   follow  gather in a ring around the master and walk along with it
//   defend  the master or one of the zombies was attacked: go for the attacker (given up if the fight
//           drifts more than ZOMBIE.leash from the master, or the attacker is gone)
//   order   the master sent the army to a tile (N): attack anybody there or on the 8 tiles around it,
//           and hold that place until the master walks up to them (ARMY.recall): then that squad follows again
//
// Who a zombie may attack is decided by the room (canHarm): never its master or the master's other
// zombies; other bunnies and their zombies only with friendly fire on. Numbers: shared/enemies.ts.
import { MapSchema } from "@colyseus/schema";
import { Enemy, Player } from "./rooms/schema/GameState.js";
import { ARMY, ZOMBIE, zombieKind, baseKind, isZombie, type LivingKind } from "../../shared/enemies.js";
import { inArea, tileCenter } from "../../shared/magic.js";
import type { Body, World } from "../../shared/world.js";

type Mode = "follow" | "defend" | "order";

export interface ZombieWorld {
  /** Where something attackable is (a bunny that isn't knocked out or protected, or an enemy), if it exists. */
  posOf(id: string): Body | undefined;
  /** May the zombies of `master` attack `targetId`? */
  canHarm(master: string, targetId: string): boolean;
  /** Everyone a zombie could attack (bunnies that can be hurt and all enemies), with their positions. */
  everyone(): Iterable<[string, Body]>;
}

export class Zombies {
  private nextId = 1;
  private mode = new Map<string, Mode>();

  constructor(
    private world: World,
    private enemies: MapSchema<Enemy>,
    /** A zombie attacks `targetId` (the room shows the swing or bite and deals the damage). */
    private strike: (id: string, z: Enemy, targetId: string, attack: number) => void,
    /** A zombie's time is up (or its master left): it crumbles to dust. */
    private crumble: (id: string, z: Enemy) => void
  ) {}

  /** A body rises at (x, y) and serves `master`. Returns the new zombie's id. */
  raise(master: string, kind: LivingKind, x: number, y: number, now: number): string {
    const z = new Enemy();
    z.kind = zombieKind(kind);
    z.owner = master;
    z.hp = ZOMBIE[kind].hp;
    z.fx = x;
    z.fy = y;
    z.x = Math.round(x);
    z.y = Math.round(y);
    z.until = now + ZOMBIE.lifeMs;
    const id = `z${this.nextId++}`;
    this.enemies.set(id, z);
    this.mode.set(id, "follow");
    return id;
  }

  /** The zombies serving `master`. */
  armyOf(master: string): [string, Enemy][] {
    const out: [string, Enemy][] = [];
    this.enemies.forEach((e, id) => { if (isZombie(e.kind) && e.owner === master) out.push([id, e]); });
    return out;
  }

  /** Takes HP from a zombie. Returns true if it fell (its body stays, and can be raised again). */
  hurt(id: string, dmg: number): boolean {
    const z = this.enemies.get(id);
    if (!z || dmg <= 0) return false;
    z.hp = Math.max(0, z.hp - dmg);
    if (z.hp > 0) return false;
    this.remove(id);
    return true;
  }

  /**
   * Someone attacked the master or one of its zombies: the zombies that are just following go for the
   * attacker; the one that was hit (`victim`) fights back even when it was sent somewhere.
   */
  provoke(master: string, attackerId: string, canHarm: boolean, victim?: string) {
    if (!canHarm || attackerId === master) return;
    for (const [id, z] of this.armyOf(master)) {
      const mode = this.mode.get(id);
      if (mode === "order" && id !== victim) continue; // holding their place
      if (mode !== "order") this.mode.set(id, "defend");
      z.target = attackerId;
    }
  }

  /** N: the master's whole army goes to tile (tx, ty). */
  order(master: string, tx: number, ty: number) {
    for (const [id, z] of this.armyOf(master)) {
      this.mode.set(id, "order");
      z.dirX = tx; // the target tile (zombies don't wander, so these fields are free)
      z.dirY = ty;
      z.band = 0; // 1 once the master has been away from it, so walking up to them later recalls them
      z.target = "";
    }
  }

  /** The master left the game: its zombies crumble. */
  disband(master: string) {
    for (const [id, z] of this.armyOf(master)) {
      this.crumble(id, z);
      this.remove(id);
    }
  }

  /** One tick. `bodies`: what zombies can't walk through (other enemies and zombies; they pass through bunnies). */
  update(dt: number, now: number, players: MapSchema<Player>, w: ZombieWorld, bodies: readonly Body[]) {
    const armies = new Map<string, [string, Enemy][]>();
    this.enemies.forEach((z, id) => {
      if (!isZombie(z.kind)) return;
      const list = armies.get(z.owner) ?? [];
      list.push([id, z]);
      armies.set(z.owner, list);
    });

    for (const [masterId, army] of armies) {
      const master = players.get(masterId);
      // Recall: the master walked up to a squad it had sent somewhere → that squad follows again
      if (master) {
        const recalled = new Set<string>();
        for (const [id, z] of army) {
          if (this.mode.get(id) !== "order") continue;
          const d = Math.hypot(master.x - z.fx, master.y - z.fy);
          if (d > ARMY.recall) z.band = 1;
          else if (z.band === 1) recalled.add(`${z.dirX},${z.dirY}`);
        }
        for (const [id, z] of army) {
          if (this.mode.get(id) === "order" && recalled.has(`${z.dirX},${z.dirY}`)) {
            this.mode.set(id, "follow");
            z.target = "";
          }
        }
      }

      let ringIndex = 0;
      for (const [id, z] of army) {
        if (!master || now >= z.until) {
          this.crumble(id, z);
          this.remove(id);
          continue;
        }
        const stats = ZOMBIE[baseKind(z.kind)];
        let mode = this.mode.get(id) ?? "follow";

        // ---- pick a target ----
        let target = z.target && w.canHarm(masterId, z.target) ? w.posOf(z.target) : undefined;
        if (mode === "defend" && (!target || Math.hypot(target.x - master.x, target.y - master.y) > ZOMBIE.leash)) {
          mode = "follow";
          target = undefined;
        }
        if (mode === "order") {
          // anybody on the target tile or around it; keep the current one while it's still there, or
          // while it's right next to the zombie (something that attacked it on the way, or just outside)
          if (target && !inArea(target.x, target.y, z.dirX, z.dirY, ARMY.radius) && Math.hypot(target.x - z.fx, target.y - z.fy) > ARMY.engaged) {
            target = undefined;
          }
          if (!target) {
            let best = Infinity;
            z.target = "";
            for (const [oid, o] of w.everyone()) {
              if (!inArea(o.x, o.y, z.dirX, z.dirY, ARMY.radius) || !w.canHarm(masterId, oid)) continue;
              const d = Math.hypot(o.x - z.fx, o.y - z.fy);
              if (d < best) (best = d), (target = o), (z.target = oid);
            }
          }
        }
        if (!target) z.target = "";
        this.mode.set(id, mode);

        // ---- where to go ----
        let goal: { x: number; y: number };
        let speed: number;
        let near: number; // close enough to stop
        if (target) {
          goal = target;
          speed = ZOMBIE.chaseSpeed;
          near = stats.reach * 0.8;
        } else if (mode === "order") {
          goal = tileCenter(z.dirX, z.dirY);
          speed = ZOMBIE.followSpeed;
          near = 20 + 14 * (army.length > 4 ? 1 : 0); // a crowd can't all stand on the very center
        } else {
          // Lost far behind (e.g. the master woke up in the start town): rise again next to it
          if (Math.hypot(master.x - z.fx, master.y - z.fy) > ZOMBIE.lostAt) this.rejoin(z, master);
          const i = ringIndex++;
          const angle = i * 2.39996; // golden angle: spots spread evenly around the master
          const r = ZOMBIE.ring + 18 * Math.floor(i / 6);
          goal = { x: master.x + Math.cos(angle) * r, y: master.y + Math.sin(angle) * r };
          speed = ZOMBIE.followSpeed;
          near = 8;
        }
        const gx = goal.x - z.fx;
        const gy = goal.y - z.fy;
        const gd = Math.hypot(gx, gy);
        if (gd > near) {
          const v = Math.min(speed, Math.max(40, gd * 4));
          let next = this.world.step(z.fx, z.fy, gx, gy, dt, v, bodies, z);
          // Blocked (by another body or the terrain): try going round it, a bit to one side or the other
          for (const turn of [0.8, -0.8, 1.6, -1.6]) {
            if (next.x !== z.fx || next.y !== z.fy) break;
            const a = Math.atan2(gy, gx) + turn;
            next = this.world.step(z.fx, z.fy, Math.cos(a), Math.sin(a), dt, v, bodies, z);
          }
          this.moveTo(z, next.x, next.y);
        }

        // ---- attack ----
        if (target && z.target && Math.hypot(target.x - z.fx, target.y - z.fy) <= stats.reach && now - z.lastBiteAt >= stats.cooldownMs) {
          z.lastBiteAt = now;
          z.faceLeft = target.x < z.fx;
          this.strike(id, z, z.target, stats.attack);
        }
      }
    }
  }

  /** Puts a zombie that got lost next to its master (the first free spot around it). */
  private rejoin(z: Enemy, master: Player) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x = master.x + Math.cos(a) * ZOMBIE.ring;
      const y = master.y + Math.sin(a) * ZOMBIE.ring;
      if (this.world.canStand(x, y)) return this.moveTo(z, x, y);
    }
    this.moveTo(z, master.x, master.y + 1);
  }

  private remove(id: string) {
    this.enemies.delete(id);
    this.mode.delete(id);
  }

  private moveTo(e: Enemy, x: number, y: number) {
    if (Math.abs(x - e.fx) > 0.2) e.faceLeft = x < e.fx;
    e.fx = x;
    e.fy = y;
    const rx = Math.round(x);
    const ry = Math.round(y);
    if (e.x !== rx) e.x = rx;
    if (e.y !== ry) e.y = ry;
  }
}
