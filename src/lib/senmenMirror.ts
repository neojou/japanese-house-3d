/**
 * Senmen vanity-mirror layout helpers (no Vite alias — Node tests import this).
 *
 * House display: worldX = buildingWidth - planX (plan-mirror group).
 * A CubeCamera not under that group MUST use world X. Plan X as world X
 * puts the probe on the opposite side of the lot (outdoor grass in envMap).
 */

export function isInsideAabb2(
  x: number,
  z: number,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  pad = 0,
): boolean {
  return (
    x >= x0 - pad &&
    x <= x1 + pad &&
    z >= z0 - pad &&
    z <= z1 + pad
  );
}

export function senmenProbePlanFrom(
  vanityX: number,
  floorY: number,
  roomZ0: number,
  roomZ1: number,
): { x: number; y: number; z: number } {
  return {
    x: vanityX,
    y: floorY + 1.45,
    z: (roomZ0 + roomZ1) / 2,
  };
}

export function planToWorldXAt(planX: number, buildingWidth: number): number {
  return buildingWidth - planX;
}

/** Look +Z into a north-wall glass (N = −Z) → bounce −Z (south / UB). */
export function expectedMirrorBounceSouth(): readonly [number, number, number] {
  const I = [0, 0, 1] as const;
  const N = [0, 0, -1] as const;
  const idn = I[2] * N[2];
  return [0, 0, I[2] - 2 * idn * N[2]];
}

export function hexEq(a: string, b: string): boolean {
  return a.replace("#", "").toLowerCase() === b.replace("#", "").toLowerCase();
}
