/**
 * Centralized building dimensions (meters) — Phase 1 / 1F exterior focus.
 *
 * Plan: docs/2d-floors/FirstFloor.jpeg
 *
 * Plan-space coordinates (wall data below; LDK = west = small X):
 *   Origin = southwest corner of LDK outer face
 *   +X = east, +Z = north, +Y = up
 *
 * Display: Scene mirrors the house in X (lib/coords.ts) so north-facing
 * views match the PDF (left=LDK, right=genkan). Do not double-flip data.
 *
 * South façade chain (bottom of plan, W→E) — user-specified:
 *   2.175 + 4.195  LDK 南牆 at z = 0
 *   内縮 2.755     parking recess depth → genkan/SCL face at z = 2.755
 *   1.520          玄関大门
 *   1.210          SCL 南牆
 *   外推 → z=2.720 UB 南面 (right-side chain 2,720)
 *   1.820          UB 南牆
 *   Sum: 2.175+4.195+1.520+1.210+1.820 = 10.920 ✓
 */

// ─────────────────────────────────────────────────────────────
// Primitive types
// ─────────────────────────────────────────────────────────────

export type FloorId = "1f" | "2f" | "ph";

export type Rect2 = {
  x: number;
  z: number;
  width: number;
  depth: number;
};

export type OpeningType = "door" | "opening";

export type Opening = {
  id: string;
  /** From lower-coordinate end of wall (smaller X for EW, smaller Z for NS). */
  fromStart: number;
  width: number;
  height: number;
  type: OpeningType;
};

export type WallSegment = {
  id: string;
  x: number;
  z: number;
  lengthX: number;
  lengthZ: number;
  floor: FloorId;
  openings?: Opening[];
  label?: string;
};

export type FloorSlab = {
  id: string;
  floor: FloorId;
  y: number;
  rect: Rect2;
  thickness: number;
  label?: string;
  color?: string;
};

export type Cardinal = "north" | "south" | "east" | "west";

export type StairFlight = {
  id: string;
  fromFloor: FloorId;
  x: number;
  z: number;
  direction: Cardinal;
  stepCount: number;
  treadDepth: number;
  riserHeight: number;
  width: number;
  label?: string;
};

// ─────────────────────────────────────────────────────────────
// Global
// ─────────────────────────────────────────────────────────────

export const BUILDING = {
  width: 10.92,
  depth: 6.37,
  wallThickness: 0.15,
  floorHeight: 2.7,
  slabThickness: 0.2,
  wallHeight: 2.5,
  doorWidth: 0.8,
  doorHeight: 2.0,
  genkanDoorWidth: 1.2,
  genkanDoorHeight: 2.2,
} as const;

export const FLOOR_LEVELS: Record<FloorId, number> = {
  "1f": 0,
  "2f": BUILDING.floorHeight,
  ph: BUILDING.floorHeight * 2,
};

const T = BUILDING.wallThickness;
const halfT = T / 2;

function wallBox(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
): Pick<WallSegment, "x" | "z" | "lengthX" | "lengthZ"> {
  return {
    x: (x0 + x1) / 2,
    z: (z0 + z1) / 2,
    lengthX: Math.abs(x1 - x0),
    lengthZ: Math.abs(z1 - z0),
  };
}

function wallEW(x0: number, x1: number, zLine: number) {
  return wallBox(x0, zLine - halfT, x1, zLine + halfT);
}

function wallNS(xLine: number, z0: number, z1: number) {
  return wallBox(xLine - halfT, z0, xLine + halfT, z1);
}

// ─────────────────────────────────────────────────────────────
// 1F plan dimensions (mm → m) — south façade driven
// ─────────────────────────────────────────────────────────────

/**
 * South façade horizontal segments (plan bottom chain).
 * Absolute X breaks from west outer face.
 */
export const SOUTH_FACADE = {
  /** LDK 南 — 2,175 mm */
  ldkA: 2.175,
  /** LDK 南 — 4,195 mm */
  ldkB: 4.195,
  /** 玄関大门宽 — 1,520 mm */
  genkanDoor: 1.52,
  /** SCL 南牆 — 1,210 mm */
  sclSouth: 1.21,
  /** UB 南牆 — 1,820 mm */
  ubSouth: 1.82,
} as const;

/** Running X along south façade (west → east) */
export const SX = {
  /** SW outer */
  x0: 0,
  /** after 2.175 */
  xLdkA: SOUTH_FACADE.ldkA, // 2.175
  /** after 2.175+4.195 = 6.370 — LDK SE / start of parking recess */
  xLdkE: SOUTH_FACADE.ldkA + SOUTH_FACADE.ldkB, // 6.37
  /** after +1.520 genkan door */
  xGenkanE: SOUTH_FACADE.ldkA + SOUTH_FACADE.ldkB + SOUTH_FACADE.genkanDoor, // 7.89
  /** after +1.210 SCL south */
  xSclE: SOUTH_FACADE.ldkA + SOUTH_FACADE.ldkB + SOUTH_FACADE.genkanDoor + SOUTH_FACADE.sclSouth, // 9.10
  /** after +1.820 UB south = 10.920 */
  xEast: BUILDING.width, // 10.92
} as const;

/**
 * South façade depth planes (Z).
 * 内縮 2.755 = genkan / SCL door wall plane.
 * 外推 to 2.720 = UB south plane (right-side chain).
 */
export const SZ = {
  /** Outermost south (LDK 南外牆) */
  outer: 0,
  /** 内縮 — 玄関・SCL 南面 */
  recess: 2.755,
  /** 外推後 UB 南面 (right chain 2,720) */
  ubSouth: 2.72,
  /** LDK 北 / 北側房间 南 — left chain 3,640 */
  mid: 3.64,
  /** North outer */
  north: 6.37,
  /** NW L-cut: 洋室 starts at x=1.82 (top chain first bay outdoor) */
  yoshitsuW: 1.82,
} as const;

// ─────────────────────────────────────────────────────────────
// Parking + genkan entry (for GenkanEntry component)
// ─────────────────────────────────────────────────────────────

/** Open parking court east of LDK, south of genkan/SCL/UB faces. */
export const PARKING_1F = {
  x: SX.xLdkE,
  z: SZ.outer,
  width: SX.xEast - SX.xLdkE, // 4.55
  /** Approx to genkan face (内縮) */
  depth: SZ.recess,
} as const;

export const GENKAN_ENTRY = {
  z: SZ.recess,
  x0: SX.xLdkE,
  x1: SX.xGenkanE,
  roomX1: SX.xGenkanE + SOUTH_FACADE.sclSouth, // to SCL east
  doorWidth: SOUTH_FACADE.genkanDoor * 0.85, // leaf slightly inside 1520 bay
  doorHeight: BUILDING.genkanDoorHeight,
  stepCount: 2,
  stepDepth: 0.32,
  stepHeight: 0.15,
  stepWidth: SOUTH_FACADE.genkanDoor * 0.95,
} as const;

// Keep GRID aliases for any remaining refs
export const GRID_X_1F = {
  x0: 0,
  x1: SZ.yoshitsuW,
  x2: 3.64,
  x3: 4.55,
  x4: 5.46,
  x5: SX.xLdkE,
  x6: SX.xGenkanE + SOUTH_FACADE.sclSouth,
  x7: 9.1,
  x8: SX.xEast,
} as const;

export const GRID_Z_1F = {
  z0: SZ.outer,
  zUbSouth: SZ.ubSouth,
  zMid: SZ.mid,
  zSenmenSouth: SZ.ubSouth + 1.82,
  z1: SZ.north,
} as const;

// ─────────────────────────────────────────────────────────────
// Floors — 1F only (simple slabs for volume reading)
// ─────────────────────────────────────────────────────────────

export const FLOORS: FloorSlab[] = [
  {
    id: "1f-ldk",
    floor: "1f",
    y: FLOOR_LEVELS["1f"],
    // LDK: full south block west of parking recess
    rect: {
      x: SX.x0,
      z: SZ.outer,
      width: SX.xLdkE - SX.x0,
      depth: SZ.mid - SZ.outer,
    },
    thickness: BUILDING.slabThickness,
    label: "LDK",
    color: "#d8d2c6",
  },
  {
    id: "1f-north-west",
    floor: "1f",
    y: FLOOR_LEVELS["1f"],
    // 洋室3帖 + CL + stair strip (north of mid, from yoshitsu west)
    rect: {
      x: SZ.yoshitsuW,
      z: SZ.mid,
      width: SX.xLdkE - SZ.yoshitsuW,
      depth: SZ.north - SZ.mid,
    },
    thickness: BUILDING.slabThickness,
    label: "北側西",
    color: "#cfc8bc",
  },
  {
    id: "1f-genkan-scl",
    floor: "1f",
    y: FLOOR_LEVELS["1f"],
    // 玄関 + SCL above parking recess
    rect: {
      x: SX.xLdkE,
      z: SZ.recess,
      width: SX.xSclE - SX.xLdkE,
      depth: SZ.mid - SZ.recess,
    },
    thickness: BUILDING.slabThickness,
    label: "玄関/SCL",
    color: "#b8b2a8",
  },
  {
    id: "1f-east-wing",
    floor: "1f",
    y: FLOOR_LEVELS["1f"],
    // UB + 洗面 block (east of SCL)
    rect: {
      x: SX.xSclE,
      z: SZ.ubSouth,
      width: SX.xEast - SX.xSclE,
      depth: SZ.north - SZ.ubSouth,
    },
    thickness: BUILDING.slabThickness,
    label: "東側",
    color: "#c4ced2",
  },
  {
    id: "1f-hall-north-east",
    floor: "1f",
    y: FLOOR_LEVELS["1f"],
    // Corridor / wet north of genkan to mid-east
    rect: {
      x: SX.xLdkE,
      z: SZ.mid,
      width: SX.xEast - SX.xLdkE,
      depth: SZ.north - SZ.mid,
    },
    thickness: BUILDING.slabThickness,
    label: "北側東",
    color: "#c8c2b8",
  },
];

// ─────────────────────────────────────────────────────────────
// Walls — 1F EXTERIOR shell only (Phase 1 focus)
// ─────────────────────────────────────────────────────────────

const DH = BUILDING.genkanDoorHeight;

/**
 * 1F exterior walls only.
 * South façade follows user chain exactly; no 2F/PH.
 */
export const WALLS_1F: WallSegment[] = [
  // ═══ SOUTH FACADE (west → east) ═══

  // LDK 南 2.175
  {
    id: "1f-south-ldk-a",
    ...wallEW(SX.x0, SX.xLdkA, SZ.outer),
    floor: "1f",
    label: "LDK南 2.175",
  },
  // LDK 南 4.195
  {
    id: "1f-south-ldk-b",
    ...wallEW(SX.xLdkA, SX.xLdkE, SZ.outer),
    floor: "1f",
    label: "LDK南 4.195",
  },

  // 内縮 return: LDK 東外牆 (臨駐車) z: 0 → 2.755
  {
    id: "1f-jog-ldk-east",
    ...wallNS(SX.xLdkE, SZ.outer, SZ.recess),
    floor: "1f",
    label: "内縮西壁 2.755",
  },

  // 玄関大门牆 1.520 at z=2.755
  {
    id: "1f-south-genkan-door",
    ...wallEW(SX.xLdkE, SX.xGenkanE, SZ.recess),
    floor: "1f",
    label: "玄関大门 1.520",
    openings: [
      {
        id: "1f-door-genkan-main",
        fromStart: (SOUTH_FACADE.genkanDoor - GENKAN_ENTRY.doorWidth) / 2,
        width: GENKAN_ENTRY.doorWidth,
        height: DH,
        type: "door",
      },
    ],
  },

  // SCL 南牆 1.210 at z=2.755
  {
    id: "1f-south-scl",
    ...wallEW(SX.xGenkanE, SX.xSclE, SZ.recess),
    floor: "1f",
    label: "SCL南 1.210",
  },

  // 外推 return: z 2.755 → 2.720 at x = SCL east (tiny step south)
  {
    id: "1f-jog-scl-ub",
    ...wallNS(SX.xSclE, SZ.ubSouth, SZ.recess),
    floor: "1f",
    label: "外推 2.755→2.720",
  },

  // UB 南牆 1.820 at z=2.720
  {
    id: "1f-south-ub",
    ...wallEW(SX.xSclE, SX.xEast, SZ.ubSouth),
    floor: "1f",
    label: "UB南 1.820",
  },

  // ═══ EAST ═══
  // Only along the building mass (UB / 洗面). Do NOT extend south into
  // the parking court (z 0 → ubSouth) — that wall was a false enclosure.
  {
    id: "1f-east",
    ...wallNS(SX.xEast - halfT, SZ.ubSouth, SZ.north),
    floor: "1f",
    label: "東外牆",
  },

  // ═══ NORTH (L-shape: no wall over NW courtyard 0–1.82) ═══
  {
    id: "1f-north",
    ...wallEW(SZ.yoshitsuW, SX.xEast, SZ.north),
    floor: "1f",
    label: "北外牆",
  },

  // ═══ WEST of north wing (洋室西 = 外牆) ═══
  {
    id: "1f-west-yoshitsu",
    ...wallNS(SZ.yoshitsuW, SZ.mid, SZ.north),
    floor: "1f",
    label: "洋室西外牆",
  },

  // LDK 北 jog (south edge of NW courtyard)
  {
    id: "1f-ldk-north-jog",
    ...wallEW(SX.x0, SZ.yoshitsuW, SZ.mid),
    floor: "1f",
    label: "LDK北外牆(L凹)",
  },

  // ═══ WEST LDK ═══
  {
    id: "1f-west-ldk",
    ...wallNS(SX.x0 + halfT, SZ.outer, SZ.mid),
    floor: "1f",
    label: "西外牆 LDK",
  },
];

/** No 2F / PH in this pass */
export const WALLS_2F: WallSegment[] = [];
export const WALLS: WallSegment[] = [...WALLS_1F];

/** Stairs deferred while focusing on 1F shell */
export const STAIRS: StairFlight[] = [];

// ─────────────────────────────────────────────────────────────
// Player / camera
// ─────────────────────────────────────────────────────────────

export const PLAYER = {
  eyeHeight: 1.6,
  moveSpeed: 3.0,
  /**
   * Spawn in parking, facing north at the genkan door.
   * When looking at the south façade from parking:
   *   screen left  = west = LDK (2.175+4.195 wall)
   *   screen right = east = SCL / UB
   */
  spawn: {
    x: (SX.xLdkE + SX.xGenkanE) / 2,
    y: FLOOR_LEVELS["1f"],
    z: 1.0,
    /** Face north (+Z) toward genkan door — Three.js: yaw = π */
    yaw: Math.PI,
  },
} as const;

export const CAMERA = {
  topDown: {
    /** Ortho zoom: smaller = more zoomed out */
    zoom: 14,
    minZoom: 4,
    maxZoom: 60,
    /** Half-height of view frustum in world units (at zoom=1) */
    frustum: 16,
    target: {
      x: BUILDING.width / 2,
      y: 0,
      z: BUILDING.depth / 2,
    },
    height: 32,
    panSpeed: 0.012,
    zoomSpeed: 0.0012,
  },
} as const;

export const COLORS = {
  wall: "#e8e4dc",
  wallExterior: "#d4cfc6",
  floor: "#d4d0c8",
  slabEdge: "#b0aaa0",
  stair: "#a09888",
  doorFill: "#8a8580",
  genkanDoor: "#a0673a",
  genkanDoorFrame: "#5c4030",
  parking: "#5a5a5a",
  parkingLine: "#d0d0d0",
  ground: "#6a7a5a",
  accent: "#2b6cb0",
  step: "#9a9590",
  labelLdk: "#3d6b3d",
  labelGenkan: "#6b3d3d",
  labelEast: "#3d4d6b",
} as const;

/** Ground markers for plan comparison (world positions). */
export const PLAN_LABELS = [
  {
    id: "label-ldk",
    text: "LDK (西)",
    x: SX.xLdkE / 2,
    z: SZ.mid / 2,
    color: COLORS.labelLdk,
  },
  {
    id: "label-genkan",
    text: "玄関",
    x: (SX.xLdkE + SX.xGenkanE) / 2,
    z: SZ.recess + 0.4,
    color: COLORS.labelGenkan,
  },
  {
    id: "label-parking",
    text: "駐車 (南)",
    x: SX.xLdkE + PARKING_1F.width / 2,
    z: SZ.recess / 2,
    color: COLORS.parkingLine,
  },
  {
    id: "label-ub",
    text: "UB (東)",
    x: (SX.xSclE + SX.xEast) / 2,
    z: SZ.ubSouth + 1.0,
    color: COLORS.labelEast,
  },
] as const;
