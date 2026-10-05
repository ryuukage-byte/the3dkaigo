/**
 * EnvironmentDebug.ts
 * Comprehensive debug visualization system:
 * - F3 toggle
 * - Room bounding box wireframes and 3D labels
 * - Collision AABB boxes wireframes
 * - Player position & active room detection
 * - Real-time performance metrics (FPS, draw calls, triangles)
 */

import * as THREE from 'three';
import { collisionWorld } from '../world/CollisionWorld.ts';
import { FACILITY_ROOMS, RoomDefinition } from '../world/FacilityLayout.ts';

export class EnvironmentDebug {
  public isEnabled: boolean = false;
  private scene: THREE.Scene;
  private debugGroup: THREE.Group = new THREE.Group();

  // Metrics
  public fps: number = 60;
  public drawCalls: number = 0;
  public triangles: number = 0;
  public activeRoom?: RoomDefinition;

  private frameCount: number = 0;
  private lastTime: number = performance.now();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.add(this.debugGroup);
    this.debugGroup.visible = false;

    this.buildRoomBoundaries();
    this.debugGroup.add(collisionWorld.getDebugGroup());
  }

  public toggle(): boolean {
    this.isEnabled = !this.isEnabled;
    this.debugGroup.visible = this.isEnabled;
    collisionWorld.setDebugVisible(this.isEnabled);
    return this.isEnabled;
  }

  public setEnabled(state: boolean) {
    this.isEnabled = state;
    this.debugGroup.visible = state;
    collisionWorld.setDebugVisible(state);
  }

  private buildRoomBoundaries() {
    for (const room of FACILITY_ROOMS) {
      const sizeX = room.max.x - room.min.x;
      const sizeY = room.max.y - room.min.y;
      const sizeZ = room.max.z - room.min.z;
      const centerX = (room.min.x + room.max.x) / 2;
      const centerY = (room.min.y + room.max.y) / 2;
      const centerZ = (room.min.z + room.max.z) / 2;

      // Wireframe box for room volume
      const boxGeo = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
      const wireGeo = new THREE.WireframeGeometry(boxGeo);
      const wireMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(room.colorTag),
        transparent: true,
        opacity: 0.85,
        linewidth: 2,
      });
      const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
      wireMesh.position.set(centerX, centerY, centerZ);
      this.debugGroup.add(wireMesh);
    }
  }

  public update(playerPos: THREE.Vector3, renderer: THREE.WebGLRenderer) {
    // 1. Calculate FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastTime >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;
    }

    // 2. Performance stats from WebGLRenderer info
    this.drawCalls = renderer.info.render.calls;
    this.triangles = renderer.info.render.triangles;

    // 3. Detect current room by checking player coordinate against FACILITY_ROOMS
    this.activeRoom = this.findRoomAt(playerPos);
  }

  public findRoomAt(pos: THREE.Vector3): RoomDefinition | undefined {
    for (const room of FACILITY_ROOMS) {
      if (
        pos.x >= room.min.x &&
        pos.x <= room.max.x &&
        pos.z >= room.min.z &&
        pos.z <= room.max.z
      ) {
        return room;
      }
    }
    return undefined;
  }
}
