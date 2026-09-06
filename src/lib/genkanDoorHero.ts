/**
 * Locked genkan-door hero sizes — must match GENKAN_ENTRY + GenkanEntry.tsx.
 * Local space: hinge at origin; leaf extends −X; +Y up; exterior −Z.
 */
export const GENKAN_DOOR_HERO = {
  id: "hero-1f-genkan-door",
  /** Matches GenkanEntry frameReveal */
  frameReveal: 0.012,
  leafW: 1.52 - 0.012 * 2,
  leafH: 1.95 - 0.012 * 0.5,
  leafT: 0.048,
  boards: 5,
  gap: 0.004,
  bevel: 0.0035,
} as const;

export type HeroMesh = {
  name: string;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
};

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
      { n: [-1, 0, 0], v: [[-hx, -hy, hz], [-hx, -hy, -hz], [-hx, hy, -hz], [-hx, hy, hz]] },
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

/** Node DCC meshes (Blender bevels these if CLI is present). */
export function buildGenkanDoorMeshes(): {
  meshes: HeroMesh[];
  root: {
    name: string;
    children: { name: string; mesh: number; extras: Record<string, unknown> }[];
  };
} {
  const h = GENKAN_DOOR_HERO;
  const meshes: HeroMesh[] = [];
  const children: { name: string; mesh: number; extras: Record<string, unknown> }[] =
    [];
  const inner = h.leafW - h.gap * (h.boards - 1);
  const boardW = inner / h.boards;
  for (let i = 0; i < h.boards; i++) {
    const x0 = -h.leafW + i * (boardW + h.gap);
    const cx = x0 + boardW / 2;
    const name = i === 0 ? "Hero_GenkanDoor" : `Hero_GenkanDoor_${i}`;
    meshes.push({
      name,
      ...boxGeo(boardW, h.leafH, h.leafT, cx, h.leafH / 2, 0),
    });
    children.push({
      name,
      mesh: meshes.length - 1,
      extras: { hinge: true, doorId: "genkan" },
    });
  }
  const frame = [
    {
      name: "Hero_GenkanFrame",
      ...boxGeo(
        h.frameReveal,
        h.leafH + h.frameReveal,
        h.leafT * 0.95,
        -h.leafW - h.frameReveal / 2,
        h.leafH / 2,
        0,
      ),
    },
    {
      name: "Hero_GenkanFrame_east",
      ...boxGeo(
        h.frameReveal,
        h.leafH + h.frameReveal,
        h.leafT * 0.95,
        h.frameReveal / 2,
        h.leafH / 2,
        0,
      ),
    },
    {
      name: "Hero_GenkanFrame_head",
      ...boxGeo(
        h.leafW + h.frameReveal * 2,
        h.frameReveal,
        h.leafT * 0.95,
        -h.leafW / 2,
        h.leafH + h.frameReveal / 2,
        0,
      ),
    },
    {
      name: "Hero_GenkanFrame_sill",
      ...boxGeo(
        h.leafW + h.frameReveal,
        0.016,
        h.leafT * 1.05,
        -h.leafW / 2,
        0.008,
        0,
      ),
    },
  ];
  for (const f of frame) {
    meshes.push(f);
    children.push({
      name: f.name,
      mesh: meshes.length - 1,
      extras: { static: true },
    });
  }
  return {
    meshes,
    root: { name: "Hero_GenkanPortal", children },
  };
}
