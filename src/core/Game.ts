/**
 * Game.ts
 * Central game coordinator connecting Three.js rendering pipeline,
 * player controller, direct physical world interactions, and UI modal state management.
 */

import * as THREE from 'three';
import { Renderer } from './Renderer.ts';
import { SceneManager } from './SceneManager.ts';
import { PlayerController } from '../player/PlayerController.ts';
import { RoomDefinition, FACILITY_ROOMS } from '../world/FacilityLayout.ts';
import { OutfitConfig, OUTFIT_PRESETS } from '../player/PlayerAvatar.ts';
import { soundManager } from '../utils/AudioEffects.ts';
import { ActiveInteractionInfo } from '../interaction/InteractionManager.ts';
import { WheelchairInstance } from '../furniture/Wheelchair.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';
import { physicsWorld } from '../physics/PhysicsWorld.ts';
import { GameConfig } from './GameConfig.ts';

export type GameMode = 'FPS' | 'UI_MENU';

export class Game {
  public readonly renderer: Renderer;
  public readonly sceneManager: SceneManager;
  public readonly player: PlayerController;

  private clock: THREE.Clock = new THREE.Clock();
  private isRunning: boolean = false;
  private animationFrameId: number = 0;

  // Interaction State Machine: 'FPS' vs 'UI_MENU'
  public gameMode: GameMode = 'FPS';

  // Physical World State: Wheelchair being pushed
  public heldWheelchair: WheelchairInstance | null = null;

  // Locker & Changing Clothes Interaction State (UI Interaction)
  public isNearLocker: boolean = false;
  public isLockerOpen: boolean = false;
  public isChangingClothesModalOpen: boolean = false;
  public currentOutfit: OutfitConfig = OUTFIT_PRESETS[0];

  // Active FPS Raycast target
  public activeInteraction: ActiveInteractionInfo | null = null;

  // Real-time state observable by UI
  public onStateUpdate?: (state: {
    fps: number;
    triangles: number;
    drawCalls: number;
    playerPos: { x: number; y: number; z: number };
    playerYaw: number;
    viewMode: 'firstPerson' | 'thirdPerson';
    currentRoom?: RoomDefinition;
    isDebug: boolean;
    isNearLocker: boolean;
    isLockerOpen: boolean;
    isChangingClothesModalOpen: boolean;
    currentOutfit: OutfitConfig;
    activeInteraction: ActiveInteractionInfo | null;
    gameMode: GameMode;
    isHoldingWheelchair: boolean;
  }) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);

    // Initialize SceneManager with wheelchair holding callback
    this.sceneManager = new SceneManager(
      window.innerWidth / window.innerHeight,
      (wc, isHolding) => this.handleWheelchairHold(wc, isHolding)
    );

    // Player Controller
    this.player = new PlayerController(this.sceneManager.camera, canvas);
    this.sceneManager.scene.add(this.player.avatar.mesh);

    // F3 debug key callback
    this.player.onDebugToggle = () => {
      this.toggleDebug();
    };

    // Register locker interaction with Raycast InteractionManager
    this.sceneManager.facility.lockerUnit?.registerInteraction(
      this.sceneManager.interactionManager,
      () => {
        this.openOutfitMenu();
      }
    );

    // Keyboard 'E' and 'Esc' interaction
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('resize', this.onWindowResize);
    this.start();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      if (this.gameMode === 'UI_MENU') {
        this.closeOutfitMenu(false);
        return;
      }
      if (this.heldWheelchair) {
        this.heldWheelchair.toggleHold();
        return;
      }
    }

    if (e.code === 'KeyE') {
      if (this.gameMode === 'FPS') {
        this.triggerInteraction();
      }
    }
  };

  /**
   * Central Interaction Dispatcher:
   * Distinguishes 'world' (direct physical action) vs 'ui' (opens menu modal).
   */
  public triggerInteraction() {
    const target = this.sceneManager.interactionManager.activeTarget;

    if (!target) {
      if (this.isNearLocker) {
        this.openOutfitMenu();
      }
      return;
    }

    if (target.type === 'ui') {
      // 1. UI INTERACTION (e.g. Wardrobe outfit selection)
      // Exit Pointer Lock, show cursor, freeze camera & movement
      this.openOutfitMenu();
    } else {
      // 2. WORLD DIRECT PHYSICAL INTERACTION (Wheelchair handle, brake, door, bed)
      // Execute immediately in FPS context without opening generic popups
      target.onInteract();
      this.sceneManager.interactionManager.refreshActiveTarget();
    }
  }

  /**
   * Wheelchair Physical Push/Hold State Handler
   */
  public handleWheelchairHold(wheelchair: WheelchairInstance, isHolding: boolean) {
    if (isHolding) {
      this.heldWheelchair = wheelchair;

      // 1. Position player directly behind the push handles
      const pushPos = wheelchair.getPlayerPushPosition();
      this.player.position.set(pushPos.x, pushPos.y, pushPos.z);
      this.player.avatar.mesh.position.copy(this.player.position);

      // 2. Align player camera yaw with the wheelchair and angle pitch naturally down at handles
      const pushYaw = wheelchair.getPlayerPushYaw();
      this.player.setLookOrientation(pushYaw, 0.22);

      // 3. Enter wheelchair holding pose (caregiver arms forward onto grips)
      this.player.avatar.isHoldingWheelchair = true;
    } else {
      if (this.heldWheelchair === wheelchair) {
        this.heldWheelchair = null;
      }
      this.player.avatar.isHoldingWheelchair = false;
    }
  }

  /**
   * UI Interaction: Open Outfit Wardrobe Menu
   */
  public openOutfitMenu() {
    this.gameMode = 'UI_MENU';
    this.isLockerOpen = true;
    this.isChangingClothesModalOpen = true;

    // Release pointer lock, show cursor, freeze movement and camera
    this.player.disableControls();
    soundManager.playLockerOpen();
    this.sceneManager.facility.lockerUnit?.setOpen(true);
  }

  /**
   * UI Interaction: Close Outfit Wardrobe Menu and restore FPS state
   */
  public closeOutfitMenu(fromUserClick: boolean = false) {
    this.gameMode = 'FPS';
    this.isLockerOpen = false;
    this.isChangingClothesModalOpen = false;

    this.sceneManager.facility.lockerUnit?.setOpen(false);
    soundManager.playLockerClose();

    // Re-enable player movement & camera look
    // If closed via click gesture, restore Pointer Lock cleanly
    this.player.enableControls(fromUserClick);
  }

  public changeOutfit(outfitId: string): boolean {
    const preset = OUTFIT_PRESETS.find((o) => o.id === outfitId);
    if (!preset) return false;

    this.player.avatar.setOutfit(preset);
    this.currentOutfit = preset;
    soundManager.playChangeClothes();
    return true;
  }

  public closeLockerModal() {
    this.closeOutfitMenu(true);
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.loop();
  }

  public stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  private loop = () => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.loop);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Update player movement and camera
    this.player.update(delta);

    // Update physical wheelchair position when holding & pushing
    if (this.heldWheelchair && this.heldWheelchair.state.isGrabbed) {
      if (this.heldWheelchair.state.brakeLocked) {
        // Brake is locked: wheelchair resists movement completely.
        // Caregiver cannot drag or push it forward. Constrain caregiver to push position:
        const pushPos = this.heldWheelchair.getPlayerPushPosition();
        this.player.position.x = pushPos.x;
        this.player.position.z = pushPos.z;
        this.player.avatar.mesh.position.copy(this.player.position);
      } else {
        // Brake is released: caregiver physically pushes the wheelchair forward/backward/turning
        // Turn wheelchair smoothly toward player's look direction:
        const targetRotY = this.player.getYaw() - Math.PI;
        this.heldWheelchair.group.rotation.y = THREE.MathUtils.lerp(
          this.heldWheelchair.group.rotation.y,
          targetRotY,
          12 * delta
        );

        // Desired position in front of caregiver:
        const forwardVec = new THREE.Vector3(0, 0, -1).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          this.player.getYaw()
        );
        const desiredWcPos = this.player.position.clone().addScaledVector(forwardVec, 0.72);
        desiredWcPos.y = 0;

        // Physical movement delta:
        const deltaMove = desiredWcPos.clone().sub(this.heldWheelchair.group.position);

        // Resolve collision against walls, beds, furniture, doors:
        const resolvedPos = collisionWorld.resolveMovement(
          this.heldWheelchair.group.position,
          deltaMove,
          this.heldWheelchair.collisionRadius,
          this.heldWheelchair.collisionHeight,
          this.heldWheelchair.collisionBoxName
        );

        const actualMove = resolvedPos.clone().sub(this.heldWheelchair.group.position);
        this.heldWheelchair.group.position.copy(resolvedPos);

        // Roll wheels according to movement along forward vector:
        const wcForward = new THREE.Vector3(0, 0, 1).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          this.heldWheelchair.group.rotation.y
        );
        const forwardDistance = actualMove.dot(wcForward);
        this.heldWheelchair.rollWheels(forwardDistance);

        // Speed & moving state:
        const speed = actualMove.length() / Math.max(delta, 0.001);
        this.heldWheelchair.currentSpeed = speed;
        this.heldWheelchair.state.isMoving = speed > 0.05;

        // Keep dynamic collider updated:
        this.heldWheelchair.updateCollider();

        // Physical constraint: if wheelchair hit a wall and was stopped,
        // clamp the caregiver so they cannot push through the wheelchair:
        const pushPos = this.heldWheelchair.getPlayerPushPosition();
        this.player.position.x = pushPos.x;
        this.player.position.z = pushPos.z;
        this.player.avatar.mesh.position.copy(this.player.position);
      }
    }

    // Central PhysicsWorld simulation for all physical movable objects (Chairs, Tables, Wheelchairs)
    physicsWorld.update(
      delta,
      this.player.position,
      this.player.velocity,
      GameConfig.player.radius
    );

    // Update facility interactive elements (smooth locker doors)
    this.sceneManager.facility.update(delta);

    // Update FPS Raycaster when in FPS mode
    if (this.gameMode === 'FPS') {
      this.sceneManager.interactionManager.update();
      this.activeInteraction = this.sceneManager.interactionManager.activeInfo;
    } else {
      this.sceneManager.interactionManager.clearActiveTarget();
      this.activeInteraction = null;
    }

    // Proximity check for staff locker row
    const dx = this.player.position.x - (-6.8);
    const dz = this.player.position.z - (-5.9);
    const distToLocker = Math.sqrt(dx * dx + dz * dz);
    const inLockerRoom = this.sceneManager.debug.activeRoom?.id === 'locker';

    const wasNear = this.isNearLocker;
    this.isNearLocker = inLockerRoom && distToLocker < 2.3 && this.player.position.z < -4.8;

    // Auto-close locker if player walks away
    if (wasNear && !this.isNearLocker && this.isLockerOpen) {
      this.closeOutfitMenu(false);
    }

    // Update debug stats
    this.sceneManager.debug.update(this.player.position, this.renderer.webgl);

    // Render 3D Scene
    this.renderer.webgl.render(this.sceneManager.scene, this.sceneManager.camera);

    // Notify UI listener (HUD)
    if (this.onStateUpdate) {
      this.onStateUpdate({
        fps: this.sceneManager.debug.fps,
        triangles: this.sceneManager.debug.triangles,
        drawCalls: this.sceneManager.debug.drawCalls,
        playerPos: {
          x: Number(this.player.position.x.toFixed(2)),
          y: Number(this.player.position.y.toFixed(2)),
          z: Number(this.player.position.z.toFixed(2)),
        },
        playerYaw: this.player.getYaw(),
        viewMode: this.player.viewMode,
        currentRoom: this.sceneManager.debug.activeRoom,
        isDebug: this.sceneManager.debug.isEnabled,
        isNearLocker: this.isNearLocker,
        isLockerOpen: this.isLockerOpen,
        isChangingClothesModalOpen: this.isChangingClothesModalOpen,
        currentOutfit: this.currentOutfit,
        activeInteraction: this.activeInteraction,
        gameMode: this.gameMode,
        isHoldingWheelchair: Boolean(this.heldWheelchair?.isHolding),
      });
    }
  };

  private onWindowResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.sceneManager.updateAspectRatio(width / height);
  };

  public toggleViewMode(): 'firstPerson' | 'thirdPerson' {
    return this.player.toggleViewMode();
  }

  public setViewMode(mode: 'firstPerson' | 'thirdPerson') {
    this.player.setViewMode(mode);
  }

  public toggleDebug(): boolean {
    return this.sceneManager.debug.toggle();
  }

  public teleportToRoom(roomId: string) {
    if (this.heldWheelchair) {
      this.heldWheelchair.toggleHold();
    }
    const room = FACILITY_ROOMS.find((r) => r.id === roomId);
    if (room) {
      this.player.resetPosition({
        x: room.center.x,
        y: 0,
        z: room.center.z,
      });
    }
  }

  public resetToSpawn() {
    if (this.heldWheelchair) {
      this.heldWheelchair.toggleHold();
    }
    this.player.resetPosition();
  }

  public setCameraDistance(distance: number) {
    this.player.cameraDistance = distance;
  }

  public dispose() {
    this.stop();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.webgl.dispose();
  }
}
