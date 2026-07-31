import {
  ALL_FLOOR_SLABS,
  BUILDING,
  GENKAN_ENTRY,
  INTERIOR_FLOOR_Y,
  STAIR_U,
  STAIRS,
} from "@/data/dimensions";

/**
 * Allow 0 → 0.5 interior floor and stair risers.
 * 2F slabs ignored until feetY is high enough.
 */
export const MAX_STEP_UP = 0.55;
export const MAX_STEP_DOWN = 0.35;
export const FEET_Y_IGNORE_2F_BELOW = 2.0;
const Y_2F_SLAB_MIN = 2.5;

/** Horizontal padding on stair tread / width hitboxes (m). */
const STAIR_PAD = 0.08;

type SurfaceHit = { y: number; kind: "slab" | "stair" | "step" | "grade" | "landing" };

function collectSurfaces(
  planX: number,
  planZ: number,
  feetY: number,
): SurfaceHit[] {
  const hits: SurfaceHit[] = [{ y: 0, kind: "grade" }];
  const ignore2f = feetY < FEET_Y_IGNORE_2F_BELOW;

  for (const slab of ALL_FLOOR_SLABS) {
    const { rect, y, floor } = slab;
    if (ignore2f && (floor === "2f" || y >= Y_2F_SLAB_MIN)) {
      continue;
    }
    if (
      planX >= rect.x &&
      planX <= rect.x + rect.width &&
      planZ >= rect.z &&
      planZ <= rect.z + rect.depth
    ) {
      const kind =
        Math.abs(y - STAIR_U.landing.y) < 0.05 ? "landing" : "slab";
      hits.push({ y, kind });
    }
  }

  // Genkan exterior steps (widened)
  const g = GENKAN_ENTRY;
  const midX = (g.x0 + g.x1) / 2;
  const halfW = g.stepWidth / 2 + 0.08;
  if (planX >= midX - halfW && planX <= midX + halfW) {
    const face = g.z - BUILDING.wallThickness / 2;
    const d = g.stepDepth;
    if (planZ >= face - 2 * d - 0.05 && planZ < face - d) {
      hits.push({ y: g.stepHeight, kind: "step" });
    } else if (planZ >= face - d && planZ <= face + 0.05) {
      hits.push({ y: g.stepHeight * g.stepCount, kind: "step" });
    }
  }

  // Interior / genkan mount insurance
  if (isInsidePastGenkanDoor(planX, planZ) || isOverInteriorFloor(planX, planZ)) {
    hits.push({ y: INTERIOR_FLOOR_Y, kind: "slab" });
  }

  // Mid landing insurance (turn pad at Y=1.7)
  if (isOnMidLanding(planX, planZ) && feetY >= 1.4) {
    hits.push({ y: STAIR_U.landing.y, kind: "landing" });
  }

  // Stair flights (widened pads)
  for (const flight of STAIRS) {
    const halfWidth = flight.width / 2 + STAIR_PAD;
    if (planX < flight.x - halfWidth || planX > flight.x + halfWidth) {
      continue;
    }

    if (flight.direction === "north") {
      for (let i = 0; i < flight.stepCount; i++) {
        const z0 = flight.z + i * flight.treadDepth - STAIR_PAD * 0.5;
        const z1 = flight.z + (i + 1) * flight.treadDepth + STAIR_PAD * 0.5;
        if (planZ >= z0 && planZ < z1) {
          hits.push({
            y: flight.baseY + (i + 1) * flight.riserHeight,
            kind: "stair",
          });
        }
      }
    } else if (flight.direction === "south") {
      for (let i = 0; i < flight.stepCount; i++) {
        const zNorth = flight.z - i * flight.treadDepth + STAIR_PAD * 0.5;
        const zSouth =
          flight.z - (i + 1) * flight.treadDepth - STAIR_PAD * 0.5;
        if (planZ > zSouth && planZ <= zNorth) {
          hits.push({
            y: flight.baseY + (i + 1) * flight.riserHeight,
            kind: "stair",
          });
        }
      }
    }
  }

  return hits;
}

function isOnMidLanding(planX: number, planZ: number): boolean {
  const L = STAIR_U.landing;
  // Generous pad so turn movement stays on Y=1.7
  const pad = 0.1;
  return (
    planX >= L.x0 - pad &&
    planX <= L.x1 + pad &&
    planZ >= L.z0 - pad &&
    planZ <= L.z1 + pad
  );
}

function isInsidePastGenkanDoor(planX: number, planZ: number): boolean {
  const g = GENKAN_ENTRY;
  const pad = 0.25;
  return (
    planX >= g.x0 - pad &&
    planX <= g.x1 + pad &&
    planZ >= g.z - BUILDING.wallThickness / 2 - 0.05
  );
}

function isOverInteriorFloor(planX: number, planZ: number): boolean {
  for (const slab of ALL_FLOOR_SLABS) {
    if (slab.floor !== "1f") continue;
    if (slab.y < INTERIOR_FLOOR_Y - 0.01) continue;
    if (slab.y > INTERIOR_FLOOR_Y + 0.05) continue;
    const { rect } = slab;
    if (
      planX >= rect.x &&
      planX <= rect.x + rect.width &&
      planZ >= rect.z &&
      planZ <= rect.z + rect.depth
    ) {
      return true;
    }
  }
  return false;
}

function pickBest(hits: SurfaceHit[]): number {
  if (hits.length === 0) return 0;
  // Prefer stair / landing / step over plain slab at same height
  const maxY = Math.max(...hits.map((h) => h.y));
  const top = hits.filter((h) => Math.abs(h.y - maxY) < 1e-6);
  const preferred = top.find(
    (h) =>
      h.kind === "stair" || h.kind === "landing" || h.kind === "step",
  );
  return preferred ? preferred.y : maxY;
}

/**
 * Ground top Y given current feet height.
 */
export function getGroundHeight(
  planX: number,
  planZ: number,
  feetY: number,
  maxStepUp: number = MAX_STEP_UP,
  maxStepDown: number = MAX_STEP_DOWN,
): number {
  const all = collectSurfaces(planX, planZ, feetY);
  if (all.length === 0) return 0;

  const lo = feetY - maxStepDown;
  const hi = feetY + maxStepUp;

  const inWindow = all.filter((h) => h.y >= lo && h.y <= hi);
  if (inWindow.length > 0) {
    return pickBest(inWindow);
  }

  const stepUpOk = all.filter((h) => h.y <= hi);
  if (stepUpOk.length > 0) {
    return pickBest(stepUpOk);
  }

  const below = all.filter((h) => h.y <= feetY);
  if (below.length > 0) {
    return pickBest(below);
  }

  return 0;
}
