/**
 * GameState.ts
 * Explicit game state machine. Each state declares what is allowed, so no
 * system has to combine scattered booleans.
 *
 *   GAMEPLAY    free movement + look, interaction raycast active
 *   INTERACTION a UI interaction (locker menu) owns the screen; cursor visible
 *   PAUSED      tab hidden / suspended; simulation frozen
 */

export type GameState = 'GAMEPLAY' | 'INTERACTION' | 'PAUSED';

export interface GameStateRules {
  movement: boolean;     // player input drives movement
  look: boolean;         // mouse/touch look applies
  pointerLock: boolean;  // clicking the canvas may capture the pointer
  interaction: boolean;  // crosshair raycast + E
  simulate: boolean;     // physics / world advance
  uiActive: boolean;     // an overlay owns the pointer
}

export const GAME_STATE_RULES: Readonly<Record<GameState, GameStateRules>> = {
  GAMEPLAY: { movement: true, look: true, pointerLock: true, interaction: true, simulate: true, uiActive: false },
  INTERACTION: { movement: false, look: false, pointerLock: false, interaction: false, simulate: true, uiActive: true },
  PAUSED: { movement: false, look: false, pointerLock: false, interaction: false, simulate: false, uiActive: false },
};

const ALLOWED: Readonly<Record<GameState, readonly GameState[]>> = {
  GAMEPLAY: ['INTERACTION', 'PAUSED'],
  INTERACTION: ['GAMEPLAY', 'PAUSED'],
  PAUSED: ['GAMEPLAY', 'INTERACTION'],
};

export class GameStateMachine {
  private current: GameState = 'GAMEPLAY';
  private resumeTarget: GameState = 'GAMEPLAY';

  /** Fired after every successful transition. */
  public onChange?: (next: GameState, prev: GameState) => void;

  public get state(): GameState {
    return this.current;
  }

  public get rules(): GameStateRules {
    return GAME_STATE_RULES[this.current];
  }

  public is(state: GameState): boolean {
    return this.current === state;
  }

  /** Returns false (and does nothing) for a disallowed or redundant transition. */
  public transition(next: GameState): boolean {
    if (next === this.current || !ALLOWED[this.current].includes(next)) return false;
    const prev = this.current;
    if (next === 'PAUSED') this.resumeTarget = prev;
    this.current = next;
    this.onChange?.(next, prev);
    return true;
  }

  public pause(): boolean {
    return this.transition('PAUSED');
  }

  /** Leaves PAUSED, returning to the state it interrupted. */
  public resume(): boolean {
    return this.is('PAUSED') && this.transition(this.resumeTarget);
  }
}
