/**
 * EnvironmentDebug.ts
 * Comprehensive debug visualization system:
 * - F3 toggle
 * - Room bounding box wireframes and 3D labels
 * - Collision AABB boxes wireframes
 * - Player position & active room detection
 * - Real-time performance metrics (FPS, draw calls, triangles)
 * - Dynamic overlays: player collider, physics bodies, velocities, interaction ray
 *
 * Gated by GameConfig.debug.enabled (off in production builds).
 */

import * as THREE from 'three';
import { GameConfig } from '../core/GameConfig.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';
import { FACILITY_ROOMS, RoomDefinition } from '../world/FacilityLayout.ts';
import { PhysicalBody, PlayerProxy } from '../physics/PhysicsWorld.ts';

const CIRCLE_SEGMENTS = 20;

function makeCircle(color: number): THREE.LineLoop {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    const a = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color }));
}

export class EnvironmentDebug {
  public isEnabled: boolean = false;
  private scene: THREE.Scene;
  private debugGroup: THREE.Group = new THREE.Group();

  // Metrics
  public fps: number = 60;
  public drawCalls: number = 0;
  public triangles: number = 0;
  public activeRoom?: RoomDefinition;

  // Dynamic overlay objects, created lazily once and reused
  private playerCircle?: THREE.LineLoop;
  private bodyCircles: THREE.LineLoop[] = [];
  private lines?: THREE.LineSegments; // velocity vectors + interaction ray
  private linePositions = new Float32Array(0);
  private readonly tmpBox = new THREE.Box3();
  private readonly tmpCenter = new THREE.Vector3();

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
    if (!GameConfig.debug.enabled) return false;
    this.isEnabled = !this.isEnabled;
    this.debugGroup.visible = this.isEnabled;
    collisionWorld.setDebugVisible(this.isEnabled);
    return this.isEnabled;
  }

  public setEnabled(state: boolean) {
    this.isEnabled = state && GameConfig.debug.enabled;
    this.debugGroup.visible = state;
    collisionWorld.setDebugVisible(this.isEnabled);
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

  /** Per-frame overlay refresh. Only call while enabled. */
  public updateDynamic(
    player: PlayerProxy,
    bodies: readonly PhysicalBody[],
    eye: THREE.Vector3,
    focusMesh: THREE.Object3D | null
  ) {
    if (!this.playerCircle) {
      this.playerCircle = makeCircle(0x22d3ee);
      this.debugGroup.add(this.playerCircle);
    }
    this.playerCircle.position.set(player.position.x, player.position.y + 0.05, player.position.z);
    this.playerCircle.scale.set(player.radius, 1, player.radius);

    while (this.bodyCircles.length < bodies.length) {
      const c = makeCircle(0xfacc15);
      this.bodyCircles.push(c);
      this.debugGroup.add(c);
    }

    // 2 vertices per segment: player velocity, each body velocity, interaction ray
    const needed = (bodies.length + 2) * 6;
    if (this.linePositions.length < needed) {
      this.linePositions = new Float32Array(needed);
      if (this.lines) {
        this.debugGroup.remove(this.lines);
        this.lines.geometry.dispose();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
      this.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xf472b6 }));
      this.lines.frustumCulled = false;
      this.debugGroup.add(this.lines);
    }

    const out = this.linePositions;
    let n = 0;
    const seg = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => {
      out[n++] = ax; out[n++] = ay; out[n++] = az;
      out[n++] = bx; out[n++] = by; out[n++] = bz;
    };

    seg(player.position.x, 0.1, player.position.z,
      player.position.x + player.velocity.x * 0.4, 0.1, player.position.z + player.velocity.z * 0.4);

    for (let i = 0; i < this.bodyCircles.length; i++) {
      const c = this.bodyCircles[i];
      const b = bodies[i];
      c.visible = !!b;
      if (!b) continue;
      c.position.set(b.position.x, 0.05, b.position.z);
      c.scale.set(b.radius, 1, b.radius);
      (c.material as THREE.LineBasicMaterial).color.setHex(b.locked ? 0xef4444 : 0xfacc15);
      seg(b.position.x, 0.1, b.position.z, b.position.x + b.velocity.x * 0.4, 0.1, b.position.z + b.velocity.z * 0.4);
    }

    if (focusMesh) {
      this.tmpBox.setFromObject(focusMesh).getCenter(this.tmpCenter);
      seg(eye.x, eye.y - 0.05, eye.z, this.tmpCenter.x, this.tmpCenter.y, this.tmpCenter.z);
    } else {
      seg(0, 0, 0, 0, 0, 0);
    }
    // zero unused tail so stale segments never draw
    while (n < out.length) out[n++] = 0;

    const attr = this.lines!.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
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
