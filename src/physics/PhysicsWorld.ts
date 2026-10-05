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
 * - A "grip" lets the player hold a body (wheelchair handles). It is a max-reach
 *   rope plus normal contact: walking forward pushes the body through contact
 *   (mass-weighted like any prop), walking back drags it through the rope.
 *   The player is never moved to a fixed spot, so a blocked grip point cannot
 *   leave the player stuck.
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

/** Player <-> body grip: the player may be at most `reach` (centre to centre) from the body. */
interface PlayerJoint {
  body: PhysicalBody;
  reach: number;
  alignYaw: boolean;
}

const JOINT_YAW_RATE = 2.8; // rad/s max body turn toward player's facing
const GRIP_LANE_HALF_WIDTH = 0.32; // m: hands on the handles keep the caregiver within this of the chair's axis
const GRIP_MIN_BEHIND = 0.5; // m behind the chair centre at least (contact keeps ~0.66 anyway)
const LANE_MAX_SPEED = 3.0; // m/s the caregiver is slid into the rear lane (gentle, never a snap)
const ROPE_MAX_SPEED = 6.0; // m/s cap on rope correction: never snaps, still above run speed

export class PhysicsWorld {
  private bodies = new Map<string, PhysicalBody>();
  private list: PhysicalBody[] = [];
  private player: PlayerProxy | null = null;
  private pushLoad = 0; // mass-weighted resistance the player is currently shoving against
  private joint: PlayerJoint | null = null;

  // scratch
  private readonly tmp = new THREE.Vector3();

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

  public attachPlayerJoint(body: PhysicalBody, reach: number, alignYaw: boolean = true) {
    this.joint = { body, reach, alignYaw };
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
    for (let it = 0; it < SOLVER_ITERATIONS; it++) {
      this.solveJoint(dt);
      this.solvePlayerContacts(dt, it === 0);
      this.solveBodyContacts();
      this.constrainToStatics();
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

  /**
   * Turns the held body toward the player's facing at a capped rate (never snaps). Once per step.
   * The body swings on an arc around the player (like steering a chair you are holding), not
   * about its own centre, so the caregiver stays behind it through a turn. The solver then
   * pushes it out of anything the arc sweeps into.
   */
  private alignHeldBody(dt: number) {
    const j = this.joint;
    const p = this.player;
    if (!j || !p || !j.alignYaw) return;
    const b = j.body;
    if (b.locked) return;
    let err = p.yaw - Math.PI - b.rotationY;
    err = Math.atan2(Math.sin(err), Math.cos(err));
    const turn = THREE.MathUtils.clamp(err * 6, -JOINT_YAW_RATE, JOINT_YAW_RATE) * dt;
    const delta = Math.abs(turn) > Math.abs(err) ? err : turn;
    b.rotationY += delta;
    b.angularVelocity = 0;

    const rx = b.position.x - p.position.x;
    const rz = b.position.z - p.position.z;
    const c = Math.cos(delta);
    const s = Math.sin(delta);
    b.position.x = p.position.x + rx * c + rz * s;
    b.position.z = p.position.z - rx * s + rz * c;
  }

  /**
   * Grip: keeps the caregiver within arm's reach (rope, mass-shared so pulling away drags the
   * body) and in the rear lane behind the handles (player-only correction: steering is done by
   * turning, not by sidestepping). Corrections are rate-capped so nothing ever snaps.
   */
  private solveJoint(dt: number) {
    const j = this.joint;
    const p = this.player;
    if (!j || !p) return;
    const b = j.body;
    const cap = (ROPE_MAX_SPEED * dt) / SOLVER_ITERATIONS;

    // Rope
    let ex = b.position.x - p.position.x;
    let ez = b.position.z - p.position.z;
    const dist = Math.hypot(ex, ez);
    if (dist > j.reach) {
      const excess = Math.min(dist - j.reach, cap);
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

    const laneCap = (LANE_MAX_SPEED * dt) / SOLVER_ITERATIONS;

    // Rear lane, in the body's local frame (forward = (sin r, cos r), right = (cos r, -sin r))
    const fx = Math.sin(b.rotationY);
    const fz = Math.cos(b.rotationY);
    const dx = p.position.x - b.position.x;
    const dz = p.position.z - b.position.z;
    const lateral = dx * fz - dz * fx; // along right = (fz, -fx)
    const along = dx * fx + dz * fz; // negative = behind
    let moveLat = 0;
    if (Math.abs(lateral) > GRIP_LANE_HALF_WIDTH) {
      moveLat = -Math.sign(lateral) * Math.min(Math.abs(lateral) - GRIP_LANE_HALF_WIDTH, laneCap);
    }
    let moveBack = 0;
    if (along > -GRIP_MIN_BEHIND) moveBack = -Math.min(along + GRIP_MIN_BEHIND, laneCap);
    p.position.x += fz * moveLat + fx * moveBack;
    p.position.z += -fx * moveLat + fz * moveBack;
  }

  private solvePlayerContacts(dt: number, applyImpulses: boolean) {
    const p = this.player;
    if (!p) return;

    for (const b of this.list) {
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
    for (const b of this.list) {
      if (p.position.y + 0.1 > b.height) continue;
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
