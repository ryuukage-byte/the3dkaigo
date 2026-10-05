/**
 * CollisionWorld.ts
 * Fast AABB collision manager for walls, large furniture, beds, and fixtures.
 * Provides sliding response for smooth player navigation.
 */

import * as THREE from 'three';

export interface CollisionBox {
  min: THREE.Vector3;
  max: THREE.Vector3;
  name: string;
}

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
    this.boxes.push({
      min: min.clone(),
      max: max.clone(),
      name,
    });
  }

  public removeBox(name: string) {
    const idx = this.boxes.findIndex((b) => b.name === name);
    if (idx !== -1) {
      this.boxes.splice(idx, 1);
    }
  }

  public updateBox(name: string, min: THREE.Vector3, max: THREE.Vector3) {
    const box = this.boxes.find((b) => b.name === name);
    if (box) {
      box.min.copy(min);
      box.max.copy(max);
    } else {
      this.addBox(min, max, name);
    }
  }

  public addCenteredBox(center: THREE.Vector3, size: THREE.Vector3, name: string = 'obstacle') {
    const half = size.clone().multiplyScalar(0.5);
    this.addBox(center.clone().sub(half), center.clone().add(half), name);
  }

  public getBoxes(): readonly CollisionBox[] {
    return this.boxes;
  }

  public getDebugGroup(): THREE.Group {
    if (!this.debugMesh && this.boxes.length > 0) {
      this.buildDebugMesh();
    }
    return this.debugGroup;
  }

  public setDebugVisible(visible: boolean) {
    if (!this.debugMesh && this.boxes.length > 0) {
      this.buildDebugMesh();
    }
    this.debugGroup.visible = visible;
  }

  private buildDebugMesh() {
    const wireframePositions: number[] = [];

    for (const box of this.boxes) {
      const x0 = box.min.x, y0 = box.min.y, z0 = box.min.z;
      const x1 = box.max.x, y1 = box.max.y, z1 = box.max.z;

      // 12 edges of AABB box
      // Bottom 4
      wireframePositions.push(x0, y0, z0, x1, y0, z0);
      wireframePositions.push(x1, y0, z0, x1, y0, z1);
      wireframePositions.push(x1, y0, z1, x0, y0, z1);
      wireframePositions.push(x0, y0, z1, x0, y0, z0);
      // Top 4
      wireframePositions.push(x0, y1, z0, x1, y1, z0);
      wireframePositions.push(x1, y1, z0, x1, y1, z1);
      wireframePositions.push(x1, y1, z1, x0, y1, z1);
      wireframePositions.push(x0, y1, z1, x0, y1, z0);
      // Vertical 4
      wireframePositions.push(x0, y0, z0, x0, y1, z0);
      wireframePositions.push(x1, y0, z0, x1, y1, z0);
      wireframePositions.push(x1, y0, z1, x1, y1, z1);
      wireframePositions.push(x0, y0, z1, x0, y1, z1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(wireframePositions, 3));
    const material = new THREE.LineBasicMaterial({ color: 0xEF4444, transparent: true, opacity: 0.75 });
    this.debugMesh = new THREE.LineSegments(geometry, material);
    this.debugGroup.add(this.debugMesh);
  }

  /**
   * Resolves movement using axis-separated sliding collision.
   * Object/Player is represented as a cylinder/capsule with radius and height.
   */
  public resolveMovement(
    currentPos: THREE.Vector3,
    deltaMove: THREE.Vector3,
    radius: number,
    height: number = 1.7,
    excludeName?: string
  ): THREE.Vector3 {
    let nextPos = currentPos.clone();

    // Check X movement
    if (deltaMove.x !== 0) {
      nextPos.x += deltaMove.x;
      if (this.checkCollision(nextPos, radius, height, excludeName)) {
        nextPos.x = currentPos.x; // slide along obstacle
      }
    }

    // Check Z movement
    if (deltaMove.z !== 0) {
      nextPos.z += deltaMove.z;
      if (this.checkCollision(nextPos, radius, height, excludeName)) {
        nextPos.z = currentPos.z; // slide along obstacle
      }
    }

    return nextPos;
  }

  public checkCollision(
    pos: THREE.Vector3,
    radius: number,
    height: number = 1.7,
    excludeName?: string
  ): boolean {
    const feetY = pos.y + 0.1;
    const headY = pos.y + height - 0.1;

    for (const box of this.boxes) {
      if (excludeName && box.name === excludeName) {
        continue;
      }

      // Y range overlap check
      if (headY < box.min.y || feetY > box.max.y) {
        continue;
      }

      // 2D circle vs AABB box check in XZ plane
      const closestX = Math.max(box.min.x, Math.min(pos.x, box.max.x));
      const closestZ = Math.max(box.min.z, Math.min(pos.z, box.max.z));

      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        return true;
      }
    }

    return false;
  }
}

export const collisionWorld = new CollisionWorld();
