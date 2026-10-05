/**
 * FloorPlanOverlay.tsx
 * High-precision 2D architectural floor-plan overlay & mini-map.
 * Renders the 18m x 14m Kaigo facility layout via SVG with:
 * - Real-time player position beacon and vision cone (direction of view)
 * - Active room highlight and bilingual room labeling
 * - Click-to-teleport interactivity
 * - Minimizable corner widget and expandable full-plan blueprint view
 */

import React, { useState } from 'react';
import { Game } from '../core/Game.ts';
import { RoomDefinition, FACILITY_ROOMS, DOOR_OPENINGS } from '../world/FacilityLayout.ts';
import { Maximize2, Minimize2, Map, Navigation, X } from 'lucide-react';

interface FloorPlanOverlayProps {
  game: Game;
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  currentRoom?: RoomDefinition;
}

export const FloorPlanOverlay: React.FC<FloorPlanOverlayProps> = ({
  game,
  playerPos,
  playerYaw,
  currentRoom,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // SVG coordinate system mapping:
  // World bounds: X: -9.2 to +9.2 (18.4m), Z: -7.2 to +7.2 (14.4m)
  // In SVG: x = world X, y = world Z
  const viewBox = '-9.4 -7.4 18.8 14.8';

  // Vision cone direction
  // Look direction: dirX = -sin(yaw), dirZ = -cos(yaw)
  const coneLength = 2.4;
  const fovAngle = 0.55; // ~32 degrees half-angle
  const forwardX = -Math.sin(playerYaw);
  const forwardZ = -Math.cos(playerYaw);

  const leftConeX = -Math.sin(playerYaw - fovAngle) * coneLength;
  const leftConeZ = -Math.cos(playerYaw - fovAngle) * coneLength;
  const rightConeX = -Math.sin(playerYaw + fovAngle) * coneLength;
  const rightConeZ = -Math.cos(playerYaw + fovAngle) * coneLength;

  const conePath = `M ${playerPos.x} ${playerPos.z} L ${playerPos.x + leftConeX} ${playerPos.z + leftConeZ} A ${coneLength} ${coneLength} 0 0 1 ${playerPos.x + rightConeX} ${playerPos.z + rightConeZ} Z`;

  const renderFloorPlanSVG = (expanded: boolean) => (
    <svg
      viewBox={viewBox}
      className="w-full h-full select-none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Subtle grid pattern for architectural feel */}
        <pattern id="archGrid" width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#334155" strokeWidth="0.02" opacity="0.4" />
        </pattern>

        {/* Player vision cone gradient */}
        <radialGradient id="visionGrad" cx="0%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
        </radialGradient>

        {/* Active room glow */}
        <filter id="activeGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="0.15" floodColor="#38BDF8" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* Exterior Ground Backdrop */}
      <rect x="-9.3" y="-7.3" width="18.6" height="14.6" fill="#0F172A" rx="0.3" stroke="#475569" strokeWidth="0.08" />
      <rect x="-9.3" y="-7.3" width="18.6" height="14.6" fill="url(#archGrid)" />

      {/* Facility Rooms */}
      {FACILITY_ROOMS.map((room) => {
        const x = room.min.x;
        const y = room.min.z;
        const w = room.max.x - room.min.x;
        const h = room.max.z - room.min.z;
        const isCurrent = currentRoom?.id === room.id;

        return (
          <g
            key={room.id}
            onClick={() => game.teleportToRoom(room.id)}
            className="cursor-pointer transition-all group"
          >
            {/* Room Area Rectangle */}
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={isCurrent ? '#1E293B' : '#182234'}
              stroke={isCurrent ? '#38BDF8' : '#334155'}
              strokeWidth={isCurrent ? '0.08' : '0.04'}
              filter={isCurrent ? 'url(#activeGlow)' : undefined}
              className="hover:fill-slate-800 transition-colors"
            />

            {/* Room Title Text */}
            <text
              x={room.center.x}
              y={room.center.z - (expanded ? 0.35 : 0.2)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isCurrent ? '#38BDF8' : '#F1F5F9'}
              fontSize={expanded ? '0.42' : '0.36'}
              fontWeight="bold"
              className="pointer-events-none"
            >
              {room.nameJa}
            </text>

            {/* Room Subtitle */}
            <text
              x={room.center.x}
              y={room.center.z + (expanded ? 0.25 : 0.18)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isCurrent ? '#7DD3FC' : '#94A3B8'}
              fontSize={expanded ? '0.24' : '0.20'}
              fontWeight="medium"
              className="pointer-events-none"
            >
              {room.nameEn}
            </text>
          </g>
        );
      })}

      {/* Door Openings Markers */}
      {DOOR_OPENINGS.map((door, idx) => {
        const isZ = door.axis === 'z';
        const dw = isZ ? 0.16 : door.width;
        const dh = isZ ? door.width : 0.16;

        return (
          <g key={idx} className="pointer-events-none">
            {/* Clear door gap */}
            <rect
              x={door.center.x - dw / 2}
              y={door.center.z - dh / 2}
              width={dw}
              height={dh}
              fill="#F59E0B"
              opacity="0.8"
            />
          </g>
        );
      })}

      {/* North Compass Arrow */}
      <g transform="translate(8.2, -6.2)" className="pointer-events-none">
        <circle cx="0" cy="0" r="0.6" fill="#1E293B" stroke="#475569" strokeWidth="0.04" />
        <path d="M 0 -0.45 L 0.2 0.35 L 0 0.18 L -0.2 0.35 Z" fill="#EF4444" />
        <text x="0" y="-0.15" textAnchor="middle" fill="#FFFFFF" fontSize="0.22" fontWeight="bold">N</text>
      </g>

      {/* Player Vision Cone */}
      <path
        d={conePath}
        fill="url(#visionGrad)"
        className="pointer-events-none transition-all duration-75"
      />

      {/* Real-time Player Position Beacon */}
      <g
        transform={`translate(${playerPos.x}, ${playerPos.z})`}
        className="pointer-events-none"
      >
        {/* Radar Pulse Wave */}
        <circle cx="0" cy="0" r="0.5" fill="#38BDF8" opacity="0.3" className="animate-ping" />

        {/* Caregiver Dot */}
        <circle cx="0" cy="0" r="0.28" fill="#0284C7" stroke="#FFFFFF" strokeWidth="0.07" />

        {/* Direction Indicator Pointer */}
        <g transform={`rotate(${(playerYaw * 180) / Math.PI + 180})`}>
          <polygon points="0,0.48 -0.15,0.1 0.15,0.1" fill="#F8FAFC" />
        </g>
      </g>
    </svg>
  );

  return (
    <>
      {/* Mini-map Corner Widget (Top Left or Collapsed) */}
      {!isExpanded && (
        <div className="absolute top-20 left-4 z-20 pointer-events-auto flex flex-col gap-1">
          {/* Header Bar */}
          <div className="flex items-center justify-between bg-neutral-900/90 backdrop-blur-md px-3 py-1.5 rounded-t-xl border-t border-x border-neutral-700/80 shadow-lg text-xs font-semibold text-neutral-200">
            <div className="flex items-center gap-1.5">
              <Map className="w-3.5 h-3.5 text-sky-400" />
              <span>フロアマップ / FLOOR PLAN</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand Mini-map' : 'Collapse Mini-map'}
                className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsExpanded(true)}
                title="Full-screen floor plan"
                className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
              </button>
            </div>
          </div>

          {/* Mini-map Body */}
          {!isMinimized && (
            <div className="w-64 h-48 bg-neutral-950/95 backdrop-blur-md rounded-b-xl border-b border-x border-neutral-700/80 p-2 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              {renderFloorPlanSVG(false)}
              <div className="flex items-center justify-between text-[10px] text-neutral-400 px-1 pt-1 border-t border-neutral-800">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>X: {playerPos.x}m, Z: {playerPos.z}m</span>
                </span>
                <span className="text-neutral-500">部屋クリックで移動</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expanded Blueprint Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-lg flex items-center justify-center p-4 sm:p-8 pointer-events-auto">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-wide">
                    施設全体平面図 / FACILITY ARCHITECTURAL FLOOR PLAN
                  </h2>
                  <p className="text-xs text-neutral-400">
                    介護施設 バリアフリー動線 & リアルタイム位置表示 (18m × 14m)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Blueprint Body */}
            <div className="flex-1 p-6 bg-neutral-950 flex items-center justify-center overflow-hidden">
              <div className="w-full max-w-3xl aspect-[18.8/14.8]">
                {renderFloorPlanSVG(true)}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-900/90 flex flex-wrap items-center justify-between text-xs text-neutral-300 gap-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-sky-400" />
                  <span className="font-semibold text-white">現在地:</span>{' '}
                  {currentRoom ? `${currentRoom.nameJa} (${currentRoom.nameEn})` : '施設内'}
                </span>
                <span className="text-neutral-500">|</span>
                <span>座標: X={playerPos.x}m, Z={playerPos.z}m</span>
              </div>
              <div className="text-neutral-400 text-[11px]">
                💡 平面図内の部屋をクリックすると直接テレポートできます
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
