/**
 * Shared walk / turn input for keyboard + virtual D-pad.
 * Mutable module state is read every frame (no React re-renders).
 *
 * Keyboard and virtual sources are OR'd so releasing one path
 * does not clear the other (hybrid laptop + touch).
 *
 * Keyboard A/D remain discrete yaw steps in FirstPersonCamera;
 * virtual ←→ set turnLeft/turnRight for continuous hold-to-turn.
 */

export type InputAxes = {
  forward: boolean;
  back: boolean;
  /** Virtual D-pad only — continuous yaw while held */
  turnLeft: boolean;
  turnRight: boolean;
};

const keyboard = {
  forward: false,
  back: false,
};

const virtual = {
  forward: false,
  back: false,
  turnLeft: false,
  turnRight: false,
};

export function getInputAxes(): InputAxes {
  return {
    forward: keyboard.forward || virtual.forward,
    back: keyboard.back || virtual.back,
    turnLeft: virtual.turnLeft,
    turnRight: virtual.turnRight,
  };
}

export function setKeyboardMove(dir: "forward" | "back", pressed: boolean): void {
  keyboard[dir] = pressed;
}

export function setVirtualMove(dir: "forward" | "back", pressed: boolean): void {
  virtual[dir] = pressed;
}

export function setVirtualTurn(dir: "left" | "right", pressed: boolean): void {
  if (dir === "left") virtual.turnLeft = pressed;
  else virtual.turnRight = pressed;
}

export function resetInput(): void {
  keyboard.forward = false;
  keyboard.back = false;
  virtual.forward = false;
  virtual.back = false;
  virtual.turnLeft = false;
  virtual.turnRight = false;
}

/** True when primary input is coarse (phones / tablets) — show D-pad, drag look. */
export function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return navigator.maxTouchPoints > 0;
  }
}

/** Prefer landscape; portrait still playable with a soft hint. */
export function isPortrait(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(orientation: portrait)").matches;
  } catch {
    return window.innerHeight > window.innerWidth;
  }
}
