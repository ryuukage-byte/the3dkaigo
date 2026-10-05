/**
 * TouchControls.tsx
 * On-screen virtual joystick and camera swipe area for Android tablets, iPads, and mobile.
 * Includes interaction button [E] when a raycast target is in focus.
 */

import React, { useRef, useState } from 'react';
import { PlayerController } from '../player/PlayerController.ts';
import { ActiveInteractionInfo } from '../interaction/InteractionManager.ts';

interface TouchControlsProps {
  player: PlayerController;
  activeInteraction?: ActiveInteractionInfo | null;
  onTriggerInteraction?: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  player,
  activeInteraction,
  onTriggerInteraction,
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isRunning, setIsRunning] = useState(false);

  const touchIdRef = useRef<number | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });

  // Camera look drag tracker
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef({ x: 0, y: 0 });

  const maxRadius = 45; // pixels

  // Joystick touch handlers
  const handleJoystickStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;

    const rect = joystickRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    startPosRef.current = { x: centerX, y: centerY };
    setJoystickActive(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    const dx = clientX - startPosRef.current.x;
    const dy = clientY - startPosRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let clampedX = dx;
    let clampedY = dy;
    if (dist > maxRadius) {
      clampedX = (dx / dist) * maxRadius;
      clampedY = (dy / dist) * maxRadius;
    }

    setKnobPos({ x: clampedX, y: clampedY });

    // Send normalized values (-1 to 1) to player controller
    player.touchInput.moveX = clampedX / maxRadius;
    player.touchInput.moveY = clampedY / maxRadius;
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleJoystickEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setJoystickActive(false);
        setKnobPos({ x: 0, y: 0 });
        player.touchInput.moveX = 0;
        player.touchInput.moveY = 0;
        break;
      }
    }
  };

  // Camera look area handlers (right half of screen)
  const handleLookStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    lookTouchIdRef.current = touch.identifier;
    lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        const deltaX = touch.clientX - lastLookPosRef.current.x;
        const deltaY = touch.clientY - lastLookPosRef.current.y;

        player.touchInput.lookX = deltaX;
        player.touchInput.lookY = deltaY;

        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
        break;
      }
    }
  };

  const handleLookEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        break;
      }
    }
  };

  const toggleRun = () => {
    const next = !isRunning;
    setIsRunning(next);
    player.touchInput.isRunning = next;
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden">
      {/* Right-half Camera Swipe Zone */}
      <div
        className="absolute top-16 right-0 bottom-16 w-1/2 pointer-events-auto touch-none"
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
        onTouchCancel={handleLookEnd}
      />

      {/* Left-bottom Virtual Joystick */}
      <div className="absolute bottom-8 left-8 pointer-events-auto">
        <div
          ref={joystickRef}
          className={`relative w-28 h-28 rounded-full border-2 transition-colors flex items-center justify-center touch-none backdrop-blur-md ${
            joystickActive
              ? 'border-sky-400 bg-sky-950/40 shadow-lg shadow-sky-500/20'
              : 'border-white/20 bg-neutral-900/40'
          }`}
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickMove}
          onTouchEnd={handleJoystickEnd}
          onTouchCancel={handleJoystickEnd}
        >
          {/* Inner Knob */}
          <div
            className={`w-12 h-12 rounded-full shadow-md transition-transform pointer-events-none ${
              joystickActive ? 'bg-sky-400' : 'bg-neutral-300/60'
            }`}
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          />
        </div>
      </div>

      {/* Action buttons (Run toggle & Interaction) */}
      <div className="absolute bottom-8 right-8 flex gap-3 pointer-events-auto items-end">
        {/* Contextual Interaction Button on Touch if target detected */}
        {activeInteraction && (
          <button
            onClick={() => onTriggerInteraction?.()}
            className="px-5 py-3.5 rounded-xl font-bold text-sm tracking-wider bg-sky-500 text-neutral-950 shadow-lg shadow-sky-500/40 border-2 border-white animate-pulse active:scale-90 transition-all flex items-center gap-1.5"
          >
            <span>[E]</span>
            <span>{activeInteraction.label}</span>
          </button>
        )}

        <button
          onClick={toggleRun}
          className={`px-4 py-3 rounded-xl font-medium text-xs tracking-wider transition-all shadow-md ${
            isRunning
              ? 'bg-amber-500 text-neutral-950 shadow-amber-500/30 font-bold'
              : 'bg-neutral-800/80 text-neutral-200 border border-neutral-700/60'
          }`}
        >
          RUN {isRunning ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
};
