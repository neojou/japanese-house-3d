/**
 * Scripted house baker — boxes from dimensions.ts (plan meters, Y-up).
 * Used by scripts/bake-house.mjs (Node glTF) and tools/dcc/build_house.py (JSON).
 */
import {
  ALL_CEILINGS,
  ALL_FLOOR_SLABS,
  BUILDING,
  COLORS,
  FLOOR_LEVELS,
  GENKAN_ENTRY,
  INTERIOR_FLOOR_Y,
  MATERIAL_PRESETS,
  PARKING_1F,
  SLIDE_DOORS,
  STAIR_WINDERS,
  STAIRS,
  SWING_DOORS,
  WALLS,
  type FloorId,
  type FloorSlab,
  type Opening,
  type SlideDoorDef,
  type StairFlight,
  type SwingDoorDef,
  type WallSegment,
} from "../data/dimensions.ts";

export type BakeMat = {
  name: string;
  color: [number, number, number];
  roughness: number;
  metalness: number;
  opacity?: number;
};

export type BakeMesh = {
  name: string;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  material: number;
};

export type BakeNode = {
  name: string;
  translation?: [number, number, number];
  rotation?: [number, number, number, number];
  rotY?: number;
  mesh?: number;
  extras?: Record<string, unknown>;
  children?: BakeNode[];
};

export type BoxSpec = {
  name: string;
  parent: string;
  size: [number, number, number];
  center: [number, number, number];
  rotY?: number;
  originOffset?: [number, number, number];
  color: [number, number, number];
  roughness: number;
  metalness: number;
  opacity?: number;
  extras?: Record<string, unknown>;
  bevel: number;
};

export type HouseBake = {
  sceneName: "House";
  materials: BakeMat[];
  meshes: BakeMesh[];
  root: BakeNode;
  specs: BoxSpec[];
};

type SolidPiece = {
  key: string;
  x: number;
  y: number;
  z: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
};

const LEAF_T = 0.04;
const FRAME_T = 0.05;

/** Finish hang-points — duplicated so Node bake does not import three.js. */
const YAKI_SUGI_WALL_IDS = new Set([
  "1f-jog-ldk-east",
  "1f-south-genkan-door",
]);
const INTERIOR_SECONDARY_WALL_IDS = new Set([
  "1f-int-toilet-w",
  "1f-int-toilet-e",
  "1f-int-toilet-s",
  "1f-int-senmen-w",
  "1f-int-scl-n-west",
  "1f-int-scl-w",
  "1f-int-cl-s",
  "1f-int-cl-e",
  "1f-int-yoshitsu-e",
  "2f-int-cl-split",
  "2f-int-sw-cl",
  "2f-int-cl-sc",
  "2f-int-toilet-s",
  "2f-int-toilet-e",
  "2f-int-nw-jog-toilet",
  "ph-hall-n",
  "ph-hall-w",
  "ph-hall-e",
  "ph-hall-s",
]);
const BATH_MARBLE_WALL_IDS = new Set([
  "1f-int-scl-ub-w",
  "1f-int-senmen-ub",
]);

function isExteriorShellId(id: string): boolean {
  if (id.includes("-int-")) return false;
  if (id.includes("-ext-") || id.includes("parapet") || id.includes("balc")) {
    return true;
  }
  if (/^1f-(south|east|north|west|jog)/.test(id)) return true;
  if (id.startsWith("ph-hall-") || id.startsWith("ph-balc-")) return true;
  if (id === "2f-ne-room-s") return true;
  return false;
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

function quatYaw(yaw: number): [number, number, number, number] {
  const h = yaw * 0.5;
  return [0, Math.sin(h), 0, Math.cos(h)];
}

export function doorFloorTag(floor?: FloorId): "1F" | "2F" | "PH" {
  if (floor === "2f") return "2F";
  if (floor === "ph") return "PH";
  return "1F";
}

export function doorNodeName(id: string, floor?: FloorId): string {
  return `Door_${doorFloorTag(floor)}_${id}`;
}

export function doorFrameName(id: string, floor?: FloorId): string {
  return `DoorFrame_${doorFloorTag(floor)}_${id}`;
}

function floorGroupName(floor: FloorId): string {
  if (floor === "2f") return "Floor_2F";
  if (floor === "ph") return "Floor_PH";
  return "Floor_1F";
}

function boxGeometry(
  sx: number,
  sy: number,
  sz: number,
  ox = 0,
  oy = 0,
  oz = 0,
): { positions: Float32Array; normals: Float32Array; indices: Uint32Array } {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const faces: { n: [number, number, number]; v: [number, number, number][] }[] =
    [
      {
        n: [0, 0, 1],
        v: [
          [-hx, -hy, hz],
          [hx, -hy, hz],
          [hx, hy, hz],
          [-hx, hy, hz],
        ],
      },
      {
        n: [0, 0, -1],
        v: [
          [hx, -hy, -hz],
          [-hx, -hy, -hz],
          [-hx, hy, -hz],
          [hx, hy, -hz],
        ],
      },
      {
        n: [1, 0, 0],
        v: [
          [hx, -hy, -hz],
          [hx, -hy, hz],
          [hx, hy, hz],
          [hx, hy, -hz],
        ],
      },
      {
        n: [-1, 0, 0],
        v: [
          [-hx, -hy, hz],
          [-hx, -hy, -hz],
          [-hx, hy, -hz],
          [-hx, hy, hz],
        ],
      },
      {
        n: [0, 1, 0],
        v: [
          [-hx, hy, hz],
          [hx, hy, hz],
          [hx, hy, -hz],
          [-hx, hy, -hz],
        ],
      },
      {
        n: [0, -1, 0],
        v: [
          [-hx, -hy, -hz],
          [hx, -hy, -hz],
          [hx, -hy, hz],
          [-hx, -hy, hz],
        ],
      },
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

function solidPiecesForWall(wall: WallSegment): SolidPiece[] {
  const wallHeight = wall.height ?? BUILDING.wallHeight;
  const baseY = FLOOR_LEVELS[wall.floor];
  const openings = wall.openings ?? [];
  const alongX = wall.lengthX >= wall.lengthZ;

  if (openings.length === 0) {
    return [
      {
        key: wall.id,
        x: wall.x,
        y: baseY + wallHeight / 2,
        z: wall.z,
        sizeX: wall.lengthX,
        sizeY: wallHeight,
        sizeZ: wall.lengthZ,
      },
    ];
  }

  const sorted = [...openings].sort((a, b) => a.fromStart - b.fromStart);
  const length = alongX ? wall.lengthX : wall.lengthZ;
  const thickness = alongX ? wall.lengthZ : wall.lengthX;
  const startCoord = alongX
    ? wall.x - wall.lengthX / 2
    : wall.z - wall.lengthZ / 2;
  const pieces: SolidPiece[] = [];
  let cursor = 0;

  const pushFullHeight = (from: number, to: number, key: string) => {
    const segLen = to - from;
    if (segLen < 0.01) return;
    const mid = startCoord + (from + to) / 2;
    pieces.push({
      key,
      x: alongX ? mid : wall.x,
      y: baseY + wallHeight / 2,
      z: alongX ? wall.z : mid,
      sizeX: alongX ? segLen : thickness,
      sizeY: wallHeight,
      sizeZ: alongX ? thickness : segLen,
    });
  };

  const pushBand = (
    opening: Opening,
    y0: number,
    y1: number,
    key: string,
  ) => {
    const h = y1 - y0;
    if (h < 0.01) return;
    const mid = startCoord + opening.fromStart + opening.width / 2;
    pieces.push({
      key,
      x: alongX ? mid : wall.x,
      y: baseY + (y0 + y1) / 2,
      z: alongX ? wall.z : mid,
      sizeX: alongX ? opening.width : thickness,
      sizeY: h,
      sizeZ: alongX ? thickness : opening.width,
    });
  };

  sorted.forEach((opening, i) => {
    const openStart = opening.fromStart;
    const openEnd = opening.fromStart + opening.width;
    const a = Math.max(0, Math.min(length, openStart));
    const b = Math.max(0, Math.min(length, openEnd));
    pushFullHeight(cursor, a, `${wall.id}-solid-${i}`);
    const sill = opening.sill ?? 0;
    const openTop = sill + opening.height;
    pushBand(opening, 0, sill, `${wall.id}-sill-${i}`);
    pushBand(opening, openTop, wallHeight, `${wall.id}-lintel-${i}`);
    cursor = Math.max(cursor, b);
  });
  pushFullHeight(cursor, length, `${wall.id}-solid-end`);
  return pieces;
}

function wallMat(id: string): BakeMat {
  if (YAKI_SUGI_WALL_IDS.has(id)) {
    return {
      name: "yakiSugi",
      color: hexRgb("#3a322c"),
      roughness: 0.82,
      metalness: 0.04,
    };
  }
  if (BATH_MARBLE_WALL_IDS.has(id)) {
    return {
      name: "bathMarble",
      color: hexRgb("#5c5854"),
      roughness: 0.55,
      metalness: 0.06,
    };
  }
  if (isExteriorShellId(id)) {
    return {
      name: "stucco",
      color: hexRgb("#f3eee4"),
      roughness: MATERIAL_PRESETS.wallExterior.roughness,
      metalness: 0,
    };
  }
  if (
    INTERIOR_SECONDARY_WALL_IDS.has(id) ||
    id.includes("-cl") ||
    id.includes("toilet") ||
    id.includes("senmen")
  ) {
    return {
      name: "interiorSecondary",
      color: hexRgb(COLORS.wallSecondary),
      roughness: 0.88,
      metalness: 0,
    };
  }
  return {
    name: "interiorMain",
    color: hexRgb(COLORS.wall),
    roughness: MATERIAL_PRESETS.wallInterior.roughness,
    metalness: 0,
  };
}

function slabMat(slab: FloorSlab): BakeMat {
  const id = slab.id;
  if (id.includes("genkan") && !id.includes("ceil")) {
    return {
      name: "floorGenkan",
      color: hexRgb("#4a4844"),
      roughness: 0.9,
      metalness: 0.03,
    };
  }
  if (id.includes("ub") && id.startsWith("1f") && !id.includes("ceil")) {
    return {
      name: "floorBath",
      color: hexRgb("#c4b896"),
      roughness: 0.86,
      metalness: 0.04,
    };
  }
  if (id.includes("balc") || id.includes("balcony") || id.includes("parking")) {
    return {
      name: "floorOutdoor",
      color: hexRgb(COLORS.floorOutdoor),
      roughness: MATERIAL_PRESETS.floorOutdoor.roughness,
      metalness: 0,
    };
  }
  if (
    id.includes("stair") ||
    id.includes("deck") ||
    id.includes("landing") ||
    id.includes("approach")
  ) {
    return {
      name: "floorStair",
      color: hexRgb(COLORS.floorStair),
      roughness: MATERIAL_PRESETS.floorStair.roughness,
      metalness: 0,
    };
  }
  if (id.startsWith("ceil")) {
    return {
      name: "ceiling",
      color: hexRgb(COLORS.ceiling),
      roughness: MATERIAL_PRESETS.ceiling.roughness,
      metalness: 0,
    };
  }
  return {
    name: "floorInterior",
    color: hexRgb(COLORS.floor),
    roughness: MATERIAL_PRESETS.floorInterior.roughness,
    metalness: 0,
  };
}

type Ctx = {
  materials: BakeMat[];
  matIndex: Map<string, number>;
  meshes: BakeMesh[];
  specs: BoxSpec[];
  groups: Map<string, BakeNode>;
};

function matKey(m: BakeMat): string {
  return `${m.name}:${m.color.join(",")}:${m.roughness}:${m.metalness}:${m.opacity ?? 1}`;
}

function ensureMat(ctx: Ctx, m: BakeMat): number {
  const k = matKey(m);
  const hit = ctx.matIndex.get(k);
  if (hit != null) return hit;
  const i = ctx.materials.length;
  ctx.materials.push(m);
  ctx.matIndex.set(k, i);
  return i;
}

function ensureGroup(ctx: Ctx, name: string, parent?: BakeNode): BakeNode {
  let n = ctx.groups.get(name);
  if (!n) {
    n = { name, children: [] };
    ctx.groups.set(name, n);
    parent?.children?.push(n);
  }
  return n;
}

function addBox(
  ctx: Ctx,
  parent: BakeNode,
  spec: Omit<BoxSpec, "parent"> & { parent?: string },
) {
  const matI = ensureMat(ctx, {
    name: spec.name.split("_")[0] ?? "mat",
    color: spec.color,
    roughness: spec.roughness,
    metalness: spec.metalness,
    opacity: spec.opacity,
  });
  const ox = spec.originOffset?.[0] ?? 0;
  const oy = spec.originOffset?.[1] ?? 0;
  const oz = spec.originOffset?.[2] ?? 0;
  const geo = boxGeometry(spec.size[0], spec.size[1], spec.size[2], ox, oy, oz);
  const meshI = ctx.meshes.length;
  ctx.meshes.push({
    name: spec.name,
    ...geo,
    material: matI,
  });
  const node: BakeNode = {
    name: spec.name,
    translation: spec.center,
    mesh: meshI,
    extras: spec.extras,
  };
  if (spec.rotY) {
    node.rotation = quatYaw(spec.rotY);
    node.rotY = spec.rotY;
  }
  parent.children = parent.children ?? [];
  parent.children.push(node);
  ctx.specs.push({
    ...spec,
    parent: parent.name,
    bevel: spec.bevel,
  });
}

function directionOffset(
  direction: StairFlight["direction"],
  distance: number,
): [number, number] {
  switch (direction) {
    case "north":
      return [0, distance];
    case "south":
      return [0, -distance];
    case "east":
      return [distance, 0];
    case "west":
      return [-distance, 0];
  }
}

export function buildHouseBake(): HouseBake {
  const ctx: Ctx = {
    materials: [],
    matIndex: new Map(),
    meshes: [],
    specs: [],
    groups: new Map(),
  };
  const house = ensureGroup(ctx, "House");
  const f1 = ensureGroup(ctx, "Floor_1F", house);
  const f2 = ensureGroup(ctx, "Floor_2F", house);
  const fph = ensureGroup(ctx, "Floor_PH", house);
  const floors: Record<string, BakeNode> = {
    Floor_1F: f1,
    Floor_2F: f2,
    Floor_PH: fph,
  };

  ensureGroup(ctx, "Walls_1F", f1);
  ensureGroup(ctx, "Slab_1F", f1);
  ensureGroup(ctx, "Ceiling_1F", f1);
  ensureGroup(ctx, "Genkan", f1);
  ensureGroup(ctx, "Stair_1F_to_2F", f1);
  ensureGroup(ctx, "Walls_2F", f2);
  ensureGroup(ctx, "Slab_2F", f2);
  ensureGroup(ctx, "Ceiling_2F", f2);
  ensureGroup(ctx, "Stair_2F_to_PH", f2);
  ensureGroup(ctx, "Walls_PH", fph);
  ensureGroup(ctx, "Balcony_PH", fph);
  ensureGroup(ctx, "Stair_PH", fph);
  ensureGroup(ctx, "Slab_PH", fph);
  ensureGroup(ctx, "Ceiling_PH", fph);

  for (const wall of WALLS) {
    const parentName =
      wall.floor === "2f"
        ? "Walls_2F"
        : wall.floor === "ph"
          ? "Walls_PH"
          : "Walls_1F";
    const parent = ctx.groups.get(parentName)!;
    const mat = wallMat(wall.id);
    for (const p of solidPiecesForWall(wall)) {
      addBox(ctx, parent, {
        name: p.key,
        size: [p.sizeX, p.sizeY, p.sizeZ],
        center: [p.x, p.y, p.z],
        color: mat.color,
        roughness: mat.roughness,
        metalness: mat.metalness,
        bevel: 0.006,
      });
    }
  }

  for (const slab of ALL_FLOOR_SLABS) {
    const { rect, thickness, y, id, floor } = slab;
    let parentName =
      floor === "2f" ? "Slab_2F" : floor === "ph" ? "Slab_PH" : "Slab_1F";
    if (
      floor === "ph" &&
      (id.includes("balc") || id.includes("balcony") || id.includes("roof"))
    ) {
      parentName = "Balcony_PH";
    }
    const parent = ctx.groups.get(parentName)!;
    const mat = slabMat(slab);
    addBox(ctx, parent, {
      name: id,
      size: [rect.width, thickness, rect.depth],
      center: [rect.x + rect.width / 2, y - thickness / 2, rect.z + rect.depth / 2],
      color: mat.color,
      roughness: mat.roughness,
      metalness: mat.metalness,
      bevel: 0.004,
    });
  }

  for (const slab of ALL_CEILINGS) {
    const { rect, thickness, y, id, floor } = slab;
    const parentName =
      floor === "2f"
        ? "Ceiling_2F"
        : floor === "ph"
          ? "Ceiling_PH"
          : "Ceiling_1F";
    const parent = ctx.groups.get(parentName)!;
    const mat = slabMat(slab);
    addBox(ctx, parent, {
      name: id,
      size: [rect.width, thickness, rect.depth],
      center: [rect.x + rect.width / 2, y - thickness / 2, rect.z + rect.depth / 2],
      color: mat.color,
      roughness: mat.roughness,
      metalness: mat.metalness,
      bevel: 0.003,
    });
  }

  const stairMat: BakeMat = {
    name: "stair",
    color: hexRgb(COLORS.stair),
    roughness: MATERIAL_PRESETS.stair.roughness,
    metalness: 0,
  };

  const stairParent = (from: FloorId): BakeNode => {
    if (from === "2f") return ctx.groups.get("Stair_2F_to_PH")!;
    if (from === "ph") return ctx.groups.get("Stair_PH")!;
    return ctx.groups.get("Stair_1F_to_2F")!;
  };

  for (const flight of STAIRS) {
    const parent = stairParent(flight.fromFloor);
    const alongX = flight.direction === "east" || flight.direction === "west";
    for (let i = 0; i < flight.stepCount; i++) {
      const along = (i + 0.5) * flight.treadDepth;
      const [dx, dz] = directionOffset(flight.direction, along);
      const y = flight.baseY + (i + 0.5) * flight.riserHeight;
      addBox(ctx, parent, {
        name: `${flight.id}-step-${i}`,
        size: [
          alongX ? flight.treadDepth : flight.width,
          flight.riserHeight,
          alongX ? flight.width : flight.treadDepth,
        ],
        center: [flight.x + dx, y, flight.z + dz],
        color: stairMat.color,
        roughness: stairMat.roughness,
        metalness: 0,
        bevel: 0.008,
      });
    }
  }

  for (const winder of STAIR_WINDERS) {
    const parent = stairParent(winder.fromFloor);
    const n = winder.stepCount;
    const rMid = (winder.rInner + winder.rOuter) / 2;
    const radial = winder.rOuter - winder.rInner;
    const dAng = winder.sweep / n;
    for (let i = 0; i < n; i++) {
      const a0 = winder.startAngle + i * dAng;
      const a1 = winder.startAngle + (i + 1) * dAng;
      const aMid = (a0 + a1) / 2;
      const x = winder.pivotX + rMid * Math.cos(aMid);
      const z = winder.pivotZ + rMid * Math.sin(aMid);
      const y = winder.baseY + (i + 0.5) * winder.riserHeight;
      const chord = Math.abs(rMid * dAng) * 1.05;
      const yaw = aMid + Math.PI / 2;
      addBox(ctx, parent, {
        name: `${winder.id}-w-${i}`,
        size: [chord, winder.riserHeight, radial],
        center: [x, y, z],
        rotY: -yaw,
        color: stairMat.color,
        roughness: stairMat.roughness,
        metalness: 0,
        bevel: 0.006,
      });
    }
  }

  const doorWood: BakeMat = {
    name: "doorWood",
    color: hexRgb(COLORS.genkanDoor),
    roughness: MATERIAL_PRESETS.doorWood.roughness,
    metalness: 0,
  };
  const doorFrame: BakeMat = {
    name: "doorFrame",
    color: hexRgb(COLORS.wallAccent),
    roughness: MATERIAL_PRESETS.doorFrame.roughness,
    metalness: 0.02,
  };

  for (const def of SWING_DOORS) {
    addSwingDoor(ctx, floors, def, doorWood, doorFrame);
  }
  addGenkanDoor(ctx, doorWood, doorFrame);
  for (const def of SLIDE_DOORS) {
    addSlideDoor(ctx, floors, def, doorFrame);
  }

  addWindows(ctx);
  addGenkanSteps(ctx);
  addParking(ctx);

  return {
    sceneName: "House",
    materials: ctx.materials,
    meshes: ctx.meshes,
    root: house,
    specs: ctx.specs,
  };
}

function addSwingDoor(
  ctx: Ctx,
  floors: Record<string, BakeNode>,
  def: SwingDoorDef,
  wood: BakeMat,
  frame: BakeMat,
) {
  const floor = def.floor ?? "1f";
  const parent = floors[floorGroupName(floor)];
  const leafW = Math.abs(def.alongMax - def.alongMin) - 0.02;
  const leafH = def.height - FRAME_T - 0.01;
  const baseY = FLOOR_LEVELS[floor];
  const sillY = baseY + def.sill;
  const hingeAlong = def.hingeAt === "min" ? def.alongMin : def.alongMax;
  const leafDir = def.hingeAt === "min" ? 1 : -1;
  const hinge: [number, number, number] =
    def.axis === "ew"
      ? [hingeAlong, sillY, def.wallZ]
      : [def.wallX, sillY, hingeAlong];
  const baseYaw = def.axis === "ns" ? -Math.PI / 2 : 0;
  const name = doorNodeName(def.id, def.floor);
  const frameName = doorFrameName(def.id, def.floor);

  const matI = ensureMat(ctx, wood);
  const geo = boxGeometry(
    leafW,
    leafH,
    LEAF_T,
    (leafDir * leafW) / 2,
    leafH / 2,
    0,
  );
  const meshI = ctx.meshes.length;
  ctx.meshes.push({ name, ...geo, material: matI });
  parent.children = parent.children ?? [];
  parent.children.push({
    name,
    translation: hinge,
    rotation: quatYaw(baseYaw),
    rotY: baseYaw,
    mesh: meshI,
    extras: {
      doorId: def.id,
      kind: "swing",
      baseYaw,
      openSign: def.openSign,
      openAngleDeg: def.openAngleDeg,
      axis: def.axis,
      hinge: true,
    },
  });
  ctx.specs.push({
    name,
    parent: parent.name,
    size: [leafW, leafH, LEAF_T],
    center: hinge,
    rotY: baseYaw,
    originOffset: [(leafDir * leafW) / 2, leafH / 2, 0],
    color: wood.color,
    roughness: wood.roughness,
    metalness: 0,
    extras: {
      doorId: def.id,
      kind: "swing",
      baseYaw,
      openSign: def.openSign,
      openAngleDeg: def.openAngleDeg,
      axis: def.axis,
      hinge: true,
    },
    bevel: 0.004,
  });

  const frameParent = parent;
  if (def.axis === "ew") {
    addBox(ctx, frameParent, {
      name: `${frameName}-min`,
      size: [FRAME_T, def.height, BUILDING.wallThickness],
      center: [def.alongMin + FRAME_T / 2, sillY + def.height / 2, def.wallZ],
      color: frame.color,
      roughness: frame.roughness,
      metalness: frame.metalness,
      bevel: 0.003,
    });
    addBox(ctx, frameParent, {
      name: `${frameName}-max`,
      size: [FRAME_T, def.height, BUILDING.wallThickness],
      center: [def.alongMax - FRAME_T / 2, sillY + def.height / 2, def.wallZ],
      color: frame.color,
      roughness: frame.roughness,
      metalness: frame.metalness,
      bevel: 0.003,
    });
    addBox(ctx, frameParent, {
      name: `${frameName}-lintel`,
      size: [leafW + 0.02, FRAME_T, BUILDING.wallThickness],
      center: [
        (def.alongMin + def.alongMax) / 2,
        sillY + def.height - FRAME_T / 2,
        def.wallZ,
      ],
      color: frame.color,
      roughness: frame.roughness,
      metalness: frame.metalness,
      bevel: 0.003,
    });
  } else {
    addBox(ctx, frameParent, {
      name: `${frameName}-min`,
      size: [BUILDING.wallThickness, def.height, FRAME_T],
      center: [def.wallX, sillY + def.height / 2, def.alongMin + FRAME_T / 2],
      color: frame.color,
      roughness: frame.roughness,
      metalness: frame.metalness,
      bevel: 0.003,
    });
    addBox(ctx, frameParent, {
      name: `${frameName}-max`,
      size: [BUILDING.wallThickness, def.height, FRAME_T],
      center: [def.wallX, sillY + def.height / 2, def.alongMax - FRAME_T / 2],
      color: frame.color,
      roughness: frame.roughness,
      metalness: frame.metalness,
      bevel: 0.003,
    });
    addBox(ctx, frameParent, {
      name: `${frameName}-lintel`,
      size: [BUILDING.wallThickness, FRAME_T, leafW + 0.02],
      center: [
        def.wallX,
        sillY + def.height - FRAME_T / 2,
        (def.alongMin + def.alongMax) / 2,
      ],
      color: frame.color,
      roughness: frame.roughness,
      metalness: frame.metalness,
      bevel: 0.003,
    });
  }
}

function addGenkanDoor(ctx: Ctx, wood: BakeMat, frame: BakeMat) {
  const g = GENKAN_ENTRY;
  const parent = ctx.groups.get("Genkan")!;
  const bayW = g.x1 - g.x0;
  const wallZ = g.z;
  const halfT = BUILDING.wallThickness / 2;
  const frameReveal = 0.012;
  const leafW = bayW - 2 * frameReveal;
  const leafH = g.openingHeight - frameReveal * 0.5;
  const leafT = Math.max(g.leafThickness, 0.048);
  const hingeX = g.x1 - frameReveal;
  const sillY = g.sill;
  const leafZ = wallZ - halfT + leafT / 2 + 0.002;
  const name = doorNodeName("genkan", "1f");
  const yaki: BakeMat = {
    name: "yakiDoor",
    color: hexRgb("#3a322c"),
    roughness: 0.78,
    metalness: 0.04,
  };
  const matI = ensureMat(ctx, yaki);
  const geo = boxGeometry(leafW, leafH, leafT, -leafW / 2, leafH / 2, 0);
  const meshI = ctx.meshes.length;
  ctx.meshes.push({ name, ...geo, material: matI });
  parent.children = parent.children ?? [];
  parent.children.push({
    name,
    translation: [hingeX, sillY, leafZ],
    mesh: meshI,
    extras: {
      doorId: "genkan",
      kind: "genkan",
      baseYaw: 0,
      openSign: -1,
      openAngleDeg: g.openAngleDeg,
      axis: "ew",
      hinge: true,
    },
  });
  ctx.specs.push({
    name,
    parent: "Genkan",
    size: [leafW, leafH, leafT],
    center: [hingeX, sillY, leafZ],
    originOffset: [-leafW / 2, leafH / 2, 0],
    color: yaki.color,
    roughness: yaki.roughness,
    metalness: yaki.metalness,
    extras: {
      doorId: "genkan",
      kind: "genkan",
      baseYaw: 0,
      openSign: -1,
      openAngleDeg: g.openAngleDeg,
      hinge: true,
    },
    bevel: 0.004,
  });
  addBox(ctx, parent, {
    name: `${doorFrameName("genkan", "1f")}-lintel`,
    size: [bayW, 0.05, BUILDING.wallThickness],
    center: [ (g.x0 + g.x1) / 2, sillY + g.openingHeight + 0.025, wallZ],
    color: frame.color,
    roughness: frame.roughness,
    metalness: frame.metalness,
    bevel: 0.003,
  });
  void wood;
}

function addSlideDoor(
  ctx: Ctx,
  floors: Record<string, BakeNode>,
  def: SlideDoorDef,
  frame: BakeMat,
) {
  const floor = def.floor ?? "1f";
  const parent = floors[floorGroupName(floor)];
  const openingW = Math.abs(def.alongMax - def.alongMin);
  const n = def.panels;
  const overlap = 0.04;
  const leafW =
    n === 2 ? (openingW + overlap) / 2 + 0.01 : openingW - 0.02;
  const leafH = def.height - 0.04;
  const baseY = FLOOR_LEVELS[floor];
  const sillY = baseY + def.sill;
  const dir = def.openToward === "min" ? -1 : 1;
  const closedA =
    n === 2
      ? def.alongMin + leafW / 2 - overlap * 0.25
      : (def.alongMin + def.alongMax) / 2;
  const closedB =
    n === 2 ? def.alongMax - leafW / 2 + overlap * 0.25 : closedA;
  const glass: BakeMat = {
    name: "slideGlass",
    color: hexRgb(def.glassColor ?? "#f2ebe0"),
    roughness: 0.72,
    metalness: 0.05,
    opacity: def.glassOpacity ?? 0.42,
  };
  const t = 0.028;
  const travelA = leafW * 0.88;
  const travelB = leafW * 0.88 + leafW * 0.72;
  const panels = n === 2 ? [closedA, closedB] : [closedA];
  const travels = n === 2 ? [travelA, travelB] : [travelA];
  panels.forEach((along, i) => {
    const id = i === 0 ? def.id : `${def.id}_B`;
    const name = doorNodeName(id, def.floor);
    const center: [number, number, number] =
      def.axis === "ew"
        ? [along, sillY + leafH / 2, def.wallZ + (i === 0 ? 0.012 : -0.018)]
        : [def.wallX + (i === 0 ? 0.012 : -0.018), sillY + leafH / 2, along];
    const size: [number, number, number] =
      def.axis === "ew" ? [leafW, leafH, t] : [t, leafH, leafW];
    addBox(ctx, parent, {
      name,
      size,
      center,
      color: glass.color,
      roughness: glass.roughness,
      metalness: glass.metalness,
      opacity: glass.opacity,
      extras: {
        doorId: def.id,
        kind: "slide",
        panel: i,
        axis: def.axis,
        dir,
        travel: travels[i],
        along: def.axis === "ew" ? "x" : "z",
      },
      bevel: 0.002,
    });
  });
  const mid = (def.alongMin + def.alongMax) / 2;
  addBox(ctx, parent, {
    name: `${doorFrameName(def.id, def.floor)}-track`,
    size:
      def.axis === "ew"
        ? [openingW + 0.08, 0.016, 0.055]
        : [0.055, 0.016, openingW + 0.08],
    center:
      def.axis === "ew"
        ? [mid, sillY + 0.008, def.wallZ]
        : [def.wallX, sillY + 0.008, mid],
    color: frame.color,
    roughness: 0.65,
    metalness: 0.2,
    bevel: 0.002,
  });
}

function addWindows(ctx: Ctx) {
  const glass: BakeMat = {
    name: "glass",
    color: hexRgb(COLORS.glass),
    roughness: MATERIAL_PRESETS.glass.roughness,
    metalness: MATERIAL_PRESETS.glass.metalness,
    opacity: MATERIAL_PRESETS.glass.opacity,
  };
  const frost: BakeMat = {
    name: "frostedGlass",
    color: hexRgb("#d8e0e4"),
    roughness: 0.88,
    metalness: 0.04,
    opacity: 0.72,
  };
  for (const wall of WALLS) {
    const parentName =
      wall.floor === "2f"
        ? "Walls_2F"
        : wall.floor === "ph"
          ? "Walls_PH"
          : "Walls_1F";
    const parent = ctx.groups.get(parentName)!;
    const alongX = wall.lengthX >= wall.lengthZ;
    const startCoord = alongX
      ? wall.x - wall.lengthX / 2
      : wall.z - wall.lengthZ / 2;
    const baseY = FLOOR_LEVELS[wall.floor];
    for (const opening of wall.openings ?? []) {
      if (opening.type !== "window") continue;
      const mid = startCoord + opening.fromStart + opening.width / 2;
      const sill = opening.sill ?? INTERIOR_FLOOR_Y;
      const y = baseY + sill + opening.height / 2;
      const t = 0.03;
      const x = alongX ? mid : wall.x;
      const z = alongX ? wall.z : mid;
      const sizeX = alongX ? opening.width * 0.88 : t;
      const sizeZ = alongX ? t : opening.width * 0.88;
      const mat = opening.glazing === "frosted" ? frost : glass;
      addBox(ctx, parent, {
        name: `Win_${opening.id}`,
        size: [sizeX, opening.height * 0.88, sizeZ],
        center: [x, y, z],
        color: mat.color,
        roughness: mat.roughness,
        metalness: mat.metalness,
        opacity: mat.opacity,
        bevel: 0.002,
      });
    }
  }
}

function addGenkanSteps(ctx: Ctx) {
  const parent = ctx.groups.get("Genkan")!;
  const g = GENKAN_ENTRY;
  const midX = (g.x0 + g.x1) / 2;
  const face = g.z - BUILDING.wallThickness / 2;
  const mat: BakeMat = {
    name: "step",
    color: hexRgb(COLORS.step),
    roughness: MATERIAL_PRESETS.step.roughness,
    metalness: 0,
  };
  for (let i = 0; i < g.stepCount; i++) {
    const z1 = face - (i + 1) * g.stepDepth;
    const z0 = face - i * g.stepDepth;
    const h = (i + 1) * g.stepHeight;
    addBox(ctx, parent, {
      name: `genkan-step-${i}`,
      size: [g.stepWidth, h, g.stepDepth],
      center: [midX, h / 2, (z0 + z1) / 2],
      color: mat.color,
      roughness: mat.roughness,
      metalness: 0,
      bevel: 0.01,
    });
  }
}

function addParking(ctx: Ctx) {
  const parent = ctx.groups.get("Floor_1F")!;
  const p = PARKING_1F;
  addBox(ctx, parent, {
    name: "parking-1f",
    size: [p.width, 0.04, p.depth],
    center: [p.x + p.width / 2, -0.02, p.z + p.depth / 2],
    color: hexRgb(COLORS.parking),
    roughness: MATERIAL_PRESETS.parking.roughness,
    metalness: 0,
    bevel: 0.002,
  });
}

export function houseBakeJson(bake: HouseBake) {
  return {
    units: "meters",
    axes: "+X east, +Y up, +Z north",
    origin: "SW",
    building: { width: BUILDING.width, depth: BUILDING.depth },
    specs: bake.specs,
  };
}
