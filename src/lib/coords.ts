import { BUILDING } from "@/data/dimensions";

/**
 * Plan space: +X east, LDK at small X (west), genkan east of LDK.
 *
 * Three.js cameras looking north put world +X on the *left* of the screen
 * (opposite of standing outdoors looking north). To keep both top-down and
 * first-person matching the floor plan, we render the house mirrored in X:
 *
 *   worldX = BUILDING.width - planX
 *
 * After mirroring, looking north: left = LDK, right = genkan. ✓
 * Top-down north-up: left = LDK, right = genkan. ✓
 *
 * Store wall data in plan space; convert only when placing free-world
 * entities (player, camera target helpers) outside the mirrored group.
 */

/** Plan X → world X (after house mirror group). */
export function planToWorldX(planX: number): number {
  return BUILDING.width - planX;
}

/** World X → plan X. */
export function worldToPlanX(worldX: number): number {
  return BUILDING.width - worldX;
}
