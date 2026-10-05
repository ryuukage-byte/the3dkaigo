/**
 * Lighting.ts
 * 3-Layer institutional lighting system:
 * Layer 1: Ambient / Hemisphere light for soft, calm, non-dramatic base illumination.
 * Layer 2: Main directional sunlight streaming through south & west windows.
 * Layer 3: Balanced auxiliary facility lights for corridors and resident rooms.
 */

import * as THREE from 'three';

export function createFacilityLighting(): THREE.Group {
  const group = new THREE.Group();

  // Layer 1: Hemisphere Light (sky: warm off-white, ground: soft vinyl tint)
  const hemiLight = new THREE.HemisphereLight(0xFFFBF2, 0xD4CBBF, 0.95);
  hemiLight.position.set(0, 10, 0);
  group.add(hemiLight);

  // Soft Ambient fill
  const ambientLight = new THREE.AmbientLight(0xF8F6F0, 0.45);
  group.add(ambientLight);

  // Layer 2: Directional Daylight Sun (soft angle through South-facing windows)
  const sunLight = new THREE.DirectionalLight(0xFFF9E6, 1.1);
  sunLight.position.set(6.0, 8.0, 10.0);
  sunLight.target.position.set(0, 0, 0);
  sunLight.castShadow = true;

  // Shadow camera tuned for 18m x 14m facility footprint
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 30;
  sunLight.shadow.camera.left = -12;
  sunLight.shadow.camera.right = 12;
  sunLight.shadow.camera.top = 10;
  sunLight.shadow.camera.bottom = -10;
  sunLight.shadow.bias = -0.0005;

  group.add(sunLight);
  group.add(sunLight.target);

  // Layer 3: Soft auxiliary facility interior fill lights
  // Keeps corridors and rooms evenly illuminated as required for institutional elderly-care
  const interiorKeyPoints: [number, number, number, number][] = [
    // [x, y, z, intensity]
    [0.0, 2.3, -1.9, 0.55],   // Central corridor
    [-5.0, 2.3, -1.9, 0.45],  // West corridor
    [5.0, 2.3, -1.9, 0.45],   // East corridor
    [-6.8, 2.3, -4.8, 0.5],   // Locker room
    [-1.0, 2.3, -4.8, 0.6],   // Office
    [2.8, 2.3, 4.6, 0.7],     // Dining / Day hall
    [-6.9, 2.3, 0.8, 0.5],    // Room 01
    [-3.1, 2.3, 0.8, 0.5],    // Room 02
    [3.1, 2.3, 0.8, 0.5],     // Room 03
    [6.9, 2.3, 0.8, 0.5],     // Accessible Toilet
    [-5.8, 2.3, 4.6, 0.55],   // Bathroom
  ];

  for (const [x, y, z, intensity] of interiorKeyPoints) {
    const pointLight = new THREE.PointLight(0xFFF9EE, intensity, 7.5, 1.2);
    pointLight.position.set(x, y, z);
    group.add(pointLight);
  }

  return group;
}
