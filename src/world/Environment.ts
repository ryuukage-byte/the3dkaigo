/**
 * Environment.ts
 * Outdoor environment visible through resident room & dining windows:
 * pleasant sky dome, exterior garden lawn, low-poly courtyard trees,
 * garden boundary fence, and distant low-rise silhouettes.
 */

import * as THREE from 'three';

export function createExteriorEnvironment(): THREE.Group {
  const group = new THREE.Group();

  // 1. Large Exterior Ground Lawn (pleasant garden outside the 18m x 14m facility)
  const lawnGeo = new THREE.PlaneGeometry(80, 80);
  const lawnMat = new THREE.MeshStandardMaterial({
    color: 0x7E9A68, // Japanese garden grass green
    roughness: 0.9,
    metalness: 0.0,
  });
  const lawnMesh = new THREE.Mesh(lawnGeo, lawnMat);
  lawnMesh.rotation.x = -Math.PI / 2;
  lawnMesh.position.y = -0.05;
  lawnMesh.receiveShadow = true;
  group.add(lawnMesh);

  // 2. Concrete perimeter apron walkway around building
  const apronGeo = new THREE.PlaneGeometry(24, 20);
  const apronMat = new THREE.MeshStandardMaterial({
    color: 0xD1D5DB,
    roughness: 0.8,
  });
  const apronMesh = new THREE.Mesh(apronGeo, apronMat);
  apronMesh.rotation.x = -Math.PI / 2;
  apronMesh.position.y = -0.03;
  group.add(apronMesh);

  // 3. Courtyard Garden Trees along South (outside Dining windows)
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x4D7C4A, roughness: 0.85 });

  const treePositions = [
    [-3.5, 9.5],
    [0.5, 10.5],
    [4.0, 9.8],
    [7.5, 10.2],
    [-11.5, 1.0], // West of Resident Room 01
    [-11.5, -4.0],
  ];

  for (const [tx, tz] of treePositions) {
    const treeGroup = new THREE.Group();

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.8, 8), trunkMat);
    trunk.position.y = 1.4;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Foliage canopy (layered low-poly cones)
    for (let c = 0; c < 3; c++) {
      const coneGeo = new THREE.ConeGeometry(1.4 - c * 0.25, 1.6, 7);
      const cone = new THREE.Mesh(coneGeo, foliageMat);
      cone.position.y = 2.4 + c * 0.8;
      cone.castShadow = true;
      treeGroup.add(cone);
    }

    treeGroup.position.set(tx, 0, tz);
    group.add(treeGroup);
  }

  // 4. Low wooden garden boundary fence
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x9CA3AF, roughness: 0.7 });
  const fenceGeo = new THREE.BoxGeometry(26, 0.9, 0.05);
  const fence = new THREE.Mesh(fenceGeo, fenceMat);
  fence.position.set(0, 0.45, 11.5);
  group.add(fence);

  // 5. Sky Dome (soft atmospheric gradient)
  const skyGeo = new THREE.SphereGeometry(60, 24, 16);
  const skyMat = new THREE.MeshBasicMaterial({
    color: 0xBAE6FD,
    side: THREE.BackSide,
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  group.add(skyMesh);

  return group;
}
