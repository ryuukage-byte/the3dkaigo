/**
 * Window.ts
 * Clean Japanese care facility windows with aluminum frames, glass panels,
 * sills, and soft muted curtains.
 */

import * as THREE from 'three';
import { materials } from '../world/Materials.ts';

export interface WindowOptions {
  position: THREE.Vector3;
  width?: number;
  height?: number;
  rotationY?: number;
  hasCurtains?: boolean;
}

export function createWindow(options: WindowOptions): THREE.Group {
  const group = new THREE.Group();
  const width = options.width ?? 1.8;
  const height = options.height ?? 1.4;
  const depth = 0.16;

  // Outer frame
  const frameMat = materials.get('careWhite');
  const frameThick = 0.05;

  // Top & bottom frame
  const hBarGeo = new THREE.BoxGeometry(width, frameThick, depth);
  const topBar = new THREE.Mesh(hBarGeo, frameMat);
  topBar.position.set(0, height / 2, 0);
  group.add(topBar);

  const bottomBar = new THREE.Mesh(hBarGeo, frameMat);
  bottomBar.position.set(0, -height / 2, 0);
  group.add(bottomBar);

  // Left & right frame
  const vBarGeo = new THREE.BoxGeometry(frameThick, height, depth);
  const leftBar = new THREE.Mesh(vBarGeo, frameMat);
  leftBar.position.set(-width / 2 + frameThick / 2, 0, 0);
  group.add(leftBar);

  const rightBar = new THREE.Mesh(vBarGeo, frameMat);
  rightBar.position.set(width / 2 - frameThick / 2, 0, 0);
  group.add(rightBar);

  // Center vertical mullion
  const midBar = new THREE.Mesh(new THREE.BoxGeometry(frameThick * 0.8, height, depth * 0.8), frameMat);
  group.add(midBar);

  // Glass pane
  const glassGeo = new THREE.PlaneGeometry(width - frameThick * 2, height - frameThick * 2);
  const glassMesh = new THREE.Mesh(glassGeo, materials.get('glass'));
  group.add(glassMesh);

  // Window sill on inside
  const sillGeo = new THREE.BoxGeometry(width + 0.1, 0.03, 0.12);
  const sillMesh = new THREE.Mesh(sillGeo, materials.get('woodLight'));
  sillMesh.position.set(0, -height / 2 - 0.015, depth / 2 + 0.05);
  group.add(sillMesh);

  // Curtains
  if (options.hasCurtains !== false) {
    const curtainMat = materials.get('fabricBeige');
    const curtainGeo = new THREE.BoxGeometry(0.25, height * 1.05, 0.05);

    // Left curtain gathered
    const leftCurtain = new THREE.Mesh(curtainGeo, curtainMat);
    leftCurtain.position.set(-width / 2 - 0.08, 0, depth / 2 + 0.04);
    group.add(leftCurtain);

    // Right curtain gathered
    const rightCurtain = new THREE.Mesh(curtainGeo, curtainMat);
    rightCurtain.position.set(width / 2 + 0.08, 0, depth / 2 + 0.04);
    group.add(rightCurtain);

    // Curtain rod
    const rodGeo = new THREE.CylinderGeometry(0.012, 0.012, width + 0.4, 8);
    const rodMesh = new THREE.Mesh(rodGeo, materials.get('metalStainless'));
    rodMesh.rotation.z = Math.PI / 2;
    rodMesh.position.set(0, height / 2 + 0.08, depth / 2 + 0.04);
    group.add(rodMesh);
  }

  group.position.copy(options.position);
  if (options.rotationY) {
    group.rotation.y = options.rotationY;
  }

  return group;
}
