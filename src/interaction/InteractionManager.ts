/**
 * InteractionManager.ts
 * Centralized First-Person Interaction Engine.
 *
 * Distinct Interaction Types:
 * 1. 'world': Direct physical interaction (Wheelchair handle, brake, door, bed, buttons).
 *    - Keeps FPS context, NO popups or generic action menus.
 *    - Executes action directly on [E].
 *
 * 2. 'ui': Interface interaction (Staff Locker wardrobe, settings, custom menus).
 *    - Exits Pointer Lock, shows cursor, freezes FPS controls.
 *    - Restores FPS state cleanly when closed.
 */

import * as THREE from 'three';

export type InteractionType = 'world' | 'ui';

export interface InteractionTarget {
  id: string;
  type: InteractionType; // 'world' | 'ui'
  objectName: string;    // e.g. "Kursi Roda"
  partName: string;      // e.g. "Pegangan", "Rem"
  action: string;        // e.g. "grab", "brake", "openOutfitMenu"
  label: string;         // e.g. "Pegang", "Rem", "Ganti Outfit"
  key?: string;          // default "E"
  maxDistance: number;   // meters (e.g. 2.0m)
  targetMesh: THREE.Object3D;
  onInteract: () => void;
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
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private targets: InteractionTarget[] = [];
  private raycastMeshes: THREE.Object3D[] = [];
  private meshToTargetMap: Map<THREE.Object3D, InteractionTarget> = new Map();

  // Active state
  public activeTarget: InteractionTarget | null = null;
  public activeInfo: ActiveInteractionInfo | null = null;

  // Highlight state
  private currentlyHighlighted: THREE.Mesh[] = [];
  private originalEmissives: Map<THREE.Mesh, { color: THREE.Color; intensity: number }> = new Map();

  // Listeners
  public onActiveTargetChange?: (info: ActiveInteractionInfo | null) => void;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.raycaster.far = 10.0;
  }

  public registerTarget(target: InteractionTarget) {
    this.targets.push(target);
    this.raycastMeshes.push(target.targetMesh);
    this.meshToTargetMap.set(target.targetMesh, target);

    // Map all child meshes for robust hit testing
    target.targetMesh.traverse((child) => {
      this.meshToTargetMap.set(child, target);
      if (!this.raycastMeshes.includes(child)) {
        this.raycastMeshes.push(child);
      }
    });
  }

  public unregisterTarget(targetId: string) {
    const idx = this.targets.findIndex((t) => t.id === targetId);
    if (idx !== -1) {
      const target = this.targets[idx];
      this.targets.splice(idx, 1);
      this.raycastMeshes = this.raycastMeshes.filter((m) => {
        return m !== target.targetMesh && !this.isChildOf(m, target.targetMesh);
      });
      this.meshToTargetMap.delete(target.targetMesh);
      target.targetMesh.traverse((child) => {
        this.meshToTargetMap.delete(child);
      });
    }
  }

  private isChildOf(child: THREE.Object3D, parent: THREE.Object3D): boolean {
    let curr = child.parent;
    while (curr) {
      if (curr === parent) return true;
      curr = curr.parent;
    }
    return false;
  }

  /**
   * Raycast from exact center of camera viewport (0, 0)
   */
  public update() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    if (this.raycastMeshes.length === 0) {
      this.clearActiveTarget();
      return;
    }

    const intersects = this.raycaster.intersectObjects(this.raycastMeshes, true);

    if (intersects.length > 0) {
      let foundTarget: InteractionTarget | null = null;
      let hitDistance = Infinity;

      for (const hit of intersects) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (this.meshToTargetMap.has(obj)) {
            const target = this.meshToTargetMap.get(obj)!;
            if (hit.distance <= target.maxDistance) {
              foundTarget = target;
              hitDistance = hit.distance;
              break;
            }
          }
          obj = obj.parent;
        }
        if (foundTarget) break;
      }

      if (foundTarget) {
        if (this.activeTarget !== foundTarget) {
          this.setActiveTarget(foundTarget, hitDistance);
        } else {
          this.updateActiveInfo(foundTarget, hitDistance);
        }
        return;
      }
    }

    this.clearActiveTarget();
  }

  private setActiveTarget(target: InteractionTarget, distance: number) {
    this.clearHighlight();
    this.activeTarget = target;

    // Apply highlight
    const meshesToHighlight: THREE.Mesh[] = [];
    if (target.highlightMesh) {
      if (Array.isArray(target.highlightMesh)) {
        meshesToHighlight.push(...target.highlightMesh);
      } else {
        meshesToHighlight.push(target.highlightMesh);
      }
    } else if (target.targetMesh instanceof THREE.Mesh) {
      meshesToHighlight.push(target.targetMesh);
    } else {
      target.targetMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) meshesToHighlight.push(child);
      });
    }

    for (const mesh of meshesToHighlight) {
      const mat = mesh.material;
      if (mat instanceof THREE.MeshStandardMaterial) {
        this.originalEmissives.set(mesh, {
          color: mat.emissive.clone(),
          intensity: mat.emissiveIntensity,
        });
        mat.emissive.set(0x38BDF8); // Subtle sky-blue highlight
        mat.emissiveIntensity = 0.5;
        this.currentlyHighlighted.push(mesh);
      }
    }

    this.updateActiveInfo(target, distance);
  }

  private updateActiveInfo(target: InteractionTarget, distance: number) {
    const info: ActiveInteractionInfo = {
      targetId: target.id,
      type: target.type,
      objectName: target.objectName,
      partName: target.partName,
      action: target.action,
      label: target.label,
      key: target.key ?? 'E',
      distance: Number(distance.toFixed(1)),
      stateText: target.getStateText ? target.getStateText() : undefined,
    };
    this.activeInfo = info;
    this.onActiveTargetChange?.(info);
  }

  public refreshActiveTarget() {
    if (this.activeTarget && this.activeInfo) {
      if (this.activeTarget.getStateText) {
        this.activeInfo.stateText = this.activeTarget.getStateText();
      }
      this.activeInfo.label = this.activeTarget.label;
      this.onActiveTargetChange?.({ ...this.activeInfo });
    }
  }

  public clearActiveTarget() {
    if (this.activeTarget !== null) {
      this.clearHighlight();
      this.activeTarget = null;
      this.activeInfo = null;
      this.onActiveTargetChange?.(null);
    }
  }

  public clearHighlight() {
    for (const mesh of this.currentlyHighlighted) {
      const orig = this.originalEmissives.get(mesh);
      if (orig && mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.emissive.copy(orig.color);
        mesh.material.emissiveIntensity = orig.intensity;
      }
    }
    this.currentlyHighlighted = [];
    this.originalEmissives.clear();
  }

  /**
   * Executes the active interaction directly
   */
  public triggerActiveInteraction(): boolean {
    if (this.activeTarget) {
      this.activeTarget.onInteract();
      this.refreshActiveTarget();
      return true;
    }
    return false;
  }
}
