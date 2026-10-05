/**
 * Props.ts
 * Environmental props adding believable Japanese care facility ambiance:
 * wall clocks, fire extinguishers, water server, notice boards,
 * desktop PC workstations, potted plants, and waste bins.
 */

import * as THREE from 'three';
import { materials } from '../world/Materials.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';

export function createWallClock(position: THREE.Vector3, rotationY: number = 0): THREE.Group {
  const group = new THREE.Group();
  const radius = 0.18;

  // Outer rim
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.03, 24), materials.get('woodLight'));
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  // White face
  const face = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.9, radius * 0.9, 0.032, 24), materials.get('careWhite'));
  face.rotation.x = Math.PI / 2;
  group.add(face);

  // Center hub & hands
  const darkMat = materials.get('metalDark');
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 12), darkMat);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);

  const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.08, 0.005), darkMat);
  hourHand.position.set(0.02, 0.03, 0.02);
  hourHand.rotation.z = -0.6;
  group.add(hourHand);

  const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.12, 0.005), darkMat);
  minHand.position.set(0, 0.05, 0.02);
  group.add(minHand);

  group.position.copy(position);
  group.rotation.y = rotationY;

  return group;
}

export function createFireExtinguisher(position: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();
  const redMat = materials.get('emergencyRed');
  const darkMat = materials.get('metalDark');

  // Cylinder body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.38, 12), redMat);
  body.position.set(0, 0.22, 0);
  body.castShadow = true;
  group.add(body);

  // Top neck & valve
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 8), darkMat);
  valve.position.set(0, 0.43, 0);
  group.add(valve);

  // Lever handle
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), darkMat);
  lever.position.set(0.03, 0.46, 0);
  group.add(lever);

  // Hose
  const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.35, 6), darkMat);
  hose.position.set(0.08, 0.24, 0);
  group.add(hose);

  // Red floor bracket / stand
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.22), redMat);
  stand.position.set(0, 0.02, 0);
  group.add(stand);

  group.position.copy(position);
  return group;
}

export function createWaterDispenser(position: THREE.Vector3, rotationY: number = 0): THREE.Group {
  const group = new THREE.Group();
  const whiteMat = materials.get('careWhite');
  const darkMat = materials.get('metalDark');

  // Lower stand
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.95, 0.36), whiteMat);
  stand.position.set(0, 0.475, 0);
  stand.castShadow = true;
  group.add(stand);

  // Dispensing recess
  const recess = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.12), darkMat);
  recess.position.set(0, 0.72, 0.13);
  group.add(recess);

  // Blue water jug inverted on top
  const jugGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.35, 12);
  const jugMat = new THREE.MeshPhysicalMaterial({
    color: 0x38BDF8,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
  });
  const jug = new THREE.Mesh(jugGeo, jugMat);
  jug.position.set(0, 1.15, 0);
  group.add(jug);

  group.position.copy(position);
  group.rotation.y = rotationY;

  collisionWorld.addBox(
    new THREE.Vector3(position.x - 0.2, 0, position.z - 0.2),
    new THREE.Vector3(position.x + 0.2, 1.35, position.z + 0.2),
    'water_dispenser'
  );

  return group;
}

export function createNoticeBoard(position: THREE.Vector3, width: number = 1.6, height: number = 0.9, rotationY: number = 0): THREE.Group {
  const group = new THREE.Group();

  // Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.06, height + 0.06, 0.02), materials.get('metalStainless'));
  group.add(frame);

  // Cork / Whiteboard surface
  const board = new THREE.Mesh(new THREE.PlaneGeometry(width, height), materials.get('wallUpper'));
  board.position.z = 0.012;
  group.add(board);

  // Small mock memos/posters
  const memoColors = [materials.get('fabricBlue'), materials.get('fabricGreen'), materials.get('fabricBeige')];
  for (let i = 0; i < 5; i++) {
    const memo = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.26), memoColors[i % 3]);
    memo.position.set(-width * 0.38 + i * 0.24, (i % 2 === 0 ? 0.1 : -0.1), 0.015);
    group.add(memo);
  }

  group.position.copy(position);
  group.rotation.y = rotationY;

  return group;
}

export function createPCWorkstation(position: THREE.Vector3, rotationY: number = 0): THREE.Group {
  const group = new THREE.Group();
  const darkMat = materials.get('metalDark');

  // Monitor base & neck
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.015, 0.14), darkMat);
  base.position.set(0, 0.01, 0);
  group.add(base);

  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.03), darkMat);
  neck.position.set(0, 0.08, -0.02);
  group.add(neck);

  // 24-inch Monitor screen
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.32, 0.03), darkMat);
  screen.position.set(0, 0.24, 0);
  screen.castShadow = true;
  group.add(screen);

  // Display pane (subtle dark blue medical chart screen)
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.28), materials.get('wheelchairSeat'));
  display.position.set(0, 0.24, 0.016);
  group.add(display);

  // Keyboard
  const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.015, 0.14), darkMat);
  keyboard.position.set(0, 0.01, 0.22);
  group.add(keyboard);

  // Mouse
  const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.09), darkMat);
  mouse.position.set(0.26, 0.01, 0.22);
  group.add(mouse);

  group.position.copy(position);
  group.rotation.y = rotationY;

  return group;
}

export function createPottedPlant(position: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();

  // Ceramic white pot
  const potGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.42, 12);
  const pot = new THREE.Mesh(potGeo, materials.get('careWhite'));
  pot.position.set(0, 0.21, 0);
  pot.castShadow = true;
  group.add(pot);

  // Soil
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 12), materials.get('metalDark'));
  soil.position.set(0, 0.40, 0);
  group.add(soil);

  // Foliage clusters (stylized low-poly plant leaves)
  const leafMat = materials.get('fabricGreen');
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const leafGeo = new THREE.ConeGeometry(0.12, 0.45, 4);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.rotation.x = 0.4;
    leaf.rotation.y = angle;
    leaf.position.set(Math.sin(angle) * 0.08, 0.55 + (i % 2) * 0.1, Math.cos(angle) * 0.08);
    leaf.castShadow = true;
    group.add(leaf);
  }

  group.position.copy(position);

  collisionWorld.addBox(
    new THREE.Vector3(position.x - 0.2, 0, position.z - 0.2),
    new THREE.Vector3(position.x + 0.2, 0.8, position.z + 0.2),
    'plant'
  );

  return group;
}

export function createTrashBin(position: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 0.32, 12), materials.get('careWhite'));
  bin.position.set(0, 0.16, 0);
  bin.castShadow = true;
  group.add(bin);

  group.position.copy(position);
  return group;
}

export function createTissueBox(position: THREE.Vector3, rotationY: number = 0): THREE.Group {
  const group = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.12), materials.get('fabricBeige'));
  box.position.set(0, 0.04, 0);
  group.add(box);

  const tissue = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.04), materials.get('pillow'));
  tissue.position.set(0, 0.09, 0);
  group.add(tissue);

  group.position.copy(position);
  group.rotation.y = rotationY;
  return group;
}
