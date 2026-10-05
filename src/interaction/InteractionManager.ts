/**
 * InteractionManager.ts
 * Crosshair interaction: finds the interactable in front of the player and
 * hands it to Game when E is pressed.
 *
 * Lifecycle (explicit, one phase at a time):
 *   IDLE     nothing in range / in sight
 *   FOCUSED  crosshair is on a valid target (prompt + highlight shown)
 *   ENGAGED  a UI interaction (e.g. locker menu) is open; raycast suspended
 *
 * Interaction types:
 *   'world'  executes immediately in gameplay (door, brake, wheelchair grip)
 *   'ui'     opens a menu and hands the screen over (state: INTERACTION)
 *
 * Cost control: raycast only against registered interactable roots (never the
 * whole scene), at `rayHz`, and line-of-sight is checked against static
 * collision boxes instead of scene meshes.
 */

import * as THREE from 'three';
import { collisionWorld } from '../world/CollisionWorld.ts';
import { GameConfig } from '../core/GameConfig.ts';

export type InteractionType = 'world' | 'ui';
export type InteractionPhase = 'IDLE' | 'FOCUSED' | 'ENGAGED';

export interface InteractionTarget {
  id: string;
  type: InteractionType;
  objectName: string;    // e.g. "Kursi Roda"
  partName: string;      // e.g. "Pegangan", "Rem"
  action: string;        // e.g. "grab", "brake", "openOutfitMenu"
  label: string;         // e.g. "Pegang", "Rem", "Ganti Outfit"
  key?: string;          // default "E"
  maxDistance: number;   // meters from the player's eye
  targetMesh: THREE.Object3D;
  onInteract: () => void;
  /** Return false to hide the prompt and block E (e.g. wrong side of a wheelchair). */
  canInteract?: () => boolean;
  /** Called when a 'ui' interaction ends (menu closed). */
  exitInteraction?: () => void;
  getStateText?: () => string | undefined;
  highlightMesh?: THREE.Mesh | THREE.Mesh[];
}

export interface ActiveInteractionInfo {
  targetId: string;
  type: InteractionType;
  objectName: string;
  partName: string;
  action: string;
  label: string;
  key: string;
  distance: number;
  stateText?: string;
}

export class InteractionManager {
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndcCenter = new THREE.Vector2(0, 0);
  private readonly targets: InteractionTarget[] = [];
  private roots: THREE.Object3D[] = [];
  private readonly meshToTarget = new Map<THREE.Object3D, InteractionTarget>();

  private _phase: InteractionPhase = 'IDLE';
  public activeTarget: InteractionTarget | null = null;
  public activeInfo: ActiveInteractionInfo | null = null;
  private engagedTarget: InteractionTarget | null = null;

  /** Player's eye position as of the last update (for canInteract checks). */
  public readonly viewerPosition = new THREE.Vector3();

  private rayTimer = 0;
  private cooldown = 0;

  // Highlight swaps in a private clone of the material so shared materials are never mutated
  private highlighted: Array<{ mesh: THREE.Mesh; original: THREE.Material | THREE.Material[] }> = [];
  private readonly highlightClones = new WeakMap<THREE.Mesh, THREE.Material>();

  // scratch
  private readonly dir = new THREE.Vector3();

  public onActiveTargetChange?: (info: ActiveInteractionInfo | null) => void;

  constructor(private readonly camera: THREE.PerspectiveCamera) {
    this.raycaster.far = GameConfig.interaction.reach + 12; // 3P camera sits behind the player
  }

  public get phase(): InteractionPhase {
    return this._phase;
  }

  // ---- registration -----------------------------------------------------------

  public registerTarget(target: InteractionTarget) {
    this.targets.push(target);
    this.roots.push(target.targetMesh);
    target.targetMesh.traverse((child) => this.meshToTarget.set(child, target));
  }

  public unregisterTarget(targetId: string) {
    const idx = this.targets.findIndex((t) => t.id === targetId);
    if (idx === -1) return;
    const target = this.targets[idx];
    this.targets.splice(idx, 1);
    this.roots = this.roots.filter((r) => r !== target.targetMesh);
    target.targetMesh.traverse((child) => this.meshToTarget.delete(child));
    if (this.activeTarget === target) this.clearActiveTarget();
  }

  // ---- per frame ----------------------------------------------------------------

  /**
   * @param dt      frame time
   * @param origin  player's eye position (range + line of sight are measured from here,
   *                which also makes interaction work in third person)
   * @param enabled false while a menu / pause owns the screen
   */
  public update(dt: number, origin: THREE.Vector3, enabled: boolean) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.viewerPosition.copy(origin);

    if (!enabled || this._phase === 'ENGAGED') {
      if (this._phase === 'FOCUSED') this.clearActiveTarget();
      return;
    }

    this.rayTimer -= dt;
    if (this.rayTimer > 0) return;
    this.rayTimer = 1 / GameConfig.interaction.rayHz;

    this.castRay(origin);
  }

  private castRay(origin: THREE.Vector3) {
    if (this.roots.length === 0) {
      this.clearActiveTarget();
      return;
    }

    this.camera.updateMatrixWorld(); // render() has not run yet this frame; do not ray from last frame's view
    this.raycaster.setFromCamera(this.ndcCenter, this.camera);
    const hits = this.raycaster.intersectObjects(this.roots, true);

    for (const hit of hits) {
      const target = this.findTarget(hit.object);
      if (!target) continue;

      const distance = hit.point.distanceTo(origin);
      if (distance > Math.min(target.maxDistance, GameConfig.interaction.reach)) continue;
      if (target.canInteract && !target.canInteract()) continue;

      // Line of sight: static walls / furniture between the eye and the hit point
      this.dir.subVectors(hit.point, origin);
      const len = this.dir.length();
      if (len > 1e-4) {
        this.dir.divideScalar(len);
        if (collisionWorld.raycast(origin, this.dir, len, hit.point) < len - 0.02) continue;
      }

      // First valid hit along the ray wins: the thing directly in front of the crosshair
      this.focus(target, distance);
      return;
    }

    this.clearActiveTarget();
  }

  private findTarget(obj: THREE.Object3D | null): InteractionTarget | null {
    while (obj) {
      const t = this.meshToTarget.get(obj);
      if (t) return t;
      obj = obj.parent;
    }
    return null;
  }

  // ---- focus / highlight ------------------------------------------------------------

  private focus(target: InteractionTarget, distance: number) {
    if (this.activeTarget !== target) {
      this.clearHighlight();
      this.activeTarget = target;
      this._phase = 'FOCUSED';
      this.applyHighlight(target);
    }
    this.refreshInfo(target, distance);
  }

  private refreshInfo(target: InteractionTarget, distance: number) {
    const stateText = target.getStateText ? target.getStateText() : undefined;
    const rounded = Number(distance.toFixed(1));
    const prev = this.activeInfo;
    if (
      prev &&
      prev.targetId === target.id &&
      prev.label === target.label &&
      prev.stateText === stateText &&
      prev.distance === rounded
    ) {
      return; // unchanged: keep identity so the UI does not re-render
    }
    this.activeInfo = {
      targetId: target.id,
      type: target.type,
      objectName: target.objectName,
      partName: target.partName,
      action: target.action,
      label: target.label,
      key: target.key ?? 'E',
      distance: rounded,
      stateText,
    };
    this.onActiveTargetChange?.(this.activeInfo);
  }

  /** Re-reads label/state text of the focused target (call after an interaction changed it). */
  public refreshActiveTarget() {
    if (this.activeTarget && this.activeInfo) this.refreshInfo(this.activeTarget, this.activeInfo.distance);
  }

  public clearActiveTarget() {
    if (this.activeTarget === null && this._phase !== 'FOCUSED') return;
    this.clearHighlight();
    this.activeTarget = null;
    this.activeInfo = null;
    if (this._phase === 'FOCUSED') this._phase = 'IDLE';
    this.onActiveTargetChange?.(null);
  }

  private applyHighlight(target: InteractionTarget) {
    const meshes: THREE.Mesh[] = [];
    if (target.highlightMesh) {
      Array.isArray(target.highlightMesh) ? meshes.push(...target.highlightMesh) : meshes.push(target.highlightMesh);
    } else if (target.targetMesh instanceof THREE.Mesh) {
      meshes.push(target.targetMesh);
    } else {
      target.targetMesh.traverse((c) => { if (c instanceof THREE.Mesh) meshes.push(c); });
    }

    for (const mesh of meshes) {
      const mat = mesh.material;
      if (Array.isArray(mat) || !(mat instanceof THREE.MeshStandardMaterial)) continue;
      let clone = this.highlightClones.get(mesh) as THREE.MeshStandardMaterial | undefined;
      if (!clone) {
        clone = mat.clone();
        clone.emissive.set(0x38bdf8);
        clone.emissiveIntensity = 0.5;
        this.highlightClones.set(mesh, clone);
      }
      this.highlighted.push({ mesh, original: mat });
      mesh.material = clone;
    }
  }

  private clearHighlight() {
    for (const { mesh, original } of this.highlighted) mesh.material = original;
    this.highlighted.length = 0;
  }

  // ---- activation --------------------------------------------------------------------

  /**
   * Called when E is pressed. Returns the focused target if it may be used now
   * (cooldown elapsed, still interactable), else null. Caller executes it.
   */
  public tryInteract(): InteractionTarget | null {
    const target = this.activeTarget;
    if (!target || this._phase !== 'FOCUSED' || this.cooldown > 0) return null;
    if (target.canInteract && !target.canInteract()) return null;
    this.cooldown = GameConfig.interaction.cooldown;
    return target;
  }

  public get coolingDown(): boolean {
    return this.cooldown > 0;
  }

  /** For interactions executed outside tryInteract (Game's hold-release shortcut). */
  public startCooldown() {
    this.cooldown = GameConfig.interaction.cooldown;
  }

  /** A UI interaction took over: stop raycasting, remember what to exit. */
  public beginEngagement(target: InteractionTarget | null) {
    this.clearActiveTarget();
    this.engagedTarget = target;
    this._phase = 'ENGAGED';
  }

  /** The UI interaction ended: back to IDLE and run the target's exit hook once. */
  public endEngagement() {
    if (this._phase !== 'ENGAGED') return;
    const target = this.engagedTarget;
    this.engagedTarget = null;
    this._phase = 'IDLE';
    this.cooldown = GameConfig.interaction.cooldown; // closing with E must not instantly reopen
    this.rayTimer = 0;
    target?.exitInteraction?.();
  }
}
