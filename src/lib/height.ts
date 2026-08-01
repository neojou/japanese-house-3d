import {
  ALL_FLOOR_SLABS,
  BUILDING,
  GENKAN_ENTRY,
  INTERIOR_FLOOR_Y,
  STAIR_WINDERS,
  STAIRS,
  type StairWinder,
} from "@/data/dimensions";

/**
 * Allow 0 → 0.5 interior floor and stair risers.
 * Higher story slabs ignored until feetY is high enough.
 */
export const MAX_STEP_UP = 0.55;
export const MAX_STEP_DOWN = 0.35;
export const FEET_Y_IGNORE_2F_BELOW = 2.0;
/** Ignore PH / roof slabs while still on 2F climb. */
export const FEET_Y_IGNORE_PH_BELOW = 4.0;
const Y_2F_SLAB_MIN = 2.5;
const Y_PH_SLAB_MIN = 5.0;

/** Horizontal padding on stair tread / width hitboxes (m). */
const STAIR_PAD = 0.14;
/** Extra angular pad for winders (rad). */
const WINDER_ANG_PAD = 0.22;

type SurfaceHit = { y: number; kind: "slab" | "stair" | "step" | "grade" | "landing" };

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Map ang into sweep parameter t∈[0,1] relative to start+sweep (signed).
 * Returns null if outside padded sweep.
 */
function sweepParam(
  ang: number,
  start: number,
  sweep: number,
): number | null {
  // Progress along clockwise (negative) or CCW sweep
  let a = normalizeAngle(ang - start);
  if (sweep < 0) {
    // clockwise: a should be in [sweep, 0]
    if (a > 0) a -= Math.PI * 2;
    if (a > WINDER_ANG_PAD || a < sweep - WINDER_ANG_PAD) return null;
    return Math.max(0, Math.min(0.999, a / sweep));
  }
  if (a < 0) a += Math.PI * 2;
  if (a < -WINDER_ANG_PAD || a > sweep + WINDER_ANG_PAD) return null;
  return Math.max(0, Math.min(0.999, a / sweep));
}

function collectWinderHits(
  w: StairWinder,
  planX: number,
  planZ: number,
  hits: SurfaceHit[],
) {
  const dx = planX - w.pivotX;
  const dz = planZ - w.pivotZ;
  const r = Math.hypot(dx, dz);
  // Allow walking near pivot (rInner small + pad)
  const rMin = Math.max(0, w.rInner - STAIR_PAD);
  const rMax = w.rOuter + STAIR_PAD;
  if (r < rMin || r > rMax) return;

  const ang = Math.atan2(dz, dx);
  const t = sweepParam(ang, w.startAngle, w.sweep);
  if (t === null) return;

  const i = Math.floor(t * w.stepCount);
  hits.push({
    y: w.baseY + (i + 1) * w.riserHeight,
    kind: "stair",
  });
}

function collectSurfaces(
  planX: number,
  planZ: number,
  feetY: number,
): SurfaceHit[] {
  const hits: SurfaceHit[] = [{ y: 0, kind: "grade" }];
  const ignore2f = feetY < FEET_Y_IGNORE_2F_BELOW;
  const ignorePh = feetY < FEET_Y_IGNORE_PH_BELOW;

  for (const slab of ALL_FLOOR_SLABS) {
    const { rect, y, floor } = slab;
    if (ignore2f && (floor === "2f" || (y >= Y_2F_SLAB_MIN && y < Y_PH_SLAB_MIN))) {
      continue;
    }
    if (ignorePh && (floor === "ph" || y >= Y_PH_SLAB_MIN)) {
      continue;
    }
    if (
      planX >= rect.x &&
      planX <= rect.x + rect.width &&
      planZ >= rect.z &&
      planZ <= rect.z + rect.depth
    ) {
      hits.push({ y, kind: "slab" });
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

  // Straight stair flights
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
    } else if (flight.direction === "east") {
      for (let i = 0; i < flight.stepCount; i++) {
        const x0 = flight.x + i * flight.treadDepth - STAIR_PAD * 0.5;
        const x1 = flight.x + (i + 1) * flight.treadDepth + STAIR_PAD * 0.5;
        if (planX >= x0 && planX < x1) {
          hits.push({
            y: flight.baseY + (i + 1) * flight.riserHeight,
            kind: "stair",
          });
        }
      }
    } else if (flight.direction === "west") {
      for (let i = 0; i < flight.stepCount; i++) {
        const xE = flight.x - i * flight.treadDepth + STAIR_PAD * 0.5;
        const xW = flight.x - (i + 1) * flight.treadDepth - STAIR_PAD * 0.5;
        if (planX > xW && planX <= xE) {
          hits.push({
            y: flight.baseY + (i + 1) * flight.riserHeight,
            kind: "stair",
          });
        }
      }
    }
  }

  // 90° winders
  for (const w of STAIR_WINDERS) {
    collectWinderHits(w, planX, planZ, hits);
  }

  return hits;
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

function isStairish(h: SurfaceHit): boolean {
  return h.kind === "stair" || h.kind === "landing" || h.kind === "step";
}

function pickBest(hits: SurfaceHit[]): number {
  if (hits.length === 0) return 0;
  const maxY = Math.max(...hits.map((h) => h.y));
  const top = hits.filter((h) => Math.abs(h.y - maxY) < 1e-6);
  const preferred = top.find((h) => isStairish(h));
  return preferred ? preferred.y : maxY;
}

/**
 * When a coplanar/higher slab would trap the player on a deck over stairs,
 * prefer the highest stair tread within maxStepDown of current feet.
 */
function pickDescent(
  hits: SurfaceHit[],
  feetY: number,
  maxStepDown: number,
): number | null {
  const stairDown = hits.filter(
    (h) =>
      isStairish(h) &&
      h.y < feetY - 0.02 &&
      h.y >= feetY - maxStepDown - 0.02,
  );
  if (stairDown.length === 0) return null;
  return Math.max(...stairDown.map((h) => h.y));
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
    const down = pickDescent(inWindow, feetY, maxStepDown);
    if (down !== null) return down;
    return pickBest(inWindow);
  }

  const stepUpOk = all.filter((h) => h.y <= hi);
  if (stepUpOk.length > 0) {
    const down = pickDescent(stepUpOk, feetY, maxStepDown);
    if (down !== null) return down;
    return pickBest(stepUpOk);
  }

  const below = all.filter((h) => h.y <= feetY);
  if (below.length > 0) {
    return pickBest(below);
  }

  return 0;
}
