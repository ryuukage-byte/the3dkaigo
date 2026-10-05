/**
 * Handrail.ts
 * Japanese barrier-free corridor handrails (手すり) at 0.85m height
 * with rounded wood grip and stainless steel wall support brackets.
 */

import * as THREE from 'three';
import { materials } from '../world/Materials.ts';
import { GameConfig } from '../core/GameConfig.ts';

export interface HandrailOptions {
  start: THREE.Vector3;
  end: THREE.Vector3;
  wallNormal?: THREE.Vector3; // points inward away from wall
}

export function createHandrail(options: HandrailOptions): THREE.Group {
  const group = new THREE.Group();
  const height = GameConfig.facility.handrailHeight;

  const dx = options.end.x - options.start.x;
  const dz = options.end.z - options.start.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  if (length < 0.1) return group;

  const angle = Math.atan2(dz, dx);
  const midX = (options.start.x + options.end.x) / 2;
  const midZ = (options.start.z + options.end.z) / 2;

  // Rail cylindrical bar (35mm diameter)
  const railGeo = new THREE.CylinderGeometry(0.02, 0.02, length, 12);
  const railMesh = new THREE.Mesh(railGeo, materials.get('woodLight'));
  railMesh.rotation.z = Math.PI / 2;
  railMesh.castShadow = true;
  group.add(railMesh);

  // Wall mounting brackets spaced every ~1.2m
  const bracketCount = Math.max(2, Math.round(length / 1.2));
  const bracketGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.06, 8);
  const bracketMat = materials.get('metalStainless');

  for (let i = 0; i <= bracketCount; i++) {
    const t = (i / bracketCount) - 0.5;
    const posX = t * length;

    const bracket = new THREE.Mesh(bracketGeo, bracketMat);
    bracket.rotation.x = Math.PI / 2;
    bracket.position.set(posX, -0.015, -0.035);
    group.add(bracket);
  }

  group.position.set(midX, height, midZ);
  group.rotation.y = -angle;

  return group;
}
