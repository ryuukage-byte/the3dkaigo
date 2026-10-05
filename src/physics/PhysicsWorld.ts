/**
 * PhysicsWorld.ts
 * Centralized rigid-body physics engine for physical/movable environmental objects
 * (Chairs, Tables, Stools, Wheelchairs, and lightweight furniture).
 *
 * Capabilities:
 * - Dynamic planar (XZ) impulse physics with realistic mass, friction, and restitution
 * - Vertical Y grounding & upright rotational stabilization (objects don't tumble chaotically)
 * - Two-way Player vs Object collision & pushing (heavier objects resist, light objects slide)
 * - Object vs Object multi-body collision & momentum transfer (Chair pushes Table pushes Chair)
 * - Object vs Environment collision sliding against walls, doors, and static fixtures
 */

import * as THREE from 'three';
import { collisionWorld } from '../world/CollisionWorld.ts';

export interface PhysicalBodyConfig {
  id: string;
  name: string;
  group: THREE.Group;
  movable?: boolean;
  mass?: number;            // in kg (e.g. 10 for chair, 22 for table/wheelchair)
  radius?: number;          // horizontal collision radius in meters
  height?: number;          // object height in meters
  friction?: number;        // friction coefficient (e.g. 0.6)
  restitution?: number;     // bounciness (0.0 to 1.0, e.g. 0.15)
  linearDamping?: number;   // velocity decay factor (e.g. 4.5)
  angularDamping?: number;  // rotational velocity decay factor (e.g. 5.5)
  isLocked?: () => boolean; // dynamic lock state (e.g. wheelchair parking brake)
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
  public isLocked?: () => boolean;
  public onMove?: (deltaMove: THREE.Vector3, speed: number) => void;

  public velocity: THREE.Vector3 = new THREE.Vector3();
  public angularVelocity: number = 0; // rad/s around Y axis
  public position: THREE.Vector3 = new THREE.Vector3();
  public rotationY: number = 0;
  public collisionBoxName: string;
  public isMoving: boolean = false;

  constructor(config: PhysicalBodyConfig) {
    this.id = config.id;
    this.name = config.name;
    this.group = config.group;
    this.movable = config.movable ?? true;
    this.mass = config.mass ?? 15;
    this.radius = config.radius ?? 0.32;
    this.height = config.height ?? 0.85;
    this.friction = config.friction ?? 0.65;
    this.restitution = config.restitution ?? 0.15;
    this.linearDamping = config.linearDamping ?? 4.5;
    this.angularDamping = config.angularDamping ?? 5.5;
    this.isLocked = config.isLocked;
    this.onMove = config.onMove;

    this.position.copy(config.group.position);
    this.rotationY = config.group.rotation.y;
    this.collisionBoxName = `phys_${this.id}`;

    this.updateCollider();
  }

  public updateCollider() {
    const half = this.radius;
    collisionWorld.updateBox(
      this.collisionBoxName,
      new THREE.Vector3(this.position.x - half, 0, this.position.z - half),
      new THREE.Vector3(this.position.x + half, this.height, this.position.z + half)
    );
  }

  public applyImpulse(impulse: THREE.Vector3) {
    if (!this.movable || (this.isLocked && this.isLocked())) {
      return;
    }
    const invMass = 1 / this.mass;
    this.velocity.x += impulse.x * invMass;
    this.velocity.z += impulse.z * invMass;

    // Clamp maximum velocity to avoid unrealistic launches
    const maxSpeed = 3.2;
    if (this.velocity.length() > maxSpeed) {
      this.velocity.setLength(maxSpeed);
    }
  }

  public applyTorque(torque: number) {
    if (!this.movable || (this.isLocked && this.isLocked())) {
      return;
    }
    this.angularVelocity += torque / (this.mass * 0.5);
    const maxAng = 4.0;
    this.angularVelocity = THREE.MathUtils.clamp(this.angularVelocity, -maxAng, maxAng);
  }
}

export class PhysicsWorld {
  private bodies: Map<string, PhysicalBody> = new Map();

  public register(config: PhysicalBodyConfig): PhysicalBody {
    const body = new PhysicalBody(config);
    this.bodies.set(body.id, body);
    return body;
  }

  public unregister(id: string) {
    const body = this.bodies.get(id);
    if (body) {
      collisionWorld.removeBox(body.collisionBoxName);
      this.bodies.delete(id);
    }
  }

  public getBody(id: string): PhysicalBody | undefined {
    return this.bodies.get(id);
  }

  public getBodies(): PhysicalBody[] {
    return Array.from(this.bodies.values());
  }

  /**
   * Main Physics Tick:
   * 1. Player vs Dynamic Object collisions
   * 2. Dynamic Object vs Dynamic Object collisions
   * 3. Dynamic Object vs Static Environment collisions (walls, beds, doors)
   * 4. Velocity integration & damping
   */
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    playerVelocity: THREE.Vector3,
    playerRadius: number = 0.30
  ) {
    const activeBodies = Array.from(this.bodies.values()).filter((b) => b.movable);

    // 1. Player vs Dynamic Objects Collision & Push
    const playerSpeed = playerVelocity.length();
    for (const body of activeBodies) {
      const locked = body.isLocked ? body.isLocked() : false;

      const dx = body.position.x - playerPos.x;
      const dz = body.position.z - playerPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = playerRadius + body.radius;

      if (dist < minDist && dist > 0.0001) {
        const overlap = minDist - dist;
        const nx = dx / dist;
        const nz = dz / dist;

        if (locked) {
          // Locked object (e.g. wheelchair with brake ON): acts as rigid barrier, pushes player back
          playerPos.x -= nx * overlap;
          playerPos.z -= nz * overlap;
        } else {
          // Movable object: player exerts push force proportional to walking speed and inversely to mass
          const massFactor = 75 / (body.mass + 35); // Lighter chairs move easily, heavy tables move slower
          const pushStrength = Math.max(1.2, playerSpeed * 1.8) * massFactor;

          // Push impulse applied to body
          body.velocity.x += nx * pushStrength * 8.0 * delta;
          body.velocity.z += nz * pushStrength * 8.0 * delta;

          // Separate slightly to resolve overlap
          const playerMass = 70;
          const bodyRatio = playerMass / (playerMass + body.mass);
          body.position.x += nx * overlap * bodyRatio;
          body.position.z += nz * overlap * bodyRatio;
          body.group.position.copy(body.position);

          // Apply slight realistic off-center rotation
          const cross = nx * playerVelocity.z - nz * playerVelocity.x;
          body.angularVelocity += cross * 1.5 * delta;
        }
      }
    }

    // 2. Dynamic Object vs Dynamic Object Collision & Momentum Transfer
    for (let i = 0; i < activeBodies.length; i++) {
      for (let j = i + 1; j < activeBodies.length; j++) {
        const a = activeBodies[i];
        const b = activeBodies[j];

        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = a.radius + b.radius;

        if (dist < minDist && dist > 0.0001) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const nz = dz / dist;

          const aLocked = a.isLocked ? a.isLocked() : false;
          const bLocked = b.isLocked ? b.isLocked() : false;

          const invMassA = aLocked ? 0 : 1 / a.mass;
          const invMassB = bLocked ? 0 : 1 / b.mass;
          const totalInvMass = invMassA + invMassB;

          if (totalInvMass > 0) {
            // Positional separation
            a.position.x -= nx * overlap * (invMassA / totalInvMass);
            a.position.z -= nz * overlap * (invMassA / totalInvMass);
            b.position.x += nx * overlap * (invMassB / totalInvMass);
            b.position.z += nz * overlap * (invMassB / totalInvMass);

            a.group.position.copy(a.position);
            b.group.position.copy(b.position);

            // Velocity impulse exchange
            const rvx = b.velocity.x - a.velocity.x;
            const rvz = b.velocity.z - a.velocity.z;
            const velAlongNormal = rvx * nx + rvz * nz;

            if (velAlongNormal < 0) {
              const e = Math.min(a.restitution, b.restitution);
              const jMag = (-(1 + e) * velAlongNormal) / totalInvMass;

              a.velocity.x -= nx * jMag * invMassA;
              a.velocity.z -= nz * jMag * invMassA;
              b.velocity.x += nx * jMag * invMassB;
              b.velocity.z += nz * jMag * invMassB;
            }
          }
        }
      }
    }

    // 3. Motion Integration & Sliding Collision against Static Environment (Walls, Beds, Doors)
    for (const body of activeBodies) {
      const locked = body.isLocked ? body.isLocked() : false;

      if (locked) {
        body.velocity.set(0, 0, 0);
        body.angularVelocity = 0;
        body.isMoving = false;
        body.updateCollider();
        continue;
      }

      // Linear friction damping
      const linearDamp = Math.exp(-body.linearDamping * delta);
      body.velocity.multiplyScalar(linearDamp);

      // Angular friction damping
      const angDamp = Math.exp(-body.angularDamping * delta);
      body.angularVelocity *= angDamp;

      const speedSq = body.velocity.lengthSq();
      if (speedSq > 0.0001) {
        const deltaMove = body.velocity.clone().multiplyScalar(delta);

        // Slide along static environment walls, beds, counters
        const nextPos = collisionWorld.resolveMovement(
          body.position,
          deltaMove,
          body.radius,
          body.height,
          body.collisionBoxName
        );

        const actualMove = nextPos.clone().sub(body.position);
        body.position.copy(nextPos);
        body.group.position.copy(body.position);

        // If blocked along an axis by a wall, kill velocity on that axis
        if (actualMove.x === 0) body.velocity.x = 0;
        if (actualMove.z === 0) body.velocity.z = 0;

        const currentSpeed = actualMove.length() / Math.max(delta, 0.0001);
        body.isMoving = currentSpeed > 0.04;

        if (body.onMove) {
          body.onMove(actualMove, currentSpeed);
        }
      } else {
        body.velocity.set(0, 0, 0);
        body.isMoving = false;
      }

      // Angular rotation around vertical Y axis
      if (Math.abs(body.angularVelocity) > 0.005) {
        body.rotationY += body.angularVelocity * delta;
        body.group.rotation.y = body.rotationY;
      } else {
        body.angularVelocity = 0;
      }

      // Update AABB collider in CollisionWorld
      body.updateCollider();
    }
  }

  public clear() {
    for (const body of this.bodies.values()) {
      collisionWorld.removeBox(body.collisionBoxName);
    }
    this.bodies.clear();
  }
}

export const physicsWorld = new PhysicsWorld();
