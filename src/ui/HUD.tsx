/**
 * HUD.tsx
 * Clean, modern HUD for the Kaigo 3D Facility prototype.
 * Displays bilingual room indicator, F3 debug telemetry, quick room navigation,
 * 1P/3P view mode switcher, 2D floor-plan overlay, and Locker changing clothes interaction.
 */

import React, { useState } from 'react';
import { RoomDefinition, FACILITY_ROOMS } from '../world/FacilityLayout.ts';
import { FloorPlanOverlay } from './FloorPlanOverlay.tsx';
import { LockerInteractionModal } from './LockerInteractionModal.tsx';
import { Crosshair } from './Crosshair.tsx';
import { OutfitConfig } from '../player/PlayerAvatar.ts';
import { ActiveInteractionInfo } from '../interaction/InteractionManager.ts';
import { Game, GameState, GameUIState } from '../core/Game.ts';
import { GameConfig } from '../core/GameConfig.ts';
import {
  Compass,
  Activity,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  Eye,
  User,
  MapPin,
  CheckCircle2,
  Shirt,
} from 'lucide-react';

interface HUDProps {
  game: Game;
  currentRoom?: RoomDefinition;
  fps: number;
  triangles: number;
  drawCalls: number;
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  viewMode: 'firstPerson' | 'thirdPerson';
  isDebug: boolean;
  isNearLocker: boolean;
  isLockerOpen: boolean;
  isChangingClothesModalOpen: boolean;
  currentOutfit: OutfitConfig;
  activeInteraction: ActiveInteractionInfo | null;
  gameState: GameState;
  isHoldingWheelchair: boolean;
  debugInfo: GameUIState;
}

export const HUD: React.FC<HUDProps> = ({
  game,
  currentRoom,
  fps,
  triangles,
  drawCalls,
  playerPos,
  playerYaw,
  viewMode,
  isDebug,
  isNearLocker,
  isLockerOpen,
  isChangingClothesModalOpen,
  currentOutfit,
  activeInteraction,
  gameState,
  isHoldingWheelchair,
  debugInfo,
}) => {
  const [showTeleportMenu, setShowTeleportMenu] = useState(false);
  const [camDist, setCamDist] = useState(3.8);

  const handleZoom = (delta: number) => {
    const next = Math.max(1.5, Math.min(6.5, camDist + delta));
    setCamDist(next);
    game.setCameraDistance(next);
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 z-20 font-sans">
      {/* FPS Center Crosshair & Raycast Interaction Target Prompt */}
      <Crosshair
        activeInteraction={activeInteraction}
        onTriggerInteraction={() => game.triggerInteraction()}
        isFirstPerson={viewMode === 'firstPerson'}
        isMenuOpen={gameState === 'INTERACTION'}
      />

      {/* Wheelchair Pushing HUD Badge when holding */}
      {isHoldingWheelchair && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900/90 border border-sky-400/80 shadow-2xl backdrop-blur-md text-white text-xs font-semibold animate-in fade-in">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span>
              {debugInfo.wheelchairBraked
                ? 'Rem terkunci: lepas rem (tuas merah) lalu dorong dengan W'
                : 'Sedang Memegang Kursi Roda: dorong dengan W'}
            </span>
            <button
              onClick={() => {
                if (game.heldWheelchair) game.heldWheelchair.toggleHold();
              }}
              className="ml-2 px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 font-mono text-[11px] border border-sky-400/40"
            >
              [E] Lepas
            </button>
          </div>
        </div>
      )}

      {/* 2D Architectural Floor Plan Overlay & Mini-map */}
      <FloorPlanOverlay
        game={game}
        playerPos={playerPos}
        playerYaw={playerYaw}
        currentRoom={currentRoom}
      />

      {/* Locker Clothes Changing Interaction Prompt & Modal */}
      <LockerInteractionModal
        game={game}
        isNearLocker={isNearLocker}
        isLockerOpen={isLockerOpen}
        isModalOpen={isChangingClothesModalOpen}
        currentOutfit={currentOutfit}
      />

      {/* Top Bar */}
      <div className="flex items-start justify-between gap-3 pointer-events-auto">
        {/* Facility Branding & Active Location */}
        <div className="flex flex-col gap-1.5 ml-72 sm:ml-72 transition-all">
          <div className="flex items-center gap-2 bg-neutral-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-neutral-700/60 shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-neutral-200 tracking-wide">
              社会福祉法人 陽だまりの郷 / KAIGO 3D
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Current Room Badge */}
            <div className="flex items-center gap-2.5 bg-neutral-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-neutral-700/80 shadow-xl">
              <MapPin className="w-4 h-4 text-sky-400" />
              <div className="flex flex-col">
                <span className="text-xs text-neutral-400 leading-none">現在地 / LOCATION</span>
                <span className="text-base font-bold text-white tracking-wider">
                  {currentRoom ? currentRoom.nameJa : '施設内 (FACILITY)'}
                  <span className="ml-2 text-xs font-medium text-sky-300">
                    {currentRoom?.nameEn}
                  </span>
                </span>
              </div>
            </div>

            {/* Currently Equipped Uniform Badge (Clickable to change) */}
            <button
              onClick={() => game.openOutfitMenu()}
              title="更衣ロッカーで着替える (Change Clothes)"
              className="flex items-center gap-2 bg-neutral-900/90 hover:bg-neutral-800/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-neutral-700/80 shadow-xl text-left transition-all active:scale-95 group"
            >
              <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 group-hover:bg-sky-500/30 transition-colors">
                <Shirt className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-400 leading-none">着用制服 / UNIFORM</span>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{currentOutfit.nameJa}</span>
                  <span className="text-[9px] px-1 py-0.2 bg-neutral-800 text-sky-300 rounded border border-neutral-700 font-mono">
                    更衣室
                  </span>
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Top Right Controls: 1P/3P View Toggle & Teleport */}
        <div className="flex items-center gap-2">
          {/* 1P / 3P View Mode Toggle Button */}
          <button
            onClick={() => game.toggleViewMode()}
            title="Toggle View Mode (Key V)"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border backdrop-blur-md text-xs font-semibold transition-all shadow-md active:scale-95 ${
              viewMode === 'firstPerson'
                ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-sky-500/20'
                : 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-amber-500/20'
            }`}
          >
            {viewMode === 'firstPerson' ? (
              <>
                <Eye className="w-4 h-4 text-sky-400" />
                <span>一人称 1P (EYE)</span>
              </>
            ) : (
              <>
                <User className="w-4 h-4 text-amber-400" />
                <span>三人称 3P (ORBIT)</span>
              </>
            )}
            <span className="px-1 bg-black/40 rounded text-[10px] text-neutral-300 font-mono">V</span>
          </button>

          {/* Quick Room Teleport Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowTeleportMenu(!showTeleportMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-neutral-900/85 hover:bg-neutral-800 text-neutral-200 rounded-lg border border-neutral-700/70 backdrop-blur-md text-xs font-medium transition-all shadow-md active:scale-95"
            >
              <Compass className="w-4 h-4 text-amber-400" />
              <span>部屋移動 (TELEPORT)</span>
            </button>

            {/* Teleport Dropdown */}
            {showTeleportMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-neutral-900/95 border border-neutral-700 rounded-xl shadow-2xl backdrop-blur-lg p-2 flex flex-col gap-1 max-h-96 overflow-y-auto z-30">
                <div className="text-[10px] font-semibold text-neutral-400 px-2 py-1 tracking-wider uppercase">
                  フロア内 移動先 (FACILITY ROOMS)
                </div>
                {FACILITY_ROOMS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      game.teleportToRoom(r.id);
                      setShowTeleportMenu(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                      currentRoom?.id === r.id
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'text-neutral-300 hover:bg-neutral-800/80'
                    }`}
                  >
                    <div>
                      <span className="font-semibold block">{r.nameJa}</span>
                      <span className="text-[10px] text-neutral-400">{r.nameEn}</span>
                    </div>
                    {currentRoom?.id === r.id ? (
                      <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Position (Locker room spawn) */}
          <button
            onClick={() => game.resetToSpawn()}
            title="Reset position (Key R)"
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900/85 hover:bg-neutral-800 text-neutral-200 rounded-lg border border-neutral-700/70 backdrop-blur-md text-xs font-medium transition-all shadow-md active:scale-95"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">リセット (R)</span>
          </button>

          {GameConfig.debug.enabled && (
            <>
          {/* Debug Mode Toggle (F3) */}
          <button
            onClick={() => game.toggleDebug()}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border backdrop-blur-md text-xs font-medium transition-all shadow-md active:scale-95 ${
              isDebug
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-emerald-500/10'
                : 'bg-neutral-900/85 hover:bg-neutral-800 border-neutral-700/70 text-neutral-300'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>DEBUG (F3)</span>
          </button>
            </>
          )}
        </div>
      </div>

      {/* Center Left: Debug Telemetry Panel (When F3 enabled) */}
      {GameConfig.debug.enabled && isDebug && (
        <div className="self-start mt-20 ml-72 bg-neutral-950/90 border border-neutral-700/80 rounded-xl p-3.5 backdrop-blur-md shadow-2xl text-xs flex flex-col gap-2 min-w-64 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 font-bold text-emerald-400 tracking-wider">
            <span>ENVIRONMENT DEBUG (F3)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
              <span className="text-neutral-400 block">FRAME RATE</span>
              <span className={`text-base font-bold ${fps >= 55 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {fps} <span className="text-xs font-normal text-neutral-500">FPS</span>
              </span>
            </div>

            <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
              <span className="text-neutral-400 block">DRAW CALLS</span>
              <span className="text-base font-bold text-neutral-200">{drawCalls}</span>
            </div>

            <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
              <span className="text-neutral-400 block">TRIANGLES</span>
              <span className="text-base font-bold text-neutral-200">
                {(triangles / 1000).toFixed(1)}k
              </span>
            </div>

            <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
              <span className="text-neutral-400 block">VIEW MODE</span>
              <span className="text-base font-bold text-sky-400 uppercase">
                {viewMode === 'firstPerson' ? '1P First Person' : '3P Third Person'}
              </span>
            </div>
          </div>

          {/* Coordinates */}
          <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800 flex flex-col gap-1 font-mono text-[11px]">
            <span className="text-neutral-400 font-sans text-[10px]">COORDINATES (METERS)</span>
            <div className="flex justify-between text-neutral-200">
              <span>X: <span className="text-amber-300">{playerPos.x}m</span></span>
              <span>Y: <span className="text-emerald-300">{playerPos.y}m</span></span>
              <span>Z: <span className="text-sky-300">{playerPos.z}m</span></span>
            </div>
          </div>

          <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-neutral-200">
            <span className="text-neutral-400">dt</span><span>{debugInfo.dtMs} ms</span>
            <span className="text-neutral-400">state</span><span>{debugInfo.gameState}</span>
            <span className="text-neutral-400">interaction</span><span>{debugInfo.interactionPhase}</span>
            <span className="text-neutral-400">speed</span><span>{debugInfo.playerSpeed} m/s</span>
            <span className="text-neutral-400">wheelchair</span><span>{debugInfo.wheelchairMode}</span>
            <span className="text-neutral-400">phys bodies</span><span>{debugInfo.bodyCount}</span>
          </div>

          <div className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-800">
            • Red wireframes: static collision (AABB)
            <br />
            • Cyan ring: player collider · Yellow/red rings: movable / braked bodies
            <br />
            • Pink lines: velocities + interaction ray
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <div className="flex items-end justify-between gap-4 pointer-events-auto mt-auto">
        {/* Controls legend for desktop */}
        <div className="hidden md:flex items-center gap-2 bg-neutral-900/80 backdrop-blur-md px-3 py-2 rounded-xl border border-neutral-700/60 text-xs text-neutral-300 shadow-lg">
          <span className="px-1.5 py-0.5 bg-neutral-800 rounded font-mono text-[10px] border border-neutral-700">
            W A S D
          </span>
          <span className="text-neutral-400 mr-2">移動 (Move)</span>

          <span className="px-1.5 py-0.5 bg-neutral-800 rounded font-mono text-[10px] border border-neutral-700">
            Shift
          </span>
          <span className="text-neutral-400 mr-2">走る (Run)</span>

          <span className="px-1.5 py-0.5 bg-neutral-800 rounded font-mono text-[10px] border border-neutral-700 text-sky-300 border-sky-500/50">
            E
          </span>
          <span className="text-sky-300 mr-2 font-medium">ロッカー着替え</span>

          <span className="px-1.5 py-0.5 bg-neutral-800 rounded font-mono text-[10px] border border-neutral-700">
            V
          </span>
          <span className="text-neutral-400 mr-2">1P/3P 視点切替</span>

          <span className="px-1.5 py-0.5 bg-neutral-800 rounded font-mono text-[10px] border border-neutral-700">
            Space
          </span>
          <span className="text-neutral-400 mr-2">ジャンプ</span>

          <span className="px-1.5 py-0.5 bg-neutral-800 rounded font-mono text-[10px] border border-neutral-700">
            マウス
          </span>
          <span className="text-neutral-400 mr-2">見回す (Look)</span>

          <span className="px-1.5 py-0.5 bg-neutral-800 rounded font-mono text-[10px] border border-neutral-700">
            F3
          </span>
          <span className="text-neutral-400">デバッグ</span>
        </div>

        {/* Camera Zoom Controls (active in 3P mode) */}
        {viewMode === 'thirdPerson' && (
          <div className="flex items-center gap-1.5 bg-neutral-900/80 backdrop-blur-md p-1.5 rounded-xl border border-neutral-700/60 shadow-lg">
            <button
              onClick={() => handleZoom(-0.5)}
              title="Zoom in"
              className="p-1.5 hover:bg-neutral-800 text-neutral-300 rounded-lg active:scale-95 transition-all"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono text-neutral-400 px-1">
              {camDist.toFixed(1)}m
            </span>
            <button
              onClick={() => handleZoom(0.5)}
              title="Zoom out"
              className="p-1.5 hover:bg-neutral-800 text-neutral-300 rounded-lg active:scale-95 transition-all"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
