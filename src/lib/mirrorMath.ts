/**
 * Pure planar-mirror math for first-person interior reflection.
 * No WebGL — unit-tested in scripts/verify-mirror-math.mjs.
 */

export type Vec3 = readonly [number, number, number];

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function len(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function normalize(a: Vec3): Vec3 {
  const l = len(a);
  if (l < 1e-12) return [0, 0, 0];
  return scale(a, 1 / l);
}

/** Reflect vector v across plane with unit normal n: v - 2 proj_n v */
export function reflectVector(v: Vec3, nUnit: Vec3): Vec3 {
  return sub(v, scale(nUnit, 2 * dot(v, nUnit)));
}

/**
 * Reflect point p across plane (point on plane M, unit normal n).
 * p' = p - 2 * dot(p - M, n) * n
 */
export function reflectPointAcrossPlane(p: Vec3, planePoint: Vec3, nUnit: Vec3): Vec3 {
  const d = dot(sub(p, planePoint), nUnit);
  return sub(p, scale(nUnit, 2 * d));
}

/**
 * Ensure plane normal points toward the camera half-space
 * (so the viewer is on the +n side of the glass).
 */
export function facingNormal(planePoint: Vec3, nUnit: Vec3, cameraPos: Vec3): Vec3 {
  const toCam = sub(cameraPos, planePoint);
  if (dot(toCam, nUnit) < 0) {
    return scale(nUnit, -1);
  }
  return nUnit;
}

/**
 * Virtual (reflected) camera position for planar mirror.
 */
export function reflectCameraPosition(
  cameraPos: Vec3,
  planePoint: Vec3,
  nUnit: Vec3,
): Vec3 {
  const n = facingNormal(planePoint, nUnit, cameraPos);
  return reflectPointAcrossPlane(cameraPos, planePoint, n);
}

/**
 * Near-plane distance so geometry between virtualCam and the mirror
 * (typically the wall) is clipped. Uses a small pull-back factor.
 */
export function nearPlaneForMirror(
  virtualCamPos: Vec3,
  planePoint: Vec3,
  pullBack = 0.97,
  minNear = 0.08,
): number {
  const dist = len(sub(virtualCamPos, planePoint));
  if (!Number.isFinite(dist) || dist <= 0) return minNear;
  return Math.max(minNear, dist * pullBack);
}

export function almostEqual(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) <= eps;
}

export function vecAlmostEqual(a: Vec3, b: Vec3, eps = 1e-6): boolean {
  return (
    almostEqual(a[0], b[0], eps) &&
    almostEqual(a[1], b[1], eps) &&
    almostEqual(a[2], b[2], eps)
  );
}
