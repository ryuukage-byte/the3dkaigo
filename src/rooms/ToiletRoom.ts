/**
 * ToiletRoom.ts
 * Barrier-free accessible toilet (多機能トイレ・車椅子対応トイレ).
 * Full compliance with universal access: accessible toilet with backrest,
 * L-shaped wall grab bar, flip-up U-rail, accessible sink with tilted mirror,
 * emergency nurse call button, and clear wheelchair turnaround area.
 */

import * as THREE from 'three';
import { createAccessibleToilet, createAccessibleSink } from '../furniture/ToiletFixtures.ts';
import { createTrashBin } from '../furniture/Props.ts';
import { materials } from '../world/Materials.ts';

export function createToiletRoom(): THREE.Group {
  const group = new THREE.Group();

  // 1. Toilet suite positioned along East wall (X = 8.2, Z = 0.5)
  // Facing West into the spacious room for wheelchair side approach
  const toilet = createAccessibleToilet({
    position: new THREE.Vector3(8.0, 0, 0.5),
    rotationY: -Math.PI / 2, // Facing west
  });
  group.add(toilet);

  // 2. Accessible sink on North wall (X = 6.0, Z = -0.6)
  const sink = createAccessibleSink(new THREE.Vector3(6.0, 0, -0.6), 0);
  group.add(sink);

  // 3. Waste bin beside sink
  const bin = createTrashBin(new THREE.Vector3(5.4, 0, -0.6));
  group.add(bin);

  // 4. Baby/Adult changing fold-down table against South wall (X = 7.0, Z = 2.3)
  const foldTable = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.7), materials.get('careWhite'));
  foldTable.position.set(7.0, 0.75, 2.2);
  foldTable.castShadow = true;
  group.add(foldTable);

  return group;
}
