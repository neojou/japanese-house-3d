/**
 * Scripted DCC for the 1F senmen vessel (DESIGN cinematic Path B).
 * Pure typed arrays — no three.js — so Node bake/tests can import this file.
 *
 * Local space: origin at outer-bottom centre, +Y up, +Z wall, −Z user.
 * Outer = vertical rounded-rect shell; inner = lofted bowl (never a second slab).
 */

export type VesselSpec = {
  w: number;
  d: number;
  h: number;
  innerDepth: number;
  wall: number;
  rim: number;
  outerR: number;
  innerR: number;
  floorR: number;
  drainR: number;
  segs: number;
  innerRings: number;
  fillet: number;
};

/** Matches `PROP_1F_SENMEN.vanity.vessel` (bake test enforces). */
export const SENMEN_VESSEL_SPEC: VesselSpec = {
  w: 0.56,
  d: 0.38,
  h: 0.12,
  innerDepth: 0.09,
  wall: 0.009,
  rim: 0.015,
  outerR: 0.016,
  innerR: 0.06,
  floorR: 0.072,
  drainR: 0.017,
  segs: 96,
  innerRings: 36,
  fillet: 0.007,
};

export type AttrMesh = {
  name: string;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
};

export type VesselBasin = {
  meshes: AttrMesh[];
  rimY: number;
  floorY: number;
};

type Key = { u: number; y: number; dy: number };

/** C1 Hermite through (u, y, dy). */
export function hermite(u: number, keys: Key[]): number {
  if (u <= keys[0].u) return keys[0].y;
  const last = keys[keys.length - 1];
  if (u >= last.u) return last.y;
  let i = 0;
  while (i < keys.length - 2 && u > keys[i + 1].u) i += 1;
  const a = keys[i];
  const b = keys[i + 1];
  const dt = b.u - a.u;
  const t = (u - a.u) / dt;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * a.y + h10 * dt * a.dy + h01 * b.y + h11 * dt * b.dy;
}

/** Drop from rim as a fraction of innerDepth. u=0 rim → u=1 floor. */
export const DROP_KEYS: Key[] = [
  { u: 0.0, y: 0.0, dy: 0.04 },
  { u: 0.07, y: 0.014, dy: 0.35 },
  { u: 0.24, y: 0.34, dy: 1.35 },
  { u: 0.52, y: 0.8, dy: 0.75 },
  { u: 0.78, y: 0.975, dy: 0.1 },
  { u: 1.0, y: 1.0, dy: 0.0 },
];

/** Inset from inner rim as a fraction of maxInset. */
export const INSET_KEYS: Key[] = [
  { u: 0.0, y: 0.0, dy: 0.25 },
  { u: 0.07, y: 0.035, dy: 0.7 },
  { u: 0.28, y: 0.4, dy: 1.05 },
  { u: 0.72, y: 0.9, dy: 0.28 },
  { u: 1.0, y: 1.0, dy: 0.0 },
];

export function profileDrop(u: number): number {
  return hermite(u, DROP_KEYS);
}

export function profileInset(u: number): number {
  return hermite(u, INSET_KEYS);
}

export function profileMonotonic(samples = 48): boolean {
  let prev = profileDrop(0);
  for (let i = 1; i <= samples; i += 1) {
    const y = profileDrop(i / samples);
    if (y + 1e-6 < prev) return false;
    prev = y;
  }
  return true;
}

/** Point on a rounded-rect perimeter. t∈[0,1). CCW from +Y, start south (−Z) going +X. */
export function roundedRectPoint(
  hw: number,
  hd: number,
  r: number,
  t: number,
): [number, number] {
  const rr = Math.min(r, Math.max(hw - 1e-4, 1e-4), Math.max(hd - 1e-4, 1e-4));
  const sx = 2 * (hw - rr);
  const sz = 2 * (hd - rr);
  const arc = (Math.PI / 2) * rr;
  const perim = 2 * sx + 2 * sz + 4 * arc;
  let s = (((t % 1) + 1) % 1) * perim;

  if (s <= sx) return [-(hw - rr) + s, -hd];
  s -= sx;
  if (s <= arc) {
    const a = -Math.PI / 2 + (s / arc) * (Math.PI / 2);
    return [hw - rr + rr * Math.cos(a), -(hd - rr) + rr * Math.sin(a)];
  }
  s -= arc;
  if (s <= sz) return [hw, -(hd - rr) + s];
  s -= sz;
  if (s <= arc) {
    const a = (s / arc) * (Math.PI / 2);
    return [hw - rr + rr * Math.cos(a), hd - rr + rr * Math.sin(a)];
  }
  s -= arc;
  if (s <= sx) return [hw - rr - s, hd];
  s -= sx;
  if (s <= arc) {
    const a = Math.PI / 2 + (s / arc) * (Math.PI / 2);
    return [-(hw - rr) + rr * Math.cos(a), hd - rr + rr * Math.sin(a)];
  }
  s -= arc;
  if (s <= sz) return [-hw, hd - rr - s];
  s -= sz;
  const a = Math.PI + (s / Math.max(arc, 1e-8)) * (Math.PI / 2);
  return [-(hw - rr) + rr * Math.cos(a), -(hd - rr) + rr * Math.sin(a)];
}

function loopXZ(w: number, d: number, r: number, segs: number): [number, number][] {
  const pts: [number, number][] = [];
  const ww = Math.max(w, 0.004);
  const dd = Math.max(d, 0.004);
  for (let i = 0; i < segs; i += 1) {
    pts.push(roundedRectPoint(ww / 2, dd / 2, r, i / segs));
  }
  return pts;
}

function stitch(
  rings: [number, number, number][][],
  flip: boolean,
): { positions: Float32Array; indices: Uint32Array } {
  const segs = rings[0].length;
  const positions = new Float32Array(rings.length * segs * 3);
  let p = 0;
  for (const ring of rings) {
    for (const [x, y, z] of ring) {
      positions[p] = x;
      positions[p + 1] = y;
      positions[p + 2] = z;
      p += 3;
    }
  }
  const indices = new Uint32Array((rings.length - 1) * segs * 6);
  let k = 0;
  for (let i = 0; i < rings.length - 1; i += 1) {
    for (let j = 0; j < segs; j += 1) {
      const a = i * segs + j;
      const b = i * segs + ((j + 1) % segs);
      const c = (i + 1) * segs + ((j + 1) % segs);
      const d = (i + 1) * segs + j;
      if (flip) {
        indices[k] = a;
        indices[k + 1] = d;
        indices[k + 2] = c;
        indices[k + 3] = a;
        indices[k + 4] = c;
        indices[k + 5] = b;
      } else {
        indices[k] = a;
        indices[k + 1] = b;
        indices[k + 2] = c;
        indices[k + 3] = a;
        indices[k + 4] = c;
        indices[k + 5] = d;
      }
      k += 6;
    }
  }
  return { positions, indices };
}

function annulus(
  w: number,
  d: number,
  r: number,
  holeR: number,
  y: number,
  segs: number,
  rings: number,
  faceDown: boolean,
): { positions: Float32Array; indices: Uint32Array } {
  const inner = Math.max(holeR * 2, 0.02);
  const loops: [number, number, number][][] = [];
  for (let i = 0; i < rings; i += 1) {
    const t = i / (rings - 1);
    const s = 1 - t * (1 - inner / Math.min(w, d));
    const loop = loopXZ(w * s, d * s, Math.max(r * s, holeR), segs).map(
      ([x, z]) => [x, y, z] as [number, number, number],
    );
    loops.push(loop);
  }
  return stitch(loops, faceDown);
}

export function computeNormals(
  positions: Float32Array,
  indices: Uint32Array,
): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;
    const ax = positions[ia];
    const ay = positions[ia + 1];
    const az = positions[ia + 2];
    const bx = positions[ib];
    const by = positions[ib + 1];
    const bz = positions[ib + 2];
    const cx = positions[ic];
    const cy = positions[ic + 1];
    const cz = positions[ic + 2];
    const abx = bx - ax;
    const aby = by - ay;
    const abz = bz - az;
    const acx = cx - ax;
    const acy = cy - ay;
    const acz = cz - az;
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    normals[ia] += nx;
    normals[ia + 1] += ny;
    normals[ia + 2] += nz;
    normals[ib] += nx;
    normals[ib + 1] += ny;
    normals[ib + 2] += nz;
    normals[ic] += nx;
    normals[ic + 1] += ny;
    normals[ic + 2] += nz;
  }
  for (let i = 0; i < normals.length; i += 3) {
    const nx = normals[i];
    const ny = normals[i + 1];
    const nz = normals[i + 2];
    const len = Math.hypot(nx, ny, nz) || 1;
    normals[i] = nx / len;
    normals[i + 1] = ny / len;
    normals[i + 2] = nz / len;
  }
  return normals;
}

function mesh(
  name: string,
  positions: Float32Array,
  indices: Uint32Array,
): AttrMesh {
  return { name, positions, indices, normals: computeNormals(positions, indices) };
}

function meanNyNearY(m: AttrMesh, yTarget: number, tol: number): number {
  let s = 0;
  let n = 0;
  for (let i = 0; i < m.positions.length; i += 3) {
    if (Math.abs(m.positions[i + 1] - yTarget) < tol) {
      s += m.normals[i + 1];
      n += 1;
    }
  }
  return n ? s / n : 0;
}

function flipWinding(m: AttrMesh): void {
  const idx = m.indices;
  for (let i = 0; i < idx.length; i += 3) {
    const t = idx[i];
    idx[i] = idx[i + 1];
    idx[i + 1] = t;
  }
  m.normals = computeNormals(m.positions, m.indices);
}

export function buildVesselBasin(spec: VesselSpec = SENMEN_VESSEL_SPEC): VesselBasin {
  const segs = spec.segs;
  const rimY = spec.h;
  const floorY = spec.h - spec.innerDepth;
  const innerW0 = spec.w - 2 * spec.rim;
  const innerD0 = spec.d - 2 * spec.rim;

  const innerRings: [number, number, number][][] = [];
  for (let i = 0; i <= spec.innerRings; i += 1) {
    const u = i / spec.innerRings;
    const drop = profileDrop(u) * spec.innerDepth;
    const t = profileInset(u);
    // Shrink both axes toward a circular drain so the floor is not a wide tray.
    const rw = innerW0 * (1 - t) + spec.drainR * 2 * t;
    const rd = innerD0 * (1 - t) + spec.drainR * 2 * t;
    const rr = spec.innerR * (1 - t) + spec.drainR * t;
    const y = rimY - drop;
    innerRings.push(loopXZ(rw, rd, rr, segs).map(([x, z]) => [x, y, z]));
  }
  const innerRaw = stitch(innerRings, false);
  const inner = mesh("basin-inner", innerRaw.positions, innerRaw.indices);
  if (meanNyNearY(inner, floorY, 0.012) < 0) flipWinding(inner);

  const fil = spec.fillet;
  const wallRings: [number, number, number][][] = [];
  const filSteps = 6;
  for (let i = 0; i <= filSteps; i += 1) {
    const t = i / filSteps;
    const a = t * (Math.PI / 2);
    const inset = fil * (1 - Math.sin(a));
    const y = fil * (1 - Math.cos(a));
    wallRings.push(
      loopXZ(spec.w - 2 * inset, spec.d - 2 * inset, spec.outerR, segs).map(
        ([x, z]) => [x, y, z],
      ),
    );
  }
  const wallSteps = 5;
  for (let i = 1; i <= wallSteps; i += 1) {
    const y = fil + (rimY - fil) * (i / wallSteps);
    wallRings.push(
      loopXZ(spec.w, spec.d, spec.outerR, segs).map(([x, z]) => [x, y, z]),
    );
  }
  const outerWallRaw = stitch(wallRings, true);
  const bottom = annulus(
    spec.w - 2 * fil,
    spec.d - 2 * fil,
    spec.outerR,
    spec.drainR * 1.15,
    0,
    segs,
    8,
    true,
  );
  const outerPos = concatPos(outerWallRaw.positions, bottom.positions);
  const outerIdx = concatIdx(
    outerWallRaw.indices,
    bottom.indices,
    outerWallRaw.positions.length / 3,
  );
  const outer = mesh("basin-outer", outerPos, outerIdx);
  if (meanNyNearY(outer, 0, 0.004) > 0) flipWinding(outer);

  // Inner face of the ceramic wall — gives the shell real thickness
  // so a side view is porcelain, not a window onto the cabinet.
  const linerRings: [number, number, number][][] = [];
  for (let i = 0; i <= filSteps; i += 1) {
    const t = i / filSteps;
    const a = t * (Math.PI / 2);
    const inset = fil * (1 - Math.sin(a)) + spec.wall;
    const y = fil * (1 - Math.cos(a));
    linerRings.push(
      loopXZ(
        spec.w - 2 * inset,
        spec.d - 2 * inset,
        Math.max(spec.outerR - spec.wall, 0.004),
        segs,
      ).map(([x, z]) => [x, y, z]),
    );
  }
  for (let i = 1; i <= wallSteps; i += 1) {
    const y = fil + (rimY - fil) * (i / wallSteps);
    linerRings.push(
      loopXZ(
        spec.w - 2 * spec.wall,
        spec.d - 2 * spec.wall,
        Math.max(spec.outerR - spec.wall, 0.004),
        segs,
      ).map(([x, z]) => [x, y, z]),
    );
  }
  const linerRaw = stitch(linerRings, false);
  const liner = mesh("basin-liner", linerRaw.positions, linerRaw.indices);

  // Drain bore: tube from bowl floor down to the underside (into the tailpiece).
  const lastInner = innerRings[innerRings.length - 1];
  const wellRings: [number, number, number][][] = [
    lastInner,
    lastInner.map(([x, , z]) => [x, 0.004, z]),
  ];
  const wellRaw = stitch(wellRings, true);
  const well = mesh("basin-well", wellRaw.positions, wellRaw.indices);

  const rimRings: [number, number, number][][] = [];
  const rimSteps = 6;
  for (let i = 0; i <= rimSteps; i += 1) {
    const t = i / rimSteps;
    const w = spec.w - (spec.w - innerW0) * t;
    const d = spec.d - (spec.d - innerD0) * t;
    const r = spec.outerR + (spec.innerR - spec.outerR) * t;
    const y = rimY + 0.0018 * Math.sin(Math.PI * t);
    rimRings.push(loopXZ(w, d, r, segs).map(([x, z]) => [x, y, z]));
  }
  const rimRaw = stitch(rimRings, false);
  const rim = mesh("basin-rim", rimRaw.positions, rimRaw.indices);
  if (meanNyNearY(rim, rimY, 0.004) < 0) flipWinding(rim);

  return { meshes: [outer, inner, rim, liner, well], rimY, floorY };
}

function concatPos(a: Float32Array, b: Float32Array): Float32Array {
  const o = new Float32Array(a.length + b.length);
  o.set(a, 0);
  o.set(b, a.length);
  return o;
}

function concatIdx(a: Uint32Array, b: Uint32Array, offset: number): Uint32Array {
  const o = new Uint32Array(a.length + b.length);
  o.set(a, 0);
  for (let i = 0; i < b.length; i += 1) o[a.length + i] = b[i] + offset;
  return o;
}

export function measureBasin(built: VesselBasin): {
  rimY: number;
  floorY: number;
  rimSpread: number;
  depth: number;
} {
  const inner = built.meshes.find((m) => m.name === "basin-inner");
  if (!inner) throw new Error("basin-inner missing");
  let minY = Infinity;
  let maxY = -Infinity;
  const rimYs: number[] = [];
  for (let i = 0; i < inner.positions.length; i += 3) {
    const y = inner.positions[i + 1];
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const segs = SENMEN_VESSEL_SPEC.segs;
  for (let j = 0; j < segs; j += 1) {
    rimYs.push(inner.positions[j * 3 + 1]);
  }
  const rimMin = Math.min(...rimYs);
  const rimMax = Math.max(...rimYs);
  return {
    rimY: (rimMin + rimMax) / 2,
    floorY: minY,
    rimSpread: rimMax - rimMin,
    depth: (rimMin + rimMax) / 2 - minY,
  };
}
