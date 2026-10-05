/**
 * PlayerController.ts
 * Third-person player controller supporting PC keyboard/mouse and tablet touch controls.
 * Features smooth movement, collision sliding, camera orbit, and wall-collision prevention.
 */

import * as THREE from 'three';
import { PlayerAvatar } from './PlayerAvatar.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';
import { GameConfig } from '../core/GameConfig.ts';

export interface TouchInputState {
  moveX: number; // -1 to 1
  moveY: number; // -1 to 1
  lookX: number; // delta pixels
  lookY: number; // delta pixels
  isRunning: boolean;
}

export class PlayerController {
  public readonly position: THREE.Vector3 = new THREE.Vector3();
  public readonly avatar: PlayerAvatar = new PlayerAvatar();

  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  // Rotation & orientation
  private yaw: number = 0; // horizontal rotation
  private pitch: number = 0.25; // vertical rotation
  private currentYaw: number = 0;
  private currentPitch: number = 0.25;

  // Camera settings
  public viewMode: 'firstPerson' | 'thirdPerson' = GameConfig.player.defaultViewMode;
  public cameraDistance: number = GameConfig.camera.defaultDistance;
  public cameraHeight: number = GameConfig.camera.defaultHeight;

  // Velocity & physics
  public velocity: THREE.Vector3 = new THREE.Vector3();
  private isGrounded: boolean = true;
  public currentSpeed: number = 0;

  // Input states & controls lock
  public enabled: boolean = true;
  private keys: { [key: string]: boolean } = {};
  public isPointerLocked: boolean = false;
  private isMouseDown: boolean = false;

  // External touch controls for tablets
  public touchInput: TouchInputState = {
    moveX: 0,
    moveY: 0,
    lookX: 0,
    lookY: 0,
    isRunning: false,
  };

  // Event callbacks
  public onDebugToggle?: () => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.resetPosition();
    this.setupEventListeners();
  }

  public resetPosition(customPos?: { x: number, y: number, z: number }) {
    const sp = customPos ?? GameConfig.player.spawnPosition;
    this.position.set(sp.x, sp.y, sp.z);
    this.avatar.mesh.position.copy(this.position);
    this.velocity.set(0, 0, 0);
    this.yaw = GameConfig.player.spawnRotation;
    this.pitch = 0.22;
  }

  public disableControls() {
    this.enabled = false;
    this.keys = {};
    this.isMouseDown = false;
    this.touchInput.moveX = 0;
    this.touchInput.moveY = 0;
    this.touchInput.lookX = 0;
    this.touchInput.lookY = 0;
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  public enableControls(requestPointerLock: boolean = true) {
    this.enabled = true;
    this.keys = {};
    this.isMouseDown = false;
    if (requestPointerLock && !this.isPointerLocked) {
      this.domElement.requestPointerLock?.();
    }
  }

  private setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;

      this.keys[e.code] = true;

      if (e.code === 'KeyR') {
        this.resetPosition();
      }

      if (e.code === 'KeyV') {
        this.toggleViewMode();
      }

      if (e.code === 'F3') {
        e.preventDefault();
        this.onDebugToggle?.();
      }

      if (e.code === 'Space' && this.isGrounded) {
        this.velocity.y = GameConfig.player.jumpVelocity;
        this.isGrounded = false;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.enabled) {
        this.keys = {};
        return;
      }
      this.keys[e.code] = false;
    });

    // Pointer lock for immersive desktop play
    this.domElement.addEventListener('click', () => {
      if (!this.enabled) return;
      if (!this.isPointerLocked) {
        this.domElement.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.domElement;
    });

    this.domElement.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (e.button === 0 || e.button === 2) {
        this.isMouseDown = true;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.isPointerLocked || this.isMouseDown) {
        const sens = GameConfig.camera.sensitivity;
        this.yaw -= e.movementX * sens;
        this.pitch -= e.movementY * sens;
        this.clampPitch();
      }
    });

    // Mouse wheel camera distance zoom
    this.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = THREE.MathUtils.clamp(
        this.cameraDistance + e.deltaY * 0.003,
        GameConfig.camera.minDistance,
        GameConfig.camera.maxDistance
      );
    }, { passive: false });
  }

  public toggleViewMode(): 'firstPerson' | 'thirdPerson' {
    this.viewMode = this.viewMode === 'firstPerson' ? 'thirdPerson' : 'firstPerson';
    return this.viewMode;
  }

  public setViewMode(mode: 'firstPerson' | 'thirdPerson') {
    this.viewMode = mode;
  }

  public getYaw(): number {
    return this.currentYaw;
  }

  private clampPitch() {
    if (this.viewMode === 'firstPerson') {
      // First person view can pitch up and down comfortably to inspect care beds, floor, ceiling
      this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI * 0.42, Math.PI * 0.42);
    } else {
      // Third person camera pitch limits
      this.pitch = THREE.MathUtils.clamp(this.pitch, -0.2, 0.75);
    }
  }

  public update(delta: number) {
    // If controls are disabled (e.g. INTERACTION_MENU open), freeze movement & look
    if (!this.enabled) {
      this.currentSpeed = 0;
      this.avatar.updateAnimation(0, delta);
      this.updateCamera();
      return;
    }

    // 1. Process touch look inputs (tablet)
    if (this.touchInput.lookX !== 0 || this.touchInput.lookY !== 0) {
      const sens = GameConfig.camera.sensitivity * 1.5;
      this.yaw -= this.touchInput.lookX * sens;
      this.pitch -= this.touchInput.lookY * sens;
      this.clampPitch();
      this.touchInput.lookX = 0;
      this.touchInput.lookY = 0;
    }

    // Smooth camera angles
    this.currentYaw = THREE.MathUtils.lerp(this.currentYaw, this.yaw, 0.25);
    this.currentPitch = THREE.MathUtils.lerp(this.currentPitch, this.pitch, 0.25);

    // 2. Compute movement intent vector
    let forward = 0;
    let right = 0;

    // Keyboard W/A/S/D
    if (this.keys['KeyW'] || this.keys['ArrowUp']) forward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) forward -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) right -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) right += 1;

    // Tablet Joystick
    if (this.touchInput.moveY !== 0) forward -= this.touchInput.moveY; // joystick up is negative Y
    if (this.touchInput.moveX !== 0) right += this.touchInput.moveX;

    const isRunning = this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.touchInput.isRunning;
    const baseSpeed = isRunning ? GameConfig.player.runSpeed : GameConfig.player.walkSpeed;

    const moveDir = new THREE.Vector3();
    if (forward !== 0 || right !== 0) {
      // Relative to camera yaw
      const forwardVec = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.currentYaw);
      const rightVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.currentYaw);

      moveDir.addScaledVector(forwardVec, forward);
      moveDir.addScaledVector(rightVec, right);
      moveDir.normalize();

      // Rotate avatar to face direction of movement smoothly
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      this.avatar.mesh.rotation.y = THREE.MathUtils.lerp(this.avatar.mesh.rotation.y, targetAngle, 0.2);
      this.currentSpeed = baseSpeed;
      this.velocity.x = moveDir.x * this.currentSpeed;
      this.velocity.z = moveDir.z * this.currentSpeed;
    } else {
      this.currentSpeed = 0;
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // 3. Movement with Collision Resolution
    const deltaMove = moveDir.clone().multiplyScalar(this.currentSpeed * delta);
    const radius = GameConfig.player.radius;

    const resolvedPos = collisionWorld.resolveMovement(this.position, deltaMove, radius, GameConfig.player.height);
    this.position.copy(resolvedPos);

    // Gravity / Jumping
    if (!this.isGrounded) {
      this.velocity.y -= 15.0 * delta;
      this.position.y += this.velocity.y * delta;
      if (this.position.y <= 0) {
        this.position.y = 0;
        this.velocity.y = 0;
        this.isGrounded = true;
      }
    }

    // Update avatar mesh position and walking cycle
    this.avatar.mesh.position.copy(this.position);
    this.avatar.updateAnimation(this.currentSpeed, delta);

    // 4. Update Third-Person Camera
    this.updateCamera();
  }

  public setLookOrientation(yaw: number, pitch: number = 0.22) {
    this.yaw = yaw;
    this.currentYaw = yaw;
    this.pitch = pitch;
    this.currentPitch = pitch;
    this.clampPitch();
    this.updateCamera();
  }

  private updateCamera() {
    if (this.viewMode === 'firstPerson') {
      // First Person View: Camera is positioned at caregiver eye level
      this.avatar.setFirstPersonVisibility(this.avatar.isHoldingWheelchair);

      const eyeHeight = GameConfig.player.eyeHeight;
      const eyePos = this.position.clone().add(new THREE.Vector3(0, eyeHeight, 0));
      this.camera.position.copy(eyePos);

      // Compute look forward direction based on currentYaw and currentPitch
      const cosPitch = Math.cos(this.currentPitch);
      const sinPitch = Math.sin(this.currentPitch);
      const sinYaw = Math.sin(this.currentYaw);
      const cosYaw = Math.cos(this.currentYaw);

      // Look direction vector: yaw 0 is looking towards negative Z (North/South)
      const lookDir = new THREE.Vector3(
        -sinYaw * cosPitch,
        sinPitch,
        -cosYaw * cosPitch
      );

      const lookTarget = eyePos.clone().add(lookDir);
      this.camera.lookAt(lookTarget);
    } else {
      // Third Person View
      this.avatar.setThirdPersonVisibility();

      const target = this.position.clone().add(new THREE.Vector3(0, 1.4, 0)); // look at caregiver upper torso/head

      // Compute ideal camera position in spherical coordinates relative to target
      const cosPitch = Math.cos(this.currentPitch);
      const sinPitch = Math.sin(this.currentPitch);
      const sinYaw = Math.sin(this.currentYaw);
      const cosYaw = Math.cos(this.currentYaw);

      let dist = this.cameraDistance;

      // Check collision along camera ray to prevent outside wall clipping
      const rayDir = new THREE.Vector3(sinYaw * cosPitch, sinPitch, cosYaw * cosPitch).normalize();
      const desiredCamPos = target.clone().add(rayDir.clone().multiplyScalar(dist));

      // Collision check: if desiredCamPos intersects obstacle or building ceiling, clamp distance
      let clampedCamPos = desiredCamPos;
      const testSteps = 10;
      for (let step = 1; step <= testSteps; step++) {
        const t = step / testSteps;
        const testPos = target.clone().add(rayDir.clone().multiplyScalar(dist * t));
        if (testPos.y >= GameConfig.facility.ceilingHeight - 0.15) {
          testPos.y = GameConfig.facility.ceilingHeight - 0.15;
        }
        if (collisionWorld.checkCollision(testPos, 0.25, 0.4)) {
          // Step back slightly from collision point
          const safeDist = Math.max(GameConfig.camera.minDistance, dist * ((step - 1) / testSteps));
          clampedCamPos = target.clone().add(rayDir.clone().multiplyScalar(safeDist));
          break;
        }
      }

      this.camera.position.lerp(clampedCamPos, 0.35);
      this.camera.lookAt(target);
    }
  }
}
