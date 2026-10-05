/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Game, GameUIState } from './core/Game.ts';
import { HUD } from './ui/HUD.tsx';
import { TouchControls } from './ui/TouchControls.tsx';
import { OUTFIT_PRESETS } from './player/PlayerAvatar.ts';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);

  const [gameState, setGameState] = useState<GameUIState>({
    fps: 60,
    triangles: 0,
    drawCalls: 0,
    playerPos: { x: -6.8, y: 0.0, z: -4.8 },
    playerYaw: 0,
    viewMode: 'firstPerson',
    isDebug: false,
    isNearLocker: false,
    isLockerOpen: false,
    isChangingClothesModalOpen: false,
    currentOutfit: OUTFIT_PRESETS[0],
    activeInteraction: null,
    gameState: 'GAMEPLAY',
    isHoldingWheelchair: false,
    wheelchairBraked: false,
    dtMs: 0,
    playerSpeed: 0,
    interactionPhase: 'IDLE',
    wheelchairMode: '-',
    bodyCount: 0,
  });

  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Detect touch device / tablet
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);

    if (!canvasRef.current) return;

    // Initialize 3D Game engine
    const game = new Game(canvasRef.current);
    gameRef.current = game;
    if (import.meta.env.DEV) (window as unknown as { __game?: Game }).__game = game; // dev-only inspection hook

    game.onStateUpdate = (state) => {
      setGameState(state);
    };

    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-neutral-950 font-sans select-none">
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block outline-none cursor-grab active:cursor-grabbing"
      />

      {/* Heads-Up Display */}
      {gameRef.current && (
        <HUD
          game={gameRef.current}
          currentRoom={gameState.currentRoom}
          fps={gameState.fps}
          triangles={gameState.triangles}
          drawCalls={gameState.drawCalls}
          playerPos={gameState.playerPos}
          playerYaw={gameState.playerYaw}
          viewMode={gameState.viewMode}
          isDebug={gameState.isDebug}
          isNearLocker={gameState.isNearLocker}
          isLockerOpen={gameState.isLockerOpen}
          isChangingClothesModalOpen={gameState.isChangingClothesModalOpen}
          currentOutfit={gameState.currentOutfit}
          activeInteraction={gameState.activeInteraction}
          gameState={gameState.gameState}
          isHoldingWheelchair={gameState.isHoldingWheelchair}
          debugInfo={gameState}
        />
      )}

      {/* On-screen touch controls for Android tablets & iPads */}
      {gameRef.current && isTouchDevice && (
        <TouchControls
          player={gameRef.current.player}
          activeInteraction={gameState.activeInteraction}
          onTriggerInteraction={() => gameRef.current?.triggerInteraction()}
        />
      )}
    </div>
  );
}
