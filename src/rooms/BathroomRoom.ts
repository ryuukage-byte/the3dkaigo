/**
 * BathroomRoom.ts
 * Japanese care facility bathing area (浴室・機械浴・特浴).
 * Features low-entry accessible care tub with handrails,
 * shower chairs, washing stations, and clean towel shelves.
 */

import * as THREE from 'three';
import { createCareBathtub, createShowerStation } from '../furniture/BathFixtures.ts';
import { createCabinet } from '../furniture/Cabinet.ts';
import { materials } from '../world/Materials.ts';

export function createBathroomRoom(): THREE.Group {
  const group = new THREE.Group();

  // 1. Care Bathtub along West exterior wall (X = -7.4, Z = 5.2)
  const tub = createCareBathtub(new THREE.Vector3(-7.4, 0, 5.2), 0);
  group.add(tub);

  // 2. Shower Station 01 with shower chair (X = -5.0, Z = 3.0)
  const shower1 = createShowerStation(new THREE.Vector3(-5.0, 0, 3.0), 0);
  group.add(shower1);

  // 3. Shower Station 02 with shower chair (X = -3.8, Z = 5.2)
  const shower2 = createShowerStation(new THREE.Vector3(-3.2, 0, 5.2), -Math.PI / 2);
  group.add(shower2);

  // 4. Clean Towel & Linen Shelf in ante-area (X = -3.4, Z = 3.2)
  const towelShelf = createCabinet({
    position: new THREE.Vector3(-3.4, 0, 3.2),
    type: 'shelf',
    width: 0.8,
    depth: 0.45,
    height: 1.6,
    rotationY: Math.PI / 2,
    name: 'bath_towel_shelf',
  });
  group.add(towelShelf);

  // 5. Laundry hamper basket for used linens
  const hamper = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.20, 0.65, 12), materials.get('metalStainless'));
  hamper.position.set(-3.4, 0.325, 4.0);
  hamper.castShadow = true;
  group.add(hamper);

  return group;
}
