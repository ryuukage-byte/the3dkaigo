/**
 * Wall.ts
 * Modular Japanese care facility wall builder with two-tone protection strip,
 * baseboard kickplates, and automatic AABB collision registration.
 */

import * as THREE from 'three';
import { materials } from '../world/Materials.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';
import { GameConfig } from '../core/GameConfig.ts';

export interface WallSegmentOptions {
  start: THREE.Vector2; // X, Z
  end: THREE.Vector2;   // X, Z
  height?: number;
  thickness?: number;
  hasCollision?: boolean;
  name?: string;
  hasProtectionStrip?: boolean;
}

export function createWallSegment(options: WallSegmentOptions): THREE.Group {
  const group = new THREE.Group();
  const height = options.height ?? GameConfig.facility.ceilingHeight;
  const thickness = options.thickness ?? GameConfig.facility.wallThickness;
  const hasCollision = options.hasCollision !== false;
  const hasProtection = options.hasProtectionStrip !== false;

  const dx = options.end.x - options.start.x;
  const dz = options.end.y - options.start.y;
  const length = Math.sqrt(dx * dx + dz * dz);
  if (length < 0.001) return group;

  const angle = Math.atan2(dz, dx);
  const midX = (options.start.x + options.end.x) / 2;
  const midZ = (options.start.y + options.end.y) / 2;

  const baseboardH = 0.08;
  const protectionH = 0.80; // Total height of lower section
  const midSectionH = protectionH - baseboardH;
  const upperH = height - protectionH;

  // 1. Kickplate / baseboard (darker beige/wood)
  const baseGeo = new THREE.BoxGeometry(length, baseboardH, thickness + 0.01);
  const baseMesh = new THREE.Mesh(baseGeo, materials.get('wallBaseboard'));
  baseMesh.position.set(0, baseboardH / 2, 0);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  if (hasProtection) {
    // 2. Lower wall protection strip (light beige-gray vinyl protection against wheelchair scuffs)
    const lowerGeo = new THREE.BoxGeometry(length, midSectionH, thickness + 0.005);
    const lowerMesh = new THREE.Mesh(lowerGeo, materials.get('wallLower'));
    lowerMesh.position.set(0, baseboardH + midSectionH / 2, 0);
    lowerMesh.castShadow = true;
    lowerMesh.receiveShadow = true;
    group.add(lowerMesh);

    // Decorative molding rail between lower and upper section
    const railGeo = new THREE.BoxGeometry(length, 0.025, thickness + 0.015);
    const railMesh = new THREE.Mesh(railGeo, materials.get('woodLight'));
    railMesh.position.set(0, protectionH, 0);
    group.add(railMesh);

    // 3. Upper wall (clean warm off-white)
    const upperGeo = new THREE.BoxGeometry(length, upperH, thickness);
    const upperMesh = new THREE.Mesh(upperGeo, materials.get('wallUpper'));
    upperMesh.position.set(0, protectionH + upperH / 2, 0);
    upperMesh.castShadow = true;
    upperMesh.receiveShadow = true;
    group.add(upperMesh);
  } else {
    // Single uniform wall
    const fullGeo = new THREE.BoxGeometry(length, height - baseboardH, thickness);
    const fullMesh = new THREE.Mesh(fullGeo, materials.get('wallUpper'));
    fullMesh.position.set(0, baseboardH + (height - baseboardH) / 2, 0);
    fullMesh.castShadow = true;
    fullMesh.receiveShadow = true;
    group.add(fullMesh);
  }

  group.position.set(midX, 0, midZ);
  group.rotation.y = -angle;

  // Collision registration
  if (hasCollision) {
    // For axis-aligned walls, we compute precise AABB
    const isAlongX = Math.abs(dz) < 0.01;
    const isAlongZ = Math.abs(dx) < 0.01;

    if (isAlongX) {
      const minX = Math.min(options.start.x, options.end.x);
      const maxX = Math.max(options.start.x, options.end.x);
      const minZ = midZ - thickness / 2;
      const maxZ = midZ + thickness / 2;
      collisionWorld.addBox(
        new THREE.Vector3(minX, 0, minZ),
        new THREE.Vector3(maxX, height, maxZ),
        options.name ?? 'wall_x'
      );
    } else if (isAlongZ) {
      const minX = midX - thickness / 2;
      const maxX = midX + thickness / 2;
      const minZ = Math.min(options.start.y, options.end.y);
      const maxZ = Math.max(options.start.y, options.end.y);
      collisionWorld.addBox(
        new THREE.Vector3(minX, 0, minZ),
        new THREE.Vector3(maxX, height, maxZ),
        options.name ?? 'wall_z'
      );
    } else {
      // General AABB bounding box enclosing the rotated wall
      const halfL = length / 2;
      const halfT = thickness / 2;
      const extentX = Math.abs(Math.cos(angle) * halfL) + Math.abs(Math.sin(angle) * halfT);
      const extentZ = Math.abs(Math.sin(angle) * halfL) + Math.abs(Math.cos(angle) * halfT);
      collisionWorld.addBox(
        new THREE.Vector3(midX - extentX, 0, midZ - extentZ),
        new THREE.Vector3(midX + extentX, height, midZ + extentZ),
        options.name ?? 'wall_angled'
      );
    }
  }

  return group;
}
