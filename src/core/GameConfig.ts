/**
 * GameConfig.ts
 * Central configuration for dimensions, human-scale constants,
 * camera parameters, and performance settings.
 */

export const GameConfig = {
  facility: {
    width: 18.0, // X dimension (meters)
    depth: 14.0, // Z dimension (meters)
    ceilingHeight: 2.5, // 2.5m standard Japanese institutional ceiling
    wallThickness: 0.15, // 0.15m wall thickness
    baseboardHeight: 0.8, // 0.8m lower wall protection strip
    doorWidth: 0.95, // 0.95m wide barrier-free accessible doors
    doorHeight: 2.1, // 2.1m standard door height
    corridorWidth: 1.8, // 1.8m spacious corridor for wheelchair navigation
    handrailHeight: 0.85, // 0.85m Japanese accessibility standard
  },
  player: {
    height: 1.68, // Typical caregiver height (meters)
    eyeHeight: 1.58, // First person camera eye level
    radius: 0.32, // Collision cylinder / box radius
    walkSpeed: 2.4, // m/s (caregiver walking pace)
    runSpeed: 4.2, // m/s (swift response pace)
    jumpVelocity: 4.0,
    spawnPosition: { x: -6.8, y: 0.0, z: -4.8 }, // Inside Locker Room (更衣室)
    spawnRotation: 0, // facing toward corridor
    defaultViewMode: 'firstPerson' as 'firstPerson' | 'thirdPerson',
  },
  camera: {
    defaultDistance: 3.8, // meters behind player in 3P mode
    minDistance: 1.2,
    maxDistance: 6.5,
    defaultHeight: 2.0, // meters above player ground
    fov: 70, // 70 FOV for immersive first-person room inspection
    near: 0.05,
    far: 80.0,
    sensitivity: 0.0025,
  },
  graphics: {
    shadows: true,
    toneMappingExposure: 1.05,
    pixelRatioLimit: 2.0,
  }
};
