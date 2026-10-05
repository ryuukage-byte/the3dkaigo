/**
 * PhysicsWorld.ts
 * Lightweight planar (XZ) rigid-body simulation for movable props
 * (chairs, tables, wheelchairs). Pure simulation: no rendering, no input.
 *
 * Model
 * - Bodies are vertical cylinders (circle in XZ) with mass, friction and damping.
 * - Static geometry (walls, beds, fixtures) comes from CollisionWorld and is
 *   resolved by depenetration, so bodies slide along walls and never end up inside.
 * - The player is a circle with a mass. Contacts are solved with positional
 *   correction split by inverse mass + a small restitution impulse, so a chair
 *   barely slows the player while a table noticeably does. A body that is blocked
 *   (wall, locked brake, chain of bodies) pushes the player back instead.
 * - A "grip joint" lets the player hold a body (wheelchair handles): two-way
 *   positional constraint with mass sharing; no teleporting.
 *
 * step(dt) must be called with dt <= ~1/60 (Game sub-steps larger frames).
 */

import * as THREE from 'three';
import { collisionWorld } from '../world/CollisionWorld.ts';

const GRAVITY = 9.81;
const SOLVER_ITERATIONS = 4;
const MAX_BODY_SPEED = 3.2;
const MAX_ANGULAR_SPEED = 3.0;
const SLEEP_SPEED = 0.02;
const PUSH_LOAD_REF = 80; // kg of friction-weighted load that halves the player's speed

export interface PlayerProxy {
  position: THREE.Vector3;
  velocity: THREE.Vector3; // horizontal components are read and written by the solver
  yaw: number;
  radius: number;
  height: number;
  mass: number;
}

export interface PhysicalBodyConfig {
  id: string;
  name: string;
  group: THREE.Group;
  movable?: boolean;
  mass?: number;            // kg
  radius?: number;          // m
  height?: number;          // m
  friction?: number;        // sliding/rolling friction coefficient (decel = friction * g)
  restitution?: number;     // 0..1
  linearDamping?: number;   // 1/s, velocity-proportional drag
  angularDamping?: number;  // 1/s
  lateralGrip?: number;     // 1/s; >0 makes the body resist sideways sliding (wheels)
  isLocked?: () => boolean; // e.g. wheelchair parking brake
  onMove?: (deltaMove: THREE.Vector3, speed: number) => void;
}

export class PhysicalBody {
  public readonly id: string;
  public readonly name: string;
  public readonly group: THREE.Group;
  public movable: boolean;
  public mass: number;
  public radius: number;
  public height: number;
  public friction: number;
  public restitution: number;
  public linearDamping: number;
  public angularDamping: number;
  public lateralGrip: number;
  public isLocked?: () => boolean;
  public onMove?: (deltaMove: THREE.Vector3, speed: number) => void;

  public readonly velocity = new THREE.Vector3();
  public readonly position = new THREE.Vector3();
  public angularVelocity = 0; // rad/s about Y
  public rotationY = 0;
  public isMoving = false;

  constructor(config: PhysicalBodyConfig, id: string) {
    this.id = id;
    this.name = config.name;
    this.group = config.group;
    this.movable = config.movable ?? true;
    this.mass = config.mass ?? 15;
    this.radius = config.radius ?? 0.32;
    this.height = config.height ?? 0.85;
    this.friction = config.friction ?? 0.45;
    this.restitution = config.restitution ?? 0.1;
    this.linearDamping = config.linearDamping ?? 0.6;
    this.angularDamping = config.angularDamping ?? 3.0;
    this.lateralGrip = config.lateralGrip ?? 0;
    this.isLocked = config.isLocked;
    this.onMove = config.onMove;

    this.position.copy(config.group.position);
    this.rotationY = config.group.rotation.y;
  }

  public get locked(): boolean {
    return !this.movable || (this.isLocked ? this.isLocked() : false);
  }

  /** Instantaneous push (N*s). Ignored while locked. */
  public applyImpulse(impulse: THREE.Vector3) {
    if (this.locked) return;
    const inv = 1 / this.mass;
    this.velocity.x += impulse.x * inv;
    this.velocity.z += impulse.z * inv;
    this.clampSpeed();
  }

  public clampSpeed() {
    const s = Math.hypot(this.velocity.x, this.velocity.z);
    if (s > MAX_BODY_SPEED) {
      const k = MAX_BODY_SPEED / s;
      this.velocity.x *= k;
      this.velocity.z *= k;
    }
  }
}

/** Player <-> body grip. Anchor is `anchorDistance` behind the body (local -Z). */
interface PlayerJoint {
  body: PhysicalBody;
  anchorDistance: number;
  slack: number;
  engaged: boolean; // false while the player is still being walked to the grip
  alignYaw: boolean;
}

const JOINT_ASSIST_SPEED = 2.2; // m/s the player is drawn to the grips before engagement
const JOINT_YAW_RATE = 2.8; // rad/s max body turn toward player's facing

export class PhysicsWorld {
  private bodies = new Map<string, PhysicalBody>();
  private list: PhysicalBody[] = [];
  private player: PlayerProxy | null = null;
  private pushLoad = 0; // mass-weighted resistance the player is currently shoving against
  private joint: PlayerJoint | null = null;

  // scratch
  private readonly tmp = new THREE.Vector3();
  private readonly anchor = new THREE.Vector3();

  public register(config: PhysicalBodyConfig): PhysicalBody {
    let id = config.id;
    for (let n = 2; this.bodies.has(id); n++) id = `${config.id}#${n}`; // never silently replace a body
    const body = new PhysicalBody(config, id);
    this.bodies.set(id, body);
    this.list.push(body);
    return body;
  }

  public unregister(id: string) {
    const body = this.bodies.get(id);
    if (!body) return;
    this.bodies.delete(id);
    this.list = this.list.filter((b) => b !== body);
    if (this.joint?.body === body) this.joint = null;
  }

  public getBody(id: string): PhysicalBody | undefined {
    return this.bodies.get(id);
  }

  public getBodies(): readonly PhysicalBody[] {
    return this.list;
  }

  public setPlayer(player: PlayerProxy | null) {
    this.player = player;
  }

  /**
   * Walk-speed multiplier (0..1) from what the player is pushing right now:
   * ~0.92 for a chair, ~0.7 for a table, lower for several at once.
   */
  public get playerSpeedFactor(): number {
    return 1 / (1 + this.pushLoad / PUSH_LOAD_REF);
  }

  public getJointBody(): PhysicalBody | null {
    return this.joint?.body ?? null;
  }

  public attachPlayerJoint(body: PhysicalBody, anchorDistance: number, alignYaw: boolean = true) {
    this.joint = { body, anchorDistance, slack: 0.04, engaged: false, alignYaw };
  }

  public detachPlayerJoint() {
    this.joint = null;
  }

  public clear() {
    this.bodies.clear();
    this.list = [];
    this.joint = null;
  }

  /** Advances the simulation by dt seconds. */
  public step(dt: number) {
    if (dt <= 0) return;

    for (const b of this.list) this.integrate(b, dt);

    this.pushLoad = 0;
    this.alignHeldBody(dt);
    const startPos = this.joint ? this.joint.body.position.clone() : null;

    for (let it = 0; it < SOLVER_ITERATIONS; it++) {
      this.solveJoint(dt);
      this.solvePlayerContacts(dt, it === 0);
      this.solveBodyContacts();
      this.constrainToStatics();
    }

    // Held body keeps the momentum it actually had, so releasing it rolls on.
    if (this.joint?.engaged && startPos && !this.joint.body.locked) {
      const b = this.joint.body;
      b.velocity.set((b.position.x - startPos.x) / dt, 0, (b.position.z - startPos.z) / dt);
      b.clampSpeed();
    }

    this.finalizePlayer();
    this.syncVisuals(dt);
  }

  // ---- integration -------------------------------------------------------

  private integrate(b: PhysicalBody, dt: number) {
    if (b.locked) {
      b.velocity.set(0, 0, 0);
      b.angularVelocity = 0;
      b.isMoving = false;
      return;
    }

    // Friction: constant deceleration (Coulomb) + velocity-proportional drag
    let speed = Math.hypot(b.velocity.x, b.velocity.z);
    if (speed > 0) {
      const newSpeed = Math.max(0, speed - (b.friction * GRAVITY + b.linearDamping * speed) * dt);
      const k = newSpeed / speed;
      b.velocity.x *= k;
      b.velocity.z *= k;
      speed = newSpeed;
    }
    if (speed < SLEEP_SPEED) {
      b.velocity.set(0, 0, 0);
      speed = 0;
    }

    // Wheels: kill sideways velocity relative to the body's heading
    if (b.lateralGrip > 0 && speed > 0) {
      const rx = Math.cos(b.rotationY);
      const rz = -Math.sin(b.rotationY);
      const lat = b.velocity.x * rx + b.velocity.z * rz;
      const k = lat * (1 - Math.exp(-b.lateralGrip * dt));
      b.velocity.x -= rx * k;
      b.velocity.z -= rz * k;
    }

    b.angularVelocity *= Math.exp(-b.angularDamping * dt);
    if (Math.abs(b.angularVelocity) < 0.01) b.angularVelocity = 0;
    b.rotationY += b.angularVelocity * dt;

    if (speed > 0) {
      const ox = b.position.x;
      const oz = b.position.z;
      const wantX = b.velocity.x * dt;
      const wantZ = b.velocity.z * dt;
      collisionWorld.moveCircle(b.position, wantX, wantZ, b.radius, b.height);
      const mx = b.position.x - ox;
      const mz = b.position.z - oz;
      // Blocked by a wall: keep only the velocity that actually produced motion
      if (Math.hypot(mx, mz) < Math.hypot(wantX, wantZ) * 0.999) {
        b.velocity.set(mx / dt, 0, mz / dt);
      }
    }
  }

  // ---- constraints -------------------------------------------------------

  /** Turns the held body toward the player's facing at a capped rate (never snaps). Once per step. */
  private alignHeldBody(dt: number) {
    const j = this.joint;
    const p = this.player;
    if (!j || !p || !j.alignYaw || !j.engaged) return;
    const b = j.body;
    if (b.locked) return;
    let err = p.yaw - Math.PI - b.rotationY;
    err = Math.atan2(Math.sin(err), Math.cos(err));
    const turn = THREE.MathUtils.clamp(err * 6, -JOINT_YAW_RATE, JOINT_YAW_RATE) * dt;
    b.rotationY += Math.abs(turn) > Math.abs(err) ? err : turn;
    b.angularVelocity = 0;
  }

  private solveJoint(dt: number) {
    const j = this.joint;
    const p = this.player;
    if (!j || !p) return;
    const b = j.body;

    this.anchor.set(
      b.position.x - Math.sin(b.rotationY) * j.anchorDistance,
      0,
      b.position.z - Math.cos(b.rotationY) * j.anchorDistance
    );
    let ex = this.anchor.x - p.position.x;
    let ez = this.anchor.z - p.position.z;
    const dist = Math.hypot(ex, ez);

    if (!j.engaged) {
      // Walk the player to the grips at a capped speed (the grab is not a teleport);
      // the joint engages exactly on arrival so there is never a final snap.
      const move = Math.min(dist, (JOINT_ASSIST_SPEED * dt) / SOLVER_ITERATIONS);
      if (dist > 1e-6) {
        p.position.x += (ex / dist) * move;
        p.position.z += (ez / dist) * move;
      }
      if (move >= dist - 1e-6) j.engaged = true;
      return;
    }

    if (dist <= j.slack) return;
    const excess = dist - j.slack;
    ex = (ex / dist) * excess;
    ez = (ez / dist) * excess;

    const invP = 1 / p.mass;
    const invB = b.locked ? 0 : 1 / b.mass;
    const inv = invP + invB;
    p.position.x += ex * (invP / inv);
    p.position.z += ez * (invP / inv);
    b.position.x -= ex * (invB / inv);
    b.position.z -= ez * (invB / inv);
  }

  private solvePlayerContacts(dt: number, applyImpulses: boolean) {
    const p = this.player;
    if (!p) return;
    const heldBody = this.joint?.body ?? null;

    for (const b of this.list) {
      if (b === heldBody) continue;
      if (p.position.y + 0.1 > b.height) continue; // jumping over it

      const dx = b.position.x - p.position.x;
      const dz = b.position.z - p.position.z;
      const minDist = p.radius + b.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 >= minDist * minDist) continue;

      const dist = Math.sqrt(d2);
      let nx: number, nz: number;
      if (dist > 1e-4) {
        nx = dx / dist;
        nz = dz / dist;
      } else {
        nx = Math.sin(p.yaw) * -1;
        nz = Math.cos(p.yaw) * -1;
      }
      const overlap = minDist - dist;

      const invP = 1 / p.mass;
      const invB = b.locked ? 0 : 1 / b.mass;
      const inv = invP + invB;

      p.position.x -= nx * overlap * (invP / inv);
      p.position.z -= nz * overlap * (invP / inv);
      b.position.x += nx * overlap * (invB / inv);
      b.position.z += nz * overlap * (invB / inv);

      if (invB === 0) continue;
      if (!applyImpulses) continue;
      // Friction-weighted load while actually pushing (counted once per step)
      if (p.velocity.x * nx + p.velocity.z * nz > 0.05) this.pushLoad += b.mass * (b.friction / 0.5);

      // Normal impulse: body picks up the player's approach speed, player loses a share
      const rel = (p.velocity.x - b.velocity.x) * nx + (p.velocity.z - b.velocity.z) * nz;
      if (rel > 0) {
        const e = b.restitution;
        const jn = ((1 + e) * rel) / inv;
        b.velocity.x += nx * jn * invB;
        b.velocity.z += nz * jn * invB;
        p.velocity.x -= nx * jn * invP;
        p.velocity.z -= nz * jn * invP;
        b.clampSpeed();
      }

      // Brushing past sideways spins light bodies
      const tangential = nx * p.velocity.z - nz * p.velocity.x;
      b.angularVelocity = THREE.MathUtils.clamp(
        b.angularVelocity + tangential * invB * 12 * dt,
        -MAX_ANGULAR_SPEED,
        MAX_ANGULAR_SPEED
      );
    }
  }

  private solveBodyContacts() {
    const n = this.list.length;
    for (let i = 0; i < n; i++) {
      const a = this.list[i];
      for (let k = i + 1; k < n; k++) {
        const b = this.list[k];
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const minDist = a.radius + b.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 >= minDist * minDist) continue;

        const dist = Math.sqrt(d2);
        const nx = dist > 1e-4 ? dx / dist : 1;
        const nz = dist > 1e-4 ? dz / dist : 0;
        const overlap = minDist - dist;

        const invA = a.locked ? 0 : 1 / a.mass;
        const invB = b.locked ? 0 : 1 / b.mass;
        const inv = invA + invB;
        if (inv === 0) continue;

        a.position.x -= nx * overlap * (invA / inv);
        a.position.z -= nz * overlap * (invA / inv);
        b.position.x += nx * overlap * (invB / inv);
        b.position.z += nz * overlap * (invB / inv);

        const rel = (b.velocity.x - a.velocity.x) * nx + (b.velocity.z - a.velocity.z) * nz;
        if (rel < 0) {
          const e = Math.min(a.restitution, b.restitution);
          const jn = (-(1 + e) * rel) / inv;
          a.velocity.x -= nx * jn * invA;
          a.velocity.z -= nz * jn * invA;
          b.velocity.x += nx * jn * invB;
          b.velocity.z += nz * jn * invB;
        }
      }
    }
  }

  /** Contacts may have shoved things into walls: push everything back out. */
  private constrainToStatics() {
    for (const b of this.list) {
      if (collisionWorld.depenetrate(b.position, b.radius, b.height)) {
        // A wall just stopped it; do not keep velocity pointing into it
        b.velocity.multiplyScalar(0.5);
      }
    }
    const p = this.player;
    if (p) collisionWorld.depenetrate(p.position, p.radius, p.height);
  }

  /**
   * After the iterations, anything still overlapping the player means the body
   * could not move away (wall behind it): the player yields completely.
   */
  private finalizePlayer() {
    const p = this.player;
    if (!p) return;
    const heldBody = this.joint?.body ?? null;
    for (const b of this.list) {
      if (b === heldBody || p.position.y + 0.1 > b.height) continue;
      const dx = p.position.x - b.position.x;
      const dz = p.position.z - b.position.z;
      const minDist = p.radius + b.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 >= minDist * minDist || d2 < 1e-8) continue;
      const dist = Math.sqrt(d2);
      const push = minDist - dist;
      p.position.x += (dx / dist) * push;
      p.position.z += (dz / dist) * push;
    }
    collisionWorld.depenetrate(p.position, p.radius, p.height);
  }

  private syncVisuals(dt: number) {
    for (const b of this.list) {
      const dx = b.position.x - b.group.position.x;
      const dz = b.position.z - b.group.position.z;
      const moved = Math.hypot(dx, dz);
      const turned = b.rotationY !== b.group.rotation.y;
      if (moved > 0 || turned) {
        b.group.position.x = b.position.x;
        b.group.position.z = b.position.z;
        b.group.rotation.y = b.rotationY;
      }
      const speed = moved / dt;
      b.isMoving = speed > 0.04;
      if (b.onMove && moved > 0) {
        this.tmp.set(dx, 0, dz);
        b.onMove(this.tmp, speed);
      } else if (b.onMove && b.isMoving === false) {
        this.tmp.set(0, 0, 0);
        b.onMove(this.tmp, 0);
      }
    }
  }
}

export const physicsWorld = new PhysicsWorld();
