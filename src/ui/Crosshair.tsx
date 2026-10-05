/**
 * Crosshair.tsx
 * FPS / Minecraft-style center-screen crosshair and raycast interaction prompt.
 * Always fixed at the center of the viewport (follows camera look direction).
 * Dynamically reacts when pointing at interactable object parts in valid range.
 */

import React from 'react';
import { ActiveInteractionInfo } from '../interaction/InteractionManager.ts';

interface CrosshairProps {
  activeInteraction: ActiveInteractionInfo | null;
  onTriggerInteraction: () => void;
  isFirstPerson: boolean;
  isMenuOpen?: boolean;
}

export const Crosshair: React.FC<CrosshairProps> = ({
  activeInteraction,
  onTriggerInteraction,
  isFirstPerson,
  isMenuOpen = false,
}) => {
  if (isMenuOpen) {
    return null;
  }

  const hasTarget = activeInteraction !== null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 flex items-center justify-center overflow-hidden">
      {/* Central Reticle Container */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Reticle Graphics */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          {/* Outer Dynamic Target Ring when target detected */}
          {hasTarget && (
            <div className="absolute inset-0 rounded-full border-2 border-sky-400/80 animate-ping opacity-75" />
          )}

          {/* Minimal Crosshair Frame */}
          <div
            className={`relative transition-all duration-150 flex items-center justify-center ${
              hasTarget
                ? 'w-6 h-6 border border-sky-400 rounded-md bg-sky-500/10 shadow-lg shadow-sky-500/30'
                : 'w-4 h-4'
            }`}
          >
            {/* Center Dot */}
            <div
              className={`rounded-full transition-colors duration-150 ${
                hasTarget
                  ? 'w-2 h-2 bg-sky-300 shadow-sm shadow-sky-400'
                  : 'w-1.5 h-1.5 bg-white/80 ring-1 ring-black/40'
              }`}
            />

            {/* Subtle Crosshair Ticks when idle */}
            {!hasTarget && (
              <>
                <div className="absolute -top-1 w-0.5 h-1 bg-white/70" />
                <div className="absolute -bottom-1 w-0.5 h-1 bg-white/70" />
                <div className="absolute -left-1 w-1 h-0.5 bg-white/70" />
                <div className="absolute -right-1 w-1 h-0.5 bg-white/70" />
              </>
            )}
          </div>
        </div>

        {/* Floating Contextual Interaction Prompt (Positioned directly below crosshair) */}
        {hasTarget && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onTriggerInteraction();
            }}
            className="mt-3 pointer-events-auto cursor-pointer animate-in fade-in zoom-in-95 duration-100 flex flex-col items-center"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900/90 hover:bg-neutral-850 border border-sky-400/80 rounded-xl shadow-2xl backdrop-blur-md text-white transition-all active:scale-95 group">
              {/* Key Badge [E] */}
              <span className="flex items-center justify-center w-5 h-5 rounded-md bg-sky-500 text-neutral-950 font-mono text-xs font-black shadow-sm group-hover:bg-sky-400 transition-colors">
                {activeInteraction.key}
              </span>

              {/* Action Label */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold tracking-wide text-white group-hover:text-sky-300 transition-colors">
                  {activeInteraction.label}
                </span>

                {/* State Text if any, e.g. "(Terkunci)" or "(Bebas)" */}
                {activeInteraction.stateText && (
                  <span className="text-xs font-semibold text-amber-300">
                    [{activeInteraction.stateText}]
                  </span>
                )}
              </div>
            </div>

            {/* Subtitle with Object Name & Part Name */}
            <div className="mt-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-md border border-white/10 text-[10px] text-neutral-300 font-medium tracking-wide flex items-center gap-1">
              <span className="text-sky-300">{activeInteraction.objectName}</span>
              <span className="text-neutral-500">•</span>
              <span className="text-neutral-200">{activeInteraction.partName}</span>
              <span className="text-neutral-400 text-[9px] ml-1">({activeInteraction.distance}m)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
