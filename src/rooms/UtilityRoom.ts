/**
 * UtilityRoom.ts
 * Utility & Linen storage room (リネン室・消耗品倉庫・清掃控室).
 * Houses multi-tier industrial storage shelving, linen hampers,
 * cleaning carts, and hygiene supplies.
 */

import * as THREE from 'three';
import { createCabinet } from '../furniture/Cabinet.ts';
import { materials } from '../world/Materials.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';

export function createUtilityRoom(): THREE.Group {
  const group = new THREE.Group();

  // 1. Linen storage shelving row along North wall (Z = -6.4)
  const shelf1 = createCabinet({
    position: new THREE.Vector3(4.5, 0, -6.4),
    type: 'shelf',
    width: 1.4,
    depth: 0.5,
    height: 1.8,
    name: 'utility_shelf_1',
  });
  group.add(shelf1);

  const shelf2 = createCabinet({
    position: new THREE.Vector3(6.5, 0, -6.4),
    type: 'shelf',
    width: 1.4,
    depth: 0.5,
    height: 1.8,
    name: 'utility_shelf_2',
  });
  group.add(shelf2);

  // 2. Storage shelving along East wall (X = 8.4)
  const shelf3 = createCabinet({
    position: new THREE.Vector3(8.4, 0, -4.8),
    type: 'shelf',
    width: 1.4,
    depth: 0.5,
    height: 1.8,
    rotationY: -Math.PI / 2,
    name: 'utility_shelf_3',
  });
  group.add(shelf3);

  // 3. Janitorial cleaning cart (X = 4.2, Z = -4.5)
  const cartGroup = new THREE.Group();
  const cartBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.75, 0.45), materials.get('fabricBlue'));
  cartBody.position.set(0, 0.45, 0);
  cartBody.castShadow = true;
  cartGroup.add(cartBody);

  // Mop handle
  const mop = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 8), materials.get('woodLight'));
  mop.position.set(0.35, 0.8, 0.15);
  cartGroup.add(mop);

  cartGroup.position.set(4.2, 0, -4.5);
  group.add(cartGroup);

  collisionWorld.addBox(
    new THREE.Vector3(3.7, 0, -4.8),
    new THREE.Vector3(4.7, 1.4, -4.2),
    'cleaning_cart'
  );

  // 4. Waste sorting bins along West partition (X = 3.4, Z = -5.0)
  for (let b = 0; b < 3; b++) {
    const binCol = b === 0 ? materials.get('fabricBlue') : b === 1 ? materials.get('fabricGreen') : materials.get('fabricBeige');
    const binMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, 0.4), binCol);
    binMesh.position.set(3.4, 0.325, -4.2 - b * 0.5);
    binMesh.castShadow = true;
    group.add(binMesh);
  }

  collisionWorld.addBox(
    new THREE.Vector3(3.1, 0, -5.5),
    new THREE.Vector3(3.7, 0.7, -4.0),
    'waste_sorting_bins'
  );

  return group;
}
