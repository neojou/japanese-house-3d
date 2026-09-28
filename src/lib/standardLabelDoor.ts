/**
 * Panasonic Standard Label inspired leaves (no brand marks).
 * GLB local: origin at the leaf centre, +X free edge, −X hinge, +Y up, +Z face.
 * Fold math is the tracked 2-panel bifold: the outer pin stays in the wall plane.
 */

export const STANDARD_LABEL_GLB = "/models/hero/standard-label-doors.glb";

export const SL_CANON_W = 0.78;
export const SL_CANON_H = 1.95;
export const SL_PH_W = 0.4;

export type StandardLabelKind = "ld" | "pa" | "dc" | "ta" | "ph";

export const SL_ROOT: Record<StandardLabelKind, string> = {
  ld: "Leaf_LD",
  pa: "Leaf_PA",
  dc: "Leaf_DC",
  ta: "Leaf_TA",
  ph: "Leaf_PH",
};

/** Hinge-group yaw before the open angle. NS walls map local +X onto plan +Z. */
export function doorBaseYaw(axis: "ew" | "ns", hingeAt: "min" | "max"): number {
  const along = axis === "ns" ? -Math.PI / 2 : 0;
  return hingeAt === "max" ? along + Math.PI : along;
}

/**
 * Signed fold angle `alpha` (radians, added to baseYaw).
 * Panel B's local yaw relative to panel A. World yaw of B is −alpha,
 * so the outer pin stays on the wall line.
 */
export function bifoldBRel(alpha: number): number {
  return -2 * alpha;
}

/** Outer pin in the hinge frame. `out` is 0 for every alpha (track constraint). */
export function foldPin(
  alpha: number,
  panelW: number,
): { along: number; out: number } {
  const ax = panelW * Math.cos(alpha);
  const az = -panelW * Math.sin(alpha);
  const bYaw = -alpha;
  return {
    along: ax + panelW * Math.cos(bYaw),
    out: az - panelW * Math.sin(bYaw),
  };
}

/**
 * Unit direction the first panel's free edge travels at a small open angle.
 * +X is east, +Z is north. Callers pick `openSign` so this points into the
 * closet or into the deeper room.
 */
export function foldTravelDir(
  axis: "ew" | "ns",
  openSign: 1 | -1,
  hingeAt: "min" | "max" = "min",
): { x: number; z: number } {
  const yaw = doorBaseYaw(axis, hingeAt) + openSign * 0.35;
  return { x: Math.cos(yaw), z: -Math.sin(yaw) };
}

/**
 * Hinge → free-edge direction for a swing leaf.
 * Matches SwingDoor: NS base yaw −π/2, hinge-at-max flips the leaf instead of adding π.
 */
export function swingLeafDir(
  axis: "ew" | "ns",
  hingeAt: "min" | "max",
  openSign: 1 | -1,
  alphaAbs = 0,
): { x: number; z: number } {
  const base = axis === "ns" ? -Math.PI / 2 : 0;
  const yaw = base + openSign * alphaAbs;
  const leaf = hingeAt === "min" ? 1 : -1;
  return { x: leaf * Math.cos(yaw), z: -leaf * Math.sin(yaw) };
}
