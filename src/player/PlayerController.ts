/**
 * PlayerController.ts
 * First/third-person player: look, movement, jump, camera.
 *
 * Responsibilities are split by when they run:
 *   applyLook(dt)   once per frame   mouse/touch look, applied immediately (no smoothing = no latency)
 *   simulate(dt)    per sub-step     acceleration, collision-resolved movement, gravity
 *   animate(dt)     once per frame   avatar facing + walk cycle
 *   updateCamera(dt) once per frame  after physics, so the camera never lags the body
 *
 * The logical collider is a circle (radius) in XZ with a height; the visible
 * avatar mesh is only a follower of `position`.
 */

import * as THREE from 'three';
import { PlayerAvatar } from './PlayerAvatar.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';
import { GameConfig } from '../core/GameConfig.ts';
import { InputManager } from '../core/InputManager.ts';
import { PlayerProxy } from '../physics/PhysicsWorld.ts';

export interface TouchInputState {
  moveX: number; // -1 to 1
  moveY: number; // -1 to 1
  lookX: number; // delta pixels
  lookY: number; // delta pixels
  isRunning: boolean;
}

export class PlayerController implements PlayerProxy {
  public readonly position = new THREE.Vector3();
  public readonly velocity = new THREE.Vector3();
  public readonly avatar = new PlayerAvatar();

  // PlayerProxy (physics view of the player)
  public readonly radius = GameConfig.player.radius;
  public readonly height = GameConfig.player.height;
  public readonly mass = GameConfig.player.mass;

  public yaw = 0;
  public pitch = 0.22;

  public viewMode: 'firstPerson' | 'thirdPerson' = GameConfig.player.defaultViewMode;
  public cameraDistance = GameConfig.camera.defaultDistance;

  /** Movement/look allowed this frame (set by Game from the state machine). */
  public movementEnabled = true;
  public lookEnabled = true;
  /** Multiplier on walk/run speed (e.g. while pushing a wheelchair). */
  public speedScale = 1;
  public jumpEnabled = true;

  public touchInput: TouchInputState = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, isRunning: false };

  public currentSpeed = 0;
  private isGrounded = true;
  private camDistance = GameConfig.camera.defaultDistance; // collision-adjusted 3P boom length

  // scratch (no per-frame allocation)
  private readonly look = { x: 0, y: 0 };
  private readonly wish = new THREE.Vector3();
  private readonly fwd = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly camTarget = new THREE.Vector3();
  private readonly camDir = new THREE.Vector3();
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly input: InputManager
  ) {
    this.resetPosition();
  }

  public resetPosition(customPos?: { x: number; y: number; z: number }) {
    const sp = customPos ?? GameConfig.player.spawnPosition;
    this.position.set(sp.x, sp.y, sp.z);
    this.velocity.set(0, 0, 0);
    this.yaw = GameConfig.player.spawnRotation;
    this.pitch = 0.22;
    this.isGrounded = true;
    this.avatar.mesh.position.copy(this.position);
    this.avatar.mesh.rotation.y = this.yaw - Math.PI;
    this.camDistance = this.cameraDistance;
    this.snapCamera();
  }

  public getYaw(): number {
    return this.yaw;
  }

  public toggleViewMode(): 'firstPerson' | 'thirdPerson' {
    this.setViewMode(this.viewMode === 'firstPerson' ? 'thirdPerson' : 'firstPerson');
    return this.viewMode;
  }

  public setViewMode(mode: 'firstPerson' | 'thirdPerson') {
    this.viewMode = mode;
    this.clampPitch();
  }

  private clampPitch() {
    this.pitch =
      this.viewMode === 'firstPerson'
        ? THREE.MathUtils.clamp(this.pitch, -Math.PI * 0.42, Math.PI * 0.42)
        : THREE.MathUtils.clamp(this.pitch, -0.2, 0.75);
  }

  // ---- per frame: look ------------------------------------------------------

  public applyLook() {
    this.input.consumeLook(this.look);
    const wheel = this.input.consumeWheel();
    const touch = this.touchInput;

    if (!this.lookEnabled) {
      // drop whatever accumulated so it cannot snap the view when control returns
      touch.lookX = 0;
      touch.lookY = 0;
      return;
    }

    const sens = GameConfig.camera.sensitivity;
    this.yaw -= this.look.x * sens;
    this.pitch -= this.look.y * sens;
    if (touch.lookX !== 0 || touch.lookY !== 0) {
      this.yaw -= touch.lookX * sens * 1.5;
      this.pitch -= touch.lookY * sens * 1.5;
      touch.lookX = 0;
      touch.lookY = 0;
    }
    this.yaw = wrapAngle(this.yaw);
    this.clampPitch();

    if (wheel !== 0) {
      this.cameraDistance = THREE.MathUtils.clamp(
        this.cameraDistance + wheel * 0.003,
        GameConfig.camera.minDistance,
        GameConfig.camera.maxDistance
      );
    }
  }

  // ---- per sub-step: movement ----------------------------------------------

  public simulate(dt: number) {
    const cfg = GameConfig.player;

    // 1. Movement intent from the (un-smoothed) yaw
    let forward = 0;
    let strafe = 0;
    let running = false;
    if (this.movementEnabled) {
      const inp = this.input;
      if (inp.isKeyDown('KeyW') || inp.isKeyDown('ArrowUp')) forward += 1;
      if (inp.isKeyDown('KeyS') || inp.isKeyDown('ArrowDown')) forward -= 1;
      if (inp.isKeyDown('KeyA') || inp.isKeyDown('ArrowLeft')) strafe -= 1;
      if (inp.isKeyDown('KeyD') || inp.isKeyDown('ArrowRight')) strafe += 1;
      forward -= this.touchInput.moveY; // joystick up is negative Y
      strafe += this.touchInput.moveX;
      running = inp.isKeyDown('ShiftLeft') || inp.isKeyDown('ShiftRight') || this.touchInput.isRunning;
    }

    this.fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.wish.set(0, 0, 0).addScaledVector(this.fwd, forward).addScaledVector(this.right, strafe);
    const wishLen = this.wish.length();
    if (wishLen > 1) this.wish.divideScalar(wishLen); // diagonals never faster; analog stick keeps partial input

    const maxSpeed = (running ? cfg.runSpeed : cfg.walkSpeed) * this.speedScale;
    const targetX = this.wish.x * maxSpeed;
    const targetZ = this.wish.z * maxSpeed;

    // 2. Accelerate toward target velocity (dt-based, deterministic)
    const rate = (wishLen > 0 ? cfg.acceleration : cfg.deceleration) * dt;
    const dvx = targetX - this.velocity.x;
    const dvz = targetZ - this.velocity.z;
    const dv = Math.hypot(dvx, dvz);
    if (dv <= rate) {
      this.velocity.x = targetX;
      this.velocity.z = targetZ;
    } else {
      this.velocity.x += (dvx / dv) * rate;
      this.velocity.z += (dvz / dv) * rate;
    }

    // 3. Move with sliding collision. If something stopped us, velocity follows
    //    the real displacement so it cannot build up against a wall.
    const ox = this.position.x;
    const oz = this.position.z;
    const wantX = this.velocity.x * dt;
    const wantZ = this.velocity.z * dt;
    collisionWorld.moveCircle(this.position, wantX, wantZ, this.radius, this.height);
    const mx = this.position.x - ox;
    const mz = this.position.z - oz;
    if (Math.hypot(mx, mz) < Math.hypot(wantX, wantZ) * 0.999) {
      this.velocity.x = mx / dt;
      this.velocity.z = mz / dt;
    }
    this.currentSpeed = Math.hypot(this.velocity.x, this.velocity.z);

    // 4. Jump / gravity
    if (this.movementEnabled && this.isGrounded && this.jumpEnabled && this.input.wasPressed('Space')) {
      this.velocity.y = cfg.jumpVelocity;
      this.isGrounded = false;
    }
    if (!this.isGrounded) {
      this.velocity.y -= cfg.gravity * dt;
      this.position.y += this.velocity.y * dt;
      if (this.position.y <= 0) {
        this.position.y = 0;
        this.velocity.y = 0;
        this.isGrounded = true;
      }
    }
  }

  // ---- per frame: avatar + camera ----------------------------------------------

  public animate(dt: number, holdingWheelchair: boolean) {
    // Face movement direction (or the look direction while holding a wheelchair)
    let targetAngle: number | null = null;
    if (holdingWheelchair) {
      targetAngle = this.yaw - Math.PI;
    } else if (this.currentSpeed > 0.1) {
      targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
    }
    if (targetAngle !== null) {
      const cur = this.avatar.mesh.rotation.y;
      const diff = wrapAngle(targetAngle - cur);
      this.avatar.mesh.rotation.y = cur + diff * (1 - Math.exp(-GameConfig.player.turnSpeed * dt));
    }

    this.avatar.mesh.position.copy(this.position);
    this.avatar.updateAnimation(this.currentSpeed, dt);
  }

  /** Snap the camera to its target with no smoothing (teleport / reset). */
  private snapCamera() {
    this.updateCamera(1);
  }

  public updateCamera(dt: number) {
    if (this.viewMode === 'firstPerson') {
      this.avatar.setFirstPersonVisibility(this.avatar.isHoldingWheelchair);
      this.camera.position.set(this.position.x, this.position.y + GameConfig.player.eyeHeight, this.position.z);
      this.euler.set(this.pitch, this.yaw, 0);
      this.camera.quaternion.setFromEuler(this.euler);
      return;
    }

    this.avatar.setThirdPersonVisibility();
    this.camTarget.set(this.position.x, this.position.y + 1.4, this.position.z);
    const cosPitch = Math.cos(this.pitch);
    this.camDir.set(Math.sin(this.yaw) * cosPitch, Math.sin(this.pitch), Math.cos(this.yaw) * cosPitch);

    // Free distance along the boom: walls (ray vs static boxes) and the ceiling
    const wanted = this.cameraDistance;
    let free = collisionWorld.raycast(this.camTarget, this.camDir, wanted + 0.3) - 0.3;
    if (this.camDir.y > 1e-4) {
      free = Math.min(free, (GameConfig.facility.ceilingHeight - 0.15 - this.camTarget.y) / this.camDir.y);
    }
    free = THREE.MathUtils.clamp(free, 0.4, wanted);

    // Pull in instantly (never see through a wall), ease back out
    if (free < this.camDistance) this.camDistance = free;
    else this.camDistance += (free - this.camDistance) * (1 - Math.exp(-8 * dt));

    this.camera.position.copy(this.camTarget).addScaledVector(this.camDir, this.camDistance);
    this.camera.lookAt(this.camTarget);
  }
}

function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
