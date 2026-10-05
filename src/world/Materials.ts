/**
 * Materials.ts
 * Centralized, reusable material library for the Japanese Kaigo facility.
 * Enforces low-poly visual discipline: warm off-white, light wood, clean vinyl,
 * muted accents, and stainless steel grab bars.
 */

import * as THREE from 'three';

class MaterialLibrary {
  private materials: Map<string, THREE.Material> = new Map();

  // Procedural canvas textures for subtle institutional finish
  private floorCanvasTexture?: THREE.CanvasTexture;
  private bathTileTexture?: THREE.CanvasTexture;
  private ceilingTileTexture?: THREE.CanvasTexture;

  constructor() {
    this.createProceduralTextures();
    this.initMaterials();
  }

  private createProceduralTextures() {
    // Subtle floor vinyl grain
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 128;
    floorCanvas.height = 128;
    const ctx = floorCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#E8E3DA';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#DFD9CE';
      for (let i = 0; i < 800; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.strokeStyle = 'rgba(180, 172, 160, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, 128, 128);
    }
    this.floorCanvasTexture = new THREE.CanvasTexture(floorCanvas);
    this.floorCanvasTexture.wrapS = THREE.RepeatWrapping;
    this.floorCanvasTexture.wrapT = THREE.RepeatWrapping;
    this.floorCanvasTexture.repeat.set(16, 12);

    // Bathroom non-slip drainage tile texture
    const bathCanvas = document.createElement('canvas');
    bathCanvas.width = 64;
    bathCanvas.height = 64;
    const bctx = bathCanvas.getContext('2d');
    if (bctx) {
      bctx.fillStyle = '#BCC9D4';
      bctx.fillRect(0, 0, 64, 64);
      bctx.strokeStyle = '#94A3B8';
      bctx.lineWidth = 2;
      bctx.strokeRect(0, 0, 64, 64);
      // Small grip dots
      bctx.fillStyle = '#9FB1C1';
      bctx.fillRect(16, 16, 6, 6);
      bctx.fillRect(44, 44, 6, 6);
    }
    this.bathTileTexture = new THREE.CanvasTexture(bathCanvas);
    this.bathTileTexture.wrapS = THREE.RepeatWrapping;
    this.bathTileTexture.wrapT = THREE.RepeatWrapping;
    this.bathTileTexture.repeat.set(6, 6);

    // Ceiling acoustic tiles
    const ceilCanvas = document.createElement('canvas');
    ceilCanvas.width = 64;
    ceilCanvas.height = 64;
    const cctx = ceilCanvas.getContext('2d');
    if (cctx) {
      cctx.fillStyle = '#F4F4F1';
      cctx.fillRect(0, 0, 64, 64);
      cctx.strokeStyle = '#DDD9CE';
      cctx.lineWidth = 1;
      cctx.strokeRect(0, 0, 64, 64);
    }
    this.ceilingTileTexture = new THREE.CanvasTexture(ceilCanvas);
    this.ceilingTileTexture.wrapS = THREE.RepeatWrapping;
    this.ceilingTileTexture.wrapT = THREE.RepeatWrapping;
    this.ceilingTileTexture.repeat.set(18, 14);
  }

  private initMaterials() {
    // Wall materials
    this.materials.set('wallUpper', new THREE.MeshStandardMaterial({
      color: 0xF7F5F0,
      roughness: 0.9,
      metalness: 0.05,
    }));

    this.materials.set('wallLower', new THREE.MeshStandardMaterial({
      color: 0xE2DCD2,
      roughness: 0.85,
      metalness: 0.05,
    }));

    this.materials.set('wallBaseboard', new THREE.MeshStandardMaterial({
      color: 0xC3B9A8,
      roughness: 0.7,
      metalness: 0.1,
    }));

    // Floor materials
    this.materials.set('floorVinyl', new THREE.MeshStandardMaterial({
      map: this.floorCanvasTexture,
      color: 0xF1EDE4,
      roughness: 0.75,
      metalness: 0.05,
    }));

    this.materials.set('floorBath', new THREE.MeshStandardMaterial({
      map: this.bathTileTexture,
      color: 0xCAD6E2,
      roughness: 0.5,
      metalness: 0.1,
    }));

    this.materials.set('floorMat', new THREE.MeshStandardMaterial({
      color: 0x64748B,
      roughness: 0.9,
    }));

    // Ceiling
    this.materials.set('ceiling', new THREE.MeshStandardMaterial({
      map: this.ceilingTileTexture,
      color: 0xFAFAFA,
      roughness: 0.95,
      metalness: 0.0,
    }));

    // Natural Japanese woods
    this.materials.set('woodLight', new THREE.MeshStandardMaterial({
      color: 0xD8B885, // Hinoki / natural birch
      roughness: 0.65,
      metalness: 0.05,
    }));

    this.materials.set('woodMedium', new THREE.MeshStandardMaterial({
      color: 0xB58E5E,
      roughness: 0.6,
      metalness: 0.05,
    }));

    // Metals
    this.materials.set('metalStainless', new THREE.MeshStandardMaterial({
      color: 0xE2E8F0,
      roughness: 0.3,
      metalness: 0.85,
    }));

    this.materials.set('metalDark', new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.45,
      metalness: 0.6,
    }));

    this.materials.set('metalLocker', new THREE.MeshStandardMaterial({
      color: 0xCBD5E1,
      roughness: 0.5,
      metalness: 0.4,
    }));

    // Medical / Care equipment white
    this.materials.set('careWhite', new THREE.MeshStandardMaterial({
      color: 0xF8FAFC,
      roughness: 0.4,
      metalness: 0.1,
    }));

    this.materials.set('mattress', new THREE.MeshStandardMaterial({
      color: 0xE0E7FF, // Soft medical hygiene lavender/blue
      roughness: 0.85,
      metalness: 0.0,
    }));

    this.materials.set('pillow', new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.9,
    }));

    // Upholstery & Accents
    this.materials.set('fabricBlue', new THREE.MeshStandardMaterial({
      color: 0x47708F, // Muted kaigo teal-blue
      roughness: 0.85,
    }));

    this.materials.set('fabricGreen', new THREE.MeshStandardMaterial({
      color: 0x567D68, // Muted sage green
      roughness: 0.85,
    }));

    this.materials.set('fabricBeige', new THREE.MeshStandardMaterial({
      color: 0xD5C7B2,
      roughness: 0.85,
    }));

    // Wheelchair elements
    this.materials.set('wheelchairSeat', new THREE.MeshStandardMaterial({
      color: 0x1E293B, // Durable dark vinyl
      roughness: 0.7,
    }));

    this.materials.set('rubberTire', new THREE.MeshStandardMaterial({
      color: 0x18181B,
      roughness: 0.9,
      metalness: 0.1,
    }));

    // Emergency / Accents
    this.materials.set('emergencyRed', new THREE.MeshStandardMaterial({
      color: 0xDC2626,
      roughness: 0.4,
      metalness: 0.2,
    }));

    this.materials.set('callCordOrange', new THREE.MeshStandardMaterial({
      color: 0xEA580C,
      roughness: 0.5,
    }));

    // Ceramic (Sink & Toilet)
    this.materials.set('ceramic', new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.15,
      metalness: 0.05,
    }));

    // Light fixtures (emissive)
    this.materials.set('ledEmissive', new THREE.MeshStandardMaterial({
      color: 0xFFFAF0,
      emissive: 0xFFF5E4,
      emissiveIntensity: 0.85,
      roughness: 0.2,
    }));

    this.materials.set('exitSignEmissive', new THREE.MeshStandardMaterial({
      color: 0x10B981,
      emissive: 0x059669,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    }));

    // Glass & Windows
    this.materials.set('glass', new THREE.MeshPhysicalMaterial({
      color: 0xE0F2FE,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.7,
      ior: 1.45,
    }));

    // Mirror
    this.materials.set('mirror', new THREE.MeshStandardMaterial({
      color: 0xCBD5E1,
      roughness: 0.1,
      metalness: 0.95,
    }));

    // Player Caregiver Uniform
    this.materials.set('caregiverUniform', new THREE.MeshStandardMaterial({
      color: 0x38BDF8, // Caregiver light cyan / blue polo
      roughness: 0.8,
    }));

    this.materials.set('caregiverPants', new THREE.MeshStandardMaterial({
      color: 0x334155, // Navy navy trousers
      roughness: 0.85,
    }));

    this.materials.set('skinTone', new THREE.MeshStandardMaterial({
      color: 0xF6D5B8,
      roughness: 0.8,
    }));

    this.materials.set('hairTone', new THREE.MeshStandardMaterial({
      color: 0x27272A,
      roughness: 0.9,
    }));

    this.materials.set('shoesTone', new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.6,
    }));
  }

  public get(name: string): THREE.Material {
    const mat = this.materials.get(name);
    if (!mat) {
      console.warn(`Material "${name}" not found in library, using default.`);
      return this.materials.get('wallUpper')!;
    }
    return mat;
  }
}

export const materials = new MaterialLibrary();
