/**
 * PlayerAvatar.ts
 * Stylized low-poly Japanese caregiver avatar (介護職員アバター).
 * Supports dynamic uniform/clothes changing (着替えシステム) with different
 * shift uniforms, bath-assist aprons, and commuter clothes.
 */

import * as THREE from 'three';
import { materials } from '../world/Materials.ts';

export interface OutfitConfig {
  id: string;
  nameJa: string;
  nameEn: string;
  descriptionJa: string;
  shirtColor: number;
  pantsColor: number;
  shoesColor: number;
  badgeVisible: boolean;
  accentBadgeColor?: number;
}

export const OUTFIT_PRESETS: OutfitConfig[] = [
  {
    id: 'day_shift',
    nameJa: '介護制服・日勤',
    nameEn: 'DAY SHIFT SCRUB',
    descriptionJa: '通所・入所フロアでの通常ケア業務向け標準ポロシャツ',
    shirtColor: 0x38BDF8, // Caregiver sky blue
    pantsColor: 0x334155, // Navy trousers
    shoesColor: 0xFFFFFF, // Clean white nursing shoes
    badgeVisible: true,
  },
  {
    id: 'bath_assist',
    nameJa: '入浴介助エプロン',
    nameEn: 'BATH ASSIST APRON',
    descriptionJa: '浴室・特殊浴槽での介助用防水エプロンスタイル',
    shirtColor: 0x10B981, // Emerald / teal waterproof apron
    pantsColor: 0x1E293B, // Deep dark slate
    shoesColor: 0x0284C7, // Blue non-slip grip clogs
    badgeVisible: true,
  },
  {
    id: 'night_shift',
    nameJa: '夜勤ポロシャツ',
    nameEn: 'NIGHT SHIFT POLO',
    descriptionJa: '夜間巡回・見守り・記録業務向けダークカラー制服',
    shirtColor: 0x1E3A8A, // Deep night navy
    pantsColor: 0x1F2937, // Charcoal slacks
    shoesColor: 0xE2E8F0, // Soft quiet sneakers
    badgeVisible: true,
  },
  {
    id: 'recreation',
    nameJa: '機能訓練・レクウェア',
    nameEn: 'RECREATION & EXERCISE',
    descriptionJa: '体操・レクリエーション・アクティビティ向けウェア',
    shirtColor: 0xF43F5E, // Energetic coral rose
    pantsColor: 0x475569, // Movement track pants
    shoesColor: 0xFFFFFF, // Sport trainers
    badgeVisible: true,
  },
  {
    id: 'commute_casual',
    nameJa: '私服・通勤着',
    nameEn: 'CASUAL COMMUTER',
    descriptionJa: '出勤時・退勤時のリラックス私服スタイル',
    shirtColor: 0xD4B996, // Oatmeal beige casual cardigan
    pantsColor: 0x2563EB, // Denim blue jeans
    shoesColor: 0x78350F, // Leather / casual sneakers
    badgeVisible: false,
  },
];

export class PlayerAvatar {
  public readonly mesh: THREE.Group = new THREE.Group();

  private torsoMesh: THREE.Mesh;
  private headMesh: THREE.Mesh;
  private badgeMesh: THREE.Mesh;
  private leftArmMesh: THREE.Mesh;
  private rightArmMesh: THREE.Mesh;
  private leftLegMesh: THREE.Mesh;
  private rightLegMesh: THREE.Mesh;
  private leftShoeMesh: THREE.Mesh;
  private rightShoeMesh: THREE.Mesh;

  private leftArm: THREE.Group = new THREE.Group();
  private rightArm: THREE.Group = new THREE.Group();
  private leftLeg: THREE.Group = new THREE.Group();
  private rightLeg: THREE.Group = new THREE.Group();

  // Dynamic Materials for clothes
  private shirtMaterial: THREE.MeshStandardMaterial;
  private pantsMaterial: THREE.MeshStandardMaterial;
  private shoesMaterial: THREE.MeshStandardMaterial;

  public currentOutfit: OutfitConfig = OUTFIT_PRESETS[0];
  public isHoldingWheelchair: boolean = false;
  private animTimer: number = 0;

  constructor() {
    const skinMat = materials.get('skinTone');
    const hairMat = materials.get('hairTone');

    // Create unique materials for dynamic outfit changing
    this.shirtMaterial = new THREE.MeshStandardMaterial({
      color: this.currentOutfit.shirtColor,
      roughness: 0.8,
    });
    this.pantsMaterial = new THREE.MeshStandardMaterial({
      color: this.currentOutfit.pantsColor,
      roughness: 0.85,
    });
    this.shoesMaterial = new THREE.MeshStandardMaterial({
      color: this.currentOutfit.shoesColor,
      roughness: 0.6,
    });

    // 1. Torso / Uniform Polo Shirt (Y: 0.85 to 1.35)
    const torsoGeo = new THREE.BoxGeometry(0.38, 0.48, 0.22);
    this.torsoMesh = new THREE.Mesh(torsoGeo, this.shirtMaterial);
    this.torsoMesh.position.y = 1.1;
    this.torsoMesh.castShadow = true;
    this.mesh.add(this.torsoMesh);

    // Name badge on chest
    const badgeGeo = new THREE.BoxGeometry(0.08, 0.05, 0.01);
    this.badgeMesh = new THREE.Mesh(badgeGeo, materials.get('careWhite'));
    this.badgeMesh.position.set(-0.1, 1.22, 0.115);
    this.mesh.add(this.badgeMesh);

    // Polo collar V-notch
    const collarGeo = new THREE.BoxGeometry(0.12, 0.08, 0.01);
    const collar = new THREE.Mesh(collarGeo, skinMat);
    collar.position.set(0, 1.3, 0.115);
    this.mesh.add(collar);

    // 2. Head & Hair (Y: 1.48)
    const headGeo = new THREE.BoxGeometry(0.22, 0.24, 0.22);
    this.headMesh = new THREE.Mesh(headGeo, skinMat);
    this.headMesh.position.y = 1.48;
    this.headMesh.castShadow = true;
    this.mesh.add(this.headMesh);

    // Hair cap
    const hairGeo = new THREE.BoxGeometry(0.24, 0.12, 0.24);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 1.56, -0.01);
    this.mesh.add(hair);

    // 3. Arms
    const armGeo = new THREE.BoxGeometry(0.1, 0.42, 0.1);
    const handGeo = new THREE.BoxGeometry(0.08, 0.1, 0.08);

    // Left arm
    this.leftArmMesh = new THREE.Mesh(armGeo, this.shirtMaterial);
    this.leftArmMesh.position.y = -0.18;
    this.leftArmMesh.castShadow = true;
    this.leftArm.position.set(-0.25, 1.28, 0);
    this.leftArm.add(this.leftArmMesh);

    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.y = -0.42;
    this.leftArm.add(leftHand);
    this.mesh.add(this.leftArm);

    // Right arm
    this.rightArmMesh = new THREE.Mesh(armGeo, this.shirtMaterial);
    this.rightArmMesh.position.y = -0.18;
    this.rightArmMesh.castShadow = true;
    this.rightArm.position.set(0.25, 1.28, 0);
    this.rightArm.add(this.rightArmMesh);

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.y = -0.42;
    this.rightArm.add(rightHand);
    this.mesh.add(this.rightArm);

    // 4. Legs & Shoes
    const legGeo = new THREE.BoxGeometry(0.14, 0.52, 0.14);
    const shoeGeo = new THREE.BoxGeometry(0.14, 0.08, 0.22);

    // Left leg
    this.leftLegMesh = new THREE.Mesh(legGeo, this.pantsMaterial);
    this.leftLegMesh.position.y = -0.24;
    this.leftLegMesh.castShadow = true;
    this.leftLeg.position.set(-0.11, 0.78, 0);
    this.leftLeg.add(this.leftLegMesh);

    this.leftShoeMesh = new THREE.Mesh(shoeGeo, this.shoesMaterial);
    this.leftShoeMesh.position.set(0, -0.52, 0.03);
    this.leftLeg.add(this.leftShoeMesh);
    this.mesh.add(this.leftLeg);

    // Right leg
    this.rightLegMesh = new THREE.Mesh(legGeo, this.pantsMaterial);
    this.rightLegMesh.position.y = -0.24;
    this.rightLegMesh.castShadow = true;
    this.rightLeg.position.set(0.11, 0.78, 0);
    this.rightLeg.add(this.rightLegMesh);

    this.rightShoeMesh = new THREE.Mesh(shoeGeo, this.shoesMaterial);
    this.rightShoeMesh.position.set(0, -0.52, 0.03);
    this.rightLeg.add(this.rightShoeMesh);
    this.mesh.add(this.rightLeg);
  }

  public setOutfit(outfit: OutfitConfig) {
    this.currentOutfit = outfit;
    this.shirtMaterial.color.setHex(outfit.shirtColor);
    this.pantsMaterial.color.setHex(outfit.pantsColor);
    this.shoesMaterial.color.setHex(outfit.shoesColor);
    this.badgeMesh.visible = outfit.badgeVisible;
  }

  public updateAnimation(speed: number, delta: number) {
    if (this.isHoldingWheelchair) {
      // Both arms holding the wheelchair handles forward
      this.leftArm.rotation.x = -Math.PI / 3.4;
      this.rightArm.rotation.x = -Math.PI / 3.4;
      this.leftArm.rotation.z = -0.08;
      this.rightArm.rotation.z = 0.08;
      this.leftArm.rotation.y = 0.04;
      this.rightArm.rotation.y = -0.04;

      if (speed > 0.1) {
        this.animTimer += delta * speed * 6.5;
        const swing = Math.sin(this.animTimer) * 0.4;
        this.leftLeg.rotation.x = swing;
        this.rightLeg.rotation.x = -swing;
        this.torsoMesh.position.y = 1.1 + Math.abs(Math.sin(this.animTimer * 2)) * 0.02;
        this.headMesh.position.y = 1.48 + Math.abs(Math.sin(this.animTimer * 2)) * 0.02;
      } else {
        this.leftLeg.rotation.x *= 0.85;
        this.rightLeg.rotation.x *= 0.85;
        this.torsoMesh.position.y = 1.1;
        this.headMesh.position.y = 1.48;
      }
      return;
    }

    if (speed > 0.1) {
      this.animTimer += delta * speed * 6.5;

      const swing = Math.sin(this.animTimer) * 0.55;
      this.leftArm.rotation.x = -swing;
      this.rightArm.rotation.x = swing;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;

      // Slight bounce
      this.torsoMesh.position.y = 1.1 + Math.abs(Math.sin(this.animTimer * 2)) * 0.03;
      this.headMesh.position.y = 1.48 + Math.abs(Math.sin(this.animTimer * 2)) * 0.03;
    } else {
      // Return smoothly to idle
      this.leftArm.rotation.x *= 0.85;
      this.rightArm.rotation.x *= 0.85;
      this.leftLeg.rotation.x *= 0.85;
      this.rightLeg.rotation.x *= 0.85;
      this.torsoMesh.position.y = 1.1;
      this.headMesh.position.y = 1.48;
    }
  }

  public setFirstPersonVisibility(isHolding: boolean) {
    if (isHolding) {
      this.mesh.visible = true;
      this.headMesh.visible = false;
      this.torsoMesh.visible = false;
      this.badgeMesh.visible = false;
      this.leftLeg.visible = false;
      this.rightLeg.visible = false;
      this.leftArm.visible = true;
      this.rightArm.visible = true;
    } else {
      this.mesh.visible = false;
      this.headMesh.visible = true;
      this.torsoMesh.visible = true;
      this.badgeMesh.visible = this.currentOutfit.badgeVisible;
      this.leftLeg.visible = true;
      this.rightLeg.visible = true;
      this.leftArm.visible = true;
      this.rightArm.visible = true;
    }
  }

  public setThirdPersonVisibility() {
    this.mesh.visible = true;
    this.headMesh.visible = true;
    this.torsoMesh.visible = true;
    this.badgeMesh.visible = this.currentOutfit.badgeVisible;
    this.leftLeg.visible = true;
    this.rightLeg.visible = true;
    this.leftArm.visible = true;
    this.rightArm.visible = true;
  }
}
