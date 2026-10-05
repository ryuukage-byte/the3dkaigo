/**
 * RoomSign.ts
 * Generates crisp bilingual Japanese / English room identification signs
 * using high-resolution offscreen canvas textures on lightweight planes.
 */

import * as THREE from 'three';

export function createRoomSign(
  titleJa: string,
  subtitleEn: string,
  accentColor: string = '#0284C7'
): THREE.Group {
  const group = new THREE.Group();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Background plate (clean off-white hospital style)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 512, 256);

    // Border
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 504, 248);

    // Left accent bar
    ctx.fillStyle = accentColor;
    ctx.fillRect(4, 4, 28, 248);

    // Text: Japanese primary
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 74px "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(titleJa, 56, 100);

    // Text: English secondary
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 36px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(subtitleEn, 56, 175);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Sign face
  const signGeo = new THREE.PlaneGeometry(0.42, 0.21);
  const signMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.3,
    metalness: 0.1,
  });
  const signMesh = new THREE.Mesh(signGeo, signMat);

  // Backing plate
  const backGeo = new THREE.BoxGeometry(0.44, 0.23, 0.015);
  const backMat = new THREE.MeshStandardMaterial({
    color: 0x94A3B8,
    roughness: 0.5,
    metalness: 0.6,
  });
  const backMesh = new THREE.Mesh(backGeo, backMat);
  backMesh.position.z = -0.008;

  group.add(backMesh);
  group.add(signMesh);

  return group;
}
