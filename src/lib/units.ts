/**
 * Unit helpers. 3D world units are always meters.
 * Floor-plan annotations are typically millimeters.
 */

/** Convert millimeters (as on Japanese floor plans) to meters. */
export function mm(valueMm: number): number {
  return valueMm * 0.001;
}

/** Convert meters to millimeters (for cross-checking plan labels). */
export function toMm(valueM: number): number {
  return valueM * 1000;
}
