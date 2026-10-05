/**
 * CareBed.ts
 * Realistic Japanese 3-motor electric care bed (介護用電動ベッド).
 * Features headboard, footboard, mattress, side assist rails (介助バー),
 * lift mechanism frame, locking casters, and pendant controller with FPS Raycast interactions.
 */

import * as THREE from 'three';
import { materials } from '../world/Materials.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';
import { InteractionManager } from '../interaction/InteractionManager.ts';
import { soundManager } from '../utils/AudioEffects.ts';

export interface CareBedOptions {
  position: THREE.Vector3;
  rotationY?: number;
  railSide?: 'left' | 'right' | 'both';
  name?: string;
  interactionManager?: InteractionManager;
}

export function createCareBed(options: CareBedOptions): THREE.Group {
  const group = new THREE.Group();
  const bedLength = 2.05;
  const bedWidth = 0.98;
  const mattressHeight = 0.52;
  const frameHeight = 0.32;

  let isRailRaised = true;
  let bedBackAngle = 0; // 0 = flat, 1 = semi-fowler, 2 = sitting

  // 1. Lower chassis frame with wheels
  const frameMat = materials.get('metalStainless');
  const chassisGeo = new THREE.BoxGeometry(bedWidth * 0.9, 0.06, bedLength * 0.9);
  const chassis = new THREE.Mesh(chassisGeo, frameMat);
  chassis.position.set(0, frameHeight, 0);
  chassis.castShadow = true;
  group.add(chassis);

  // 4 Locking Casters
  const wheelGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12);
  const wheelMat = materials.get('rubberTire');
  const wheelOffsets = [
    [-bedWidth * 0.4, frameHeight / 2, -bedLength * 0.4],
    [bedWidth * 0.4, frameHeight / 2, -bedLength * 0.4],
    [-bedWidth * 0.4, frameHeight / 2, bedLength * 0.4],
    [bedWidth * 0.4, frameHeight / 2, bedLength * 0.4],
  ];

  for (const [wx, wy, wz] of wheelOffsets) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    group.add(wheel);

    const legGeo = new THREE.CylinderGeometry(0.015, 0.015, frameHeight, 8);
    const leg = new THREE.Mesh(legGeo, frameMat);
    leg.position.set(wx, frameHeight / 2, wz);
    group.add(leg);
  }

  // 2. Electric scissor lift actuator
  const actuatorGeo = new THREE.BoxGeometry(0.18, 0.12, 0.45);
  const actuator = new THREE.Mesh(actuatorGeo, materials.get('metalDark'));
  actuator.position.set(0, frameHeight + 0.08, 0);
  group.add(actuator);

  // 3. Mattress deck
  const deckGeo = new THREE.BoxGeometry(bedWidth, 0.04, bedLength);
  const deck = new THREE.Mesh(deckGeo, materials.get('careWhite'));
  deck.position.set(0, mattressHeight - 0.08, 0);
  group.add(deck);

  // 4. Medical hygiene mattress (INTERACTIVE TARGET: KASUR / MATTRESS)
  const mattressGeo = new THREE.BoxGeometry(bedWidth - 0.04, 0.14, bedLength - 0.04);
  const mattressMat = (materials.get('mattress') as THREE.MeshStandardMaterial).clone();
  const mattress = new THREE.Mesh(mattressGeo, mattressMat);
  mattress.position.set(0, mattressHeight, 0);
  mattress.castShadow = true;
  mattress.receiveShadow = true;
  mattress.name = 'care_bed_mattress';
  group.add(mattress);

  // Pillow
  const pillowGeo = new THREE.BoxGeometry(0.55, 0.08, 0.35);
  const pillow = new THREE.Mesh(pillowGeo, materials.get('pillow'));
  pillow.position.set(0, mattressHeight + 0.09, -bedLength * 0.35);
  pillow.castShadow = true;
  group.add(pillow);

  // Folded blanket
  const blanketGeo = new THREE.BoxGeometry(bedWidth - 0.02, 0.05, 0.9);
  const blanket = new THREE.Mesh(blanketGeo, materials.get('fabricBlue'));
  blanket.position.set(0, mattressHeight + 0.08, bedLength * 0.22);
  blanket.castShadow = true;
  group.add(blanket);

  // 5. Headboard & Footboard
  const woodMat = materials.get('woodLight');
  const headGeo = new THREE.BoxGeometry(bedWidth + 0.04, 0.55, 0.04);
  const headboard = new THREE.Mesh(headGeo, woodMat);
  headboard.position.set(0, mattressHeight + 0.18, -bedLength / 2 - 0.02);
  headboard.castShadow = true;
  group.add(headboard);

  const footGeo = new THREE.BoxGeometry(bedWidth + 0.04, 0.38, 0.04);
  const footboard = new THREE.Mesh(footGeo, woodMat);
  footboard.position.set(0, mattressHeight + 0.1, bedLength / 2 + 0.02);
  footboard.castShadow = true;
  group.add(footboard);

  // 6. Bed Assist Side Rails (INTERACTIVE TARGET: REL SAMPING)
  const railSide = options.railSide ?? 'right';
  const railGroups: THREE.Group[] = [];

  const createSideRail = (sideX: number) => {
    const railGroup = new THREE.Group();
    const railLength = 0.95;
    const railH = 0.32;

    const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, railLength, 8), frameMat);
    topBar.rotation.z = Math.PI / 2;
    topBar.position.set(0, railH, 0);
    railGroup.add(topBar);

    const botBar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, railLength, 8), frameMat);
    botBar.rotation.z = Math.PI / 2;
    botBar.position.set(0, 0.1, 0);
    railGroup.add(botBar);

    for (let i = -2; i <= 2; i++) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, railH, 8), frameMat);
      rung.position.set((i / 2) * (railLength * 0.45), railH / 2, 0);
      railGroup.add(rung);
    }

    railGroup.position.set(sideX, mattressHeight + 0.05, -0.15);
    railGroups.push(railGroup);
    return railGroup;
  };

  if (railSide === 'left' || railSide === 'both') {
    group.add(createSideRail(-bedWidth / 2 - 0.02));
  }
  if (railSide === 'right' || railSide === 'both') {
    group.add(createSideRail(bedWidth / 2 + 0.02));
  }

  // 7. Handset pendant remote (INTERACTIVE TARGET: REMOTE PENDANT)
  const remoteGeo = new THREE.BoxGeometry(0.08, 0.16, 0.03);
  const remoteMat = new THREE.MeshStandardMaterial({ color: 0xF8FAFC, roughness: 0.3 });
  const remote = new THREE.Mesh(remoteGeo, remoteMat);
  remote.position.set(bedWidth / 2 + 0.04, mattressHeight + 0.25, -0.1);
  remote.name = 'care_bed_remote';
  group.add(remote);

  // Position and rotate
  group.position.copy(options.position);
  if (options.rotationY) {
    group.rotation.y = options.rotationY;
  }

  // Collision box registration
  const halfW = (bedWidth + 0.1) / 2;
  const halfL = (bedLength + 0.1) / 2;
  const rotY = options.rotationY ?? 0;
  const extentX = Math.abs(Math.cos(rotY) * halfW) + Math.abs(Math.sin(rotY) * halfL);
  const extentZ = Math.abs(Math.sin(rotY) * halfW) + Math.abs(Math.cos(rotY) * halfL);

  collisionWorld.addBox(
    new THREE.Vector3(options.position.x - extentX, 0, options.position.z - extentZ),
    new THREE.Vector3(options.position.x + extentX, mattressHeight + 0.45, options.position.z + extentZ),
    options.name ?? 'care_bed'
  );

  // Register Raycast interactions if manager is provided
  if (options.interactionManager) {
    const mgr = options.interactionManager;
    const namePrefix = options.name ?? 'care_bed';

    // Target 1: Remote Control (Direct Physical Toggle)
    mgr.registerTarget({
      id: `${namePrefix}_remote`,
      type: 'world',
      objectName: 'Tempat Tidur Medis (Care Bed)',
      partName: 'Remote Bed Electric',
      action: 'adjustBed',
      label: 'Atur Posisi',
      key: 'E',
      maxDistance: 2.2,
      targetMesh: remote,
      highlightMesh: remote,
      getStateText: () => (bedBackAngle === 0 ? 'Datar (Flat)' : bedBackAngle === 1 ? 'Sandaran 30°' : 'Sandaran 60° (Duduk)'),
      onInteract: () => {
        bedBackAngle = (bedBackAngle + 1) % 3;
        soundManager.playLockerOpen();
        pillow.position.y = mattressHeight + 0.09 + bedBackAngle * 0.08;
      },
    });

    // Target 2: Side Rail (Direct Physical Toggle)
    if (railGroups.length > 0) {
      mgr.registerTarget({
        id: `${namePrefix}_rail`,
        type: 'world',
        objectName: 'Tempat Tidur Medis (Care Bed)',
        partName: 'Rel Pengaman Samping',
        action: 'toggleRail',
        label: 'Side Rail',
        key: 'E',
        maxDistance: 2.2,
        targetMesh: railGroups[0],
        getStateText: () => (isRailRaised ? 'Terpasang (Safe)' : 'Diturunkan (Transfer)'),
        onInteract: () => {
          isRailRaised = !isRailRaised;
          for (const rg of railGroups) {
            rg.position.y = isRailRaised ? mattressHeight + 0.05 : mattressHeight - 0.22;
          }
          if (isRailRaised) {
            soundManager.playLockerClose();
          } else {
            soundManager.playLockerOpen();
          }
        },
      });
    }

    // Target 3: Mattress (Direct Tidy)
    mgr.registerTarget({
      id: `${namePrefix}_mattress`,
      type: 'world',
      objectName: 'Tempat Tidur Medis (Care Bed)',
      partName: 'Kasur Medis & Seprai',
      action: 'tidyBed',
      label: 'Rapikan',
      key: 'E',
      maxDistance: 2.2,
      targetMesh: mattress,
      highlightMesh: mattress,
      getStateText: () => 'Kondisi Rapi & Bersih',
      onInteract: () => {
        soundManager.playChangeClothes();
      },
    });
  }

  return group;
}
