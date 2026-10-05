/**
 * LockerRoom.ts
 * Staff changing room (更衣室) where the shift begins (Player spawn point).
 * Contains steel lockers, changing bench, full-length mirror, staff notice board.
 */

import * as THREE from 'three';
import { createLockerRow, createBench, LockerUnit } from '../furniture/Locker.ts';
import { createNoticeBoard } from '../furniture/Props.ts';
import { materials } from '../world/Materials.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';

export interface LockerRoomResult {
  group: THREE.Group;
  lockerUnit: LockerUnit;
}

export function createLockerRoom(): LockerRoomResult {
  const group = new THREE.Group();

  // 1. Staff locker row along North wall (Z = -6.4)
  // X: -8.5 to -5.5
  const lockerUnit = createLockerRow({
    position: new THREE.Vector3(-6.8, 0, -6.4),
    count: 7,
    rotationY: 0,
    name: 'locker_row_north',
  });
  group.add(lockerUnit.group);

  // 2. Changing bench in center (Z = -5.0)
  const bench = createBench(new THREE.Vector3(-6.8, 0, -4.9), 1.8, 0);
  group.add(bench);

  // 3. Full-length staff mirror on West wall (X = -8.7)
  const mirrorGeo = new THREE.BoxGeometry(0.02, 1.6, 0.65);
  const mirror = new THREE.Mesh(mirrorGeo, materials.get('mirror'));
  mirror.position.set(-8.68, 1.1, -4.8);
  group.add(mirror);

  const mirrorFrameGeo = new THREE.BoxGeometry(0.03, 1.66, 0.71);
  const mirrorFrame = new THREE.Mesh(mirrorFrameGeo, materials.get('woodLight'));
  mirrorFrame.position.set(-8.70, 1.1, -4.8);
  group.add(mirrorFrame);

  // 4. Staff notice board on East wall (X = -4.9)
  const board = createNoticeBoard(new THREE.Vector3(-4.92, 1.5, -4.8), 1.4, 0.8, -Math.PI / 2);
  group.add(board);

  // 5. Shoe shelf / Geta-bako near entrance (X = -5.2, Z = -3.2)
  const shoeShelf = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.35), materials.get('woodLight'));
  shoeShelf.position.set(-5.3, 0.45, -3.2);
  shoeShelf.castShadow = true;
  group.add(shoeShelf);

  collisionWorld.addBox(
    new THREE.Vector3(-5.7, 0, -3.4),
    new THREE.Vector3(-4.9, 0.9, -3.0),
    'shoe_shelf'
  );

  return { group, lockerUnit };
}
