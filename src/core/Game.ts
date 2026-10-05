/**
 * Game.ts
 * Central coordinator: owns the loop, the state machine, and wires the
 * independent systems together. Systems never talk to each other directly.
 *
 * Frame order
 *   input edges (E / Esc / R / V / F3)  -> state transitions
 *   player.applyLook()                  immediate, un-smoothed mouse look
 *   N x { player.simulate(h); physics.step(h) }   h <= maxStep, frame split evenly
 *   interactions, facility animation, avatar, camera (after physics: no lag)
 *   render, then throttled HUD update
 */

import * as THREE from 'three';
import { Renderer } from './Renderer.ts';
import { SceneManager } from './SceneManager.ts';
import { InputManager } from './InputManager.ts';
import { GameState, GameStateMachine } from './GameState.ts';
import { PlayerController } from '../player/PlayerController.ts';
import { RoomDefinition, FACILITY_ROOMS } from '../world/FacilityLayout.ts';
import { OutfitConfig, OUTFIT_PRESETS } from '../player/PlayerAvatar.ts';
import { soundManager } from '../utils/AudioEffects.ts';
import { ActiveInteractionInfo, InteractionPhase } from '../interaction/InteractionManager.ts';
import { WheelchairInstance } from '../furniture/Wheelchair.ts';
import { collisionWorld } from '../world/CollisionWorld.ts';
import { physicsWorld } from '../physics/PhysicsWorld.ts';
import { GameConfig } from './GameConfig.ts';

export type { GameState };

export interface GameUIState {
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
  gameState: GameState;
  isHoldingWheelchair: boolean;
  // debug telemetry (only meaningful when isDebug)
  dtMs: number;
  playerSpeed: number;
  interactionPhase: InteractionPhase;
  wheelchairMode: string;
  bodyCount: number;
}

export class Game {
  public readonly renderer: Renderer;
  public readonly sceneManager: SceneManager;
  public readonly input: InputManager;
  public readonly player: PlayerController;
  public readonly fsm = new GameStateMachine();

  private isRunning = false;
  private animationFrameId = 0;
  private lastTime = 0;
  private frameDt = 0;

  public heldWheelchair: WheelchairInstance | null = null;

  // Locker / outfit UI
  public isNearLocker = false;
  public isLockerOpen = false;
  public isChangingClothesModalOpen = false;
  public currentOutfit: OutfitConfig = OUTFIT_PRESETS[0];

  public activeInteraction: ActiveInteractionInfo | null = null;

  public onStateUpdate?: (state: GameUIState) => void;
  private uiTimer = 0;
  private uiSignature = '';

  private readonly eye = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    // Shared simulation singletons: start from a clean slate (hot reload / remount safe)
    collisionWorld.clear();
    physicsWorld.clear();

    this.renderer = new Renderer(canvas);
    this.input = new InputManager(canvas);

    this.sceneManager = new SceneManager(
      window.innerWidth / window.innerHeight,
      (wc, isHolding) => this.handleWheelchairHold(wc, isHolding)
    );

    this.player = new PlayerController(this.sceneManager.camera, this.input);
    this.sceneManager.scene.add(this.player.avatar.mesh);
    physicsWorld.setPlayer(this.player);

    this.sceneManager.facility.lockerUnit?.registerInteraction(
      this.sceneManager.interactionManager,
      () => this.openOutfitMenu()
    );

    this.fsm.onChange = (next) => {
      this.input.pointerLockAllowed = this.fsm.rules.pointerLock;
      if (next === 'INTERACTION') this.input.exitPointerLock();
    };

    window.addEventListener('resize', this.onWindowResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.start();
  }

  // ---- loop ------------------------------------------------------------------------

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  public stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  private loop = (now: number) => {
    if (!this.isRunning) return;
    this.animationFrameId = requestAnimationFrame(this.loop);

    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.frame(dt);
  };

  private frame(rawDt: number) {
    // Clamp so a frozen tab / hitch can never launch the simulation
    const dt = Math.min(Math.max(rawDt, 0), GameConfig.loop.maxFrameDelta);
    this.frameDt = dt;
    this.processInput();

    const rules = this.fsm.rules;
    const player = this.player;
    const heldBraked = this.heldWheelchair?.state.brakeLocked ?? false;
    player.movementEnabled = rules.movement;
    player.lookEnabled = rules.look;
    player.jumpEnabled = this.heldWheelchair === null;
    player.speedScale =
      (this.heldWheelchair && !heldBraked ? GameConfig.player.pushSpeedScale : 1) * physicsWorld.playerSpeedFactor;

    if (rules.simulate) {
      player.applyLook();
      this.simulate(dt);
    }

    this.eye.set(player.position.x, player.position.y + GameConfig.player.eyeHeight, player.position.z);
    this.sceneManager.interactionManager.update(dt, this.eye, rules.interaction);
    this.activeInteraction = this.sceneManager.interactionManager.activeInfo;

    if (rules.simulate) {
      this.sceneManager.facility.update(dt);
      player.animate(dt, this.heldWheelchair !== null);
    }
    player.updateCamera(dt);

    const debug = this.sceneManager.debug;
    debug.update(player.position, this.renderer.webgl);
    this.updateLockerProximity();
    if (debug.isEnabled) {
      debug.updateDynamic(
        player,
        physicsWorld.getBodies(),
        this.eye,
        this.sceneManager.interactionManager.activeTarget?.targetMesh ?? null
      );
    }

    this.renderer.webgl.render(this.sceneManager.scene, this.sceneManager.camera);

    this.pushUIState(dt);
    this.input.endFrame();
  }

  /** Advances player + physics in equal sub-steps of at most `maxStep` seconds. */
  private simulate(dt: number) {
    if (dt <= 0) return;
    const steps = Math.max(1, Math.ceil(dt / GameConfig.loop.maxStep));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.player.simulate(h);
      physicsWorld.step(h);
    }
  }

  // ---- input -> state ----------------------------------------------------------------

  private processInput() {
    const input = this.input;
    const state = this.fsm.state;
    if (state === 'PAUSED') return;

    if (input.wasPressed('Escape') && state === 'INTERACTION') {
      this.closeOutfitMenu();
      return;
    }

    if (state !== 'GAMEPLAY') return;

    if (input.wasPressed('Escape') && this.heldWheelchair) this.heldWheelchair.toggleHold();
    if (input.wasPressed('KeyE')) this.triggerInteraction();
    if (input.wasPressed('KeyR')) this.resetToSpawn();
    if (input.wasPressed('KeyV')) this.player.toggleViewMode();
    if (input.wasPressed('F3')) this.toggleDebug();
  }

  // ---- interaction ----------------------------------------------------------------------

  /**
   * Central dispatcher for E / touch button / crosshair click.
   * 'world' targets run immediately; 'ui' targets hand the screen to a menu.
   */
  public triggerInteraction() {
    if (!this.fsm.rules.interaction) return;
    const im = this.sceneManager.interactionManager;

    const target = im.tryInteract();
    if (!target) {
      if (this.isNearLocker && im.phase !== 'ENGAGED') this.openOutfitMenu();
      return;
    }

    if (target.type === 'ui') {
      im.beginEngagement(target);
      target.onInteract();
      // Safety: if the handler did not actually open a UI state, never stay engaged
      if (!this.fsm.is('INTERACTION')) im.endEngagement();
    } else {
      target.onInteract();
      im.refreshActiveTarget();
    }
  }

  /** Wheelchair grip/release (callback from WheelchairInstance.toggleHold). */
  public handleWheelchairHold(wheelchair: WheelchairInstance, isHolding: boolean) {
    if (isHolding) {
      if (this.heldWheelchair && this.heldWheelchair !== wheelchair) {
        this.heldWheelchair.toggleHold(); // release the previous one (re-enters with isHolding=false)
      }
      this.heldWheelchair = wheelchair;
      // The player is walked to the grips by the physics joint, never teleported
      physicsWorld.attachPlayerJoint(
        wheelchair.physicalBody,
        wheelchair.collisionRadius + this.player.radius + 0.04,
        true
      );
      this.player.avatar.isHoldingWheelchair = true;
    } else {
      if (this.heldWheelchair === wheelchair) {
        this.heldWheelchair = null;
        physicsWorld.detachPlayerJoint();
      }
      this.player.avatar.isHoldingWheelchair = this.heldWheelchair !== null;
    }
  }

  public openOutfitMenu() {
    if (!this.fsm.transition('INTERACTION')) return;
    const im = this.sceneManager.interactionManager;
    if (im.phase !== 'ENGAGED') im.beginEngagement(null);

    this.isLockerOpen = true;
    this.isChangingClothesModalOpen = true;
    soundManager.playLockerOpen();
    this.sceneManager.facility.lockerUnit?.setOpen(true);
  }

  /** Idempotent: closing twice (Esc + button) does nothing the second time. */
  public closeOutfitMenu() {
    if (!this.fsm.is('INTERACTION')) return;
    this.fsm.transition('GAMEPLAY');

    this.isLockerOpen = false;
    this.isChangingClothesModalOpen = false;
    this.sceneManager.facility.lockerUnit?.setOpen(false);
    soundManager.playLockerClose();

    this.sceneManager.interactionManager.endEngagement();
    this.input.requestPointerLock(); // falls back to click-to-lock if the browser refuses
  }

  public closeLockerModal() {
    this.closeOutfitMenu();
  }

  public changeOutfit(outfitId: string): boolean {
    const preset = OUTFIT_PRESETS.find((o) => o.id === outfitId);
    if (!preset) return false;
    this.player.avatar.setOutfit(preset);
    this.currentOutfit = preset;
    soundManager.playChangeClothes();
    return true;
  }

  private updateLockerProximity() {
    const p = this.player.position;
    const dx = p.x - -6.8;
    const dz = p.z - -5.9;
    const inLockerRoom = this.sceneManager.debug.activeRoom?.id === 'locker';
    this.isNearLocker = inLockerRoom && Math.hypot(dx, dz) < 2.3 && p.z < -4.8;
  }

  // ---- window / tab ------------------------------------------------------------------------

  private onWindowResize = () => {
    const width = window.innerWidth;
    const height = Math.max(window.innerHeight, 1);
    this.renderer.setSize(width, height);
    this.sceneManager.updateAspectRatio(width / height);
  };

  private onVisibilityChange = () => {
    if (document.hidden) {
      this.input.resetState();
      this.fsm.pause();
    } else {
      this.lastTime = performance.now(); // no catch-up spike
      this.fsm.resume();
    }
  };

  // ---- UI bridge -------------------------------------------------------------------------------

  /** Pushes state to React at a fixed rate, or immediately when something discrete changed. */
  private pushUIState(dt: number) {
    if (!this.onStateUpdate) return;

    const im = this.sceneManager.interactionManager;
    const room = this.sceneManager.debug.activeRoom;
    const a = this.activeInteraction;
    const signature = [
      this.fsm.state,
      a ? `${a.targetId}|${a.label}|${a.stateText ?? ''}` : '-',
      this.isNearLocker ? 1 : 0,
      this.heldWheelchair ? 1 : 0,
      this.player.viewMode,
      this.sceneManager.debug.isEnabled ? 1 : 0,
      room?.id ?? '',
      this.currentOutfit.id,
      im.phase,
    ].join(',');

    this.uiTimer += dt;
    if (signature === this.uiSignature && this.uiTimer < 1 / GameConfig.ui.updateHz) return;
    this.uiTimer = 0;
    this.uiSignature = signature;

    const p = this.player.position;
    const debug = this.sceneManager.debug;
    this.onStateUpdate({
      fps: debug.fps,
      triangles: debug.triangles,
      drawCalls: debug.drawCalls,
      playerPos: { x: Number(p.x.toFixed(2)), y: Number(p.y.toFixed(2)), z: Number(p.z.toFixed(2)) },
      playerYaw: this.player.getYaw(),
      viewMode: this.player.viewMode,
      currentRoom: room,
      isDebug: debug.isEnabled,
      isNearLocker: this.isNearLocker,
      isLockerOpen: this.isLockerOpen,
      isChangingClothesModalOpen: this.isChangingClothesModalOpen,
      currentOutfit: this.currentOutfit,
      activeInteraction: a,
      gameState: this.fsm.state,
      isHoldingWheelchair: this.heldWheelchair !== null,
      dtMs: Number((this.frameDt * 1000).toFixed(1)),
      playerSpeed: Number(this.player.currentSpeed.toFixed(2)),
      interactionPhase: im.phase,
      wheelchairMode: this.heldWheelchair?.mode ?? '-',
      bodyCount: physicsWorld.getBodies().length,
    });
  }

  // ---- public controls used by HUD -------------------------------------------------------------

  public toggleViewMode(): 'firstPerson' | 'thirdPerson' {
    return this.player.toggleViewMode();
  }

  public setViewMode(mode: 'firstPerson' | 'thirdPerson') {
    this.player.setViewMode(mode);
  }

  public toggleDebug(): boolean {
    if (!GameConfig.debug.enabled) return false;
    return this.sceneManager.debug.toggle();
  }

  public teleportToRoom(roomId: string) {
    this.heldWheelchair?.toggleHold();
    const room = FACILITY_ROOMS.find((r) => r.id === roomId);
    if (room) this.player.resetPosition({ x: room.center.x, y: 0, z: room.center.z });
  }

  public resetToSpawn() {
    this.heldWheelchair?.toggleHold();
    this.player.resetPosition();
  }

  public setCameraDistance(distance: number) {
    this.player.cameraDistance = distance;
  }

  public dispose() {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.input.dispose();
    physicsWorld.setPlayer(null);
    physicsWorld.clear();
    collisionWorld.clear();
    this.renderer.webgl.dispose();
  }
}
