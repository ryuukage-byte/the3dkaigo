/**
 * SceneManager.ts
 * Manages the scene graph root, camera setup, facility structure,
 * and exterior environment.
 */

import * as THREE from 'three';
import { Facility } from '../world/Facility.ts';
import { createFacilityLighting } from '../world/Lighting.ts';
import { createExteriorEnvironment } from '../world/Environment.ts';
import { EnvironmentDebug } from '../debug/EnvironmentDebug.ts';
import { InteractionManager } from '../interaction/InteractionManager.ts';
import { WheelchairInstance } from '../furniture/Wheelchair.ts';
import { GameConfig } from './GameConfig.ts';

export class SceneManager {
  public readonly scene: THREE.Scene = new THREE.Scene();
  public readonly camera: THREE.PerspectiveCamera;
  public readonly facility: Facility;
  public readonly debug: EnvironmentDebug;
  public readonly interactionManager: InteractionManager;

  constructor(
    aspectRatio: number,
    onToggleHold?: (wheelchair: WheelchairInstance, isHolding: boolean) => void
  ) {
    // 1. Perspective Camera
    this.camera = new THREE.PerspectiveCamera(
      GameConfig.camera.fov,
      aspectRatio,
      GameConfig.camera.near,
      GameConfig.camera.far
    );

    // 2. Soft background color
    this.scene.background = new THREE.Color(0xBAE6FD);

    // 3. Outdoor Environment (trees, garden lawn, boundary fence)
    this.scene.add(createExteriorEnvironment());

    // 4. Facility 3-Layer Lighting
    this.scene.add(createFacilityLighting());

    // 5. Interaction Manager
    this.interactionManager = new InteractionManager(this.camera);

    // 6. Complete 18m x 14m Kaigo Facility
    this.facility = new Facility(this.interactionManager, onToggleHold);
    this.scene.add(this.facility.group);

    // 7. Debug Visualization Manager
    this.debug = new EnvironmentDebug(this.scene);
  }

  public updateAspectRatio(aspectRatio: number) {
    this.camera.aspect = aspectRatio;
    this.camera.updateProjectionMatrix();
  }
}
