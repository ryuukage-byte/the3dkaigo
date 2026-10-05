/**
 * Renderer.ts
 * WebGLRenderer configuration optimized for lightweight performance on desktop and mobile.
 */

import * as THREE from 'three';
import { GameConfig } from './GameConfig.ts';

export class Renderer {
  public readonly webgl: THREE.WebGLRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.webgl = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });

    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, GameConfig.graphics.pixelRatioLimit));
    this.webgl.setSize(window.innerWidth, window.innerHeight);

    // Color management & tone mapping for clean Japanese institutional lighting
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping;
    this.webgl.toneMappingExposure = GameConfig.graphics.toneMappingExposure;

    if (GameConfig.graphics.shadows) {
      this.webgl.shadowMap.enabled = true;
      this.webgl.shadowMap.type = THREE.PCFSoftShadowMap;
    }
  }

  public setSize(width: number, height: number) {
    this.webgl.setSize(width, height);
  }
}
