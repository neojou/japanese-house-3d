/**
 * UB tub fill — visual water only (no fluid solver).
 * Plug seated + faucet on → rise; plug out → stream hits the floor and
 * runs to the grate (visual rivulet). No fluid solver.
 */

export type TubWaterSpec = {
  fillRate: number;
  drainRate: number;
  /** How fast the floor wet-front grows while spilling (0–1 / s) */
  spreadRate: number;
  /** How fast stain + towel dry after the spill stops */
  dryRate: number;
};

export const TUB_WATER: TubWaterSpec = {
  /** ~8 s empty → brim when plugged and faucet on */
  fillRate: 0.12,
  /** Faster than fill — water leaves through the unseen waste */
  drainRate: 0.32,
  spreadRate: 0.085,
  dryRate: 0.05,
};

/** Tub is full and still being fed — water goes over the rim. */
export function isTubSpilling(
  fill: number,
  plugged: boolean,
  faucetOn: boolean,
): boolean {
  return plugged && faucetOn && fill >= 0.995;
}

export type FloorWetState = {
  /** Max wet-front 0–1. Grows while spilling; holds until moisture hits 0. */
  front: number;
  /** Uniform moisture of the already-wetted region. */
  moisture: number;
};

export function stepFloorWet(
  state: FloorWetState,
  dt: number,
  fill: number,
  plugged: boolean,
  faucetOn: boolean,
  spec: TubWaterSpec = TUB_WATER,
): FloorWetState {
  if (isTubSpilling(fill, plugged, faucetOn)) {
    return {
      front: Math.min(1, state.front + spec.spreadRate * dt),
      moisture: Math.min(1, state.moisture + spec.spreadRate * 1.15 * dt),
    };
  }
  if (!faucetOn || !plugged) {
    const moisture = Math.max(0, state.moisture - spec.dryRate * dt);
    return { front: moisture <= 1e-4 ? 0 : state.front, moisture };
  }
  return state;
}

/** @deprecated use stepFloorWet — kept as moisture-only for older calls */
export function stepTubOverflow(
  overflow: number,
  dt: number,
  fill: number,
  plugged: boolean,
  faucetOn: boolean,
  spec: TubWaterSpec = TUB_WATER,
): number {
  return stepFloorWet(
    { front: overflow, moisture: overflow },
    dt,
    fill,
    plugged,
    faucetOn,
    spec,
  ).moisture;
}

/** Ellipse-normalized distance past the tub footprint (0 = on the shell). */
export function ellipseOutside(
  x: number,
  z: number,
  cx: number,
  cz: number,
  halfW: number,
  halfL: number,
): number {
  const e = Math.hypot((x - cx) / halfW, (z - cz) / halfL);
  return Math.max(0, e - 1);
}

export function wetnessAt(
  outside: number,
  wetR: number,
  feather = 0.28,
): number {
  if (wetR <= 1e-6) return 0;
  const a = wetR;
  const b = wetR + Math.max(feather, 1e-4);
  if (outside <= a) return 1;
  if (outside >= b) return 0;
  const t = (outside - a) / (b - a);
  return 1 - t * t * (3 - 2 * t);
}

/** Maps front 0–1 → ellipse-outside distance covering the whole UB floor at 1. */
export function overflowWetRadius(front: number): number {
  return Math.min(1, Math.max(0, front)) * 2.85;
}

export function stepTubFill(
  fill: number,
  dt: number,
  plugged: boolean,
  faucetOn: boolean,
  spec: TubWaterSpec = TUB_WATER,
): number {
  let next = fill;
  if (!plugged) next -= spec.drainRate * dt;
  else if (faucetOn) next += spec.fillRate * dt;
  return Math.min(1, Math.max(0, next));
}

export function waterSurfaceY(
  fill: number,
  floorY: number,
  brimY: number,
): number {
  const t = Math.min(1, Math.max(0, fill));
  return floorY + t * (brimY - floorY);
}

/** Floor rivulet is visible while the tap runs onto a dry / draining basin. */
export function runoffVisible(
  faucetOn: boolean,
  plugged: boolean,
  fill: number,
): boolean {
  return faucetOn && (!plugged || fill < 0.07);
}

export function lerp3(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  t: number,
): [number, number, number] {
  const u = Math.min(1, Math.max(0, t));
  return [ax + (bx - ax) * u, ay + (by - ay) * u, az + (bz - az) * u];
}

/**
 * Tapered ribbon from impact → drain, sitting on the basin floor (+Y).
 * Mid-path bows slightly so the run-off is not a ruler.
 */
export function buildRunoffStrip(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  width0: number,
  width1: number,
  segs = 18,
  bow = 0.028,
): { positions: Float32Array; uvs: Float32Array; indices: Uint32Array } {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz) || 1;
  const px = -dz / len;
  const pz = dx / len;
  const n = Math.max(2, segs);
  const positions = new Float32Array((n + 1) * 2 * 3);
  const uvs = new Float32Array((n + 1) * 2 * 2);
  const indices = new Uint32Array(n * 6);
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const w = width0 + (width1 - width0) * t;
    const s = Math.sin(t * Math.PI) * bow;
    const [x, y, z] = lerp3(ax, ay, az, bx, by, bz, t);
    const cx = x + px * s;
    const cz = z + pz * s;
    const i0 = i * 2;
    positions[i0 * 3] = cx - px * w;
    positions[i0 * 3 + 1] = y;
    positions[i0 * 3 + 2] = cz - pz * w;
    positions[(i0 + 1) * 3] = cx + px * w;
    positions[(i0 + 1) * 3 + 2] = cz + pz * w;
    positions[(i0 + 1) * 3 + 1] = y;
    uvs[i0 * 2] = 0;
    uvs[i0 * 2 + 1] = t;
    uvs[(i0 + 1) * 2] = 1;
    uvs[(i0 + 1) * 2 + 1] = t;
  }
  for (let i = 0; i < n; i += 1) {
    const a = i * 2;
    const k = i * 6;
    indices[k] = a;
    indices[k + 1] = a + 1;
    indices[k + 2] = a + 3;
    indices[k + 3] = a;
    indices[k + 4] = a + 3;
    indices[k + 5] = a + 2;
  }
  return { positions, uvs, indices };
}
