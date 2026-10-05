/**
 * Door.ts
 * Barrier-free Japanese sliding care door with natural wood finish,
 * aluminum top track, vertical accessibility handle, and bilingual room sign.
 * Supports FPS Raycast interaction to open/close sliding doors.
 */

import * as THREE from 'three';
import { materials } from '../world/Materials.ts';
import { createRoomSign } from './RoomSign.ts';
import { InteractionManager } from '../interaction/InteractionManager.ts';
import { soundManager } from '../utils/AudioEffects.ts';

export interface DoorOptions {
  position: THREE.Vector3;
  width?: number;
  height?: number;
  rotationY?: number; // 0 = along X axis, Math.PI/2 = along Z axis
  isOpen?: boolean;
  titleJa?: string;
  subtitleEn?: string;
  accentColor?: string;
  interactionManager?: InteractionManager;
  doorId?: string;
}

export class DoorInstance {
  public readonly group: THREE.Group = new THREE.Group();
  public isOpen: boolean = true;
  private doorPanel: THREE.Mesh;
  private handleMesh: THREE.Mesh;
  private doorPanelW: number;
  private openOffset: number;

  constructor(options: DoorOptions) {
    const width = options.width ?? 0.95;
    const height = options.height ?? 2.1;
    const frameThick = 0.16;
    const postThick = 0.08;
    this.isOpen = options.isOpen !== false;

    // 1. Door frame top header
    const headerGeo = new THREE.BoxGeometry(width + postThick * 2, 0.08, frameThick);
    const headerMesh = new THREE.Mesh(headerGeo, materials.get('woodLight'));
    headerMesh.position.set(0, height + 0.04, 0);
    headerMesh.castShadow = true;
    this.group.add(headerMesh);

    // 2. Left side frame post
    const postGeo = new THREE.BoxGeometry(postThick, height, frameThick);
    const leftPost = new THREE.Mesh(postGeo, materials.get('woodLight'));
    leftPost.position.set(-width / 2 - postThick / 2, height / 2, 0);
    leftPost.castShadow = true;
    this.group.add(leftPost);

    // 3. Right side frame post
    const rightPost = new THREE.Mesh(postGeo, materials.get('woodLight'));
    rightPost.position.set(width / 2 + postThick / 2, height / 2, 0);
    rightPost.castShadow = true;
    this.group.add(rightPost);

    // 4. Sliding track on top (aluminum)
    const trackGeo = new THREE.BoxGeometry(width * 1.8, 0.05, 0.04);
    const trackMesh = new THREE.Mesh(trackGeo, materials.get('metalStainless'));
    trackMesh.position.set(width * 0.4, height + 0.07, frameThick / 2 + 0.02);
    this.group.add(trackMesh);

    // 5. Sliding door panel
    this.doorPanelW = width - 0.02;
    const doorPanelH = height - 0.02;
    this.openOffset = this.doorPanelW * 0.85;

    const doorGeo = new THREE.BoxGeometry(this.doorPanelW, doorPanelH, 0.04);
    const doorMat = (materials.get('woodLight') as THREE.MeshStandardMaterial).clone();
    this.doorPanel = new THREE.Mesh(doorGeo, doorMat);

    const initialX = this.isOpen ? this.openOffset : 0;
    this.doorPanel.position.set(initialX, doorPanelH / 2, frameThick / 2 + 0.02);
    this.doorPanel.castShadow = true;
    this.doorPanel.name = 'door_panel';
    this.group.add(this.doorPanel);

    // Vertical accessible grab handle
    const handleGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.6, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xCBD5E1, roughness: 0.3, metalness: 0.8 });
    this.handleMesh = new THREE.Mesh(handleGeo, handleMat);
    this.handleMesh.position.set(initialX - this.doorPanelW * 0.4, 1.0, frameThick / 2 + 0.06);
    this.handleMesh.name = 'door_handle';
    this.group.add(this.handleMesh);

    // 6. Room Sign
    if (options.titleJa) {
      const sign = createRoomSign(
        options.titleJa,
        options.subtitleEn ?? '',
        options.accentColor ?? '#0284C7'
      );
      sign.position.set(-width / 2 - 0.35, 1.8, frameThick / 2 + 0.01);
      this.group.add(sign);
    }

    this.group.position.copy(options.position);
    if (options.rotationY) {
      this.group.rotation.y = options.rotationY;
    }

    // Register Raycast interaction
    if (options.interactionManager) {
      const doorId = options.doorId ?? `door_${Math.round(options.position.x)}_${Math.round(options.position.z)}`;
      options.interactionManager.registerTarget({
        id: doorId,
        type: 'world',
        objectName: options.titleJa ?? 'Pintu Kamar',
        partName: 'Gagang Pintu Geser',
        action: 'toggleDoor',
        label: 'Pintu',
        key: 'E',
        maxDistance: 2.2,
        targetMesh: this.handleMesh,
        highlightMesh: [this.handleMesh, this.doorPanel],
        getStateText: () => (this.isOpen ? 'Terbuka' : 'Tertutup'),
        onInteract: () => {
          this.toggleDoor();
        },
      });
    }
  }

  public toggleDoor() {
    this.isOpen = !this.isOpen;
    const targetX = this.isOpen ? this.openOffset : 0;
    this.doorPanel.position.x = targetX;
    this.handleMesh.position.x = targetX - this.doorPanelW * 0.4;

    if (this.isOpen) {
      soundManager.playLockerOpen();
    } else {
      soundManager.playLockerClose();
    }
  }
}

export function createDoor(options: DoorOptions): THREE.Group {
  const instance = new DoorInstance(options);
  instance.group.userData.doorInstance = instance;
  return instance.group;
}
