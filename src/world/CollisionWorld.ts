/**
 * CollisionWorld.ts
 * Static AABB collision for walls, large furniture, beds, and fixtures.
 *
 * Only STATIC geometry lives here. Movable bodies (chairs, tables, wheelchairs)
 * are owned by PhysicsWorld so the player can push them instead of being blocked.
 *
 * Circles (player / bodies) are resolved by depenetration: move, then push the
 * circle out of every overlapping box along the closest-point normal. This slides
 * naturally along walls and corners and also recovers from starting inside geometry.
 */

import * as THREE from 'three';

export interface CollisionBox {
  min: THREE.Vector3;
  max: THREE.Vector3;
  name: string;
}

const MAX_DEPENETRATION_ITERATIONS = 3;
const FOOT_CLEARANCE = 0.1; // low obstacles below this are stepped/jumped over
const HEAD_CLEARANCE = 0.1;

export class CollisionWorld {
  private boxes: CollisionBox[] = [];
  private debugGroup: THREE.Group = new THREE.Group();
  private debugMesh?: THREE.LineSegments;

  constructor() {
    this.debugGroup.visible = false;
  }

  public clear() {
    this.boxes = [];
    if (this.debugMesh) {
      this.debugGroup.remove(this.debugMesh);
      this.debugMesh.geometry.dispose();
      (this.debugMesh.material as THREE.Material).dispose();
      this.debugMesh = undefined;
    }
  }

  public addBox(min: THREE.Vector3, max: THREE.Vector3, name: string = 'obstacle') {
    this.boxes.push({ min: min.clone(), max: max.clone(), name });
  }

  public removeBox(name: string) {
    const idx = this.boxes.findIndex((b) => b.name === name);
    if (idx !== -1) this.boxes.splice(idx, 1);
  }

  public addCenteredBox(center: THREE.Vector3, size: THREE.Vector3, name: string = 'obstacle') {
    const half = size.clone().multiplyScalar(0.5);
    this.addBox(center.clone().sub(half), center.clone().add(half), name);
  }

  public getBoxes(): readonly CollisionBox[] {
    return this.boxes;
  }

  public getDebugGroup(): THREE.Group {
    if (!this.debugMesh && this.boxes.length > 0) this.buildDebugMesh();
    return this.debugGroup;
  }

  public setDebugVisible(visible: boolean) {
    if (!this.debugMesh && this.boxes.length > 0) this.buildDebugMesh();
    this.debugGroup.visible = visible;
  }

  private buildDebugMesh() {
    const p: number[] = [];
    for (const box of this.boxes) {
      const x0 = box.min.x, y0 = box.min.y, z0 = box.min.z;
      const x1 = box.max.x, y1 = box.max.y, z1 = box.max.z;
      p.push(x0, y0, z0, x1, y0, z0, x1, y0, z0, x1, y0, z1, x1, y0, z1, x0, y0, z1, x0, y0, z1, x0, y0, z0);
      p.push(x0, y1, z0, x1, y1, z0, x1, y1, z0, x1, y1, z1, x1, y1, z1, x0, y1, z1, x0, y1, z1, x0, y1, z0);
      p.push(x0, y0, z0, x0, y1, z0, x1, y0, z0, x1, y1, z0, x1, y0, z1, x1, y1, z1, x0, y0, z1, x0, y1, z1);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    const material = new THREE.LineBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.75 });
    this.debugMesh = new THREE.LineSegments(geometry, material);
    this.debugGroup.add(this.debugMesh);
  }

  /**
   * Moves `pos` (mutated) by (dx, dz), sliding along static geometry.
   * The move is split into sub-steps no longer than half the radius so a fast
   * mover can never tunnel through a thin wall. Returns true if anything was hit.
   */
  public moveCircle(
    pos: THREE.Vector3,
    dx: number,
    dz: number,
    radius: number,
    height: number = 1.7
  ): boolean {
    const dist = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(dist / (radius * 0.5)));
    const sx = dx / steps;
    const sz = dz / steps;
    let hit = false;
    for (let i = 0; i < steps; i++) {
      pos.x += sx;
      pos.z += sz;
      if (this.depenetrate(pos, radius, height)) hit = true;
    }
    return hit;
  }

  /**
   * Pushes the circle at `pos` (mutated) out of any overlapping static box.
   * Returns true if a correction was applied.
   */
  public depenetrate(pos: THREE.Vector3, radius: number, height: number = 1.7): boolean {
    const feetY = pos.y + FOOT_CLEARANCE;
    const headY = pos.y + height - HEAD_CLEARANCE;
    const r2 = radius * radius;
    let corrected = false;

    for (let iter = 0; iter < MAX_DEPENETRATION_ITERATIONS; iter++) {
      let moved = false;
      for (const box of this.boxes) {
        if (headY < box.min.y || feetY > box.max.y) continue;
        // Cheap reject before the closest-point math
        if (pos.x < box.min.x - radius || pos.x > box.max.x + radius) continue;
        if (pos.z < box.min.z - radius || pos.z > box.max.z + radius) continue;

        const cx = Math.max(box.min.x, Math.min(pos.x, box.max.x));
        const cz = Math.max(box.min.z, Math.min(pos.z, box.max.z));
        const dx = pos.x - cx;
        const dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r2) continue;

        if (d2 > 1e-10) {
          const d = Math.sqrt(d2);
          const push = radius - d;
          pos.x += (dx / d) * push;
          pos.z += (dz / d) * push;
        } else {
          // Centre is inside the box: leave through the nearest face
          const toMinX = pos.x - box.min.x + radius;
          const toMaxX = box.max.x - pos.x + radius;
          const toMinZ = pos.z - box.min.z + radius;
          const toMaxZ = box.max.z - pos.z + radius;
          const best = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
          if (best === toMinX) pos.x -= toMinX;
          else if (best === toMaxX) pos.x += toMaxX;
          else if (best === toMinZ) pos.z -= toMinZ;
          else pos.z += toMaxZ;
        }
        moved = true;
      }
      if (!moved) break;
      corrected = true;
    }
    return corrected;
  }

  /** True if a circle at `pos` overlaps any static box. */
  public checkCollision(pos: THREE.Vector3, radius: number, height: number = 1.7): boolean {
    const feetY = pos.y + FOOT_CLEARANCE;
    const headY = pos.y + height - HEAD_CLEARANCE;
    const r2 = radius * radius;
    for (const box of this.boxes) {
      if (headY < box.min.y || feetY > box.max.y) continue;
      const dx = pos.x - Math.max(box.min.x, Math.min(pos.x, box.max.x));
      const dz = pos.z - Math.max(box.min.z, Math.min(pos.z, box.max.z));
      if (dx * dx + dz * dz < r2) return true;
    }
    return false;
  }

  /**
   * Distance along a ray to the first static box (slab test), or Infinity.
   * Used for camera collision and interaction line-of-sight: far cheaper than
   * raycasting scene meshes.
   * `ignorePoint`: boxes containing this point (± margin) are skipped, so a
   * target that is part of / mounted on a box is not occluded by it.
   */
  public raycast(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxDistance: number,
    ignorePoint?: THREE.Vector3,
    ignoreMargin: number = 0.08
  ): number {
    let nearest = Infinity;
    for (const box of this.boxes) {
      if (
        ignorePoint &&
        ignorePoint.x >= box.min.x - ignoreMargin && ignorePoint.x <= box.max.x + ignoreMargin &&
        ignorePoint.y >= box.min.y - ignoreMargin && ignorePoint.y <= box.max.y + ignoreMargin &&
        ignorePoint.z >= box.min.z - ignoreMargin && ignorePoint.z <= box.max.z + ignoreMargin
      ) {
        continue;
      }

      let tMin = 0;
      let tMax = maxDistance;
      let miss = false;
      for (let axis = 0; axis < 3; axis++) {
        const o = axis === 0 ? origin.x : axis === 1 ? origin.y : origin.z;
        const d = axis === 0 ? dir.x : axis === 1 ? dir.y : dir.z;
        const lo = axis === 0 ? box.min.x : axis === 1 ? box.min.y : box.min.z;
        const hi = axis === 0 ? box.max.x : axis === 1 ? box.max.y : box.max.z;
        if (Math.abs(d) < 1e-9) {
          if (o < lo || o > hi) { miss = true; break; }
        } else {
          let t1 = (lo - o) / d;
          let t2 = (hi - o) / d;
          if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
          tMin = Math.max(tMin, t1);
          tMax = Math.min(tMax, t2);
          if (tMin > tMax) { miss = true; break; }
        }
      }
      if (!miss && tMin < nearest) nearest = tMin;
    }
    return nearest;
  }
}

export const collisionWorld = new CollisionWorld();
