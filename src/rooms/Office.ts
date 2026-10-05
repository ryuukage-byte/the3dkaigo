/**
 * Office.ts
 * Staff office & Nurse Station (事務室・ナースステーション).
 * Equipped with 2 staff workstations, PC monitors, swivel chairs,
 * filing cabinets, printer station, wall clock, whiteboard,
 * and reception counter facing the corridor.
 */

import * as THREE from 'three';
import { createTable } from '../furniture/Table.ts';
import { createChair } from '../furniture/Chair.ts';
import { createCabinet } from '../furniture/Cabinet.ts';
import {
  createPCWorkstation,
  createNoticeBoard,
  createWallClock,
  createTrashBin,
  createPottedPlant
} from '../furniture/Props.ts';
import { materials } from '../world/Materials.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';

export function createOffice(): THREE.Group {
  const group = new THREE.Group();

  // 1. Desk 01 (Staff Workstation)
  const desk1 = createTable({
    position: new THREE.Vector3(-3.2, 0, -5.2),
    width: 1.4,
    depth: 0.7,
    type: 'office',
    name: 'office_desk_1',
  });
  group.add(desk1);

  // Chair 01
  const chair1 = createChair({
    position: new THREE.Vector3(-3.2, 0, -4.5),
    rotationY: Math.PI,
    type: 'office',
    name: 'office_chair_1',
  });
  group.add(chair1);

  // PC 01
  const pc1 = createPCWorkstation(new THREE.Vector3(-3.2, 0.72, -5.25), 0);
  group.add(pc1);

  // 2. Desk 02 (Care Manager Workstation)
  const desk2 = createTable({
    position: new THREE.Vector3(-1.4, 0, -5.2),
    width: 1.4,
    depth: 0.7,
    type: 'office',
    name: 'office_desk_2',
  });
  group.add(desk2);

  // Chair 02
  const chair2 = createChair({
    position: new THREE.Vector3(-1.4, 0, -4.5),
    rotationY: Math.PI,
    type: 'office',
    name: 'office_chair_2',
  });
  group.add(chair2);

  // PC 02
  const pc2 = createPCWorkstation(new THREE.Vector3(-1.4, 0.72, -5.25), 0);
  group.add(pc2);

  // 3. Nurse Station Reception Counter (X: 1.6, Z: -3.3)
  const counter = createTable({
    position: new THREE.Vector3(1.6, 0, -3.3),
    width: 2.2,
    depth: 0.65,
    type: 'reception',
    name: 'nurse_station_counter',
  });
  group.add(counter);

  // Reception PC
  const pcCounter = createPCWorkstation(new THREE.Vector3(1.6, 0.72, -3.35), 0);
  group.add(pcCounter);

  const counterChair = createChair({
    position: new THREE.Vector3(1.6, 0, -4.0),
    rotationY: 0,
    type: 'office',
    name: 'counter_chair',
  });
  group.add(counterChair);

  // 4. Filing cabinets along North wall (Z = -6.5)
  const filing1 = createCabinet({
    position: new THREE.Vector3(-4.0, 0, -6.4),
    type: 'filing',
    name: 'filing_cab_1',
  });
  group.add(filing1);

  const filing2 = createCabinet({
    position: new THREE.Vector3(-2.8, 0, -6.4),
    type: 'filing',
    name: 'filing_cab_2',
  });
  group.add(filing2);

  // 5. Office Printer / Multi-function copier (X = -0.6, Z = -6.3)
  const printer = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.95, 0.6), materials.get('careWhite'));
  printer.position.set(-0.6, 0.475, -6.35);
  printer.castShadow = true;
  group.add(printer);

  collisionWorld.addBox(
    new THREE.Vector3(-1.0, 0, -6.7),
    new THREE.Vector3(-0.2, 1.0, -6.0),
    'office_printer'
  );

  // 6. Whiteboard / Staff Schedule on West wall (X = -4.7)
  const whiteboard = createNoticeBoard(new THREE.Vector3(-4.72, 1.5, -4.5), 1.8, 1.0, Math.PI / 2);
  group.add(whiteboard);

  // 7. Wall clock on North wall
  const clock = createWallClock(new THREE.Vector3(-1.4, 2.0, -6.72), 0);
  group.add(clock);

  // 8. Waste bin & plant
  const bin = createTrashBin(new THREE.Vector3(-4.2, 0, -4.8));
  group.add(bin);

  const plant = createPottedPlant(new THREE.Vector3(2.6, 0, -6.3));
  group.add(plant);

  return group;
}
