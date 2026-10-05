/**
 * Table.ts
 * Barrier-free institutional dining tables and office desks
 * with rounded edges and open clearance beneath for wheelchair accessibility.
 */

import * as THREE from 'three';
import { materials } from '../world/Materials.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';
import { physicsWorld } from '../physics/PhysicsWorld.ts';

export interface TableOptions {
  position: THREE.Vector3;
  width?: number; // X size
  depth?: number; // Z size
  height?: number;
  rotationY?: number;
  type?: 'dining' | 'office' | 'bedside' | 'reception';
  movable?: boolean;
  mass?: number;
  name?: string;
}

export function createTable(options: TableOptions): THREE.Group {
  const group = new THREE.Group();
  const type = options.type ?? 'dining';
  const width = options.width ?? (type === 'bedside' ? 0.45 : type === 'reception' ? 2.4 : 1.5);
  const depth = options.depth ?? (type === 'bedside' ? 0.45 : type === 'reception' ? 0.7 : 0.85);
  const height = options.height ?? (type === 'bedside' ? 0.58 : 0.72);

  const topMat = type === 'office' ? materials.get('wallUpper') : materials.get('woodLight');
  const legMat = materials.get('metalStainless');

  // Table top
  const topThickness = 0.035;
  const topGeo = new THREE.BoxGeometry(width, topThickness, depth);
  const topMesh = new THREE.Mesh(topGeo, topMat);
  topMesh.position.set(0, height - topThickness / 2, 0);
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  if (type === 'bedside') {
    // Bedside drawer unit
    const bodyGeo = new THREE.BoxGeometry(width - 0.04, height - topThickness - 0.08, depth - 0.04);
    const bodyMesh = new THREE.Mesh(bodyGeo, materials.get('woodLight'));
    bodyMesh.position.set(0, (height - topThickness) / 2 + 0.02, 0);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Small metal handle
    const handleGeo = new THREE.BoxGeometry(0.12, 0.02, 0.02);
    const handle = new THREE.Mesh(handleGeo, materials.get('metalDark'));
    handle.position.set(0, height * 0.6, depth / 2);
    group.add(handle);

    // Casters
    for (const [cx, cz] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 8), materials.get('metalDark'));
      c.position.set(cx, 0.02, cz);
      group.add(c);
    }
  } else if (type === 'reception') {
    // Front modesty panel / counter facade
    const panelGeo = new THREE.BoxGeometry(width, height - 0.05, 0.04);
    const panel = new THREE.Mesh(panelGeo, materials.get('woodMedium'));
    panel.position.set(0, (height - 0.05) / 2, depth / 2 - 0.02);
    group.add(panel);

    // Support legs on staff side
    for (const lx of [-width * 0.45, 0, width * 0.45]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, height - topThickness, depth - 0.1), materials.get('careWhite'));
      leg.position.set(lx, (height - topThickness) / 2, -0.02);
      group.add(leg);
    }
  } else {
    // 4 legs set back for wheelchair clearance
    const legRadius = 0.025;
    const insetX = width * 0.42;
    const insetZ = depth * 0.40;
    const legOffsets = [
      [-insetX, -insetZ],
      [insetX, -insetZ],
      [-insetX, insetZ],
      [insetX, insetZ],
    ];

    for (const [lx, lz] of legOffsets) {
      const legGeo = new THREE.CylinderGeometry(legRadius, legRadius, height - topThickness, 12);
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, (height - topThickness) / 2, lz);
      leg.castShadow = true;
      group.add(leg);

      // Leveling foot glide
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.015, 12), materials.get('metalDark'));
      foot.position.set(lx, 0.008, lz);
      group.add(foot);
    }

    if (type === 'office') {
      // Under-desk privacy panel
      const modestyGeo = new THREE.BoxGeometry(width - 0.2, height * 0.5, 0.02);
      const modesty = new THREE.Mesh(modestyGeo, materials.get('careWhite'));
      modesty.position.set(0, height * 0.5, -insetZ);
      group.add(modesty);
    }
  }

  group.position.copy(options.position);
  if (options.rotationY) {
    group.rotation.y = options.rotationY;
  }

  const isMovable = options.movable ?? (type !== 'reception');

  if (isMovable) {
    const mass = options.mass ?? (type === 'bedside' ? 18 : type === 'dining' ? 26 : 32);
    const radius = Math.hypot(width, depth) * 0.5 * 0.75; // circle approximating the footprint

    const body = physicsWorld.register({
      id: options.name ?? `table_${Math.round(options.position.x * 100)}_${Math.round(options.position.z * 100)}`,
      name: options.name ?? 'table',
      group,
      movable: true,
      mass,
      radius,
      height,
      friction: 0.5,      // heavy: stops quickly once you stop pushing
      restitution: 0.1,
      linearDamping: 1.0,
      angularDamping: 5.0,
    });
    group.userData.physicalBody = body;
  } else {
    // Static reception counter
    const rotY = options.rotationY ?? 0;
    const halfW = width / 2;
    const halfD = depth / 2;
    const extentX = Math.abs(Math.cos(rotY) * halfW) + Math.abs(Math.sin(rotY) * halfD);
    const extentZ = Math.abs(Math.sin(rotY) * halfW) + Math.abs(Math.cos(rotY) * halfD);

    collisionWorld.addBox(
      new THREE.Vector3(options.position.x - extentX, 0, options.position.z - extentZ),
      new THREE.Vector3(options.position.x + extentX, height, options.position.z + extentZ),
      options.name ?? 'table'
    );
  }

  return group;
}
