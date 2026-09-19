/**
 * Giesta 2 fire-door inspired hero (no trademarks).
 * Local: hinge origin WEST; leaf +X east (handle); +Y up; exterior −Z.
 */
export const GENKAN_DOOR_HERO = {
  id: "hero-1f-genkan-door",
  frameReveal: 0.05,
  leafW: 1.52 - 0.05 * 2,
  leafH: 1.95 - 0.02,
  leafT: 0.052,
  boards: 9,
  glassSlats: [2, 4] as const,
  bevel: 0.0022,
  openSign: 1,
  hingeSide: "west" as const,
  handleSide: "east" as const,
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

export type HeroMeshWithMat = HeroMesh & { material: number };

/** Node DCC fallback (Blender path is preferred). */
export function buildGenkanDoorMeshes(): {
  meshes: HeroMeshWithMat[];
  materials: {
    name: string;
    color: [number, number, number];
    roughness: number;
    metalness: number;
    opacity?: number;
  }[];
  root: {
    name: string;
    children: { name: string; mesh: number; extras: Record<string, unknown> }[];
  };
} {
  const h = GENKAN_DOOR_HERO;
  const materials = [
    { name: "GiestaWoodExt", color: [0.18, 0.11, 0.07] as [number, number, number], roughness: 0.78, metalness: 0.02 },
    { name: "GiestaFrame", color: [0.07, 0.06, 0.055] as [number, number, number], roughness: 0.42, metalness: 0.55 },
    { name: "GiestaGlass", color: [0.86, 0.88, 0.9] as [number, number, number], roughness: 0.2, metalness: 0, opacity: 0.55 },
    { name: "GiestaHandle", color: [0.12, 0.12, 0.12] as [number, number, number], roughness: 0.35, metalness: 0.7 },
  ];
  const meshes: HeroMeshWithMat[] = [];
  const children: { name: string; mesh: number; extras: Record<string, unknown> }[] =
    [];
  const push = (
    name: string,
    geo: ReturnType<typeof boxGeo>,
    material: number,
    extras: Record<string, unknown>,
  ) => {
    meshes.push({ name, ...geo, material });
    children.push({ name, mesh: meshes.length - 1, extras });
  };
  push(
    "Hero_GenkanDoor",
    boxGeo(h.leafW, h.leafH, h.leafT, h.leafW / 2, h.leafH / 2, 0),
    0,
    { hinge: true, doorId: "genkan", hingeSide: "west" },
  );
  const slatW = h.leafW / h.boards;
  for (let i = 0; i < h.boards; i++) {
    const cx = slatW * (i + 0.5);
    const isGlass = (h.glassSlats as readonly number[]).includes(i);
    if (isGlass) {
      push(
        `Hero_GenkanGlass_ext_${i}`,
        boxGeo(slatW * 0.42, h.leafH * 0.78, 0.01, cx, h.leafH * 0.52, -h.leafT / 2 + 0.004),
        2,
        { hinge: true, doorId: "genkan" },
      );
    } else {
      push(
        `Hero_GenkanSlat_${i}`,
        boxGeo(slatW * 0.88, h.leafH - 0.04, 0.01, cx, h.leafH / 2, -h.leafT / 2 + 0.003),
        0,
        { hinge: true, doorId: "genkan" },
      );
    }
  }
  push(
    "Hero_GenkanGlass_int",
    boxGeo(0.22, h.leafH * 0.72, 0.01, h.leafW - 0.2, h.leafH * 0.52, h.leafT / 2 - 0.003),
    2,
    { hinge: true, doorId: "genkan" },
  );
  push(
    "Hero_GenkanHandle_out",
    boxGeo(0.022, 0.92, 0.032, h.leafW - 0.065, 0.92, -h.leafT / 2 - 0.018),
    3,
    { hinge: true, doorId: "genkan" },
  );
  const fw = h.frameReveal;
  push(
    "Hero_GenkanFrame",
    boxGeo(fw, h.leafH + fw, h.leafT * 1.2, -fw / 2, h.leafH / 2, 0),
    1,
    { static: true },
  );
  push(
    "Hero_GenkanFrame_east",
    boxGeo(fw, h.leafH + fw, h.leafT * 1.2, h.leafW + fw / 2, h.leafH / 2, 0),
    1,
    { static: true },
  );
  push(
    "Hero_GenkanFrame_head",
    boxGeo(h.leafW + fw * 2, fw, h.leafT * 1.2, h.leafW / 2, h.leafH + fw / 2, 0),
    1,
    { static: true },
  );
  return { meshes, materials, root: { name: "Hero_GenkanPortal", children } };
}
