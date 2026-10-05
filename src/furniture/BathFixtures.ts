/**
 * BathFixtures.ts
 * Japanese care facility bathing fixtures (介助用浴室・浴槽・シャワーチェア).
 * Features low-entry bathtub with handrails, height-adjustable shower chair,
 * washing stations, and towel storage.
 */

import * as THREE from 'three';
import { materials } from '../world/Materials.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';

export function createCareBathtub(position: THREE.Vector3, rotationY: number = 0): THREE.Group {
  const group = new THREE.Group();
  const width = 1.6;
  const depth = 0.95;
  const height = 0.55;

  const tubMat = materials.get('careWhite');
  const railMat = materials.get('metalStainless');

  // Outer tub body
  const bodyGeo = new THREE.BoxGeometry(width, height, depth);
  const body = new THREE.Mesh(bodyGeo, tubMat);
  body.position.set(0, height / 2, 0);
  body.castShadow = true;
  group.add(body);

  // Inner water surface (soft cyan)
  const waterGeo = new THREE.PlaneGeometry(width - 0.2, depth - 0.2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x38BDF8,
    transparent: true,
    opacity: 0.75,
    roughness: 0.1,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, height - 0.08, 0);
  group.add(water);

  // Tub rim safety handrail
  const rimRail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, width * 0.75, 12), railMat);
  rimRail.rotation.z = Math.PI / 2;
  rimRail.position.set(0, height + 0.12, depth / 2 - 0.05);
  group.add(rimRail);

  // Vertical entry assist pole
  const assistPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 12), railMat);
  assistPole.position.set(width / 2 - 0.1, 0.9, depth / 2 + 0.05);
  group.add(assistPole);

  group.position.copy(position);
  group.rotation.y = rotationY;

  // Collision
  const halfW = width / 2;
  const halfD = depth / 2;
  const rotY = rotationY;
  const extentX = Math.abs(Math.cos(rotY) * halfW) + Math.abs(Math.sin(rotY) * halfD);
  const extentZ = Math.abs(Math.sin(rotY) * halfW) + Math.abs(Math.cos(rotY) * halfD);

  collisionWorld.addBox(
    new THREE.Vector3(position.x - extentX, 0, position.z - extentZ),
    new THREE.Vector3(position.x + extentX, height + 0.2, position.z + extentZ),
    'bathtub'
  );

  return group;
}

export function createShowerStation(position: THREE.Vector3, rotationY: number = 0): THREE.Group {
  const group = new THREE.Group();
  const railMat = materials.get('metalStainless');

  // Vertical shower slide bar
  const slideBar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8), railMat);
  slideBar.position.set(0, 1.4, 0.03);
  group.add(slideBar);

  // Shower head
  const headGeo = new THREE.CylinderGeometry(0.045, 0.02, 0.1, 12);
  const head = new THREE.Mesh(headGeo, railMat);
  head.rotation.x = 0.5;
  head.position.set(0, 1.75, 0.12);
  group.add(head);

  // Mixing faucet & lever
  const faucet = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.12), railMat);
  faucet.position.set(0, 0.8, 0.08);
  group.add(faucet);

  // Shampoo & body soap pump bottles on small shelf
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.12), materials.get('careWhite'));
  shelf.position.set(0, 0.65, 0.08);
  group.add(shelf);

  const bottle1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), materials.get('fabricGreen'));
  bottle1.position.set(-0.08, 0.73, 0.08);
  group.add(bottle1);

  const bottle2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), materials.get('fabricBlue'));
  bottle2.position.set(0.08, 0.73, 0.08);
  group.add(bottle2);

  // Specialized Kaigo Shower Chair (シャワーチェア with orange non-slip seat)
  const chairGroup = new THREE.Group();
  const orangeMat = materials.get('callCordOrange');

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.40), orangeMat);
  seat.position.set(0, 0.42, 0);
  chairGroup.add(seat);

  // Backrest
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.25, 0.03), orangeMat);
  back.position.set(0, 0.62, -0.18);
  chairGroup.add(back);

  // Aluminum legs with rubber suction feet
  for (const [lx, lz] of [[-0.18, -0.16], [0.18, -0.16], [-0.18, 0.16], [0.18, 0.16]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.42, 8), railMat);
    leg.position.set(lx, 0.21, lz);
    chairGroup.add(leg);

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8), materials.get('metalDark'));
    foot.position.set(lx, 0.01, lz);
    chairGroup.add(foot);
  }

  chairGroup.position.set(0, 0, 0.65);
  group.add(chairGroup);

  group.position.copy(position);
  group.rotation.y = rotationY;

  return group;
}
