/**
 * 1F UB Type-M hero — layout helpers + Node DCC fallback.
 * Local space: origin at interior SW on the deck; +X east, +Y up, +Z north.
 * Blender baker is preferred (`tools/dcc/build_ub_bath.py`).
 */
import { PROP_1F_UB_TUB, SZ, UB_BATH, UB_EAST_WINDOW } from "@/data/dimensions";

export const UB_BATH_HERO = {
  id: "hero-1f-ub-bath",
  gltf: UB_BATH.gltf,
  ceilingH: UB_BATH.ceilingH,
  cladT: UB_BATH.cladT,
} as const;

export function ubOrigin(): { x: number; y: number; z: number } {
  return { x: UB_BATH.x0, y: UB_BATH.y0, z: UB_BATH.z0 };
}

export function ubSize(): { sx: number; sy: number; sz: number } {
  return {
    sx: UB_BATH.x1 - UB_BATH.x0,
    sy: UB_BATH.ceilingH,
    sz: UB_BATH.z1 - UB_BATH.z0,
  };
}

export function tubLocalCenter(): { x: number; y: number; z: number } {
  const o = ubOrigin();
  return {
    x: PROP_1F_UB_TUB.x - o.x,
    y: 0,
    z: PROP_1F_UB_TUB.z - o.z,
  };
}

/** Inner water footprint — thin deck lip, large rounded basin. */
export function tubInner(): { w: number; l: number; r: number } {
  const p = PROP_1F_UB_TUB;
  return {
    w: p.width - 2 * p.innerInset,
    l: p.length - 2 * p.innerInset,
    r: p.innerCornerR,
  };
}

/** Chrome control on the northwest **deck** (plan metres). */
export function drainButtonPlan(): { x: number; y: number; z: number } {
  const p = PROP_1F_UB_TUB;
  return {
    x: p.x - p.width / 2 + p.plug.deckInset,
    y: p.y + p.rimH + 0.002,
    z: p.z + p.length / 2 - p.plug.deckInset,
  };
}

/** Basin-floor drain (south inner), opened by the deck button. */
export function drainHolePlan(): { x: number; y: number; z: number } {
  const p = PROP_1F_UB_TUB;
  const inner = tubInner();
  return {
    x: p.x,
    y: p.y + p.rimH - p.basinDepth + 0.006,
    z: p.z - inner.l / 2 + 0.09,
  };
}

/** Wall mixer on the south (dark) wall, wash-floor side. */
export function mixerPlan(): { x: number; y: number; z: number } {
  const p = PROP_1F_UB_TUB;
  return {
    x: p.x - p.width / 2 - 0.16,
    y: p.y + p.faucet.mixerH,
    z: UB_BATH.z0 + 0.03,
  };
}

/** Filler spout over the tub's south inner rim. */
export function spoutTipPlan(): { x: number; y: number; z: number } {
  const p = PROP_1F_UB_TUB;
  return {
    x: p.x - 0.04,
    y: p.y + p.rimH + 0.1,
    z: p.z - p.length / 2 + 0.06,
  };
}

export type HeroMesh = {
  name: string;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
};

export type HeroMeshWithMat = HeroMesh & { material: number };

function boxGeo(
  sx: number,
  sy: number,
  sz: number,
  ox: number,
  oy: number,
  oz: number,
): Omit<HeroMesh, "name"> {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const faces: { n: [number, number, number]; v: [number, number, number][] }[] =
    [
      { n: [0, 0, 1], v: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]] },
      { n: [0, 0, -1], v: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]] },
      { n: [1, 0, 0], v: [[hx, -hy, -hz], [hx, -hy, hz], [hx, hy, hz], [hx, hy, -hz]] },
      { n: [-1, 0, 0], v: [[-hx, -hy, hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, hz]] },
      { n: [0, 1, 0], v: [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]] },
      { n: [0, -1, 0], v: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]] },
    ];
  const positions = new Float32Array(24 * 3);
  const normals = new Float32Array(24 * 3);
  const indices = new Uint32Array(36);
  let vi = 0;
  let ii = 0;
  let base = 0;
  for (const f of faces) {
    for (const p of f.v) {
      positions[vi] = p[0] + ox;
      positions[vi + 1] = p[1] + oy;
      positions[vi + 2] = p[2] + oz;
      normals[vi] = f.n[0];
      normals[vi + 1] = f.n[1];
      normals[vi + 2] = f.n[2];
      vi += 3;
    }
    indices[ii++] = base;
    indices[ii++] = base + 1;
    indices[ii++] = base + 2;
    indices[ii++] = base;
    indices[ii++] = base + 2;
    indices[ii++] = base + 3;
    base += 4;
  }
  return { positions, normals, indices };
}

function cylGeo(
  r: number,
  h: number,
  ox: number,
  oy: number,
  oz: number,
  axis: "x" | "y" | "z",
  segs = 16,
): Omit<HeroMesh, "name"> {
  const n = Math.max(8, segs);
  const positions = new Float32Array((n * 2 + 2) * 3);
  const normals = new Float32Array((n * 2 + 2) * 3);
  const indices = new Uint32Array(n * 12);
  const axisV: [number, number, number] =
    axis === "x" ? [1, 0, 0] : axis === "z" ? [0, 0, 1] : [0, 1, 0];
  const a: [number, number, number] =
    axis === "y" ? [1, 0, 0] : axis === "x" ? [0, 1, 0] : [1, 0, 0];
  const b: [number, number, number] = [
    axisV[1] * a[2] - axisV[2] * a[1],
    axisV[2] * a[0] - axisV[0] * a[2],
    axisV[0] * a[1] - axisV[1] * a[0],
  ];
  const hh = h / 2;
  let vi = 0;
  for (let cap = 0; cap < 2; cap += 1) {
    const t = cap === 0 ? -hh : hh;
    for (let i = 0; i < n; i += 1) {
      const ang = (i / n) * Math.PI * 2;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const px = a[0] * c * r + b[0] * s * r + axisV[0] * t;
      const py = a[1] * c * r + b[1] * s * r + axisV[1] * t;
      const pz = a[2] * c * r + b[2] * s * r + axisV[2] * t;
      positions[vi] = px + ox;
      positions[vi + 1] = py + oy;
      positions[vi + 2] = pz + oz;
      normals[vi] = a[0] * c + b[0] * s;
      normals[vi + 1] = a[1] * c + b[1] * s;
      normals[vi + 2] = a[2] * c + b[2] * s;
      vi += 3;
    }
  }
  const topC = n * 2;
  const botC = n * 2 + 1;
  positions[topC * 3] = ox + axisV[0] * hh;
  positions[topC * 3 + 1] = oy + axisV[1] * hh;
  positions[topC * 3 + 2] = oz + axisV[2] * hh;
  normals[topC * 3] = axisV[0];
  normals[topC * 3 + 1] = axisV[1];
  normals[topC * 3 + 2] = axisV[2];
  positions[botC * 3] = ox - axisV[0] * hh;
  positions[botC * 3 + 1] = oy - axisV[1] * hh;
  positions[botC * 3 + 2] = oz - axisV[2] * hh;
  normals[botC * 3] = -axisV[0];
  normals[botC * 3 + 1] = -axisV[1];
  normals[botC * 3 + 2] = -axisV[2];
  let ii = 0;
  for (let i = 0; i < n; i += 1) {
    const i0 = i;
    const i1 = (i + 1) % n;
    const j0 = i + n;
    const j1 = ((i + 1) % n) + n;
    indices[ii++] = i0;
    indices[ii++] = i1;
    indices[ii++] = j1;
    indices[ii++] = i0;
    indices[ii++] = j1;
    indices[ii++] = j0;
    indices[ii++] = j0;
    indices[ii++] = j1;
    indices[ii++] = topC;
    indices[ii++] = i1;
    indices[ii++] = i0;
    indices[ii++] = botC;
  }
  return { positions, normals, indices };
}

/** Node DCC fallback (Blender path is preferred). */
export function buildUbBathMeshes(): {
  meshes: HeroMeshWithMat[];
  materials: {
    name: string;
    color: [number, number, number];
    roughness: number;
    metalness: number;
  }[];
  root: {
    name: string;
    children: { name: string; mesh: number; extras?: Record<string, unknown> }[];
  };
} {
  const p = PROP_1F_UB_TUB;
  const size = ubSize();
  const tLoc = tubLocalCenter();
  const T = UB_BATH.cladT;
  const H = size.sy;
  const sx = size.sx;
  const sz = size.sz;
  const o = ubOrigin();
  const winZ0 = SZ.ubSouth + UB_EAST_WINDOW.fromStart - o.z;
  const winZ1 = winZ0 + UB_EAST_WINDOW.width;
  const winY0 = UB_EAST_WINDOW.sill - o.y;
  const winY1 = winY0 + UB_EAST_WINDOW.height;
  const doorX0 = UB_BATH.showerDoor.x0 - o.x;
  const doorX1 = doorX0 + UB_BATH.showerDoor.width;
  const doorH = UB_BATH.showerDoor.height;

  const materials = [
    { name: "UbPorcelain", color: [0.95, 0.93, 0.9] as [number, number, number], roughness: 0.28, metalness: 0.04 },
    { name: "UbCreamTile", color: [0.9, 0.87, 0.82] as [number, number, number], roughness: 0.62, metalness: 0.02 },
    { name: "UbCharcoal", color: [0.18, 0.18, 0.19] as [number, number, number], roughness: 0.72, metalness: 0.04 },
    { name: "UbFloor", color: [0.88, 0.82, 0.72] as [number, number, number], roughness: 0.86, metalness: 0.02 },
    { name: "UbChrome", color: [0.72, 0.74, 0.76] as [number, number, number], roughness: 0.14, metalness: 0.94 },
    { name: "UbCeiling", color: [0.93, 0.92, 0.9] as [number, number, number], roughness: 0.78, metalness: 0 },
    { name: "UbGrab", color: [0.55, 0.55, 0.56] as [number, number, number], roughness: 0.42, metalness: 0.35 },
    { name: "UbWindow", color: [0.96, 0.95, 0.93] as [number, number, number], roughness: 0.45, metalness: 0.05 },
  ];

  const meshes: HeroMeshWithMat[] = [];
  const children: { name: string; mesh: number; extras?: Record<string, unknown> }[] =
    [];
  const push = (
    name: string,
    geo: Omit<HeroMesh, "name">,
    material: number,
    extras?: Record<string, unknown>,
  ) => {
    meshes.push({ name, ...geo, material });
    children.push({ name, mesh: meshes.length - 1, extras });
  };

  // Floor
  push("Hero_UbFloor", boxGeo(sx - T * 2, 0.018, sz - T * 2, sx / 2, 0.009, sz / 2), 3);

  // Ceiling
  push("Hero_UbCeiling", boxGeo(sx - T * 2, 0.02, sz - T * 2, sx / 2, H - 0.01, sz / 2), 5);

  // South wall (charcoal shower)
  push("Hero_UbWall_S", boxGeo(sx, H, T, sx / 2, H / 2, T / 2), 2);

  // West wall (cream)
  push("Hero_UbWall_W", boxGeo(T, H, sz, T / 2, H / 2, sz / 2), 1);

  // East wall around the window
  const eastX = sx - T / 2;
  push("Hero_UbWall_E_s", boxGeo(T, H, Math.max(winZ0, 0.02), eastX, H / 2, winZ0 / 2), 1);
  push(
    "Hero_UbWall_E_n",
    boxGeo(T, H, Math.max(sz - winZ1, 0.02), eastX, H / 2, (winZ1 + sz) / 2),
    1,
  );
  push(
    "Hero_UbWall_E_sill",
    boxGeo(T, Math.max(winY0, 0.02), winZ1 - winZ0, eastX, winY0 / 2, (winZ0 + winZ1) / 2),
    1,
  );
  push(
    "Hero_UbWall_E_head",
    boxGeo(
      T,
      Math.max(H - winY1, 0.02),
      winZ1 - winZ0,
      eastX,
      (winY1 + H) / 2,
      (winZ0 + winZ1) / 2,
    ),
    1,
  );

  // North wall (cream) around 洗面 shower door
  const northZ = sz - T / 2;
  push("Hero_UbWall_N_w", boxGeo(Math.max(doorX0, 0.02), H, T, doorX0 / 2, H / 2, northZ), 1);
  push(
    "Hero_UbWall_N_e",
    boxGeo(Math.max(sx - doorX1, 0.02), H, T, (doorX1 + sx) / 2, H / 2, northZ),
    1,
  );
  push(
    "Hero_UbWall_N_head",
    boxGeo(doorX1 - doorX0, Math.max(H - doorH, 0.02), T, (doorX0 + doorX1) / 2, (doorH + H) / 2, northZ),
    1,
  );

  // Window reveal
  const reveal = 0.06;
  const winCx = sx - T - reveal / 2;
  const winCz = (winZ0 + winZ1) / 2;
  const winCy = (winY0 + winY1) / 2;
  const winW = winZ1 - winZ0;
  const winH = winY1 - winY0;
  push("Hero_UbWindowReveal_sill", boxGeo(reveal + 0.04, 0.04, winW + 0.04, winCx, winY0 - 0.01, winCz), 7);
  push("Hero_UbWindowReveal_head", boxGeo(reveal, 0.04, winW + 0.04, winCx, winY1 + 0.02, winCz), 7);
  push("Hero_UbWindowReveal_s", boxGeo(reveal, winH, 0.04, winCx, winCy, winZ0 - 0.02), 7);
  push("Hero_UbWindowReveal_n", boxGeo(reveal, winH, 0.04, winCx, winCy, winZ1 + 0.02), 7);

  // Tub apron well (Node fallback; Blender booleans a Minamo cavity)
  const tw = p.width;
  const tl = p.length;
  const th = p.rimH;
  const wall = p.innerInset;
  push(
    "Hero_UbTub",
    boxGeo(wall, th, tl, tLoc.x - tw / 2 + wall / 2, th / 2, tLoc.z),
    0,
  );
  push(
    "Hero_UbTub_e",
    boxGeo(wall, th, tl, tLoc.x + tw / 2 - wall / 2, th / 2, tLoc.z),
    0,
  );
  push(
    "Hero_UbTub_s",
    boxGeo(tw, th, wall, tLoc.x, th / 2, tLoc.z - tl / 2 + wall / 2),
    0,
  );
  push(
    "Hero_UbTub_n",
    boxGeo(tw, th, wall, tLoc.x, th / 2, tLoc.z + tl / 2 - wall / 2),
    0,
  );
  push(
    "Hero_UbTubWell",
    boxGeo(tw - wall * 2, 0.022, tl - wall * 2, tLoc.x, th - p.basinDepth + 0.01, tLoc.z),
    0,
  );

  const btn = drainButtonPlan();
  push(
    "Hero_UbDrainButton",
    cylGeo(p.plug.r, p.plug.h, btn.x - o.x, btn.y - o.y, btn.z - o.z, "y", 18),
    4,
    { interactable: "plug" },
  );
  const hole = drainHolePlan();
  push(
    "Hero_UbDrainBore",
    cylGeo(p.drain.r + 0.004, 0.008, hole.x - o.x, hole.y - o.y - 0.004, hole.z - o.z, "y", 16),
    2,
  );
  push(
    "Hero_UbDrainPlug",
    cylGeo(p.drain.r, 0.008, hole.x - o.x, hole.y - o.y, hole.z - o.z, "y", 18),
    4,
  );

  const grabY = th - p.grab.belowRim;
  const grabX = tLoc.x - tw / 2 + wall + 0.02;
  push(
    "Hero_UbGrab",
    cylGeo(p.grab.r, p.grab.length, grabX, grabY, tLoc.z, "z", 14),
    6,
  );

  const mix = mixerPlan();
  const mx = mix.x - o.x;
  const my = mix.y - o.y;
  const mz = mix.z - o.z;
  push("Hero_UbFaucet", boxGeo(0.18, 0.055, 0.05, mx, my, mz), 4, { interactable: "faucet" });
  push("Hero_UbFaucet_knobL", cylGeo(0.018, 0.03, mx - 0.055, my, mz + 0.02, "z", 12), 4);
  push("Hero_UbFaucet_knobR", cylGeo(0.018, 0.03, mx + 0.055, my, mz + 0.02, "z", 12), 4);

  const barX = mx + 0.11;
  const barZ = mz + 0.02;
  push("Hero_UbShower_bar", cylGeo(0.011, p.faucet.barH, barX, p.faucet.barH / 2, barZ, "y", 12), 4);
  push("Hero_UbShower_head", cylGeo(0.042, 0.05, barX, p.faucet.barH - 0.08, barZ + 0.04, "z", 16), 4);
  push("Hero_UbShower_hose", cylGeo(0.007, 0.55, barX - 0.04, my + 0.12, barZ + 0.08, "y", 10), 4);

  const spout = spoutTipPlan();
  push(
    "Hero_UbSpout",
    cylGeo(0.012, p.faucet.spoutReach, spout.x - o.x, spout.y - o.y, spout.z - o.z, "z", 12),
    4,
  );

  // Floor drain grate on wash floor
  const gx = (p.x - p.width / 2 - o.x) * 0.55;
  const gz = tLoc.z + 0.08;
  push("Hero_UbFloorDrain", boxGeo(0.14, 0.008, 0.14, gx, 0.014, gz), 4);

  // Shelves on charcoal wall
  push("Hero_UbShelf_a", boxGeo(0.18, 0.03, 0.08, mx + 0.28, 1.35, mz + 0.02), 7);
  push("Hero_UbShelf_b", boxGeo(0.18, 0.03, 0.08, mx + 0.28, 1.12, mz + 0.02), 7);

  // Downlight rings
  push("Hero_UbLight_0", cylGeo(0.055, 0.012, sx * 0.38, H - 0.018, sz * 0.32, "y", 16), 5);
  push("Hero_UbLight_1", cylGeo(0.055, 0.012, sx * 0.38, H - 0.018, sz * 0.62, "y", 16), 5);

  return {
    meshes,
    materials,
    root: { name: "Hero_UbBath", children },
  };
}
