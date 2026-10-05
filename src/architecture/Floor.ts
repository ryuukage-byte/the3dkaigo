/**
 * Floor.ts
 * Generates the clean Japanese institutional vinyl floor with subtle room delineation,
 * non-slip drainage flooring in the bathroom, and entrance mats in the locker room.
 */

import * as THREE from 'three';
import { materials } from '../world/Materials.ts';
import { FACILITY_ROOMS } from '../world/FacilityLayout.ts';

export function createFacilityFloors(): THREE.Group {
  const group = new THREE.Group();

  // 1. Overall base subfloor (slight buffer below floor level)
  const baseGeo = new THREE.PlaneGeometry(18.5, 14.5);
  const baseMesh = new THREE.Mesh(baseGeo, materials.get('wallBaseboard'));
  baseMesh.rotation.x = -Math.PI / 2;
  baseMesh.position.y = -0.005;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // 2. Individual room floors with tailored materials
  for (const room of FACILITY_ROOMS) {
    const width = room.max.x - room.min.x;
    const depth = room.max.z - room.min.z;
    const centerX = (room.min.x + room.max.x) / 2;
    const centerZ = (room.min.z + room.max.z) / 2;

    const floorGeo = new THREE.PlaneGeometry(width, depth);
    const material = room.id === 'bathroom' ? materials.get('floorBath') : materials.get('floorVinyl');
    
    const floorMesh = new THREE.Mesh(floorGeo, material);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(centerX, 0.001, centerZ);
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // Floor transition trim at door thresholds
    const trimMat = materials.get('woodLight');
    const trimGeo = new THREE.BoxGeometry(width, 0.005, 0.04);
    const trimMesh = new THREE.Mesh(trimGeo, trimMat);
    trimMesh.position.set(centerX, 0.002, room.max.z);
    group.add(trimMesh);
  }

  // 3. Entrance floor mat in Locker Room
  const matGeo = new THREE.PlaneGeometry(1.6, 1.0);
  const matMesh = new THREE.Mesh(matGeo, materials.get('floorMat'));
  matMesh.rotation.x = -Math.PI / 2;
  matMesh.position.set(-6.8, 0.003, -3.4);
  group.add(matMesh);

  return group;
}
