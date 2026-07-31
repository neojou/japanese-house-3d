import {
  BUILDING,
  FLOORS,
  GENKAN_ENTRY,
  type FloorId,
} from "@/data/dimensions";

/**
 * Sample walkable ground height (plan-space X/Z → top surface Y).
 * Used so the player stands on steps / raised genkan without clipping.
 */
export function getGroundHeight(
  planX: number,
  planZ: number,
  _floor: FloorId = "1f",
): number {
  let h = 0;

  // Raised floor slabs (e.g. genkan platform at 0.5 m)
  for (const slab of FLOORS) {
    if (slab.floor !== "1f") continue;
    const { rect, y } = slab;
    if (
      planX >= rect.x &&
      planX <= rect.x + rect.width &&
      planZ >= rect.z &&
      planZ <= rect.z + rect.depth
    ) {
      h = Math.max(h, y);
    }
  }

  // Exterior steps south of genkan door
  const g = GENKAN_ENTRY;
  const midX = (g.x0 + g.x1) / 2;
  const halfW = g.stepWidth / 2 + 0.02;
  if (planX >= midX - halfW && planX <= midX + halfW) {
    const face = g.z - BUILDING.wallThickness / 2;
    const d = g.stepDepth;
    // Outer step (first from parking): top = 0.25
    if (planZ >= face - 2 * d && planZ < face - d) {
      h = Math.max(h, g.stepHeight);
    }
    // Inner step (second, at door): top = 0.50
    else if (planZ >= face - d && planZ <= face + 0.02) {
      h = Math.max(h, g.stepHeight * g.stepCount);
    }
  }

  return h;
}
