/**
 * Ceiling.ts
 * Institutional suspended ceiling with recessed rectangular LED fixtures,
 * soft emissive glow, and ventilation grilles.
 */

import * as THREE from 'three';
import { materials } from '../world/Materials.ts';
import { GameConfig } from '../core/GameConfig.ts';

export function createCeiling(): THREE.Group {
  const group = new THREE.Group();
  const ceilingY = GameConfig.facility.ceilingHeight;

  // Main ceiling plane (facing downwards into the rooms)
  const ceilingGeo = new THREE.PlaneGeometry(18.2, 14.2);
  const ceilingMat = materials.get('ceiling');
  const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceilingMesh.rotation.x = Math.PI / 2; // Face down
  ceilingMesh.position.set(0, ceilingY, 0);
  group.add(ceilingMesh);

  // Recessed LED Troffer Lights (1.2m x 0.3m typical Japanese office/hospital troffers)
  const lightPositions: [number, number][] = [
    // Locker room
    [-6.8, -4.8],
    // Office
    [-3.0, -4.8],
    [0.5, -4.8],
    // Utility
    [5.5, -4.8],
    // Corridor (spaced evenly along 18m)
    [-7.0, -1.9],
    [-3.5, -1.9],
    [0.0, -1.9],
    [3.5, -1.9],
    [7.0, -1.9],
    // Connecting hallway
    [0.0, 0.8],
    // Resident Room 01
    [-6.9, 0.8],
    // Resident Room 02
    [-3.1, 0.8],
    // Resident Room 03
    [3.1, 0.8],
    // Accessible Toilet
    [6.9, 0.8],
    // Bathroom
    [-5.8, 4.7],
    // Dining / Day Hall (multiple fixtures)
    [-0.5, 4.7],
    [3.2, 3.8],
    [3.2, 5.6],
    [6.5, 4.7],
  ];

  const fixtureGeo = new THREE.BoxGeometry(1.2, 0.04, 0.3);
  const fixtureFrameMat = materials.get('careWhite');
  const ledEmissiveMat = materials.get('ledEmissive');

  for (const [x, z] of lightPositions) {
    const fixtureGroup = new THREE.Group();

    // White housing
    const frame = new THREE.Mesh(fixtureGeo, fixtureFrameMat);
    fixtureGroup.add(frame);

    // Emissive luminous diffuser panel on bottom face
    const panelGeo = new THREE.PlaneGeometry(1.15, 0.26);
    const panel = new THREE.Mesh(panelGeo, ledEmissiveMat);
    panel.rotation.x = Math.PI / 2;
    panel.position.y = -0.021;
    fixtureGroup.add(panel);

    fixtureGroup.position.set(x, ceilingY - 0.015, z);
    group.add(fixtureGroup);
  }

  // Emergency Exit light (誘導灯) over corridor doors
  const exitSignGeo = new THREE.BoxGeometry(0.35, 0.15, 0.08);
  const exitMesh = new THREE.Mesh(exitSignGeo, materials.get('exitSignEmissive'));
  exitMesh.position.set(8.5, ceilingY - 0.15, -1.9);
  group.add(exitMesh);

  const exitMesh2 = new THREE.Mesh(exitSignGeo, materials.get('exitSignEmissive'));
  exitMesh2.position.set(-8.5, ceilingY - 0.15, -1.9);
  group.add(exitMesh2);

  return group;
}
