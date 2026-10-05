/**
 * ToiletFixtures.ts
 * Japanese barrier-free accessible toilet suite (バリアフリー多機能トイレ).
 * Compliant with wheelchair transfer standards: L-shaped wall grab bar,
 * flip-up U-rail, accessible sink, tilted mirror, and emergency call button.
 */

import * as THREE from 'three';
import { materials } from '../world/Materials.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';

export interface ToiletFixturesOptions {
  position: THREE.Vector3;
  rotationY?: number;
}

export function createAccessibleToilet(options: ToiletFixturesOptions): THREE.Group {
  const group = new THREE.Group();
  const ceramicMat = materials.get('ceramic');
  const stainlessMat = materials.get('metalStainless');
  const careWhiteMat = materials.get('careWhite');

  // 1. Toilet pedestal & bowl
  const bowlGeo = new THREE.BoxGeometry(0.42, 0.42, 0.68);
  const bowl = new THREE.Mesh(bowlGeo, ceramicMat);
  bowl.position.set(0, 0.21, 0);
  bowl.castShadow = true;
  group.add(bowl);

  // Seat ring & lid
  const seatGeo = new THREE.BoxGeometry(0.44, 0.04, 0.50);
  const seat = new THREE.Mesh(seatGeo, careWhiteMat);
  seat.position.set(0, 0.44, 0.05);
  group.add(seat);

  // Water tank / back support buffer
  const tankGeo = new THREE.BoxGeometry(0.42, 0.52, 0.20);
  const tank = new THREE.Mesh(tankGeo, ceramicMat);
  tank.position.set(0, 0.55, -0.24);
  tank.castShadow = true;
  group.add(tank);

  // Back cushion pad (for resident comfort)
  const padGeo = new THREE.BoxGeometry(0.32, 0.22, 0.04);
  const pad = new THREE.Mesh(padGeo, materials.get('fabricBlue'));
  pad.position.set(0, 0.58, -0.12);
  group.add(pad);

  // 2. Wall L-shaped Grab Bar (L型手すり: horizontal at 0.7m, vertical going up to 1.3m)
  const lRailGroup = new THREE.Group();
  // Horizontal bar
  const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.65, 12), stainlessMat);
  hBar.rotation.x = Math.PI / 2;
  hBar.position.set(0, 0.70, 0.05);
  lRailGroup.add(hBar);

  // Vertical bar
  const vBar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.60, 12), stainlessMat);
  vBar.position.set(0, 1.0, 0.35);
  lRailGroup.add(vBar);

  lRailGroup.position.set(-0.35, 0, 0);
  group.add(lRailGroup);

  // 3. Flip-up U-shaped Grab Bar (可動式手すり / スイング手すり for wheelchair transfer)
  const uRailGroup = new THREE.Group();
  const uBarTop = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.70, 12), stainlessMat);
  uBarTop.rotation.x = Math.PI / 2;
  uBarTop.position.set(0, 0.70, 0.1);
  uRailGroup.add(uBarTop);

  const uBarBot = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.70, 12), stainlessMat);
  uBarBot.rotation.x = Math.PI / 2;
  uBarBot.position.set(0, 0.50, 0.1);
  uRailGroup.add(uBarBot);

  uRailGroup.position.set(0.35, 0, 0);
  group.add(uRailGroup);

  // 4. Toilet Paper Holder
  const paperGeo = new THREE.BoxGeometry(0.08, 0.12, 0.16);
  const paper = new THREE.Mesh(paperGeo, stainlessMat);
  paper.position.set(-0.35, 0.78, 0.15);
  group.add(paper);

  // 5. Emergency Call Button & Pull Cord (ナースコール)
  const callBtnGeo = new THREE.BoxGeometry(0.08, 0.12, 0.02);
  const callBtn = new THREE.Mesh(callBtnGeo, materials.get('emergencyRed'));
  callBtn.position.set(-0.35, 0.95, 0.05);
  group.add(callBtn);

  // Cord hanging down
  const cordGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.65, 4);
  const cord = new THREE.Mesh(cordGeo, materials.get('callCordOrange'));
  cord.position.set(-0.35, 0.62, 0.05);
  group.add(cord);

  // Position and collision
  group.position.copy(options.position);
  if (options.rotationY) {
    group.rotation.y = options.rotationY;
  }

  collisionWorld.addBox(
    new THREE.Vector3(options.position.x - 0.45, 0, options.position.z - 0.5),
    new THREE.Vector3(options.position.x + 0.45, 1.1, options.position.z + 0.4),
    'toilet_unit'
  );

  return group;
}

export function createAccessibleSink(position: THREE.Vector3, rotationY: number = 0): THREE.Group {
  const group = new THREE.Group();
  const ceramicMat = materials.get('ceramic');
  const stainlessMat = materials.get('metalStainless');

  // Accessible shallow bowl allowing wheelchair leg clearance beneath
  const basinGeo = new THREE.BoxGeometry(0.60, 0.18, 0.48);
  const basin = new THREE.Mesh(basinGeo, ceramicMat);
  basin.position.set(0, 0.74, 0);
  basin.castShadow = true;
  group.add(basin);

  // Sensor / long lever faucet
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 8), stainlessMat);
  spout.position.set(0, 0.88, -0.15);
  group.add(spout);

  // Tilted mirror above sink for seated wheelchair user
  const mirrorGeo = new THREE.BoxGeometry(0.55, 0.80, 0.02);
  const mirror = new THREE.Mesh(mirrorGeo, materials.get('mirror'));
  mirror.rotation.x = 0.08; // slightly tilted down
  mirror.position.set(0, 1.45, -0.22);
  group.add(mirror);

  // Handrail along sink front
  const sinkRail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.64, 8), stainlessMat);
  sinkRail.rotation.z = Math.PI / 2;
  sinkRail.position.set(0, 0.72, 0.26);
  group.add(sinkRail);

  group.position.copy(position);
  group.rotation.y = rotationY;

  collisionWorld.addBox(
    new THREE.Vector3(position.x - 0.35, 0, position.z - 0.3),
    new THREE.Vector3(position.x + 0.35, 1.8, position.z + 0.3),
    'accessible_sink'
  );

  return group;
}
