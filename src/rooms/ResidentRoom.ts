/**
 * ResidentRoom.ts
 * Configurable resident room generator (居室 01, 02, 03).
 * Supports spatial variations to test different caregiving and wheelchair transfer layouts.
 */

import * as THREE from 'three';
import { createCareBed } from '../furniture/CareBed.ts';
import { createWheelchair } from '../furniture/Wheelchair.ts';
import { createTable } from '../furniture/Table.ts';
import { createChair } from '../furniture/Chair.ts';
import { createCabinet } from '../furniture/Cabinet.ts';
import {
  createWallClock,
  createTissueBox,
  createTrashBin,
} from '../furniture/Props.ts';
import { createWindow } from '../architecture/Window.ts';
import { InteractionManager } from '../interaction/InteractionManager.ts';
import { WheelchairInstance } from '../furniture/Wheelchair.ts';

export interface ResidentRoomConfig {
  roomId: 'room01' | 'room02' | 'room03';
  center: THREE.Vector3;
  interactionManager?: InteractionManager;
  onToggleHold?: (wheelchair: WheelchairInstance, isHolding: boolean) => void;
}

export function createResidentRoom(config: ResidentRoomConfig): THREE.Group {
  const group = new THREE.Group();
  const c = config.center;
  const mgr = config.interactionManager;

  if (config.roomId === 'room01') {
    // Room 01: Standard barrier-free layout
    // Bed aligned North-South along East partition, transfer space on West
    const bed = createCareBed({
      position: new THREE.Vector3(c.x + 0.6, 0, c.z - 0.2),
      rotationY: 0,
      railSide: 'right', // rail against east wall, open left for wheelchair transfer
      name: 'bed_room01',
      interactionManager: mgr,
    });
    group.add(bed);

    // Wheelchair placed beside bed on transfer side (clear 1.0m transfer zone)
    const wheelchair = createWheelchair({
      position: new THREE.Vector3(c.x - 0.75, 0, c.z - 0.2),
      rotationY: Math.PI / 2, // facing bed
      name: 'wheelchair_room01',
      interactionManager: mgr,
      onToggleHold: config.onToggleHold,
    });
    group.add(wheelchair);

    // Bedside drawer unit
    const bedside = createTable({
      position: new THREE.Vector3(c.x + 0.6, 0, c.z - 1.4),
      type: 'bedside',
      name: 'bedside_room01',
    });
    group.add(bedside);

    // Tissue box on bedside table
    const tissue = createTissueBox(new THREE.Vector3(c.x + 0.6, 0.58, c.z - 1.4));
    group.add(tissue);

    // Wardrobe along South partition
    const wardrobe = createCabinet({
      position: new THREE.Vector3(c.x - 1.1, 0, c.z + 1.4),
      type: 'wardrobe',
      rotationY: Math.PI,
      name: 'wardrobe_room01',
    });
    group.add(wardrobe);

    // Resident armchair near window
    const chair = createChair({
      position: new THREE.Vector3(c.x - 1.1, 0, c.z + 0.3),
      rotationY: Math.PI / 4,
      type: 'kaigo',
      color: 'blue',
      name: 'chair_room01',
    });
    group.add(chair);

    // Window on West exterior wall (X = -8.8)
    const windowMesh = createWindow({
      position: new THREE.Vector3(-8.78, 1.4, c.z),
      rotationY: Math.PI / 2,
      hasCurtains: true,
    });
    group.add(windowMesh);

    // Wall clock on East wall
    const clock = createWallClock(new THREE.Vector3(c.x + 1.82, 2.0, c.z - 0.5), -Math.PI / 2);
    group.add(clock);

    // Trash bin
    const bin = createTrashBin(new THREE.Vector3(c.x - 0.3, 0, c.z + 1.4));
    group.add(bin);

  } else if (config.roomId === 'room02') {
    // Room 02: Rotated layout
    // Bed rotated East-West along South wall, wheelchair transfer approach from North
    const bed = createCareBed({
      position: new THREE.Vector3(c.x, 0, c.z + 0.5),
      rotationY: Math.PI / 2, // headboard East, footboard West
      railSide: 'left',
      name: 'bed_room02',
      interactionManager: mgr,
    });
    group.add(bed);

    // Wheelchair placed on North side of bed
    const wheelchair = createWheelchair({
      position: new THREE.Vector3(c.x - 0.2, 0, c.z - 0.6),
      rotationY: Math.PI,
      name: 'wheelchair_room02',
      interactionManager: mgr,
      onToggleHold: config.onToggleHold,
    });
    group.add(wheelchair);

    // Bedside table
    const bedside = createTable({
      position: new THREE.Vector3(c.x + 1.3, 0, c.z + 0.5),
      type: 'bedside',
      name: 'bedside_room02',
    });
    group.add(bedside);

    const tissue = createTissueBox(new THREE.Vector3(c.x + 1.3, 0.58, c.z + 0.5));
    group.add(tissue);

    // Wardrobe on West wall
    const wardrobe = createCabinet({
      position: new THREE.Vector3(c.x - 1.4, 0, c.z - 0.8),
      type: 'wardrobe',
      rotationY: Math.PI / 2,
      name: 'wardrobe_room02',
    });
    group.add(wardrobe);

    // Resident armchair
    const chair = createChair({
      position: new THREE.Vector3(c.x + 0.9, 0, c.z - 0.8),
      rotationY: -Math.PI / 3,
      type: 'kaigo',
      color: 'green',
      name: 'chair_room02',
    });
    group.add(chair);

    // Clock
    const clock = createWallClock(new THREE.Vector3(c.x - 1.82, 2.0, c.z + 0.2), Math.PI / 2);
    group.add(clock);

    const bin = createTrashBin(new THREE.Vector3(c.x + 1.3, 0, c.z + 1.3));
    group.add(bin);

  } else {
    // Room 03: Slightly more constrained realistic navigation challenge
    // Bed tucked closer to wall, narrower approach clearance for wheelchair navigation
    const bed = createCareBed({
      position: new THREE.Vector3(c.x - 0.7, 0, c.z - 0.3),
      rotationY: 0,
      railSide: 'both', // rails on both sides
      name: 'bed_room03',
      interactionManager: mgr,
    });
    group.add(bed);

    // Wheelchair parked at foot of bed with tighter turning radius
    const wheelchair = createWheelchair({
      position: new THREE.Vector3(c.x + 0.65, 0, c.z + 0.6),
      rotationY: -Math.PI / 4,
      name: 'wheelchair_room03',
      interactionManager: mgr,
      onToggleHold: config.onToggleHold,
    });
    group.add(wheelchair);

    // Bedside unit
    const bedside = createTable({
      position: new THREE.Vector3(c.x - 0.7, 0, c.z - 1.45),
      type: 'bedside',
      name: 'bedside_room03',
    });
    group.add(bedside);

    // Wardrobe on East wall
    const wardrobe = createCabinet({
      position: new THREE.Vector3(c.x + 1.4, 0, c.z - 0.6),
      type: 'wardrobe',
      rotationY: -Math.PI / 2,
      name: 'wardrobe_room03',
    });
    group.add(wardrobe);

    // Armchair
    const chair = createChair({
      position: new THREE.Vector3(c.x + 0.8, 0, c.z + 1.3),
      rotationY: -Math.PI * 0.75,
      type: 'kaigo',
      color: 'beige',
      name: 'chair_room03',
    });
    group.add(chair);

    const clock = createWallClock(new THREE.Vector3(c.x, 2.0, c.z - 1.72), 0);
    group.add(clock);

    const bin = createTrashBin(new THREE.Vector3(c.x + 1.4, 0, c.z + 0.4));
    group.add(bin);
  }

  return group;
}
