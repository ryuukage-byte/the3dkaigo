/**
 * Facility.ts
 * Master facility assembler. Constructs:
 * - Exterior envelope walls & interior partitions
 * - Barrier-free sliding doors with bilingual room signs
 * - Continuous corridor accessibility handrails
 * - Emergency exit signs, fire extinguishers, corridor clocks
 * - Integrates all individual rooms, floors, ceilings, and collisions
 */

import * as THREE from 'three';
import { createWallSegment } from '../architecture/Wall.ts';
import { createFacilityFloors } from '../architecture/Floor.ts';
import { createCeiling } from '../architecture/Ceiling.ts';
import { createDoor } from '../architecture/Door.ts';
import { createHandrail } from '../architecture/Handrail.ts';
import { createFireExtinguisher, createWallClock } from '../furniture/Props.ts';
import { createLockerRoom } from '../rooms/LockerRoom.ts';
import { LockerUnit } from '../furniture/Locker.ts';
import { createOffice } from '../rooms/Office.ts';
import { createResidentRoom } from '../rooms/ResidentRoom.ts';
import { createDiningArea } from '../rooms/DiningArea.ts';
import { createToiletRoom } from '../rooms/ToiletRoom.ts';
import { createBathroomRoom } from '../rooms/BathroomRoom.ts';
import { createUtilityRoom } from '../rooms/UtilityRoom.ts';
import { FACILITY_ROOMS, DOOR_OPENINGS } from './FacilityLayout.ts';
import { InteractionManager } from '../interaction/InteractionManager.ts';
import { WheelchairInstance } from '../furniture/Wheelchair.ts';

export class Facility {
  public readonly group: THREE.Group = new THREE.Group();
  public lockerUnit?: LockerUnit;
  public interactionManager?: InteractionManager;
  public onToggleHold?: (wheelchair: WheelchairInstance, isHolding: boolean) => void;
  public wheelchairs: WheelchairInstance[] = [];

  constructor(
    interactionManager?: InteractionManager,
    onToggleHold?: (wheelchair: WheelchairInstance, isHolding: boolean) => void
  ) {
    this.interactionManager = interactionManager;
    this.onToggleHold = onToggleHold;
    this.buildArchitecture();
    this.buildRooms();
    this.buildCorridorFeatures();

    // Collect all wheelchair physical instances
    this.group.traverse((obj) => {
      if (obj.userData?.wheelchairInstance && !this.wheelchairs.includes(obj.userData.wheelchairInstance)) {
        this.wheelchairs.push(obj.userData.wheelchairInstance);
      }
    });
  }

  public update(delta: number) {
    this.lockerUnit?.update(delta);
  }

  private buildArchitecture() {
    // 1. Institutional vinyl floors
    this.group.add(createFacilityFloors());

    // 2. Suspended ceiling with LED troffers
    this.group.add(createCeiling());

    // 3. Exterior perimeter walls
    // North exterior wall (Z = -6.8)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(-8.8, -6.8),
      end: new THREE.Vector2(8.8, -6.8),
      name: 'ext_wall_north',
    }));

    // South exterior wall (Z = 6.8)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(-8.8, 6.8),
      end: new THREE.Vector2(8.8, 6.8),
      name: 'ext_wall_south',
    }));

    // West exterior wall (X = -8.8)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(-8.8, -6.8),
      end: new THREE.Vector2(-8.8, 6.8),
      name: 'ext_wall_west',
    }));

    // East exterior wall (X = 8.8)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(8.8, -6.8),
      end: new THREE.Vector2(8.8, 6.8),
      name: 'ext_wall_east',
    }));

    // 4. North Corridor Wall (Z = -2.8) with door openings
    // Locker room door at X = -6.8 (width 1.0m, cutout -7.3 to -6.3)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(-8.8, -2.8),
      end: new THREE.Vector2(-7.3, -2.8),
      name: 'wall_corridor_n1',
    }));

    // Office door at X = -2.6 (cutout -3.1 to -2.1)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(-6.3, -2.8),
      end: new THREE.Vector2(-3.1, -2.8),
      name: 'wall_corridor_n2',
    }));

    // Wall up to Nurse Station counter window
    this.group.add(createWallSegment({
      start: new THREE.Vector2(-2.1, -2.8),
      end: new THREE.Vector2(0.5, -2.8),
      name: 'wall_corridor_n3',
    }));

    // Nurse Station counter opening: wall lower half only (0.8m)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(0.5, -2.8),
      end: new THREE.Vector2(2.7, -2.8),
      height: 0.85,
      name: 'nurse_station_lower_wall',
    }));

    // Upper header over nurse station
    this.group.add(createWallSegment({
      start: new THREE.Vector2(0.5, -2.8),
      end: new THREE.Vector2(2.7, -2.8),
      height: 0.4,
      hasCollision: false,
      name: 'nurse_station_header',
    }));

    // Wall to Utility door (X = 5.5, cutout 5.0 to 6.0)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(2.7, -2.8),
      end: new THREE.Vector2(5.0, -2.8),
      name: 'wall_corridor_n4',
    }));

    this.group.add(createWallSegment({
      start: new THREE.Vector2(6.0, -2.8),
      end: new THREE.Vector2(8.8, -2.8),
      name: 'wall_corridor_n5',
    }));

    // 5. South Corridor Wall (Z = -1.0) with door openings & central hallway branch
    // Room 01 door at X = -6.9 (cutout -7.4 to -6.4)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(-8.8, -1.0),
      end: new THREE.Vector2(-7.4, -1.0),
      name: 'wall_corridor_s1',
    }));

    // Room 02 door at X = -3.1 (cutout -3.6 to -2.6)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(-6.4, -1.0),
      end: new THREE.Vector2(-3.6, -1.0),
      name: 'wall_corridor_s2',
    }));

    this.group.add(createWallSegment({
      start: new THREE.Vector2(-2.6, -1.0),
      end: new THREE.Vector2(-1.2, -1.0),
      name: 'wall_corridor_s3',
    }));

    // [OPEN CENTRAL HALLWAY BRANCH: X = -1.2 to 1.2 is completely open!]

    this.group.add(createWallSegment({
      start: new THREE.Vector2(1.2, -1.0),
      end: new THREE.Vector2(2.6, -1.0),
      name: 'wall_corridor_s4',
    }));

    // Room 03 door at X = 3.1 (cutout 2.6 to 3.6)
    // Toilet door at X = 6.9 (cutout 6.4 to 7.4)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(3.6, -1.0),
      end: new THREE.Vector2(6.4, -1.0),
      name: 'wall_corridor_s5',
    }));

    this.group.add(createWallSegment({
      start: new THREE.Vector2(7.4, -1.0),
      end: new THREE.Vector2(8.8, -1.0),
      name: 'wall_corridor_s6',
    }));

    // 6. Central Hallway Partition Walls (Z = -1.0 to 2.6)
    // West wall of central hallway (dividing hallway from Room 02)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(-1.2, -1.0),
      end: new THREE.Vector2(-1.2, 2.6),
      name: 'wall_hallway_west',
    }));

    // East wall of central hallway (dividing hallway from Room 03)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(1.2, -1.0),
      end: new THREE.Vector2(1.2, 2.6),
      name: 'wall_hallway_east',
    }));

    // 7. North Row Partition Walls
    // Between Locker and Office (X = -4.8, Z: -6.8 to -2.8)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(-4.8, -6.8),
      end: new THREE.Vector2(-4.8, -2.8),
      name: 'wall_part_locker_office',
    }));

    // Between Office and Utility (X = 3.0, Z: -6.8 to -2.8)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(3.0, -6.8),
      end: new THREE.Vector2(3.0, -2.8),
      name: 'wall_part_office_utility',
    }));

    // 8. Middle Row Partition Walls
    // Between Room 01 and Room 02 (X = -5.0, Z: -1.0 to 2.6)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(-5.0, -1.0),
      end: new THREE.Vector2(-5.0, 2.6),
      name: 'wall_part_r1_r2',
    }));

    // Between Room 03 and Toilet (X = 5.0, Z: -1.0 to 2.6)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(5.0, -1.0),
      end: new THREE.Vector2(5.0, 2.6),
      name: 'wall_part_r3_toilet',
    }));

    // South wall of Room 01 & Room 02 (Z = 2.6, X: -8.8 to -1.2)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(-8.8, 2.6),
      end: new THREE.Vector2(-1.2, 2.6),
      name: 'wall_part_r1_r2_south',
    }));

    // South wall of Room 03 & Toilet (Z = 2.6, X: 1.2 to 8.8)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(1.2, 2.6),
      end: new THREE.Vector2(8.8, 2.6),
      name: 'wall_part_r3_toilet_south',
    }));

    // 9. South Row Partition Walls
    // Between Bathroom and Corridor/Dining (X = -2.8, Z: 2.6 to 6.8 with door opening at Z = 3.8)
    this.group.add(createWallSegment({
      start: new THREE.Vector2(-2.8, 2.6),
      end: new THREE.Vector2(-2.8, 3.3),
      name: 'wall_part_bath_1',
    }));

    this.group.add(createWallSegment({
      start: new THREE.Vector2(-2.8, 4.3),
      end: new THREE.Vector2(-2.8, 6.8),
      name: 'wall_part_bath_2',
    }));

    // 10. Install barrier-free sliding care doors
    this.buildDoors();
  }

  private buildDoors() {
    for (const doorOp of DOOR_OPENINGS) {
      const isZAxis = doorOp.axis === 'z';
      const rotY = isZAxis ? Math.PI / 2 : 0;

      const door = createDoor({
        position: doorOp.center,
        width: doorOp.width,
        height: doorOp.height,
        rotationY: rotY,
        isOpen: true,
        titleJa: doorOp.labelJa,
        subtitleEn: doorOp.labelEn,
        doorId: doorOp.wallId,
        interactionManager: this.interactionManager,
      });

      this.group.add(door);
    }
  }

  private buildRooms() {
    // Locker Room (Player Spawn)
    const lockerRoom = createLockerRoom();
    this.group.add(lockerRoom.group);
    this.lockerUnit = lockerRoom.lockerUnit;

    // Office & Nurse Station
    this.group.add(createOffice());

    // Resident Rooms 01, 02, 03
    const r1 = FACILITY_ROOMS.find(r => r.id === 'room01')!;
    this.group.add(createResidentRoom({ roomId: 'room01', center: r1.center, interactionManager: this.interactionManager, onToggleHold: this.onToggleHold }));

    const r2 = FACILITY_ROOMS.find(r => r.id === 'room02')!;
    this.group.add(createResidentRoom({ roomId: 'room02', center: r2.center, interactionManager: this.interactionManager, onToggleHold: this.onToggleHold }));

    const r3 = FACILITY_ROOMS.find(r => r.id === 'room03')!;
    this.group.add(createResidentRoom({ roomId: 'room03', center: r3.center, interactionManager: this.interactionManager, onToggleHold: this.onToggleHold }));

    // Accessible Toilet
    this.group.add(createToiletRoom());

    // Bathroom
    this.group.add(createBathroomRoom());

    // Common Dining Area & Day Hall
    this.group.add(createDiningArea());

    // Utility & Linen Room
    this.group.add(createUtilityRoom());
  }

  private buildCorridorFeatures() {
    // Continuous wooden care handrails along corridor (0.85m height)
    // North wall handrail segments
    this.group.add(createHandrail({
      start: new THREE.Vector3(-8.7, 0, -2.72),
      end: new THREE.Vector3(-7.4, 0, -2.72),
    }));

    this.group.add(createHandrail({
      start: new THREE.Vector3(-6.2, 0, -2.72),
      end: new THREE.Vector3(-3.2, 0, -2.72),
    }));

    this.group.add(createHandrail({
      start: new THREE.Vector3(2.8, 0, -2.72),
      end: new THREE.Vector3(4.9, 0, -2.72),
    }));

    this.group.add(createHandrail({
      start: new THREE.Vector3(6.1, 0, -2.72),
      end: new THREE.Vector3(8.7, 0, -2.72),
    }));

    // South wall handrail segments
    this.group.add(createHandrail({
      start: new THREE.Vector3(-6.3, 0, -1.08),
      end: new THREE.Vector3(-3.7, 0, -1.08),
    }));

    this.group.add(createHandrail({
      start: new THREE.Vector3(3.7, 0, -1.08),
      end: new THREE.Vector3(6.3, 0, -1.08),
    }));

    // Hallway branch handrails
    this.group.add(createHandrail({
      start: new THREE.Vector3(-1.12, 0, -0.8),
      end: new THREE.Vector3(-1.12, 0, 2.4),
    }));

    this.group.add(createHandrail({
      start: new THREE.Vector3(1.12, 0, -0.8),
      end: new THREE.Vector3(1.12, 0, 2.4),
    }));

    // Central Corridor Wall Clock
    this.group.add(createWallClock(new THREE.Vector3(0, 2.1, -2.72), 0));

    // Fire extinguishers in corridor
    this.group.add(createFireExtinguisher(new THREE.Vector3(-8.4, 0, -2.5)));
    this.group.add(createFireExtinguisher(new THREE.Vector3(8.4, 0, -2.5)));
  }
}
