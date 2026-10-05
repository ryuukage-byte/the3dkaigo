/**
 * InputManager.ts
 * Single owner of keyboard / mouse / pointer-lock state. Gameplay code only
 * polls it; it never reacts to DOM events itself.
 *
 * - Key state is truthful (keyup is always recorded) and wiped on blur / tab
 *   hide, so a key can never get stuck.
 * - Edge-triggered presses (`wasPressed`) ignore OS key-repeat and live for one
 *   frame; Game calls `endFrame()` after processing.
 * - Mouse-look deltas are accumulated and consumed once per frame.
 * - All listeners are registered once and removed in dispose().
 */

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyR', 'KeyV',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'ShiftLeft', 'ShiftRight', 'F3',
]);

const MAX_MOUSE_DELTA = 250; // pointer-lock sometimes emits one huge spike on lock

export class InputManager {
  private readonly canvas: HTMLCanvasElement;
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();

  private lookX = 0;
  private lookY = 0;
  private wheel = 0;
  private dragging = false;

  private _pointerLocked = false;
  /** Game state decides whether a canvas click may grab the pointer. */
  public pointerLockAllowed = true;

  private readonly cleanups: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.listen(window, 'keydown', this.onKeyDown as EventListener);
    this.listen(window, 'keyup', this.onKeyUp as EventListener);
    this.listen(window, 'blur', this.resetState);
    this.listen(document, 'visibilitychange', () => {
      if (document.hidden) this.resetState();
    });
    this.listen(document, 'pointerlockchange', () => {
      this._pointerLocked = document.pointerLockElement === this.canvas;
      this.dragging = false;
    });
    this.listen(canvas, 'click', () => {
      if (this.pointerLockAllowed && !this._pointerLocked) this.requestPointerLock();
    });
    this.listen(canvas, 'mousedown', ((e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) this.dragging = true;
    }) as EventListener);
    this.listen(window, 'mouseup', () => { this.dragging = false; });
    this.listen(window, 'mousemove', this.onMouseMove as EventListener);
    this.listen(canvas, 'wheel', ((e: WheelEvent) => {
      e.preventDefault();
      this.wheel += e.deltaY;
    }) as EventListener, { passive: false });
    this.listen(canvas, 'contextmenu', ((e: Event) => e.preventDefault()) as EventListener);
  }

  private listen(
    target: EventTarget,
    type: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ) {
    target.addEventListener(type, handler, options);
    this.cleanups.push(() => target.removeEventListener(type, handler, options));
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target)) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    this.down.add(e.code);
    this.pressed.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.down.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this._pointerLocked && !this.dragging) return;
    this.lookX += clamp(e.movementX, MAX_MOUSE_DELTA);
    this.lookY += clamp(e.movementY, MAX_MOUSE_DELTA);
  };

  /** Drops all held keys / pending edges / look deltas. */
  public resetState = () => {
    this.down.clear();
    this.pressed.clear();
    this.lookX = 0;
    this.lookY = 0;
    this.wheel = 0;
    this.dragging = false;
  };

  public isKeyDown(code: string): boolean {
    return this.down.has(code);
  }

  /** True once per physical key press (not on OS auto-repeat). */
  public wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  /** Clears edge-triggered presses. Call once at the end of each frame. */
  public endFrame() {
    this.pressed.clear();
  }

  /** Accumulated mouse-look since the last call, in pixels. */
  public consumeLook(out: { x: number; y: number }) {
    out.x = this.lookX;
    out.y = this.lookY;
    this.lookX = 0;
    this.lookY = 0;
  }

  public consumeWheel(): number {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  public get isPointerLocked(): boolean {
    return this._pointerLocked;
  }

  public requestPointerLock() {
    try {
      const result = this.canvas.requestPointerLock?.() as unknown;
      if (result instanceof Promise) result.catch(() => { /* needs a user gesture; click will retry */ });
    } catch {
      /* ignored: browser refused, the next click retries */
    }
  }

  public exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock?.();
  }

  public dispose() {
    for (const off of this.cleanups) off();
    this.cleanups.length = 0;
    this.resetState();
  }
}

function clamp(v: number, limit: number): number {
  return v > limit ? limit : v < -limit ? -limit : v;
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}
