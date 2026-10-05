/**
 * Cabinet.ts
 * Japanese care home furniture: resident wardrobe (衣類チェスト),
 * office filing cabinets, storage shelves, and TV console.
 */

import * as THREE from 'three';
import { materials } from '../world/Materials.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';

export interface CabinetOptions {
  position: THREE.Vector3;
  width?: number;
  depth?: number;
  height?: number;
  rotationY?: number;
  type?: 'wardrobe' | 'shelf' | 'tv_console' | 'filing';
  name?: string;
}

export function createCabinet(options: CabinetOptions): THREE.Group {
  const group = new THREE.Group();
  const type = options.type ?? 'wardrobe';
  const width = options.width ?? (type === 'tv_console' ? 1.6 : type === 'filing' ? 0.9 : 0.85);
  const depth = options.depth ?? (type === 'tv_console' ? 0.45 : 0.52);
  const height = options.height ?? (type === 'tv_console' ? 0.52 : type === 'filing' ? 1.4 : 1.75);

  const woodMat = materials.get('woodLight');
  const darkMat = materials.get('metalDark');
  const whiteMat = materials.get('careWhite');

  if (type === 'tv_console') {
    // Low media console
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height - 0.1, depth), woodMat);
    body.position.set(0, height / 2, 0);
    body.castShadow = true;
    group.add(body);

    // Legs
    for (const [lx, lz] of [[-width * 0.45, -depth * 0.4], [width * 0.45, -depth * 0.4], [-width * 0.45, depth * 0.4], [width * 0.45, depth * 0.4]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), darkMat);
      leg.position.set(lx, 0.05, lz);
      group.add(leg);
    }

    // Flat screen TV on top
    const tvStand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.2), darkMat);
    tvStand.position.set(0, height + 0.01, 0);
    group.add(tvStand);

    const tvNeck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.03), darkMat);
    tvNeck.position.set(0, height + 0.06, 0);
    group.add(tvNeck);

    const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 0.04), darkMat);
    tvScreen.position.set(0, height + 0.42, 0);
    tvScreen.castShadow = true;
    group.add(tvScreen);

    // Screen bezel & display face
    const screenFace = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 0.59), materials.get('wheelchairSeat'));
    screenFace.position.set(0, height + 0.42, 0.025);
    group.add(screenFace);
  } else if (type === 'shelf') {
    // Open storage shelves (linen & utility)
    const shelfMat = materials.get('metalStainless');
    const uprights = [
      [-width / 2 + 0.02, -depth / 2 + 0.02],
      [width / 2 - 0.02, -depth / 2 + 0.02],
      [-width / 2 + 0.02, depth / 2 - 0.02],
      [width / 2 - 0.02, depth / 2 - 0.02],
    ];

    for (const [ux, uz] of uprights) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, height, 8), shelfMat);
      post.position.set(ux, height / 2, uz);
      group.add(post);
    }

    // 4 shelf tiers
    const tierCount = 4;
    for (let t = 0; t < tierCount; t++) {
      const ty = (t / (tierCount - 1)) * (height - 0.2) + 0.15;
      const tier = new THREE.Mesh(new THREE.BoxGeometry(width, 0.03, depth), shelfMat);
      tier.position.set(0, ty, 0);
      group.add(tier);

      // Simple folded linen / towel boxes on shelves
      const boxMat = t % 2 === 0 ? materials.get('fabricBlue') : materials.get('fabricBeige');
      const box = new THREE.Mesh(new THREE.BoxGeometry(width * 0.35, 0.18, depth * 0.7), boxMat);
      box.position.set(-width * 0.25, ty + 0.1, 0);
      group.add(box);

      const box2 = new THREE.Mesh(new THREE.BoxGeometry(width * 0.35, 0.18, depth * 0.7), materials.get('careWhite'));
      box2.position.set(width * 0.25, ty + 0.1, 0);
      group.add(box2);
    }
  } else {
    // Wardrobe / Filing cabinet with drawers and doors
    const mat = type === 'filing' ? whiteMat : woodMat;
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
    body.position.set(0, height / 2, 0);
    body.castShadow = true;
    group.add(body);

    // Handles
    const handleCount = type === 'filing' ? 3 : 2;
    for (let h = 0; h < handleCount; h++) {
      const hy = (h + 1) * (height / (handleCount + 1));
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.02), darkMat);
      handle.position.set(0, hy, depth / 2 + 0.01);
      group.add(handle);
    }
  }

  group.position.copy(options.position);
  if (options.rotationY) {
    group.rotation.y = options.rotationY;
  }

  // Collision
  const rotY = options.rotationY ?? 0;
  const halfW = width / 2;
  const halfD = depth / 2;
  const extentX = Math.abs(Math.cos(rotY) * halfW) + Math.abs(Math.sin(rotY) * halfD);
  const extentZ = Math.abs(Math.sin(rotY) * halfW) + Math.abs(Math.cos(rotY) * halfD);

  collisionWorld.addBox(
    new THREE.Vector3(options.position.x - extentX, 0, options.position.z - extentZ),
    new THREE.Vector3(options.position.x + extentX, height, options.position.z + extentZ),
    options.name ?? 'cabinet'
  );

  return group;
}
