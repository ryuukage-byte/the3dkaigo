/**
 * Wheelchair.ts
 * Physically interactive Japanese care wheelchair (自走・介助兼用車いす).
 *
 * Physical State:
 * - brakeLocked: controls whether wheelchair resists movement or rolls freely
 * - isGrabbed: player is physically holding and pushing the handles
 * - isMoving: dynamic velocity and wheel roll animation
 *
 * Physical Behaviors:
 * - Direct collision with walls, doors, furniture, and player
 * - Rotational wheels & front castors responding to velocity
 * - Push impulse response when bumped while brake is released
 * - Physical movement constraint when pushed by caregiver
 */

import * as THREE from 'three';
import { materials } from '../world/Materials.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';
import { InteractionManager } from '../interaction/InteractionManager.ts';
import { soundManager } from '../utils/AudioEffects.ts';
import { physicsWorld, PhysicalBody } from '../physics/PhysicsWorld.ts';

export interface WheelchairPhysicalState {
  brakeLocked: boolean;
  isGrabbed: boolean;
  isMoving: boolean;
}

export interface WheelchairOptions {
  position: THREE.Vector3;
  rotationY?: number;
  name?: string;
  interactionManager?: InteractionManager;
  onToggleHold?: (wheelchair: WheelchairInstance, isHolding: boolean) => void;
}

export class WheelchairInstance {
  public readonly group: THREE.Group = new THREE.Group();

  // Internal physical state
  public state: WheelchairPhysicalState = {
    brakeLocked: true,
    isGrabbed: false,
    isMoving: false,
  };

  // Backward compatibility getters/setters
  public get isBrakeLocked(): boolean {
    return this.state.brakeLocked;
  }
  public set isBrakeLocked(val: boolean) {
    this.state.brakeLocked = val;
  }

  public get isHolding(): boolean {
    return this.state.isGrabbed;
  }
  public set isHolding(val: boolean) {
    this.state.isGrabbed = val;
  }

  public isFootrestFolded: boolean = false;
  public onToggleHold?: (wheelchair: WheelchairInstance, isHolding: boolean) => void;

  // Physics properties
  public physicalBody!: PhysicalBody;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public currentSpeed: number = 0;
  public collisionBoxName: string;
  public collisionRadius: number = 0.38;
  public collisionHeight: number = 0.95;

  // Wheel rolling physics
  public wheelAngle: number = 0;
  public castorAngle: number = 0;
  public mainWheelGroups: THREE.Group[] = [];
  public castorWheelGroups: THREE.Group[] = [];

  // Interaction target meshes
  public handleMeshes: THREE.Mesh[] = [];
  public brakeMeshes: THREE.Mesh[] = [];
  public seatMesh!: THREE.Mesh;
  public footrestMeshes: THREE.Mesh[] = [];

  constructor(options: WheelchairOptions) {
    this.collisionBoxName = options.name ?? `wheelchair_${Math.round(options.position.x * 10)}`;
    this.onToggleHold = options.onToggleHold;
    this.build(options);

    // Register with central PhysicsWorld
    this.physicalBody = physicsWorld.register({
      id: this.collisionBoxName,
      name: options.name ?? 'wheelchair',
      group: this.group,
      movable: true,
      mass: 24,
      radius: this.collisionRadius,
      height: this.collisionHeight,
      friction: 0.7,
      restitution: 0.12,
      linearDamping: 4.8,
      angularDamping: 6.0,
      isLocked: () => this.state.brakeLocked || this.state.isGrabbed,
      onMove: (deltaMove, speed) => {
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          this.group.rotation.y
        );
        const distAlongForward = deltaMove.dot(forward);
        this.rollWheels(distAlongForward);
        this.currentSpeed = speed;
        this.state.isMoving = speed > 0.05;
      },
    });
    this.group.userData.physicalBody = this.physicalBody;

    if (options.interactionManager) {
      this.registerInteractions(options.interactionManager, options.name ?? 'wheelchair');
    }
  }

  private build(options: WheelchairOptions) {
    const width = 0.65;
    const depth = 0.95;
    const seatH = 0.45;
    const seatW = 0.44;
    const seatD = 0.42;

    const frameMat = materials.get('metalStainless');
    const tireMat = materials.get('rubberTire');
    const seatMat = materials.get('fabricBlue');
    const darkMetal = materials.get('metalDark');

    // 1. Frame tubular chassis
    const frameGeo = new THREE.BoxGeometry(seatW, 0.03, seatD);
    const frameBase = new THREE.Mesh(frameGeo, frameMat);
    frameBase.position.set(0, seatH - 0.05, 0);
    this.group.add(frameBase);

    // 2. Seat cushion (INTERACTIVE TARGET: SEAT / DUDUKAN)
    const seatGeo = new THREE.BoxGeometry(seatW, 0.06, seatD);
    this.seatMesh = new THREE.Mesh(seatGeo, seatMat.clone());
    this.seatMesh.position.set(0, seatH, 0);
    this.seatMesh.castShadow = true;
    this.seatMesh.name = 'wheelchair_seat';
    this.group.add(this.seatMesh);

    // 3. Backrest
    const backGeo = new THREE.BoxGeometry(seatW, 0.42, 0.04);
    const backMesh = new THREE.Mesh(backGeo, seatMat.clone());
    backMesh.position.set(0, seatH + 0.22, -seatD / 2);
    backMesh.castShadow = true;
    this.group.add(backMesh);

    // 4. Rear Push Handles (INTERACTIVE TARGET: HANDLE / PEGANGAN)
    const handleOffsets = [-seatW * 0.4, seatW * 0.4];
    for (const hx of handleOffsets) {
      const handlePost = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 8), frameMat);
      handlePost.position.set(hx, seatH + 0.26, -seatD / 2 - 0.03);
      this.group.add(handlePost);

      // Grip mesh
      const gripGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.14, 8);
      const gripMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.8 });
      const grip = new THREE.Mesh(gripGeo, gripMat);
      grip.rotation.x = Math.PI / 2;
      grip.position.set(hx, seatH + 0.52, -seatD / 2 - 0.08);
      grip.name = 'wheelchair_handle_grip';
      this.handleMeshes.push(grip);
      this.group.add(grip);
    }

    // 5. Armrests
    for (const ax of [-seatW / 2 - 0.02, seatW / 2 + 0.02]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.02), frameMat);
      post.position.set(ax, seatH + 0.1, 0);
      this.group.add(post);

      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.3), darkMetal);
      pad.position.set(ax, seatH + 0.2, 0);
      this.group.add(pad);
    }

    // 6. Large Rear Wheels (Physically Rotatable Groups)
    const wheelRadius = 0.28;
    const rearZ = -seatD * 0.2;

    for (const side of [-1, 1]) {
      const wx = side * (width / 2);

      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(wx, wheelRadius, rearZ);

      // Tire
      const tireGeo = new THREE.TorusGeometry(wheelRadius, 0.02, 8, 24);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.rotation.y = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Hand rim
      const rimGeo = new THREE.TorusGeometry(wheelRadius * 0.85, 0.01, 8, 24);
      const rim = new THREE.Mesh(rimGeo, frameMat);
      rim.rotation.y = Math.PI / 2;
      rim.position.x = side * 0.025;
      wheelGroup.add(rim);

      // Center Hub
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), frameMat);
      hub.rotation.z = Math.PI / 2;
      wheelGroup.add(hub);

      // Spokes
      for (let angle = 0; angle < Math.PI; angle += Math.PI / 4) {
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, wheelRadius * 1.9, 4), frameMat);
        spoke.rotation.x = angle;
        wheelGroup.add(spoke);
      }

      this.mainWheelGroups.push(wheelGroup);
      this.group.add(wheelGroup);

      // 7. Parking Brake Levers (INTERACTIVE TARGET: BRAKE / REM)
      const brakePivot = new THREE.Group();
      brakePivot.position.set(wx - side * 0.04, wheelRadius + 0.04, rearZ + 0.16);

      const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.05), darkMetal);
      brakePivot.add(clamp);

      const leverMat = new THREE.MeshStandardMaterial({ color: 0xDC2626, roughness: 0.4 });
      const lever = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.025), leverMat);
      lever.position.set(0, 0.06, 0);
      lever.name = `wheelchair_brake_${side < 0 ? 'left' : 'right'}`;
      brakePivot.add(lever);

      this.brakeMeshes.push(lever);
      this.group.add(brakePivot);
    }

    // 8. Front Castors (Physically Rotatable Groups)
    const castorR = 0.06;
    const frontZ = seatD * 0.55;
    for (const side of [-1, 1]) {
      const cx = side * (seatW * 0.42);

      const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), frameMat);
      fork.position.set(cx, castorR + 0.06, frontZ);
      this.group.add(fork);

      const castorGroup = new THREE.Group();
      castorGroup.position.set(cx, castorR, frontZ);

      const cWheel = new THREE.Mesh(new THREE.CylinderGeometry(castorR, castorR, 0.025, 12), tireMat);
      cWheel.rotation.z = Math.PI / 2;
      castorGroup.add(cWheel);

      this.castorWheelGroups.push(castorGroup);
      this.group.add(castorGroup);
    }

    // 9. Footrests / Footplates (INTERACTIVE TARGET: FOOTREST / PIJAKAN)
    const footZ = seatD * 0.72;
    for (const side of [-1, 1]) {
      const fx = side * (seatW * 0.32);

      const legBar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 8), frameMat);
      legBar.rotation.x = -0.3;
      legBar.position.set(fx, 0.2, seatD * 0.52);
      this.group.add(legBar);

      const plateMat = new THREE.MeshStandardMaterial({ color: 0x27272A, roughness: 0.7 });
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.18), plateMat);
      plate.position.set(fx, 0.09, footZ);
      plate.name = `wheelchair_footrest_${side < 0 ? 'left' : 'right'}`;
      this.footrestMeshes.push(plate);
      this.group.add(plate);
    }

    this.group.position.copy(options.position);
    if (options.rotationY) {
      this.group.rotation.y = options.rotationY;
    }

    // Register initial physical collider in CollisionWorld
    this.updateCollider();
  }

  /**
   * Updates physical AABB box collider in CollisionWorld
   */
  public updateCollider() {
    const halfW = 0.65 / 2;
    const halfD = 0.95 / 2;
    const rotY = this.group.rotation.y;
    const extentX = Math.abs(Math.cos(rotY) * halfW) + Math.abs(Math.sin(rotY) * halfD);
    const extentZ = Math.abs(Math.sin(rotY) * halfW) + Math.abs(Math.cos(rotY) * halfD);

    const pos = this.group.position;
    collisionWorld.updateBox(
      this.collisionBoxName,
      new THREE.Vector3(pos.x - extentX, 0, pos.z - extentZ),
      new THREE.Vector3(pos.x + extentX, 0.95, pos.z + extentZ)
    );
  }

  /**
   * Physical wheel rolling animation
   */
  public rollWheels(distanceTraveled: number) {
    if (this.state.brakeLocked || Math.abs(distanceTraveled) < 0.0001) return;

    const mainRadius = 0.28;
    const castorRadius = 0.06;

    const dMainAngle = distanceTraveled / mainRadius;
    const dCastorAngle = distanceTraveled / castorRadius;

    this.wheelAngle += dMainAngle;
    this.castorAngle += dCastorAngle;

    for (const wg of this.mainWheelGroups) {
      wg.rotation.x = this.wheelAngle;
    }
    for (const cg of this.castorWheelGroups) {
      cg.rotation.x = this.castorAngle;
    }
  }

  /**
   * Applies push impulse when physically bumped by the player or other objects
   */
  public applyPushImpulse(impulse: THREE.Vector3) {
    if (this.physicalBody) {
      this.physicalBody.applyImpulse(impulse);
    }
  }

  /**
   * General physics simulation update (synced with PhysicsWorld)
   */
  public updatePhysics(delta: number) {
    if (this.state.isGrabbed) {
      if (this.physicalBody) {
        this.physicalBody.position.copy(this.group.position);
        this.physicalBody.rotationY = this.group.rotation.y;
        this.physicalBody.velocity.set(0, 0, 0);
        this.physicalBody.angularVelocity = 0;
      }
    } else {
      if (this.physicalBody) {
        this.velocity.copy(this.physicalBody.velocity);
        this.currentSpeed = this.physicalBody.velocity.length();
      }
    }

    this.updateCollider();
  }

  /**
   * Position of caregiver hands behind push handles
   */
  public getPlayerPushPosition(): THREE.Vector3 {
    const standOffset = new THREE.Vector3(0, 0, -0.42 / 2 - 0.48);
    standOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
    return this.group.position.clone().add(standOffset);
  }

  public getPlayerPushYaw(): number {
    return this.group.rotation.y + Math.PI;
  }

  public toggleHold() {
    this.state.isGrabbed = !this.state.isGrabbed;
    soundManager.playLockerOpen();
    this.onToggleHold?.(this, this.state.isGrabbed);
  }

  public toggleBrake() {
    this.state.brakeLocked = !this.state.brakeLocked;

    // Physical tilt of brake levers
    for (const b of this.brakeMeshes) {
      b.rotation.x = this.state.brakeLocked ? 0 : -0.45;
    }

    if (this.state.brakeLocked) {
      this.velocity.set(0, 0, 0);
      this.state.isMoving = false;
      soundManager.playLockerClose();
    } else {
      soundManager.playLockerOpen();
    }
  }

  public registerInteractions(manager: InteractionManager, namePrefix: string) {
    // 1. Pegangan / Handle Direct Physical Interaction
    for (let i = 0; i < this.handleMeshes.length; i++) {
      const handle = this.handleMeshes[i];
      manager.registerTarget({
        id: `${namePrefix}_handle_${i}`,
        type: 'world',
        objectName: 'Kursi Roda (Wheelchair)',
        partName: 'Pegangan Belakang',
        action: 'grab',
        label: this.state.isGrabbed ? 'Lepas Pegang' : 'Pegang',
        key: 'E',
        maxDistance: 2.2,
        targetMesh: handle,
        highlightMesh: this.handleMeshes,
        getStateText: () =>
          this.state.isGrabbed
            ? this.state.brakeLocked
              ? 'Dipegang (Rem Terkunci)'
              : 'Dipegang (Siap Didorong)'
            : undefined,
        onInteract: () => {
          this.toggleHold();
        },
      });
    }

    // 2. Rem / Brake Direct Physical Interaction
    for (let i = 0; i < this.brakeMeshes.length; i++) {
      const brake = this.brakeMeshes[i];
      manager.registerTarget({
        id: `${namePrefix}_brake_${i}`,
        type: 'world',
        objectName: 'Kursi Roda (Wheelchair)',
        partName: 'Rem Parkir Roda',
        action: 'brake',
        label: 'Rem',
        key: 'E',
        maxDistance: 2.2,
        targetMesh: brake,
        highlightMesh: this.brakeMeshes,
        getStateText: () => (this.state.brakeLocked ? 'Terkunci (Locked)' : 'Bebas (Released)'),
        onInteract: () => {
          this.toggleBrake();
        },
      });
    }

    // 3. Dudukan / Seat Direct Inspection
    manager.registerTarget({
      id: `${namePrefix}_seat`,
      type: 'world',
      objectName: 'Kursi Roda (Wheelchair)',
      partName: 'Dudukan & Bantalan',
      action: 'inspect',
      label: 'Periksa',
      key: 'E',
      maxDistance: 2.0,
      targetMesh: this.seatMesh,
      highlightMesh: this.seatMesh,
      getStateText: () => 'Bantalan Bersih & Siap',
      onInteract: () => {
        soundManager.playChangeClothes();
      },
    });

    // 4. Pijakan Kaki / Footrest Direct Interaction
    for (let i = 0; i < this.footrestMeshes.length; i++) {
      const footrest = this.footrestMeshes[i];
      manager.registerTarget({
        id: `${namePrefix}_footrest_${i}`,
        type: 'world',
        objectName: 'Kursi Roda (Wheelchair)',
        partName: 'Pijakan Kaki',
        action: 'footrest',
        label: 'Pijakan',
        key: 'E',
        maxDistance: 2.0,
        targetMesh: footrest,
        highlightMesh: this.footrestMeshes,
        getStateText: () => (this.isFootrestFolded ? 'Dilipat (Folded)' : 'Terbuka (Ready)'),
        onInteract: () => {
          this.isFootrestFolded = !this.isFootrestFolded;
          for (const f of this.footrestMeshes) {
            f.rotation.z = this.isFootrestFolded ? Math.PI / 2 : 0;
          }
          soundManager.playLockerClose();
        },
      });
    }
  }
}

export function createWheelchair(options: WheelchairOptions): THREE.Group {
  const instance = new WheelchairInstance(options);
  instance.group.userData.wheelchairInstance = instance;
  return instance.group;
}
