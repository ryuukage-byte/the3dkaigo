/**
 * Locker.ts
 * Japanese staff locker units (更衣用スチールロッカー) and changing bench.
 * Supports interactive door animation for Locker #04 (Player's assigned locker)
 * with visible interior (uniform on hanger, shelf, shoe rack).
 */

import * as THREE from 'three';
import { materials } from '../world/Materials.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';

export interface LockerRowOptions {
  position: THREE.Vector3;
  count?: number;
  rotationY?: number;
  name?: string;
}

export class LockerUnit {
  public readonly group: THREE.Group = new THREE.Group();
  public interactiveDoorGroup?: THREE.Group;
  public isOpen: boolean = false;
  private targetDoorAngle: number = 0;
  private currentDoorAngle: number = 0;

  constructor(options: LockerRowOptions) {
    this.build(options);
  }

  private build(options: LockerRowOptions) {
    const count = options.count ?? 7;
    const lockerW = 0.38;
    const lockerD = 0.52;
    const lockerH = 1.85;
    const totalW = lockerW * count;

    const lockerMat = materials.get('metalLocker');
    const darkMat = materials.get('metalDark');

    // Main cabinet outer shell
    const bodyGeo = new THREE.BoxGeometry(totalW, lockerH, lockerD);
    const body = new THREE.Mesh(bodyGeo, lockerMat);
    body.position.set(0, lockerH / 2, 0);
    body.castShadow = true;
    this.group.add(body);

    // Plinth base
    const plinthGeo = new THREE.BoxGeometry(totalW, 0.08, lockerD);
    const plinth = new THREE.Mesh(plinthGeo, darkMat);
    plinth.position.set(0, 0.04, 0);
    this.group.add(plinth);

    // Individual locker doors (Locker #03 is the player's interactive locker)
    const playerLockerIdx = 3;

    for (let i = 0; i < count; i++) {
      const doorX = -totalW / 2 + lockerW * i + lockerW / 2;
      const isPlayerLocker = i === playerLockerIdx;

      if (isPlayerLocker) {
        // Interior cavity behind door (recessed interior cavity)
        const cavityGeo = new THREE.BoxGeometry(lockerW - 0.04, lockerH - 0.16, lockerD - 0.06);
        const cavityMat = new THREE.MeshStandardMaterial({
          color: 0x94A3B8,
          roughness: 0.7,
        });
        const cavity = new THREE.Mesh(cavityGeo, cavityMat);
        cavity.position.set(doorX, lockerH / 2, 0.02);
        this.group.add(cavity);

        // Clothes hanging rod inside locker
        const rodGeo = new THREE.CylinderGeometry(0.008, 0.008, lockerW - 0.08, 8);
        const rod = new THREE.Mesh(rodGeo, materials.get('metalStainless'));
        rod.rotation.z = Math.PI / 2;
        rod.position.set(doorX, lockerH * 0.82, 0);
        this.group.add(rod);

        // Hanging scrub uniform on hanger
        const hangerGeo = new THREE.BoxGeometry(0.24, 0.02, 0.02);
        const hanger = new THREE.Mesh(hangerGeo, materials.get('woodLight'));
        hanger.position.set(doorX, lockerH * 0.81, 0);
        this.group.add(hanger);

        const uniformHanging = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.55, 0.08), materials.get('caregiverUniform'));
        uniformHanging.position.set(doorX, lockerH * 0.52, 0);
        this.group.add(uniformHanging);

        // Top shelf with towel/bag
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(lockerW - 0.06, 0.02, lockerD - 0.1), materials.get('metalLocker'));
        shelf.position.set(doorX, lockerH * 0.86, 0);
        this.group.add(shelf);

        const towel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.2), materials.get('careWhite'));
        towel.position.set(doorX, lockerH * 0.91, 0);
        this.group.add(towel);

        // Animated swinging door (hinged on left edge of this locker)
        const doorPivot = new THREE.Group();
        doorPivot.position.set(doorX - lockerW / 2 + 0.01, 0, lockerD / 2 + 0.01);

        const doorPanelW = lockerW - 0.01;
        const doorPanel = new THREE.Mesh(
          new THREE.BoxGeometry(doorPanelW, lockerH - 0.1, 0.02),
          lockerMat
        );
        doorPanel.position.set(doorPanelW / 2, lockerH / 2, 0);
        doorPanel.castShadow = true;
        doorPivot.add(doorPanel);

        // Label: STAFF 04 山田
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.045, 0.01), materials.get('careWhite'));
        plate.position.set(doorPanelW / 2, lockerH * 0.85, 0.012);
        doorPivot.add(plate);

        // Gold keyhole & handle
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.14, 0.025), materials.get('woodLight'));
        handle.position.set(doorPanelW * 0.85, lockerH * 0.52, 0.02);
        doorPivot.add(handle);

        // Ventilation louvers
        for (let v = 0; v < 3; v++) {
          const vent = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.01, 0.008), darkMat);
          vent.position.set(doorPanelW / 2, lockerH * 0.76 - v * 0.03, 0.012);
          doorPivot.add(vent);
        }

        this.interactiveDoorGroup = doorPivot;
        this.group.add(doorPivot);

      } else {
        // Static locker door
        const seam = new THREE.Mesh(new THREE.BoxGeometry(0.005, lockerH - 0.1, 0.01), darkMat);
        seam.position.set(doorX + lockerW / 2, lockerH / 2, lockerD / 2 + 0.005);
        this.group.add(seam);

        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.01), materials.get('careWhite'));
        plate.position.set(doorX, lockerH * 0.85, lockerD / 2 + 0.01);
        this.group.add(plate);

        for (let v = 0; v < 3; v++) {
          const vent = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.01, 0.008), darkMat);
          vent.position.set(doorX, lockerH * 0.76 - v * 0.03, lockerD / 2 + 0.008);
          this.group.add(vent);
        }

        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.02), darkMat);
        handle.position.set(doorX + lockerW * 0.35, lockerH * 0.52, lockerD / 2 + 0.015);
        this.group.add(handle);
      }
    }

    this.group.position.copy(options.position);
    if (options.rotationY) {
      this.group.rotation.y = options.rotationY;
    }

    // Collision
    const rotY = options.rotationY ?? 0;
    const halfW = totalW / 2;
    const halfD = lockerD / 2;
    const extentX = Math.abs(Math.cos(rotY) * halfW) + Math.abs(Math.sin(rotY) * halfD);
    const extentZ = Math.abs(Math.sin(rotY) * halfW) + Math.abs(Math.cos(rotY) * halfD);

    collisionWorld.addBox(
      new THREE.Vector3(options.position.x - extentX, 0, options.position.z - extentZ),
      new THREE.Vector3(options.position.x + extentX, lockerH, options.position.z + extentZ),
      options.name ?? 'lockers'
    );
  }

  public setOpen(open: boolean) {
    this.isOpen = open;
    this.targetDoorAngle = open ? -Math.PI * 0.65 : 0;
  }

  public toggle(): boolean {
    this.setOpen(!this.isOpen);
    return this.isOpen;
  }

  public registerInteraction(manager: any, onToggle: () => void) {
    if (this.interactiveDoorGroup) {
      manager.registerTarget({
        id: 'locker_04_wardrobe',
        type: 'ui',
        objectName: 'Locker Staff #04 (Yamada)',
        partName: 'Pintu Locker',
        action: 'openOutfitMenu',
        label: 'Ganti Outfit',
        key: 'E',
        maxDistance: 2.3,
        targetMesh: this.interactiveDoorGroup,
        onInteract: () => {
          onToggle();
        },
      });
    }
  }

  public update(delta: number) {
    if (!this.interactiveDoorGroup) return;

    // Smooth door swing animation
    this.currentDoorAngle = THREE.MathUtils.lerp(
      this.currentDoorAngle,
      this.targetDoorAngle,
      10 * delta
    );
    this.interactiveDoorGroup.rotation.y = this.currentDoorAngle;
  }
}

export function createLockerRow(options: LockerRowOptions): LockerUnit {
  return new LockerUnit(options);
}

export function createBench(position: THREE.Vector3, length: number = 1.8, rotationY: number = 0): THREE.Group {
  const group = new THREE.Group();
  const width = length;
  const depth = 0.40;
  const height = 0.42;

  // Wood top slat
  const top = new THREE.Mesh(new THREE.BoxGeometry(width, 0.04, depth), materials.get('woodLight'));
  top.position.set(0, height - 0.02, 0);
  top.castShadow = true;
  group.add(top);

  // Metal legs
  const legMat = materials.get('metalDark');
  for (const side of [-1, 1]) {
    const lx = side * (width / 2 - 0.15);
    const legFrame = new THREE.Mesh(new THREE.BoxGeometry(0.04, height - 0.04, depth - 0.08), legMat);
    legFrame.position.set(lx, (height - 0.04) / 2, 0);
    legFrame.castShadow = true;
    group.add(legFrame);
  }

  group.position.copy(position);
  group.rotation.y = rotationY;

  collisionWorld.addBox(
    new THREE.Vector3(position.x - width / 2, 0, position.z - depth / 2),
    new THREE.Vector3(position.x + width / 2, height, position.z + depth / 2),
    'bench'
  );

  return group;
}
