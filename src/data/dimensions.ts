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
 *   内縮 → genkan/SCL 南面 (NS 1.72 自洗面南 4.55 反推 → z ≈ 2.83)
 *   1.520          玄関大门
 *   1.210          SCL 南牆
 *   外推 → z=2.720 UB 南面 (right-side chain 2,720)
 *   1.820          UB 南牆
 *   Sum: 2.175+4.195+1.520+1.210+1.820 = 10.920 ✓
 *
 * SCL / 玄関: EW SCL=1.21; NS=1.72; 北貼洗面南 (4.55); 南與玄関切齊.
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

export type OpeningType = "door" | "opening" | "window" | "passage";

export type Opening = {
  id: string;
  /** From lower-coordinate end of wall (smaller X for EW, smaller Z for NS). */
  fromStart: number;
  width: number;
  /** Clear opening height (above sill). */
  height: number;
  /**
   * Raised sill under the opening (m). Genkan door sits above exterior steps.
   * Wall solid fills 0 → sill; opening is sill → sill+height.
   */
  sill?: number;
  type: OpeningType;
};

/**
 * Interactive swing door (四分之一圆弧 = 90°).
 * Geometry is in plan space; hinge on one end of the wall opening.
 */
export type SwingDoorDef = {
  id: string;
  /** Matches Opening.id on a wall */
  openingId: string;
  /** Wall centerline position */
  wallX: number;
  wallZ: number;
  /** Opening span along wall (plan coords, min → max) */
  alongMin: number;
  alongMax: number;
  /** Wall runs east-west (opening along X) or north-south (along Z) */
  axis: "ew" | "ns";
  sill: number;
  height: number;
  /**
   * Hinge at alongMin or alongMax end of the opening.
   * Leaf fills toward the other end.
   */
  hingeAt: "min" | "max";
  /**
   * Open angle sign in plan space (rotation around +Y).
   * Choose so the leaf follows the plan quarter-arc into the room.
   */
  openSign: 1 | -1;
  openAngleDeg: number;
  /** Story base for sill Y (default 1f). */
  floor?: FloorId;
  label?: string;
};

/**
 * Sliding door / shower screen (tokonoma-card wet variant).
 * Leaves translate along the wall — no quarter-arc into the room.
 */
export type SlideDoorDef = {
  id: string;
  openingId: string;
  style: "tokonoma-card";
  wallX: number;
  wallZ: number;
  alongMin: number;
  alongMax: number;
  axis: "ew" | "ns";
  sill: number;
  height: number;
  /**
   * Open travel toward alongMin ("min") or alongMax ("max").
   * Dual bypass panels both stack this side.
   */
  openToward: "min" | "max";
  /** 1 = single leaf; 2 = bypass pair (both stack openToward) */
  panels: 1 | 2;
  floor?: FloorId;
  label?: string;
  /** Frosted glass look */
  glassColor?: string;
  glassOpacity?: number;
  frameColor?: string;
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
  /** Override BUILDING.wallHeight (e.g. balcony parapet ~1.1 m). */
  height?: number;
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
  /** Center X (for north/south run) or west edge logic via width */
  x: number;
  /**
   * For direction "north": plan Z of the **south edge** of the lowest tread.
   * Step i center Z = z + (i + 0.5) * treadDepth.
   */
  z: number;
  direction: Cardinal;
  stepCount: number;
  treadDepth: number;
  riserHeight: number;
  width: number;
  /** Walk surface Y under the first riser (1F finished floor). */
  baseY: number;
  /** Landing / upper floor walk surface Y after last riser. */
  topY: number;
  label?: string;
};

/**
 * 90° winder flight (turn while rising).
 * Angles: 0 = +X east, π/2 = +Z north (atan2(z,x) convention).
 */
export type StairWinder = {
  id: string;
  fromFloor: FloorId;
  pivotX: number;
  pivotZ: number;
  rInner: number;
  rOuter: number;
  /** Start angle (rad); first step begins here */
  startAngle: number;
  /** Signed sweep (rad); −π/2 = 90° clockwise */
  sweep: number;
  stepCount: number;
  riserHeight: number;
  baseY: number;
  topY: number;
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
  genkanDoorWidth: 1.52,
  genkanDoorHeight: 2.15,
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
 * Genkan/SCL 南 = 洗面南(4.55) − NS(1.72) = 2.83（大门立面）.
 * 外推 2.720 = UB south plane (right-side chain).
 */
/** Genkan + SCL north-south clear depth (owner lock). */
export const GENKAN_SCL_NS = 1.72;
/** 洗面南 / 廊帶南 (= north − 1.82). Genkan+SCL 北緣. */
export const SENMEN_SOUTH_Z = 6.37 - 1.82; // 4.55

export const SZ = {
  /** Outermost south (LDK 南外牆) */
  outer: 0,
  /**
   * 内縮 — 玄関・SCL 南面（大门）.
   * = SENMEN_SOUTH_Z − GENKAN_SCL_NS = 4.55 − 1.72 = 2.83
   */
  recess: SENMEN_SOUTH_Z - GENKAN_SCL_NS, // 2.83
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

/**
 * 玄関大门 + exterior steps + raised interior floor.
 *
 * Steps (south of door, each 0.25 m):
 *   step 1 (outer) top = 0.25 · step 2 (inner) top = 0.50
 * Door sill & genkan interior floor = 0.50 m
 * Eye height 1.5 → Y: outside 1.50 · step1 1.75 · step2/inside 2.00
 */
export const GENKAN_ENTRY = {
  z: SZ.recess,
  x0: SX.xLdkE,
  x1: SX.xGenkanE,
  roomX1: SX.xGenkanE + SOUTH_FACADE.sclSouth,
  /** Wall cut = full bay width */
  openingWidth: SOUTH_FACADE.genkanDoor, // 1.52
  /**
   * Clear opening above sill. sill(0.5)+height ≤ wallHeight(2.5).
   * 0.5 + 1.95 = 2.45 → 0.05 m lintel.
   */
  openingHeight: 1.95,
  /** Door bottom / interior platform height (= 2 × stepHeight) */
  sill: 0.5,
  frameThickness: 0.055,
  frameDepth: BUILDING.wallThickness,
  leafThickness: 0.04,
  leafClearance: 0.006,
  openAngleDeg: 100,
  stepCount: 2,
  stepDepth: 0.32,
  stepHeight: 0.25,
  stepWidth: SOUTH_FACADE.genkanDoor * 0.95,
} as const;

/**
 * 2F NE balcony geometry + exterior lighting (plan space).
 * North edge = G2 / clN = 2.73 (corridor south). West bay south 1.62.
 */
export const BALCONY_2F = {
  y: FLOOR_LEVELS["2f"], // 2.7
  slabT: BUILDING.slabThickness,
  /** NE G2 / balcony north = clN = 2.73 (corridor south) */
  west: {
    x0: SX.xLdkE, // 6.37
    x1: SX.xLdkE + 2.73, // 9.10
    z0: 2.73 - 1.11, // 1.62
    z1: 2.73,
    width: 2.73,
    depth: 1.11,
  },
  east: {
    x0: SX.xLdkE + 2.73, // 9.10
    x1: SX.xEast, // 10.92
    z0: 2.73 - 0.91, // 1.82
    z1: 2.73,
    width: 1.82,
    depth: 0.91,
  },
  /** West bay south vs genkan recess (2.83 − 1.62) */
  genkanOverhang: 2.83 - (2.73 - 1.11),
  /**
   * Three recessed downlights under west soffit, aligned to genkan door bay.
   */
  downlights: (() => {
    const g0 = SX.xLdkE;
    const g1 = SX.xGenkanE;
    const mid = (g0 + g1) / 2;
    const span = (g1 - g0) * 0.72;
    const xs = [mid - span / 2, mid, mid + span / 2];
    const z = (2.73 - 1.11 + SZ.recess) / 2;
    const y = FLOOR_LEVELS["2f"] - BUILDING.slabThickness - 0.02;
    return xs.map((x, i) => ({
      id: `balc-dl-${i}`,
      position: [x, y, z] as [number, number, number],
      intensity: 0.55,
      distance: 3.2,
      color: "#fff0d8",
    }));
  })(),
  /**
   * European wall sconce east of genkan door (on SCL south face).
   * Position: just east of door, ~1.7 m AFFL, proud of wall.
   */
  sconce: {
    x: SX.xGenkanE + 0.18,
    y: FLOOR_LEVELS["1f"] + 1.65,
    z: SZ.recess - BUILDING.wallThickness / 2 - 0.08,
    colorMetal: "#1a1a1a",
    colorGlass: "#fff6e8",
    intensity: 0.65,
    distance: 4,
  },
} as const;

/**
 * 玄関 + SCL interior finish (落塵區). Plan walls unchanged.
 * Floor: dark slate (same darkness family as yaki, one step brighter).
 * Cove: N/S only, warm 2700K-ish, low intensity.
 * Sconce: east wall (SCL side), south — near main door, flat iron (vs exterior lantern).
 */
export const GENKAN_INTERIOR = {
  /** Dust zone = genkan + SCL slabs */
  floorIds: ["1f-genkan", "1f-scl"] as const,
  /** Slightly lighter than pure yaki charcoal so grain/joints read */
  floorColor: "#4a4642",
  jointColor: "#1c1a18",
  tileM: 0.38,
  /** N/S cove strips under 1F soffit (no E/W full U) */
  cove: {
    y: 2.5 - 0.035,
    inset: 0.05,
    stripW: 0.018,
    stripH: 0.012,
    color: "#ffe4c0",
    emissiveIntensity: 0.45,
    lightIntensity: 0.22,
    lightDistance: 2.8,
  },
  /** Flat matte-black iron sconce on genkan east wall, south (near door) */
  sconce: {
    x: SX.xGenkanE - BUILDING.wallThickness / 2 - 0.04,
    y: FLOOR_LEVELS["1f"] + GENKAN_ENTRY.sill + 1.45,
    z: SZ.recess + 0.32,
    metal: "#1a1a1a",
    glow: "#fff0d8",
    intensity: 0.4,
    distance: 3.2,
  },
} as const;

/**
 * All 1F interior finished-floor height (m).
 * = genkan sill / top of exterior steps (0.5).
 * Standing eye Y = INTERIOR_FLOOR_Y + PLAYER.eyeHeight = 0.5 + 1.5 = 2.0.
 */
export const INTERIOR_FLOOR_Y = GENKAN_ENTRY.sill;
/** @deprecated use INTERIOR_FLOOR_Y */
export const GENKAN_FLOOR_Y = INTERIOR_FLOOR_Y;

// Keep GRID aliases for any remaining refs
export const GRID_X_1F = {
  x0: 0,
  x1: SZ.yoshitsuW, // 1.82
  x2: SX.xLdkE - 0.91 * 3, // 3.64 洋室E/CL
  x3: SX.xLdkE - 0.91 * 2, // 4.55 階段W
  x4: SX.xLdkE - 0.91, // 5.46 階段E
  x5: SX.xLdkE, // 6.37 玄関W
  x6: SX.xGenkanE, // 7.89
  x7: SX.xSclE, // 9.10
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
// Floors — 1F only (all rooms share raised platform height)
// ─────────────────────────────────────────────────────────────

/** Solid fill under raised interior floors (down to grade y=0). */
const INTERIOR_SLAB_THICKNESS = INTERIOR_FLOOR_Y;

export const FLOORS: FloorSlab[] = [
  {
    id: "1f-ldk",
    floor: "1f",
    y: INTERIOR_FLOOR_Y,
    // LDK: full south block west of parking recess
    rect: {
      x: SX.x0,
      z: SZ.outer,
      width: SX.xLdkE - SX.x0,
      depth: SZ.mid - SZ.outer,
    },
    thickness: INTERIOR_SLAB_THICKNESS,
    label: "LDK",
    color: "#d8d2c6",
  },
  // 1F north-of-mid floors: split later in ALL_FLOOR_SLABS to void the stair well
  // (see FLOORS_1F_NORTH_SPLIT). Placeholder removed — was covering entire stair U.
  {
    id: "1f-genkan",
    floor: "1f",
    y: INTERIOR_FLOOR_Y,
    // 玄関: NS 1.72 (recess → 洗面南 4.55)
    rect: {
      x: SX.xLdkE,
      z: SZ.recess,
      width: SX.xGenkanE - SX.xLdkE,
      depth: GENKAN_SCL_NS,
    },
    thickness: INTERIOR_SLAB_THICKNESS,
    label: "玄関",
    color: GENKAN_INTERIOR.floorColor,
  },
  {
    id: "1f-scl",
    floor: "1f",
    y: INTERIOR_FLOOR_Y,
    // SCL: EW 1.21 × NS 1.72, west of UB, north flush 洗面
    rect: {
      x: SX.xGenkanE,
      z: SZ.recess,
      width: SOUTH_FACADE.sclSouth,
      depth: GENKAN_SCL_NS,
    },
    thickness: INTERIOR_SLAB_THICKNESS,
    label: "SCL",
    color: GENKAN_INTERIOR.floorColor,
  },
  {
    id: "1f-east-wing",
    floor: "1f",
    y: INTERIOR_FLOOR_Y,
    // UB + 洗面 block (east of SCL)
    rect: {
      x: SX.xSclE,
      z: SZ.ubSouth,
      width: SX.xEast - SX.xSclE,
      depth: SZ.north - SZ.ubSouth,
    },
    thickness: INTERIOR_SLAB_THICKNESS,
    label: "東側",
    color: "#c4ced2",
  },
  {
    id: "1f-hall-north-east",
    floor: "1f",
    y: INTERIOR_FLOOR_Y,
    // North of genkan/SCL band (z ≥ 4.55) toward トイレ／洗面
    rect: {
      x: SX.xLdkE,
      z: SENMEN_SOUTH_Z,
      width: SX.xEast - SX.xLdkE,
      depth: SZ.north - SENMEN_SOUTH_Z,
    },
    thickness: INTERIOR_SLAB_THICKNESS,
    label: "北側東",
    color: "#c8c2b8",
  },
];

// ─────────────────────────────────────────────────────────────
// Walls — 1F EXTERIOR shell only (Phase 1 focus)
// ─────────────────────────────────────────────────────────────

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

  // 内縮 return: LDK 東外牆 (臨駐車) z: 0 → genkan/SCL 南
  {
    id: "1f-jog-ldk-east",
    ...wallNS(SX.xLdkE, SZ.outer, SZ.recess),
    floor: "1f",
    label: "内縮西壁→玄関南",
  },

  // 玄関大门牆 1.520 at genkan/SCL 南 — full-bay opening; frame/leaf in GenkanEntry
  {
    id: "1f-south-genkan-door",
    ...wallEW(SX.xLdkE, SX.xGenkanE, SZ.recess),
    floor: "1f",
    label: "玄関大门 1.520",
    openings: [
      {
        id: "1f-door-genkan-main",
        fromStart: 0,
        width: GENKAN_ENTRY.openingWidth,
        height: GENKAN_ENTRY.openingHeight,
        sill: GENKAN_ENTRY.sill,
        type: "door",
      },
    ],
  },

  // SCL 南牆 1.210（與玄関南切齊）
  {
    id: "1f-south-scl",
    ...wallEW(SX.xGenkanE, SX.xSclE, SZ.recess),
    floor: "1f",
    label: "SCL南 1.210",
  },

  // 外推 return: UB 南 2.72 → genkan/SCL 南 2.83 at x = SCL east
  {
    id: "1f-jog-scl-ub",
    ...wallNS(SX.xSclE, SZ.ubSouth, SZ.recess),
    floor: "1f",
    label: "外推 UB南→SCL南",
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

// ─────────────────────────────────────────────────────────────
// 1F interior room grid (user-measured from genkan → west)
//
// From 玄関 west wall (x=6.37) into LDK:
//   −0.91 m → stair east wall (x=5.46), length 1.82 from north
//   −0.91 m → stairs width 0.91 (x=4.55–5.46)
//   CL east wall at x=4.55; CL south wall width 0.91
//   洋室 east boundary x=3.64, wall depth 2.73 from north
//   LDK pocket between CL & 洋室: 0.91 × 0.91 (south of mid, under CL)
//
//   x: 1.82 | 3.64 | 4.55 | 5.46 | 6.37 | 7.89 | 9.10 | 10.92
//   z: north=6.37 · mid=3.64 · stairS=4.55 · wetS=4.54 · recess=2.755
// ─────────────────────────────────────────────────────────────

const M91 = 0.91;
const M182 = 1.82;
const M273 = 2.73;

/** Interior structural lines (m) */
export const IR = {
  yoshitsuW: SZ.yoshitsuW, // 1.82
  /** 洋室 east / CL west */
  yoshitsuE: SX.xLdkE - M91 * 3, // 6.37 − 2.73 = 3.64
  /** CL east / 階段 west — stairs width 0.91 */
  clE: SX.xLdkE - M91 * 2, // 6.37 − 1.82 = 4.55
  /** 階段 east wall (from genkan 0.91 m west into LDK) */
  stairE: SX.xLdkE - M91, // 6.37 − 0.91 = 5.46
  genkanW: SX.xLdkE, // 6.37
  genkanE: SX.xGenkanE, // 7.89
  sclE: SX.xSclE, // 9.10
  east: SX.xEast,
  south: SZ.outer,
  ubS: SZ.ubSouth, // 2.72
  /** Genkan / SCL south (doors) = 4.55 − 1.72 */
  recess: SZ.recess, // 2.83
  mid: SZ.mid, // 3.64 = north − 2.73
  /** South end of stair / 洗面南 / genkan+SCL 北 (= north − 1.82) */
  stairS: SZ.north - M182, // 4.55
  /** LDK pocket south of CL (0.91 × 0.91 under CL) */
  clPocketS: SZ.mid - M91, // 2.73
  /** Unified with stairS (was ubS+1.82=4.54) */
  wetS: SZ.north - M182, // 4.55
  north: SZ.north,
  module: M91,
} as const;

const INT_DOOR_W = 0.8;
const INT_DOOR_H = 1.95;
const INT_SILL = INTERIOR_FLOOR_Y;
const WIN_W = 0.9;
const WIN_H = 1.0;
const WIN_SILL = INTERIOR_FLOOR_Y + 0.9;

/**
 * 1F トイレ — NS 0.91 × EW 1.82, north strip.
 * West half: sit toilet facing east; south wall solid + east passage with curtains (no door).
 */
export const TOILET_1F = {
  x0: IR.genkanW, // 6.37
  x1: IR.genkanW + 1.82, // 8.19
  z0: IR.north - 0.91, // 5.46
  z1: IR.north, // 6.37
  width: 1.82,
  depth: 0.91,
  /** South-wall east passage clear width (no leaf) */
  passW: 0.7,
  /** Solid south wall length from west (width − passW) */
  solidW: 1.82 - 0.7, // 1.12
} as const;

/**
 * 1F sit toilet — tokonoma-card wet fixture (DESIGN.md §2.7).
 * Placement locked: west half of トイレ, face +X east (tank west, bowl east).
 * Ethos: 高貴典雅 + 細節優先 — boutique rounded porcelain, not two boxes.
 */
export const PROP_1F_TOILET = {
  id: "hero-1f-toilet",
  style: "tokonoma-card" as const,
  floor: "1f" as FloorId,
  label: "1Fトイレ便器",
  /** Anchor center (locked) — west half, NS mid */
  x: TOILET_1F.x0 + 0.91 * 0.45,
  z: (TOILET_1F.z0 + TOILET_1F.z1) / 2,
  y: INTERIOR_FLOOR_Y,
  /** Overall envelope NS width / EW depth (approx, refined mesh inside) */
  width: 0.4,
  depth: 0.65,
  /** Tank (west) */
  tank: {
    w: 0.36,
    d: 0.18,
    h: 0.42,
    /** Top of tank above finished floor */
    topY: 0.78,
  },
  /** Bowl / seat (east of tank) */
  bowl: {
    seatH: 0.4,
    rimR: 0.17,
    length: 0.42,
  },
  /** Lid open angle (rad) — slight lift toward room east */
  lidOpenRad: 0.22, // ~12.5°
  /** Thin wood endscape behind tank on west wall */
  board: {
    width: 0.42,
    height: 0.95,
    thickness: 0.016,
    standoff: 0.025,
  },
  light: {
    dx: 0.22,
    dy: 0.55,
    dz: 0.08,
    intensity: 0.26,
    distance: 1.4,
    color: "#fff4e8",
  },
  porcelain: "#f5f0e8",
  porcelainInner: "#c8c2ba",
  button: "#4a4642",
} as const;

/**
 * 1F UB east-half freestanding tub — tokonoma-card wet fixture (DESIGN.md §2.7).
 * Long axis NS; faucet on south; boutique sculptural porcelain + champagne metal.
 */
export const PROP_1F_UB_TUB = {
  id: "hero-1f-ub-tub",
  style: "tokonoma-card" as const,
  floor: "1f" as FloorId,
  label: "UB獨立浴缸",
  /** East half of UB (x 9.10–10.92) */
  x: SX.xSclE + (SX.xEast - SX.xSclE) * 0.72, // ≈ 10.41
  /** NS center; length leaves ~0.16 m clear N/S */
  z: (SZ.ubSouth + IR.wetS) / 2, // ≈ 3.635
  y: INTERIOR_FLOOR_Y,
  /** Outer length along Z (north–south) */
  length: 1.5,
  /** Outer width along X (east–west) */
  width: 0.73,
  /** Rim height above finished floor */
  rimH: 0.56,
  /** Inner basin depth below rim */
  basinDepth: 0.38,
  porcelain: "#f7f2ea",
  porcelainInner: "#d4cdc4",
  /** Decorative water plane */
  water: {
    color: "#a8c8d8",
    opacity: 0.38,
    /** Below rim */
    insetY: 0.1,
  },
  /** Champagne / soft gold metal */
  metal: "#c4a574",
  metalness: 0.72,
  /** Floor-mount faucet south of tub */
  faucet: {
    /** Offset south of tub south end (m) */
    southGap: 0.07,
    columnH: 0.92,
    spoutReach: 0.18,
  },
  light: {
    dx: -0.25,
    dy: 0.7,
    dz: 0.15,
    intensity: 0.28,
    distance: 1.9,
    color: "#fff0e0",
  },
} as const;

/** Double center-split curtains in south passage (no swing door) */
export const PROP_1F_TOILET_CURTAIN = {
  floor: "1f" as FloorId,
  /** Passage center X */
  x: TOILET_1F.x0 + TOILET_1F.solidW + TOILET_1F.passW / 2,
  z: TOILET_1F.z0,
  y: INTERIOR_FLOOR_Y,
  passW: TOILET_1F.passW,
  height: 1.9,
  panelGap: 0.02,
  thickness: 0.02,
  label: "1Fトイレ門簾",
} as const;

/**
 * M8 hero prop — style **tokonoma-card** (床の間卡). Full recipe: DESIGN.md §2.7.
 * Ethos: 高貴典雅 + 細節優先 (noble elegant, detail-first) — not crude box stacks.
 * - Curved card / crafted form + wood endscape + 3–5 cm standoff + one weak warm key
 * - No brand marks; data here; mesh under house/; plan walls unchanged
 *
 * 1F SCL east wall: honey-gold trench (Chelsea-inspired silhouette).
 * Wall face (into SCL) ≈ sclE − halfT; coat standoff 4 cm west.
 */
export const PROP_1F_SCL_COAT = {
  id: "hero-1f-scl-trench",
  /** Named presentation style — agents: match DESIGN §2.7 */
  style: "tokonoma-card" as const,
  floor: "1f" as FloorId,
  label: "SCL蜜金風衣",
  /** East wall plan centerline X */
  wallX: SX.xSclE, // 9.10
  /** SCL NS mid */
  z: (SZ.recess + SENMEN_SOUTH_Z) / 2, // ≈ 3.69
  /** Interior face of east wall (west-facing) */
  wallFaceX: SX.xSclE - BUILDING.wallThickness / 2,
  /** Coat center standoff from wall face (into room, −X) */
  standoff: 0.04,
  /** Coat card size (m) — Chelsea length */
  coatW: 0.58,
  coatH: 1.05,
  /** Parabolic bow into room (side-view thickness cue) */
  sagitta: 0.055,
  /** Shoulder height above finished floor (hook line) */
  shoulderY: 1.62,
  /** Slim waist pinch (0–1 scale at waist) */
  waistScale: 0.88,
  /** Wood endscape / shallow niche board */
  board: {
    width: 0.78,
    height: 1.42,
    thickness: 0.022,
    /** Board proud of wall face into room */
    standoff: 0.006,
  },
  /** Weak residential key — south-west of coat, short range */
  light: {
    /** Offset from coat center (plan) */
    dx: -0.28,
    dy: 0.12,
    dz: -0.22,
    intensity: 0.32,
    distance: 1.85,
    color: "#fff0d8",
  },
  hanger: {
    wood: "#c4a574",
    metal: "#2a2826",
    barW: 0.42,
    barT: 0.012,
  },
} as const;

/**
 * 1F SCL north wall — ivory getabako (tokonoma-card floor furniture).
 * Ethos: 高貴典雅 + 細節優先 — cabriole legs, rounded top + gold corners,
 * dual frame-panel doors, readable stiletto pair (tight).
 * Paired with east trench as 落塵 vignette. See DESIGN.md §2.7.
 */
export const PROP_1F_SCL_GETABAKO = {
  id: "hero-1f-scl-getabako",
  style: "tokonoma-card" as const,
  floor: "1f" as FloorId,
  label: "SCL象牙白鞋罐",
  x: (SX.xGenkanE + SX.xSclE) / 2, // ≈ 8.495
  wallZ: SENMEN_SOUTH_Z, // 4.55
  wallFaceZ: SENMEN_SOUTH_Z - BUILDING.wallThickness / 2,
  standoff: 0.04,
  /** Carcass width / depth (top overhangs slightly) */
  width: 0.76,
  depth: 0.32,
  /** Body height above legs (excludes legs + top slab) */
  bodyH: 0.72,
  /** Open upper bay as fraction of bodyH */
  openBayFrac: 0.4,
  shell: 0.024,
  doorInset: 0.01,
  /** Soft cabriole-style legs */
  leg: {
    height: 0.078,
    /** Outward splay at foot (m from body corner inward inset) */
    cornerInset: 0.028,
    splay: 0.012,
  },
  /** Molded top slab */
  top: {
    overhang: 0.014,
    thickness: 0.02,
    cornerR: 0.038,
  },
  /** Thin gold corner ornaments on top */
  cornerOrnament: {
    size: 0.042,
    thickness: 0.004,
    color: "#b8975a",
  },
  board: {
    width: 0.9,
    height: 1.05,
    thickness: 0.02,
    standoff: 0.005,
  },
  light: {
    dx: -0.1,
    dy: 0.22,
    dz: -0.42,
    intensity: 0.3,
    distance: 1.75,
    color: "#fff2e0",
  },
  heels: {
    color: "#b01630",
    sole: "#1a0c10",
    /** Center-to-center span — tight pair */
    span: 0.11,
    heelH: 0.085,
    length: 0.21,
    width: 0.072,
    /** Outward toe yaw (rad), nearly parallel */
    yaw: 0.04,
  },
  handle: {
    color: "#9a7d4a",
    metalness: 0.6,
  },
} as const;

/**
 * 1F 洗面 — EW 2.73 west-abutting toilet; NS 1.82 north strip.
 * West wall south 0.91 bay + door (hinge S, handle N, open into room +X).
 */
export const SENMEN_1F = {
  x0: TOILET_1F.x1, // 8.19
  x1: IR.east, // 10.92
  z0: IR.stairS, // 4.55
  z1: IR.north, // 6.37
  width: 2.73,
  depth: 1.82,
  doorBay: 0.91,
  doorW: 0.8,
  /** fromStart on west wall from min Z (south), centered in 0.91 bay */
  doorFrom: (0.91 - 0.8) / 2,
} as const;

const SENMEN_DOOR_FROM = SENMEN_1F.doorFrom;

/**
 * 1F SCL — EW 1.21 × NS 1.72.
 * 南=玄関南(2.83); 北=洗面南(4.55，東段與洗面南牆共用);
 * 東=UB 西; 西=玄関（中段通道無門）; 室內無中隔.
 */
const SCL_PASS_W = 0.9;
const SCL_PASS_FROM = (GENKAN_SCL_NS - SCL_PASS_W) / 2;

export const SCL_1F = {
  x0: IR.genkanE, // 7.89
  x1: IR.sclE, // 9.10
  z0: IR.recess, // 2.83
  z1: IR.stairS, // 4.55 = 洗面南
  width: SOUTH_FACADE.sclSouth, // 1.21
  depth: GENKAN_SCL_NS, // 1.72
  passW: SCL_PASS_W,
  passFrom: SCL_PASS_FROM,
} as const;

/**
 * Interior partitions. Passages omit doors; swing doors listed in SWING_DOORS.
 */
export const WALLS_1F_INTERIOR: WallSegment[] = [
  // ── 洋室 south (to LDK) width 1.82 + door ──
  {
    id: "1f-int-yoshitsu-s",
    ...wallEW(IR.yoshitsuW, IR.yoshitsuE, IR.mid),
    floor: "1f",
    label: "洋室南 1.82",
    openings: [
      {
        id: "1f-door-yoshitsu",
        fromStart: IR.yoshitsuE - IR.yoshitsuW - INT_DOOR_W - 0.15,
        width: INT_DOOR_W,
        height: INT_DOOR_H,
        sill: INT_SILL,
        type: "door",
      },
    ],
  },

  // ── 洋室 east wall: north → south 2.73 m (to mid) ──
  // Open channel to CL: large passage so 洋室↔CL connects; LDK pocket 0.91² south of mid
  {
    id: "1f-int-yoshitsu-e",
    ...wallNS(IR.yoshitsuE, IR.mid, IR.north),
    floor: "1f",
    label: "洋室東 2.73",
    openings: [
      {
        // Open to CL (full clear height) — passage not a door
        id: "1f-pass-yoshitsu-cl",
        fromStart: 0.1,
        width: M273 - 0.2,
        height: INT_DOOR_H,
        sill: INT_SILL,
        type: "passage",
      },
    ],
  },

  // ── CL south wall width 0.91 ──
  {
    id: "1f-int-cl-s",
    ...wallEW(IR.yoshitsuE, IR.clE, IR.mid),
    floor: "1f",
    label: "CL南 0.91",
  },

  // ── CL east | 階段 west ──
  {
    id: "1f-int-cl-e",
    ...wallNS(IR.clE, IR.mid, IR.north),
    floor: "1f",
    label: "CL東|階段",
  },

  // L 形梯：無 180° 中隔；井壁 = CL 東 + 外框
  // 直段南口開放接 LDK（z=4.55 南）

  // ── LDK | 玄関：南→北 全高實牆（玄関 NS 1.72）──
  {
    id: "1f-int-ldk-genkan",
    ...wallNS(IR.genkanW, IR.recess, IR.stairS),
    floor: "1f",
    label: "LDK|玄関(壁)",
  },
  // ── LDK 門：z 4.55–5.46 (0.91)，緊貼トイレ西牆南側 ──
  {
    id: "1f-int-ldk-door",
    ...wallNS(IR.genkanW, IR.stairS, IR.north - M91),
    floor: "1f",
    label: "LDK門 0.91@トイレ南",
    openings: [
      {
        id: "1f-door-ldk-genkan",
        fromStart: (M91 - INT_DOOR_W) / 2,
        width: INT_DOOR_W,
        height: INT_DOOR_H,
        sill: INT_SILL,
        type: "door",
      },
    ],
  },

  // ── SCL: EW 1.21 × NS 1.72; 四邊牆、室內無中隔 ──
  // 南=外牆; 東=1f-int-scl-ub-w; 北西段(7.89–8.19); 北東段與洗面南共用
  // 西靠玄関：中段通道 0.9、無門
  {
    id: "1f-int-scl-n-west",
    // 洗面以西：x genkanE → トイレ東/洗面西 (8.19)
    ...wallEW(IR.genkanE, TOILET_1F.x1, IR.stairS),
    floor: "1f",
    label: "SCL北(西段)",
  },
  {
    id: "1f-int-scl-w",
    ...wallNS(IR.genkanE, IR.recess, IR.stairS),
    floor: "1f",
    label: "SCL西|玄関(通道)",
    openings: [
      {
        id: "1f-pass-scl-w",
        fromStart: SCL_PASS_FROM,
        width: SCL_PASS_W,
        height: INT_DOOR_H,
        sill: INT_SILL,
        type: "passage",
      },
    ],
  },
  // East: x=sclE ubS→wetS (SCL+UB); north east 8.19–9.10 = 洗面南 (senmen-ub)

  // ── トイレ 0.91×1.82: 西半馬桶朝東; 南牆東側 0.7 通道+雙片門簾 ──
  {
    id: "1f-int-toilet-w",
    ...wallNS(TOILET_1F.x0, TOILET_1F.z0, TOILET_1F.z1),
    floor: "1f",
    label: "トイレ西",
  },
  {
    id: "1f-int-toilet-e",
    ...wallNS(TOILET_1F.x1, TOILET_1F.z0, TOILET_1F.z1),
    floor: "1f",
    label: "トイレ東",
  },
  {
    id: "1f-int-toilet-s",
    ...wallEW(TOILET_1F.x0, TOILET_1F.x1, TOILET_1F.z0),
    floor: "1f",
    label: "トイレ南(東通道)",
    openings: [
      {
        id: "1f-pass-toilet-s",
        fromStart: TOILET_1F.solidW, // east side
        width: TOILET_1F.passW,
        height: INT_DOOR_H,
        sill: INT_SILL,
        type: "passage",
      },
    ],
  },

  // ── 洗面 west (abut toilet east) + south 0.91 door bay ──
  {
    id: "1f-int-senmen-w",
    ...wallNS(SENMEN_1F.x0, SENMEN_1F.z0, SENMEN_1F.z1),
    floor: "1f",
    label: "洗面西 2.73房",
    openings: [
      {
        id: "1f-door-senmen",
        fromStart: SENMEN_DOOR_FROM,
        width: INT_DOOR_W,
        height: INT_DOOR_H,
        sill: INT_SILL,
        type: "door",
      },
    ],
  },
  // 洗面南 | UB 北（UB 西界仍 sclE）— opening is shower slide (not swing)
  {
    id: "1f-int-senmen-ub",
    ...wallEW(SENMEN_1F.x0, IR.east, IR.wetS),
    floor: "1f",
    label: "洗面|UB",
    openings: [
      {
        id: "1f-door-ub",
        fromStart: IR.sclE - SENMEN_1F.x0 + 0.5,
        width: INT_DOOR_W,
        /** Near full clear to ceiling (sill 0.5 + 2.0 → top 2.5) */
        height: 2.0,
        sill: INT_SILL,
        type: "door",
      },
    ],
  },

  // ── SCL東|UB西 單線 x=sclE（ubS→wetS = 洗面南，含 SCL 全高）──
  {
    id: "1f-int-scl-ub-w",
    ...wallNS(IR.sclE, IR.ubS, IR.wetS),
    floor: "1f",
    label: "SCL東|UB西",
  },

  // ── 玄関北 @ 洗面南線 (passage to 北側廊／トイレ) ──
  // Passage ~1.15 m centered — clear view north (e.g. 7.1, 4.4); do not seal with cladding
  {
    id: "1f-int-genkan-n",
    ...wallEW(IR.genkanW, IR.genkanE, IR.stairS),
    floor: "1f",
    label: "玄関北",
    openings: [
      {
        id: "1f-pass-toilet",
        fromStart: (IR.genkanE - IR.genkanW - 1.15) / 2,
        width: 1.15,
        height: INT_DOOR_H,
        sill: INT_SILL,
        type: "passage",
      },
    ],
  },
];

/** North exterior split so トイレ can have a window */
export const WALLS_1F_NORTH: WallSegment[] = [
  {
    id: "1f-north-yoshitsu",
    ...wallEW(IR.yoshitsuW, IR.yoshitsuE, IR.north),
    floor: "1f",
    label: "北外牆 洋室",
  },
  {
    id: "1f-north-cl",
    ...wallEW(IR.yoshitsuE, IR.clE, IR.north),
    floor: "1f",
    label: "北外牆 CL",
  },
  {
    id: "1f-north-stair",
    ...wallEW(IR.clE, IR.stairE, IR.north),
    floor: "1f",
    label: "北外牆 階段 0.91",
  },
  {
    id: "1f-north-stair-e",
    ...wallEW(IR.stairE, IR.genkanW, IR.north),
    floor: "1f",
    label: "北外牆 階段東〜玄関 0.91",
  },
  {
    id: "1f-north-toilet",
    ...wallEW(TOILET_1F.x0, TOILET_1F.x1, IR.north),
    floor: "1f",
    label: "北外牆 トイレ 1.82",
    openings: [
      {
        id: "1f-win-toilet",
        fromStart: 0.35,
        width: WIN_W,
        height: WIN_H,
        sill: WIN_SILL,
        type: "window",
      },
    ],
  },
  {
    id: "1f-north-senmen",
    ...wallEW(SENMEN_1F.x0, IR.east, IR.north),
    floor: "1f",
    label: "北外牆 洗面 2.73",
  },
];

/** Interactive interior swing doors (90° quarter-arc, plan-accurate hinge). */
export const SWING_DOORS: SwingDoorDef[] = [
  {
    id: "swing-yoshitsu",
    openingId: "1f-door-yoshitsu",
    wallX: 0,
    wallZ: IR.mid,
    alongMin: IR.yoshitsuE - INT_DOOR_W - 0.15,
    alongMax: IR.yoshitsuE - 0.15,
    axis: "ew",
    sill: INT_SILL,
    height: INT_DOOR_H,
    // Plan arc into 洋室 (north of wall): hinge east end, open into +Z
    hingeAt: "max",
    openSign: 1,
    openAngleDeg: 90,
    label: "洋室",
  },
  {
    id: "swing-ldk-genkan",
    openingId: "1f-door-ldk-genkan",
    wallX: IR.genkanW,
    wallZ: 0,
    // Door bay z 4.55–5.46 (abut toilet west wall south)
    alongMin: IR.stairS + (M91 - INT_DOOR_W) / 2,
    alongMax: IR.stairS + (M91 - INT_DOOR_W) / 2 + INT_DOOR_W,
    axis: "ns",
    sill: INT_SILL,
    height: INT_DOOR_H,
    /**
     * Entering LDK (facing west): hinge north (max), open into LDK.
     */
    hingeAt: "max",
    openSign: -1,
    openAngleDeg: 90,
    label: "LDK|玄関 門0.91",
  },
  {
    id: "swing-senmen",
    openingId: "1f-door-senmen",
    wallX: TOILET_1F.x1, // 8.19 senmen west
    wallZ: 0,
    // South 0.91 bay on wall z 4.55–6.37
    alongMin: IR.stairS + SENMEN_DOOR_FROM,
    alongMax: IR.stairS + SENMEN_DOOR_FROM + INT_DOOR_W,
    axis: "ns",
    sill: INT_SILL,
    height: INT_DOOR_H,
    // Hinge south (min), handle north; open into 洗面 (+X)
    hingeAt: "min",
    openSign: 1,
    openAngleDeg: 90,
    label: "洗面",
  },
  // UB shower: see SLIDE_DOORS (no swing — does not arc into UB/洗面)
  // ── 2F NE west door (wall from clN=2.73; door centered in corridor 2.73–3.64) ──
  {
    id: "swing-2f-ne",
    openingId: "2f-door-ne-yoshitsu",
    wallX: IR.genkanW,
    wallZ: 0,
    alongMin: 2.73 + (3.64 - 2.73 - 0.8) / 2,
    alongMax: 2.73 + (3.64 - 2.73 - 0.8) / 2 + 0.8,
    axis: "ns",
    sill: 0,
    height: 1.95,
    hingeAt: "min",
    openSign: -1,
    openAngleDeg: 90,
    floor: "2f",
    label: "2F梯|洋室",
  },
  // ── 2F south-wing doors @ clN=2.73 → corridor ──
  {
    id: "swing-2f-sw",
    openingId: "2f-door-sw-yoshitsu",
    wallX: 0,
    wallZ: 2.73, // Z2.clN
    alongMin: 2.73 - 0.8 - 0.04,
    alongMax: 2.73 - 0.04,
    axis: "ew",
    sill: 0,
    height: 1.95,
    hingeAt: "max",
    openSign: -1,
    openAngleDeg: 90,
    floor: "2f",
    label: "2F西洋室",
  },
  {
    id: "swing-2f-sc",
    openingId: "2f-door-sc-yoshitsu",
    wallX: 0,
    wallZ: 2.73, // Z2.clN
    alongMin: 3.64 + 0.04,
    alongMax: 3.64 + 0.04 + 0.8,
    axis: "ew",
    sill: 0,
    height: 1.95,
    hingeAt: "min",
    openSign: 1,
    openAngleDeg: 90,
    floor: "2f",
    label: "2F中央洋室",
  },
  // ── 2F トイレ: door on corridor north z=corrN=3.64 ──
  {
    id: "swing-2f-toilet",
    openingId: "2f-door-toilet",
    wallX: 0,
    wallZ: 3.64, // Z2.corrN
    alongMin: 2.73 + 0.2,
    alongMax: 2.73 + 0.2 + 0.8,
    axis: "ew",
    sill: 0,
    height: 1.95,
    hingeAt: "min",
    openSign: -1,
    openAngleDeg: 90,
    floor: "2f",
    label: "2Fトイレ",
  },
  // Balcony access door deferred (south wall is fixed G2 glass for now)
  // ── PH stair hall → roof balcony ──
  {
    id: "swing-ph-balcony",
    openingId: "ph-door-balcony",
    wallX: 0,
    wallZ: IR.mid, // hall south = balcony north = 3.64
    alongMin: IR.clE + (1.82 - 0.8) / 2,
    alongMax: IR.clE + (1.82 - 0.8) / 2 + 0.8,
    axis: "ew",
    sill: 0,
    height: 1.95,
    hingeAt: "min",
    openSign: -1, // open onto balcony (−Z)
    openAngleDeg: 90,
    floor: "ph",
    label: "PH陽台",
  },
];

/**
 * Sliding doors (tokonoma-card wet / space-saving).
 * UB|洗面: dual frosted panels both stack west (openToward min) — no swing arc.
 */
export const SLIDE_DOORS: SlideDoorDef[] = [
  {
    id: "slide-ub-shower",
    openingId: "1f-door-ub",
    style: "tokonoma-card",
    wallX: 0,
    wallZ: IR.wetS,
    alongMin: IR.sclE + 0.5, // ≈ 9.60
    alongMax: IR.sclE + 0.5 + INT_DOOR_W, // ≈ 10.40
    axis: "ew",
    sill: INT_SILL,
    /** Near ceiling: sill 0.5 + 2.0 = wall top 2.5 */
    height: 2.0,
    /** Stack west along 洗面南 wall (longer pocket than east) */
    openToward: "min",
    panels: 2,
    floor: "1f",
    label: "UB淋浴拉門",
    glassColor: "#f2ebe0",
    glassOpacity: 0.42,
    frameColor: "#2c2824",
  },
];

/** Exterior shell without the old single north wall (replaced by WALLS_1F_NORTH). */
export const WALLS_1F_SHELL: WallSegment[] = WALLS_1F.filter(
  (w) => w.id !== "1f-north",
);

// ─────────────────────────────────────────────────────────────
// Stairs L-shape (not 180°): straight NS 0.91 + 90° winders NS 0.91
// 1F→2F: straight north z 4.55–5.46, winders z 5.46–6.37 turn to east @ Y=2.7
// Rise 2.2 m: 6×0.20 straight + 5×0.20 winders
// ─────────────────────────────────────────────────────────────

const STAIR_BAND = M91; // 0.91
const STAIR_RISER = 0.2;
const STAIR_STRAIGHT_N = 6;
const STAIR_WINDER_N = 5;
const STAIR_STRAIGHT_TREAD = STAIR_BAND / STAIR_STRAIGHT_N; // ≈ 0.1517
const STAIR_STRAIGHT_RISE = STAIR_STRAIGHT_N * STAIR_RISER; // 1.2
const STAIR_WINDER_RISE = STAIR_WINDER_N * STAIR_RISER; // 1.0

/** Straight band south edge (= IR.stairS); north edge overlaps winders */
const STAIR_STR_Z0 = IR.stairS; // 4.55
const STAIR_STR_Z1_NOMINAL = IR.north - M91; // 5.46
/** Overlap straight into turn zone so (5.36, 5.55) stays walkable */
const STAIR_JOIN_OVERLAP = 0.08;
const STAIR_STR_Z1 = STAIR_STR_Z1_NOMINAL + STAIR_JOIN_OVERLAP; // ≈ 5.54
const STAIR_WIN_Z0 = STAIR_STR_Z1_NOMINAL; // 5.46
const STAIR_WIN_Z1 = IR.north; // 6.37

/**
 * L-stair 1F→2F: straight north then winders (connection → east).
 * Pivot west of east bay edge so first winders meet straight exit (x≈5.0–5.4).
 * startAngle ~WNW so arc covers join before sweeping to east.
 */
export const STAIR_L_1F_2F = {
  straight: {
    x0: IR.clE, // 4.55
    x1: IR.stairE, // 5.46
    z0: STAIR_STR_Z0,
    z1: STAIR_STR_Z1, // extends into winder band
    steps: STAIR_STRAIGHT_N,
    tread: (STAIR_STR_Z1 - STAIR_STR_Z0) / STAIR_STRAIGHT_N,
    riser: STAIR_RISER,
    baseY: INTERIOR_FLOOR_Y,
    topY: INTERIOR_FLOOR_Y + STAIR_STRAIGHT_RISE, // 1.7
  },
  winder: {
    /** Slightly west of bay NE corner — aligns with straight centerline */
    pivotX: IR.clE + 0.6, // ≈ 5.15
    pivotZ: STAIR_STR_Z1_NOMINAL, // 5.46
    rInner: 0.05,
    rOuter: 0.95,
    /**
     * From WNW (~0.88π, join with straight) clockwise to east (0).
     * Facing change ≈ N→E; arc longer so treads cover the join.
     */
    startAngle: Math.PI * 0.88,
    sweep: -Math.PI * 0.88,
    steps: STAIR_WINDER_N,
    riser: STAIR_RISER,
    baseY: INTERIOR_FLOOR_Y + STAIR_STRAIGHT_RISE,
    topY: FLOOR_LEVELS["2f"], // 2.7
  },
  baseY: INTERIOR_FLOOR_Y,
  topY: FLOOR_LEVELS["2f"],
  voidRect: {
    x: IR.clE,
    z: STAIR_STR_Z0,
    width: IR.genkanW - IR.clE,
    depth: IR.north - STAIR_STR_Z0,
  },
} as const;

/** @deprecated alias — L-stair, no mid landing */
export const STAIR_U = {
  lower: STAIR_L_1F_2F.straight,
  landing: {
    x0: IR.clE,
    x1: IR.genkanW,
    z0: STAIR_WIN_Z0,
    z1: STAIR_WIN_Z1,
    y: STAIR_L_1F_2F.straight.topY,
  },
  upper: {
    x0: IR.stairE,
    x1: IR.genkanW,
    zNorth: STAIR_WIN_Z1,
    zSouth: STAIR_WIN_Z0,
    steps: 0,
    tread: 0.15,
  },
  tread: STAIR_STRAIGHT_TREAD,
  riser: STAIR_RISER,
  overlap: 0,
  baseY: INTERIOR_FLOOR_Y,
  topY: FLOOR_LEVELS["2f"],
  voidRect: STAIR_L_1F_2F.voidRect,
} as const;

/** @deprecated */
export const STAIR_1F_2F = STAIR_U;

/** @deprecated no flat mid landing on L-stair */
export const FLOOR_STAIR_MID_LANDING: FloorSlab = {
  id: "stair-mid-landing-deprecated",
  floor: "1f",
  y: -10,
  rect: { x: 0, z: 0, width: 0.01, depth: 0.01 },
  thickness: 0.01,
  label: "unused",
  color: "#9a958c",
};

// ─────────────────────────────────────────────────────────────
// Stairs 2F → PH — same L: straight 0.91 + 90° winders 0.91
// Hall shell 1.82 × 2.73; door corr z 3.64–4.55
// Rise 2.7 m: 6×0.225 straight + 6×0.225 winders → Y=5.4
// Balcony: x 0–6.37, z 0–3.64
// ─────────────────────────────────────────────────────────────

const PH_BAND = M91;
const PH_RISER = 0.225;
const PH_STRAIGHT_N = 6;
const PH_WINDER_N = 6;
const PH_STRAIGHT_TREAD = PH_BAND / PH_STRAIGHT_N;
const PH_STRAIGHT_RISE = PH_STRAIGHT_N * PH_RISER; // 1.35
const PH_BASE_Y = FLOOR_LEVELS["2f"]; // 2.7
const PH_TOP_Y = FLOOR_LEVELS.ph; // 5.4

/** PH stair hall outer shell (walls + ceiling) */
export const PH_HALL = {
  x0: IR.clE,
  x1: IR.genkanW,
  z0: IR.mid,
  z1: IR.north,
  width: IR.genkanW - IR.clE,
  depth: IR.north - IR.mid,
  corrZ0: IR.mid,
  corrZ1: IR.stairS,
  corrDepth: M91,
  flightZ0: IR.stairS,
  flightZ1: IR.north - M91,
  landZ0: IR.north - M91,
  landZ1: IR.north,
  wellZ0: IR.stairS,
  wellZ1: IR.north,
  wellDepth: M182,
} as const;

const PH_JOIN_OVERLAP = 0.08;
const PH_STR_Z1 = PH_HALL.flightZ1 + PH_JOIN_OVERLAP; // ≈ 5.54

export const STAIR_L_2F_PH = {
  straight: {
    x0: PH_HALL.x0,
    x1: IR.stairE,
    z0: PH_HALL.flightZ0,
    z1: PH_STR_Z1,
    steps: PH_STRAIGHT_N,
    tread: (PH_STR_Z1 - PH_HALL.flightZ0) / PH_STRAIGHT_N,
    riser: PH_RISER,
    baseY: PH_BASE_Y,
    topY: PH_BASE_Y + PH_STRAIGHT_RISE, // 4.05
  },
  winder: {
    pivotX: PH_HALL.x0 + 0.6, // ≈ 5.15
    pivotZ: PH_HALL.flightZ1, // 5.46
    rInner: 0.05,
    rOuter: 0.95,
    startAngle: Math.PI * 0.88,
    sweep: -Math.PI * 0.88,
    steps: PH_WINDER_N,
    riser: PH_RISER,
    baseY: PH_BASE_Y + PH_STRAIGHT_RISE,
    topY: PH_TOP_Y,
  },
  baseY: PH_BASE_Y,
  topY: PH_TOP_Y,
  corridor: {
    x0: PH_HALL.x0,
    x1: PH_HALL.x1,
    z0: PH_HALL.corrZ0,
    z1: PH_HALL.corrZ1,
  },
} as const;

/** @deprecated shape alias for height/docs */
export const STAIR_2F_PH = {
  lower: STAIR_L_2F_PH.straight,
  landing: {
    x0: PH_HALL.x0,
    x1: PH_HALL.x1,
    z0: PH_HALL.landZ0,
    z1: PH_HALL.landZ1,
    y: STAIR_L_2F_PH.straight.topY,
  },
  upper: {
    x0: IR.stairE,
    x1: PH_HALL.x1,
    zNorth: PH_HALL.landZ1,
    zSouth: PH_HALL.flightZ0,
    steps: 0,
    tread: PH_STRAIGHT_TREAD,
  },
  tread: PH_STRAIGHT_TREAD,
  riser: PH_RISER,
  overlap: 0,
  baseY: PH_BASE_Y,
  topY: PH_TOP_Y,
  well: {
    x0: PH_HALL.x0,
    x1: PH_HALL.x1,
    z0: PH_HALL.wellZ0,
    z1: PH_HALL.wellZ1,
  },
  corridor: STAIR_L_2F_PH.corridor,
} as const;

/** @deprecated unused on L-stair */
export const FLOOR_STAIR_PH_MID: FloorSlab = {
  id: "stair-ph-mid-deprecated",
  floor: "2f",
  y: -10,
  rect: { x: 0, z: 0, width: 0.01, depth: 0.01 },
  thickness: 0.01,
  label: "unused",
  color: "#8a8580",
};

/** Straight flights only (winders in STAIR_WINDERS) */
export const STAIRS: StairFlight[] = [
  {
    id: "stair-1f-straight",
    fromFloor: "1f",
    x: (STAIR_L_1F_2F.straight.x0 + STAIR_L_1F_2F.straight.x1) / 2,
    z: STAIR_L_1F_2F.straight.z0,
    direction: "north",
    stepCount: STAIR_L_1F_2F.straight.steps,
    treadDepth: STAIR_L_1F_2F.straight.tread,
    riserHeight: STAIR_L_1F_2F.straight.riser,
    width: STAIR_L_1F_2F.straight.x1 - STAIR_L_1F_2F.straight.x0,
    baseY: STAIR_L_1F_2F.straight.baseY,
    topY: STAIR_L_1F_2F.straight.topY,
    label: "1F直線北上",
  },
  {
    id: "stair-2f-ph-straight",
    fromFloor: "2f",
    x: (STAIR_L_2F_PH.straight.x0 + STAIR_L_2F_PH.straight.x1) / 2,
    z: STAIR_L_2F_PH.straight.z0,
    direction: "north",
    stepCount: STAIR_L_2F_PH.straight.steps,
    treadDepth: STAIR_L_2F_PH.straight.tread,
    riserHeight: STAIR_L_2F_PH.straight.riser,
    width: STAIR_L_2F_PH.straight.x1 - STAIR_L_2F_PH.straight.x0,
    baseY: STAIR_L_2F_PH.straight.baseY,
    topY: STAIR_L_2F_PH.straight.topY,
    label: "2F直線北上",
  },
];

/** 90° winders (turn while rising) → floor level at end */
export const STAIR_WINDERS: StairWinder[] = [
  {
    id: "winder-1f-2f",
    fromFloor: "1f",
    pivotX: STAIR_L_1F_2F.winder.pivotX,
    pivotZ: STAIR_L_1F_2F.winder.pivotZ,
    rInner: STAIR_L_1F_2F.winder.rInner,
    rOuter: STAIR_L_1F_2F.winder.rOuter,
    startAngle: STAIR_L_1F_2F.winder.startAngle,
    sweep: STAIR_L_1F_2F.winder.sweep,
    stepCount: STAIR_L_1F_2F.winder.steps,
    riserHeight: STAIR_L_1F_2F.winder.riser,
    baseY: STAIR_L_1F_2F.winder.baseY,
    topY: STAIR_L_1F_2F.winder.topY,
    label: "1F→2F 90°踢步",
  },
  {
    id: "winder-2f-ph",
    fromFloor: "2f",
    pivotX: STAIR_L_2F_PH.winder.pivotX,
    pivotZ: STAIR_L_2F_PH.winder.pivotZ,
    rInner: STAIR_L_2F_PH.winder.rInner,
    rOuter: STAIR_L_2F_PH.winder.rOuter,
    startAngle: STAIR_L_2F_PH.winder.startAngle,
    sweep: STAIR_L_2F_PH.winder.sweep,
    stepCount: STAIR_L_2F_PH.winder.steps,
    riserHeight: STAIR_L_2F_PH.winder.riser,
    baseY: STAIR_L_2F_PH.winder.baseY,
    topY: STAIR_L_2F_PH.winder.topY,
    label: "2F→PH 90°踢步",
  },
];

/** Roof balcony parapet height (m) */
export const PH_PARAPET_H = 1.4;

/** PH ルーフバルコニー */
export const PH_BALCONY = {
  x0: 0,
  x1: 6.37,
  z0: 0,
  z1: IR.mid, // 3.64 — north edge meets stair hall south
  y: FLOOR_LEVELS.ph,
  width: 6.37,
  depth: 3.64,
} as const;

const Y_PH = FLOOR_LEVELS.ph;
const T_PH = BUILDING.slabThickness;

export const FLOORS_PH: FloorSlab[] = [
  {
    id: "ph-balcony",
    floor: "ph",
    y: Y_PH,
    rect: {
      x: PH_BALCONY.x0,
      z: PH_BALCONY.z0,
      width: PH_BALCONY.width,
      depth: PH_BALCONY.depth,
    },
    thickness: T_PH,
    label: "PHルーフバルコニー",
    color: "#a8b0a4",
  },
  /**
   * PH corridor NS 0.91 (z 3.64–4.55) — door front, like 2F corridor.
   * North edge abuts ph-stair-deck.
   */
  {
    id: "ph-corridor",
    floor: "ph",
    y: Y_PH,
    rect: {
      x: PH_HALL.x0,
      z: PH_HALL.corrZ0,
      width: PH_HALL.width,
      depth: PH_HALL.corrDepth, // 0.91
    },
    thickness: T_PH,
    label: "PH廊道0.91",
    color: "#b0aaa0",
  },
  /**
   * L-stair top deck @ PH: full well x 4.55–6.37, z 4.55–6.37, Y=5.4.
   * Fills gap (e.g. 5.92, 4.8) between corridor and north landing band.
   * Connects winder exit → corridor (south) → balcony door.
   */
  {
    id: "ph-stair-deck",
    floor: "ph",
    y: Y_PH,
    rect: {
      x: PH_HALL.x0, // 4.55
      z: PH_HALL.wellZ0, // 4.55
      width: PH_HALL.width, // 1.82
      depth: PH_HALL.wellDepth, // 1.82
    },
    thickness: T_PH,
    label: "PH梯口甲板",
    color: "#b8b4ac",
  },
  // North band still listed for clarity (overlaps deck; harmless)
  {
    id: "ph-hall-landing-top",
    floor: "ph",
    y: Y_PH,
    rect: {
      x: PH_HALL.x0,
      z: PH_HALL.landZ0,
      width: PH_HALL.width,
      depth: PH_HALL.landZ1 - PH_HALL.landZ0,
    },
    thickness: T_PH,
    label: "PH梯間北平台面",
    color: "#b8b4ac",
  },
];

const PH_DOOR_W = 0.8;
const PH_DOOR_H = 1.95;
const PH_DOOR_FROM = (PH_HALL.width - PH_DOOR_W) / 2;

export const WALLS_PH: WallSegment[] = [
  // Stair hall — four walls, full height
  {
    id: "ph-hall-n",
    ...wallEW(PH_HALL.x0, PH_HALL.x1, PH_HALL.z1),
    floor: "ph",
    label: "PH梯間北",
  },
  {
    id: "ph-hall-w",
    ...wallNS(PH_HALL.x0, PH_HALL.z0, PH_HALL.z1),
    floor: "ph",
    label: "PH梯間西",
  },
  {
    id: "ph-hall-e",
    ...wallNS(PH_HALL.x1, PH_HALL.z0, PH_HALL.z1),
    floor: "ph",
    label: "PH梯間東",
  },
  {
    id: "ph-hall-s",
    ...wallEW(PH_HALL.x0, PH_HALL.x1, PH_HALL.z0),
    floor: "ph",
    label: "PH梯間南→陽台",
    openings: [
      {
        id: "ph-door-balcony",
        fromStart: PH_DOOR_FROM,
        width: PH_DOOR_W,
        height: PH_DOOR_H,
        sill: 0,
        type: "door",
      },
    ],
  },
  // Balcony parapets 1.4 m (north only west of stair hall)
  {
    id: "ph-balc-s",
    ...wallEW(PH_BALCONY.x0, PH_BALCONY.x1, PH_BALCONY.z0),
    floor: "ph",
    height: PH_PARAPET_H,
    label: "PH陽台南矮牆",
  },
  {
    id: "ph-balc-w",
    ...wallNS(PH_BALCONY.x0 + halfT, PH_BALCONY.z0, PH_BALCONY.z1),
    floor: "ph",
    height: PH_PARAPET_H,
    label: "PH陽台西矮牆",
  },
  {
    id: "ph-balc-e",
    ...wallNS(PH_BALCONY.x1 - halfT, PH_BALCONY.z0, PH_BALCONY.z1),
    floor: "ph",
    height: PH_PARAPET_H,
    label: "PH陽台東矮牆",
  },
  {
    id: "ph-balc-n",
    ...wallEW(PH_BALCONY.x0, PH_HALL.x0, PH_BALCONY.z1),
    floor: "ph",
    height: PH_PARAPET_H,
    label: "PH陽台北矮牆(西段)",
  },
];

export const CEILING_PH = {
  soffitY: FLOOR_LEVELS.ph + BUILDING.wallHeight, // 7.9
  thickness: 0.12,
} as const;

const CEIL_PH_TOP = CEILING_PH.soffitY + CEILING_PH.thickness;
const CEIL_PH_T = CEILING_PH.thickness;

/** PH stair hall ceiling only (balcony open to sky) */
export const CEILINGS_PH: FloorSlab[] = [
  {
    id: "ceil-ph-hall",
    floor: "ph",
    y: CEIL_PH_TOP,
    rect: {
      x: PH_HALL.x0,
      z: PH_HALL.z0,
      width: PH_HALL.width,
      depth: PH_HALL.depth,
    },
    thickness: CEIL_PH_T,
    label: "天花 PH梯間",
    color: "#f7f2e8",
  },
];


/** @deprecated alias */
export const FLOOR_2F_LANDING = FLOOR_STAIR_MID_LANDING;

// ─────────────────────────────────────────────────────────────
// 2F footprint — NS total 6.37 aligned with 1F:
//   south rooms 2.73 + corridor 0.91 + north wing 2.73
//   (corridor = north_wing 2.73 − stair_well 1.82)
//
// z (south=0.91): rooms → 3.64 | corridor → 4.55 | well/toilet → 6.37
//
// NW jog: corridor west wall pushed west 0.91 → x=1.82; protrusion NS 1.365
// (half of 2.73) with solid wall to トイレ; sink on north face.
// ─────────────────────────────────────────────────────────────

/**
 * 2F plan NS — flush with 1F south (z=0), total 6.37:
 *   south rooms 2.73 + corridor 0.91 + north wing 2.73.
 * (Old grid sat on z=0.91 and only summed to 5.46 → exterior SW notch.)
 *
 * Stair well stays z 4.55–6.37 (1F align). NE G2 / balcN on corridor south (= clN).
 */
export const Z2 = {
  /** 2F south face — flush with 1F SZ.outer */
  south: 0,
  /** South-room / CL north = corridor south */
  clN: 2.73,
  /** @deprecated alias of clN */
  mid: 2.73,
  /** Corridor north = north-wing south (toilet etc.) */
  corrN: 3.64,
  /** @deprecated use corrN */
  sRoomN: 3.64,
  /**
   * NE 南牆 / G2 / balcony north (= clN = corridor south = south-room north).
   * Corridor east faces NE west door (not balcony).
   * West bay NS 1.11 → south 1.62; east bay NS 0.91 → south 1.82.
   */
  balcN: 2.73, // = clN
  balcWestS: 2.73 - 1.11, // 1.62
  balcEastS: 2.73 - 0.91, // 1.82
  /** @deprecated use balcEastS / balcWestS */
  balcS: 2.73 - 0.91,
  north: IR.north, // 6.37
  /** 1F stair well south (fixed) — deck / void */
  wellS: IR.stairS, // 4.55
  sRoomDepth: 2.73,
  clDepth: 2.73,
  corrDepth: 0.91,
  /** North wing NS */
  nWingDepth: 2.73,
  nwJogDepth: 2.73 / 2, // 1.365
  /** NW jog north = corrN + half north-wing */
  nwJogN: 3.64 + 2.73 / 2, // ≈ 5.005
} as const;

/** NW corridor west façade (south-block west + 0 is rooms; jog = 2.73 − 0.91). */
export const X2_NW_JOG = 2.73 - 0.91; // 1.82

export const X2 = {
  w0: 0,
  w1: 2.73,
  w2: 3.64,
  /** NE 洋室 west / stair|room wall */
  w3: 6.37,
  /** Balcony bay east (2.73 east of w3) — not end of NE south wall */
  w4: 9.1,
  /** Building / NE 洋室 east (= w3 + 2.73 + 1.82) */
  east: BUILDING.width, // 10.92
} as const;

const Y2 = FLOOR_LEVELS["2f"];
const T2 = BUILDING.slabThickness;

/**
 * 2F walkable floors.
 * South rooms z0–2.73; corridor 2.73–3.64; north wing 3.64–6.37.
 * Stair well / deck still z 4.55–6.37 (1F). Approach strip 3.64–4.55 to deck.
 * NE G2 4.55 m EW @ z=clN. Balcony south of G2.
 */
export const FLOORS_2F: FloorSlab[] = [
  {
    id: "2f-sw-room",
    floor: "2f",
    y: Y2,
    rect: { x: 0, z: Z2.south, width: 2.73, depth: Z2.sRoomDepth },
    thickness: T2,
    label: "2F洋室6.5(西)",
    color: "#cfc9be",
  },
  {
    id: "2f-s-cl",
    floor: "2f",
    y: Y2,
    rect: { x: 2.73, z: Z2.south, width: 0.91, depth: Z2.clDepth },
    thickness: T2,
    label: "2F-CL(南翼)",
    color: "#c8c2b8",
  },
  {
    id: "2f-s-center",
    floor: "2f",
    y: Y2,
    rect: { x: 3.64, z: Z2.south, width: 2.73, depth: Z2.sRoomDepth },
    thickness: T2,
    label: "2F洋室6(中央)",
    color: "#cfc9be",
  },
  /**
   * 2F NE balcony — south of G2 @ clN=2.73 (corridor south / south-room north):
   *  West: EW 2.73 × NS 1.11 → z 1.62–2.73
   *  East: EW 1.82 × NS 0.91 → z 1.82–2.73
   */
  {
    id: "2f-balcony-w",
    floor: "2f",
    y: Y2,
    rect: {
      x: IR.genkanW, // 6.37
      z: Z2.balcWestS, // 1.62
      width: 2.73,
      depth: 1.11,
    },
    thickness: T2,
    label: "2F陽台西 2.73×1.11",
    color: "#b5b0a6",
  },
  {
    id: "2f-balcony-e",
    floor: "2f",
    y: Y2,
    rect: {
      x: IR.genkanW + 2.73, // 9.10
      z: Z2.balcEastS, // 1.82
      width: 1.82,
      depth: 0.91,
    },
    thickness: T2,
    label: "2F陽台東 1.82×0.91",
    color: "#b5b0a6",
  },
  /**
   * 0.91 corridor: west façade at 1.82 (jog) → 6.37; SW door stays indoors.
   * North edge abuts 2f-stair-deck.
   */
  {
    id: "2f-corridor",
    floor: "2f",
    y: Y2,
    rect: {
      x: X2_NW_JOG,
      z: Z2.clN,
      width: IR.genkanW - X2_NW_JOG, // 1.82 → 6.37
      depth: Z2.corrDepth, // 0.91
    },
    thickness: T2,
    label: "2F廊道0.91",
    color: "#b0aaa0",
  },
  /**
   * Approach corrN→wellS (3.64→4.55) full stair width — links corridor to deck.
   */
  {
    id: "2f-stair-approach",
    floor: "2f",
    y: Y2,
    rect: {
      x: IR.clE, // 4.55
      z: Z2.corrN, // 3.64
      width: IR.genkanW - IR.clE, // 1.82
      depth: Z2.wellS - Z2.corrN, // 0.91
    },
    thickness: T2,
    label: "2F梯南アプローチ",
    color: "#b0aaa0",
  },
  /**
   * L-stair top deck: full well x 4.55–6.37, z 4.55–6.37 @ Y=2.7.
   * mid-climb snap limited by maxStepUp 0.55.
   */
  {
    id: "2f-stair-deck",
    floor: "2f",
    y: Y2,
    rect: {
      x: IR.clE, // 4.55
      z: Z2.wellS, // 4.55
      width: IR.genkanW - IR.clE, // 1.82
      depth: Z2.north - Z2.wellS, // 1.82
    },
    thickness: T2,
    label: "2F梯口甲板",
    color: "#b8b4ac",
  },
  /**
   * NW jog wet / sink bay (north of corridor strip, west of トイレ solid wall).
   * x 1.82–2.73, z corrN→nwJogN.
   */
  {
    id: "2f-nw-jog",
    floor: "2f",
    y: Y2,
    rect: {
      x: X2_NW_JOG,
      z: Z2.corrN,
      width: 2.73 - X2_NW_JOG, // 0.91
      depth: Z2.nwJogN - Z2.corrN, // ≈ 1.365
    },
    thickness: T2,
    label: "2F西北凸角(洗面)",
    color: "#b8b4ac",
  },
  // トイレ (north wing west of well)
  {
    id: "2f-n-west",
    floor: "2f",
    y: Y2,
    rect: {
      x: 2.73,
      z: Z2.corrN,
      width: IR.clE - 2.73,
      depth: Z2.north - Z2.corrN, // 2.73
    },
    thickness: T2,
    label: "2Fトイレ",
    color: "#c5c0b6",
  },
  /**
   * NE 洋室6.5 — x≥6.37, z clN→north (includes corridor strip + north 2.73).
   * South = corridor south so corridor east faces NE door (not balcony).
   */
  {
    id: "2f-ne-yoshitsu",
    floor: "2f",
    y: Y2,
    rect: {
      x: IR.genkanW,
      z: Z2.clN, // 2.73
      width: BUILDING.width - IR.genkanW,
      depth: Z2.north - Z2.clN, // 3.64
    },
    thickness: T2,
    label: "2F洋室6.5(東北)",
    color: "#c5c0b6",
  },
];

/**
 * Simple Phase-1 sink placeholder (plan-space, on 2F).
 * Against north wall of NW jog, east of west façade.
 */
export const PROP_2F_SINK = {
  floor: "2f" as FloorId,
  /** Cabinet + basin AABB center (plan) */
  x: X2_NW_JOG + 0.91 / 2, // mid of jog width
  z: Z2.nwJogN - 0.22,
  y: FLOOR_LEVELS["2f"],
  width: 0.55,
  depth: 0.4,
  height: 0.85,
  basinH: 0.12,
  label: "2F洗手台",
} as const;

/**
 * 1F north-of-mid floors.
 * Stair well void (no 0.5 slab): lower bay z≥lowerZ0, upper bay z≥upperSouth,
 * landing footprint uses mid-landing slab at y=1.7 instead.
 *
 * Corridors A+B keep 0.5 floor so path LDK → stair / 玄関 door does not fall to grade.
 */
export const FLOORS_1F_NORTH_SPLIT: FloorSlab[] = [
  // West of entire stair U (x < 4.55)
  {
    id: "1f-n-west-of-stair",
    floor: "1f",
    y: INTERIOR_FLOOR_Y,
    rect: {
      x: SZ.yoshitsuW,
      z: SZ.mid,
      width: IR.clE - SZ.yoshitsuW, // 1.82–4.55
      depth: SZ.north - SZ.mid,
    },
    thickness: INTERIOR_SLAB_THICKNESS,
    label: "1F北側(梯西)",
    color: "#cfc8bc",
  },
  /**
   * Approach mid → flight band south (z 4.55), full stair width.
   * LDK door sits on genkanW at z 4.55–5.46 (east of this band).
   */
  {
    id: "1f-n-stair-approach-wide",
    floor: "1f",
    y: INTERIOR_FLOOR_Y,
    rect: {
      x: IR.clE,
      z: SZ.mid,
      width: IR.genkanW - IR.clE, // 4.55–6.37
      depth: Math.max(STAIR_STR_Z0 - SZ.mid, 0.05), // mid → 4.55
    },
    thickness: INTERIOR_SLAB_THICKNESS,
    label: "1F梯南走廊A",
    color: "#cfc8bc",
  },
  // East of genkanW: 1f-hall-north-east
];

/** All walkable slabs for Floors + height sampling */
export const ALL_FLOOR_SLABS: FloorSlab[] = [
  ...FLOORS,
  ...FLOORS_1F_NORTH_SPLIT,
  ...FLOORS_2F,
  ...FLOORS_PH,
];

// ─────────────────────────────────────────────────────────────
// 1F ceiling (full indoor roof so sky is not visible from 1F)
// Soffit bottom = wall top (2.5); stair well left open.
// ─────────────────────────────────────────────────────────────

export const CEILING_1F = {
  /** Underside Y seen from indoors (flush with wall top). */
  soffitY: BUILDING.wallHeight, // 2.5
  thickness: 0.12,
} as const;

/** Top of ceiling box (soffit = top − thickness). */
const CEIL_TOP_Y = CEILING_1F.soffitY + CEILING_1F.thickness;
const CEIL_T = CEILING_1F.thickness;
const CEIL_COLOR = "#f7f2e8";

/**
 * 1F ceiling slabs following indoor exterior envelope.
 * Omits outdoor NW courtyard and STAIR_U.voidRect.
 */
export const CEILINGS_1F: FloorSlab[] = [
  // LDK
  {
    id: "ceil-1f-ldk",
    floor: "1f",
    y: CEIL_TOP_Y,
    rect: {
      x: SX.x0,
      z: SZ.outer,
      width: SX.xLdkE - SX.x0,
      depth: SZ.mid - SZ.outer,
    },
    thickness: CEIL_T,
    label: "天花 LDK",
    color: CEIL_COLOR,
  },
  // North of mid, west of stair void (洋室・CL)
  {
    id: "ceil-1f-n-west",
    floor: "1f",
    y: CEIL_TOP_Y,
    rect: {
      x: SZ.yoshitsuW,
      z: SZ.mid,
      width: IR.clE - SZ.yoshitsuW,
      depth: SZ.north - SZ.mid,
    },
    thickness: CEIL_T,
    label: "天花 北側西",
    color: CEIL_COLOR,
  },
  // Approach south of stair package (mid → flight z0)
  {
    id: "ceil-1f-stair-approach",
    floor: "1f",
    y: CEIL_TOP_Y,
    rect: {
      x: IR.clE,
      z: SZ.mid,
      width: IR.genkanW - IR.clE,
      depth: Math.max(STAIR_U.voidRect.z - SZ.mid, 0.05),
    },
    thickness: CEIL_T,
    label: "天花 梯南走廊",
    color: CEIL_COLOR,
  },
  // Genkan + SCL band (NS 1.72 → 洗面南)
  {
    id: "ceil-1f-genkan-scl",
    floor: "1f",
    y: CEIL_TOP_Y,
    rect: {
      x: SX.xLdkE,
      z: SZ.recess,
      width: SX.xSclE - SX.xLdkE,
      depth: GENKAN_SCL_NS,
    },
    thickness: CEIL_T,
    label: "天花 玄関SCL",
    color: CEIL_COLOR,
  },
  // East wing (UB / 洗面 vertical band)
  {
    id: "ceil-1f-east",
    floor: "1f",
    y: CEIL_TOP_Y,
    rect: {
      x: SX.xSclE,
      z: SZ.ubSouth,
      width: SX.xEast - SX.xSclE,
      depth: SZ.north - SZ.ubSouth,
    },
    thickness: CEIL_T,
    label: "天花 東側",
    color: CEIL_COLOR,
  },
  // North of genkan/SCL (z ≥ 4.55)
  {
    id: "ceil-1f-n-east",
    floor: "1f",
    y: CEIL_TOP_Y,
    rect: {
      x: SX.xLdkE,
      z: SENMEN_SOUTH_Z,
      width: SX.xEast - SX.xLdkE,
      depth: SZ.north - SENMEN_SOUTH_Z,
    },
    thickness: CEIL_T,
    label: "天花 北側東",
    color: CEIL_COLOR,
  },
];

// ─────────────────────────────────────────────────────────────
// 2F ceiling — soffit at 2F wall top (2.7 + 2.5 = 5.2)
// Indoor footprint only; balcony + stair well open (no slab).
// ─────────────────────────────────────────────────────────────

export const CEILING_2F = {
  /** Underside Y from 2F rooms (floor 2.7 + wallHeight 2.5). */
  soffitY: FLOOR_LEVELS["2f"] + BUILDING.wallHeight, // 5.2
  thickness: CEILING_1F.thickness, // 0.12
} as const;

const CEIL2_TOP_Y = CEILING_2F.soffitY + CEILING_2F.thickness; // 5.32
const CEIL2_T = CEILING_2F.thickness;
const CEIL2_COLOR = "#f7f2e8";

/**
 * 2F ceiling slabs aligned with indoor floors.
 * Omits: balcony, stair well (x 4.55–6.37, z ≥ corrN).
 */
export const CEILINGS_2F: FloorSlab[] = [
  {
    id: "ceil-2f-sw",
    floor: "2f",
    y: CEIL2_TOP_Y,
    rect: { x: 0, z: Z2.south, width: 2.73, depth: Z2.sRoomDepth },
    thickness: CEIL2_T,
    label: "天花 2F西洋室",
    color: CEIL2_COLOR,
  },
  {
    id: "ceil-2f-cl",
    floor: "2f",
    y: CEIL2_TOP_Y,
    rect: { x: 2.73, z: Z2.south, width: 0.91, depth: Z2.clDepth },
    thickness: CEIL2_T,
    label: "天花 2F-CL",
    color: CEIL2_COLOR,
  },
  {
    id: "ceil-2f-sc",
    floor: "2f",
    y: CEIL2_TOP_Y,
    rect: { x: 3.64, z: Z2.south, width: 2.73, depth: Z2.sRoomDepth },
    thickness: CEIL2_T,
    label: "天花 2F中央洋室",
    color: CEIL2_COLOR,
  },
  // Corridor ceiling west of stair shaft only (x 4.55–6.37 open for 2F→PH)
  {
    id: "ceil-2f-corridor",
    floor: "2f",
    y: CEIL2_TOP_Y,
    rect: {
      x: X2_NW_JOG,
      z: Z2.clN,
      width: IR.clE - X2_NW_JOG, // 1.82 → 4.55
      depth: Z2.corrDepth,
    },
    thickness: CEIL2_T,
    label: "天花 2F廊道",
    color: CEIL2_COLOR,
  },
  {
    id: "ceil-2f-nw-jog",
    floor: "2f",
    y: CEIL2_TOP_Y,
    rect: {
      x: X2_NW_JOG,
      z: Z2.corrN,
      width: 2.73 - X2_NW_JOG,
      depth: Z2.nwJogN - Z2.corrN,
    },
    thickness: CEIL2_T,
    label: "天花 2F西北凸角",
    color: CEIL2_COLOR,
  },
  {
    id: "ceil-2f-toilet",
    floor: "2f",
    y: CEIL2_TOP_Y,
    rect: {
      x: 2.73,
      z: Z2.corrN,
      width: IR.clE - 2.73,
      depth: Z2.north - Z2.corrN,
    },
    thickness: CEIL2_T,
    label: "天花 2Fトイレ",
    color: CEIL2_COLOR,
  },
  {
    id: "ceil-2f-stair-approach",
    floor: "2f",
    y: CEIL2_TOP_Y,
    rect: {
      x: IR.clE,
      z: Z2.corrN,
      width: IR.genkanW - IR.clE,
      depth: Z2.wellS - Z2.corrN,
    },
    thickness: CEIL2_T,
    label: "天花 2F梯アプローチ",
    color: CEIL2_COLOR,
  },
  {
    id: "ceil-2f-ne",
    floor: "2f",
    y: CEIL2_TOP_Y,
    rect: {
      x: IR.genkanW,
      z: Z2.clN,
      width: BUILDING.width - IR.genkanW,
      depth: Z2.north - Z2.clN,
    },
    thickness: CEIL2_T,
    label: "天花 2F東北洋室",
    color: CEIL2_COLOR,
  },
];

/** All ceiling slabs for rendering (not walkable). */
export const ALL_CEILINGS: FloorSlab[] = [
  ...CEILINGS_1F,
  ...CEILINGS_2F,
  ...CEILINGS_PH,
];

// ─────────────────────────────────────────────────────────────
// 2F walls (base Y = 2.7)
// NS: rooms 2.73 + corridor 0.91 + north 2.73 (= 6.37 from south z=0)
// South wing doors @ clN → corridor; トイレ @ corrN; NE G2 @ clN
// ─────────────────────────────────────────────────────────────

/** 2F interior door / glass (sill relative to floor top of story). */
const INT2_DOOR_W = 0.8;
const INT2_DOOR_H = 1.95;
const INT2_SILL = 0;

/** South-wing plan X breaks (bottom chain). */
const X2_SW0 = 0;
const X2_CL0 = 2.73;
const X2_CL1 = 3.64;
const X2_SE = IR.genkanW; // 6.37

/** CL stack: south → clN; equal halves. */
const Z2_CL_SPLIT = Z2.south + Z2.clDepth / 2; // 1.365
const Z2_CL_N = Z2.clN; // 2.73 — south-room north / corridor south / NE·G2 south
const Z2_CORR_N = Z2.corrN; // 3.64 — corridor north
const Z2_NW_JOG_N = Z2.nwJogN; // ≈ 5.005
const Z2_WELL_S = Z2.wellS; // 4.55 — 1F stair well
const X2_JOG = X2_NW_JOG; // 1.82

/**
 * NE 洋室 south wall (G2): EW 4.55 @ z=clN (corridor south).
 */
const NE_S_X0 = IR.genkanW; // 6.37
const NE_S_X1 = BUILDING.width; // 10.92
const NE_S_LEN = NE_S_X1 - NE_S_X0; // 4.55

const G2_SILL = 0.1;
const G2_H = BUILDING.wallHeight - G2_SILL - 0.08;
const G2_EDGE = 0.08;
const G2_FROM = G2_EDGE;
const G2_W = NE_S_LEN - 2 * G2_EDGE;

/** NE door on west wall, centered in corridor band clN→corrN (along Z from clN). */
const DOOR_2F_NE_FROM = (Z2_CORR_N - Z2_CL_N - INT2_DOOR_W) / 2;

/** Room doors flank CL on wall @ clN (fromStart from x=0). */
const DOOR_2F_SW_FROM = X2_CL0 - INT2_DOOR_W - 0.04; // east-shifted, tight to CL
const DOOR_2F_SC_FROM = X2_CL1 + 0.04; // tight to CL east

const CL_PASS_W = 0.7;
const CL_PASS_H = INT2_DOOR_H;
const CL_PASS_S_FROM = (Z2_CL_SPLIT - Z2.south - CL_PASS_W) / 2;
const CL_PASS_N_FROM =
  Z2_CL_SPLIT - Z2.south + (Z2_CL_N - Z2_CL_SPLIT - CL_PASS_W) / 2;

export const WALLS_2F: WallSegment[] = [
  // ── South face of south block ──
  {
    id: "2f-ext-south-w",
    ...wallEW(X2_SW0, X2_SE, Z2.south),
    floor: "2f",
    label: "2F南(西〜中央)",
  },
  // ── West ──
  {
    id: "2f-ext-west-s",
    ...wallNS(halfT, Z2.south, Z2_CL_N),
    floor: "2f",
    label: "2F西(南翼)",
  },
  // NW jog west façade (corridor + sink bay), x=1.82, z clN→nwJogN
  {
    id: "2f-ext-west-nw-jog",
    ...wallNS(X2_JOG + halfT, Z2_CL_N, Z2_NW_JOG_N),
    floor: "2f",
    label: "2F西(廊道凸角)",
  },
  // North wing west only north of jog (トイレ NW corner → north)
  {
    id: "2f-ext-west-n",
    ...wallNS(X2_CL0 + halfT, Z2_NW_JOG_N, Z2.north),
    floor: "2f",
    label: "2F西(北翼トイレ北段)",
  },
  // NW jog north exterior (sink bay)
  {
    id: "2f-ext-nw-jog-n",
    ...wallEW(X2_JOG, X2_CL0, Z2_NW_JOG_N),
    floor: "2f",
    label: "2F北(西北凸角)",
  },
  // ── North exterior (from x=2.73 east; jog has own north wall) ──
  {
    id: "2f-ext-north",
    ...wallEW(X2_CL0, BUILDING.width, Z2.north),
    floor: "2f",
    label: "2F北",
  },
  // ── East exterior (NE) ──
  {
    id: "2f-ext-east",
    ...wallNS(BUILDING.width - halfT, Z2_CL_N, Z2.north),
    floor: "2f",
    label: "2F東(NE)",
  },
  // ── South block east @ x=6.37 (south rooms only; NE continues north of clN) ──
  {
    id: "2f-ext-s-block-e",
    ...wallNS(X2_SE, Z2.south, Z2_CL_N),
    floor: "2f",
    label: "2F南翼東",
  },

  // ═══════════════════════════════════════════════════════════
  // South-wing north wall @ clN → corridor (not outdoors)
  // Doors flank CL; open opposite into rooms.
  // ═══════════════════════════════════════════════════════════

  {
    id: "2f-int-sroom-n",
    ...wallEW(X2_SW0, X2_SE, Z2_CL_N),
    floor: "2f",
    label: "2F南翼北牆→廊",
    openings: [
      {
        id: "2f-door-sw-yoshitsu",
        fromStart: DOOR_2F_SW_FROM,
        width: INT2_DOOR_W,
        height: INT2_DOOR_H,
        sill: INT2_SILL,
        type: "door",
      },
      {
        id: "2f-door-sc-yoshitsu",
        fromStart: DOOR_2F_SC_FROM,
        width: INT2_DOOR_W,
        height: INT2_DOOR_H,
        sill: INT2_SILL,
        type: "door",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // CL stack — 南 only east; 北 only west
  // ═══════════════════════════════════════════════════════════

  {
    id: "2f-int-sw-cl",
    ...wallNS(X2_CL0, Z2.south, Z2_CL_N),
    floor: "2f",
    label: "2F西洋室|CL",
    openings: [
      {
        id: "2f-pass-ncl-west",
        fromStart: CL_PASS_N_FROM,
        width: CL_PASS_W,
        height: CL_PASS_H,
        sill: INT2_SILL,
        type: "passage",
      },
    ],
  },
  {
    id: "2f-int-cl-sc",
    ...wallNS(X2_CL1, Z2.south, Z2_CL_N),
    floor: "2f",
    label: "2F-CL|中央洋室",
    openings: [
      {
        id: "2f-pass-scl-east",
        fromStart: CL_PASS_S_FROM,
        width: CL_PASS_W,
        height: CL_PASS_H,
        sill: INT2_SILL,
        type: "passage",
      },
    ],
  },
  {
    id: "2f-int-cl-split",
    ...wallEW(X2_CL0, X2_CL1, Z2_CL_SPLIT),
    floor: "2f",
    label: "2F-CL中隔",
  },
  // CL north face is solid segment of 2f-int-sroom-n (x 2.73–3.64, no opening)

  // ═══════════════════════════════════════════════════════════
  // Corridor north / トイレ south @ corrN
  // NW jog | トイレ: solid wall @ x=2.73, z corrN→nwJogN (no door)
  // ═══════════════════════════════════════════════════════════

  {
    id: "2f-int-toilet-s",
    ...wallEW(X2_CL0, IR.clE, Z2_CORR_N),
    floor: "2f",
    label: "2Fトイレ南←廊",
    openings: [
      {
        id: "2f-door-toilet",
        fromStart: 0.2,
        width: INT2_DOOR_W,
        height: INT2_DOOR_H,
        sill: INT2_SILL,
        type: "door",
      },
    ],
  },
  {
    id: "2f-int-toilet-e",
    ...wallNS(IR.clE, Z2_CORR_N, Z2.north),
    floor: "2f",
    label: "2Fトイレ東|梯井",
  },
  // Solid partition: NW sink bay | トイレ (no door)
  {
    id: "2f-int-nw-jog-toilet",
    ...wallNS(X2_CL0, Z2_CORR_N, Z2_NW_JOG_N),
    floor: "2f",
    label: "2F凸角|トイレ(實)",
  },

  // ═══════════════════════════════════════════════════════════
  // NE 洋室 (G2 4.55 locked)
  // ═══════════════════════════════════════════════════════════

  {
    id: "2f-int-ne-west",
    ...wallNS(IR.genkanW, Z2_CL_N, Z2.north),
    floor: "2f",
    label: "2F梯|洋室 西牆",
    openings: [
      {
        id: "2f-door-ne-yoshitsu",
        fromStart: DOOR_2F_NE_FROM,
        width: INT2_DOOR_W,
        height: INT2_DOOR_H,
        sill: INT2_SILL,
        type: "door",
      },
    ],
  },
  {
    id: "2f-ne-room-s",
    ...wallEW(NE_S_X0, NE_S_X1, Z2_CL_N),
    floor: "2f",
    label: "2F洋室南 G2 4.55",
    openings: [
      {
        id: "2f-win-ne-g2",
        fromStart: G2_FROM,
        width: G2_W,
        height: G2_H,
        sill: G2_SILL,
        type: "window",
      },
    ],
  },
];

export const WALLS: WallSegment[] = [
  ...WALLS_1F_SHELL,
  ...WALLS_1F_NORTH,
  ...WALLS_1F_INTERIOR,
  ...WALLS_2F,
  ...WALLS_PH,
];

// ─────────────────────────────────────────────────────────────
// Player / camera
// ─────────────────────────────────────────────────────────────

export const PLAYER = {
  eyeHeight: 1.5,
  /** Horizontal walk speed (m/s) for W/S forward-back */
  moveSpeed: 2.0,
  /** Pointer-lock look sensitivity (rad per pixel) */
  lookSensitivity: 0.002,
  /** A / D (and ← / →) discrete yaw step (degrees). A = left, D = right. */
  turnDegrees: 10,
  /**
   * Spawn at z = -2.8 m (south of building), centered on genkan door bay X.
   * Facing north toward the door: left = LDK, right = SCL / UB.
   */
  spawn: {
    x: (SX.xLdkE + SX.xGenkanE) / 2,
    y: FLOOR_LEVELS["1f"],
    /** Start south of the building, facing genkan */
    z: -2.8,
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

/**
 * L1 palette — exterior ivory/yaki + interior 70/25/5 (see DESIGN.md, INTERIOR in houseMaterials).
 */
export const COLORS = {
  /** Interior main ~70%: milk / oat */
  wall: "#f7f2e8",
  /** Exterior warm ivory */
  wallExterior: "#f3eee4",
  /** Interior secondary ~25% warm gray */
  wallSecondary: "#c9c3b8",
  /** Interior accent ~5% charcoal */
  wallAccent: "#2c2824",
  /** Yaki-sugi / charred cedar exterior */
  yakiSugi: "#2a2420",
  /** Default interior floor (warm light wood) */
  floor: "#c9b59a",
  /** Outdoor slab / balcony concrete (warm grey) */
  floorOutdoor: "#b5b0a6",
  /** Balcony soffit underside (warm ivory-grey) */
  balconySoffit: "#e8e4dc",
  /** Stair deck / mid landings (slightly darker wood) */
  floorStair: "#b59a78",
  slabEdge: "#9a948a",
  /** Stair treads / risers */
  stair: "#8f7a5e",
  /** Ceiling oat (not pure white) */
  ceiling: "#f7f2e8",
  doorFill: "#8a8580",
  /** Genkan leaf — light tint; grain from yaki maps */
  genkanDoor: "#c8c0b4",
  /** Door frames — charcoal accent */
  genkanDoorFrame: "#2c2824",
  glass: "#a8c4d4",
  parking: "#5a5a5a",
  parkingLine: "#d0d0d0",
  /** Soft landscape ground */
  ground: "#7a8a6a",
  accent: "#2b6cb0",
  step: "#8a857c",
  labelLdk: "#3d6b3d",
  labelGenkan: "#6b3d3d",
  labelEast: "#3d4d6b",
  propCabinet: "#c4b8a8",
  propBasin: "#e8eef2",
  propPorcelain: "#f2f4f6",
  propCurtain: "#5c4a6a",
} as const;

/** Shared MeshStandardMaterial knobs (non-façade props / floors). */
export const MATERIAL_PRESETS = {
  wallInterior: { roughness: 0.92, metalness: 0.0 },
  wallExterior: { roughness: 0.9, metalness: 0.0 },
  floorInterior: { roughness: 0.72, metalness: 0.0 },
  floorOutdoor: { roughness: 0.95, metalness: 0.0 },
  floorStair: { roughness: 0.78, metalness: 0.0 },
  stair: { roughness: 0.82, metalness: 0.0 },
  ceiling: { roughness: 0.96, metalness: 0.0 },
  doorWood: { roughness: 0.68, metalness: 0.0 },
  doorFrame: { roughness: 0.75, metalness: 0.02 },
  glass: { roughness: 0.08, metalness: 0.12, transparent: true, opacity: 0.36 },
  ground: { roughness: 1.0, metalness: 0.0 },
  parking: { roughness: 0.95, metalness: 0.0 },
  step: { roughness: 0.9, metalness: 0.0 },
  handle: { roughness: 0.3, metalness: 0.7 },
} as const;

/**
 * Scene lighting (L1) — lower ambient so stucco/yaki normals read in raking sun.
 * No heavy post-processing.
 */
export const LIGHTING = {
  /** Slightly warm sky so ivory walls don’t go hospital-cold */
  background: "#c5d0dc",
  fogNear: 50,
  fogFar: 110,
  ambient: 0.32,
  hemiSky: "#eef2f8",
  hemiGround: "#8a8a78",
  hemiIntensity: 0.4,
  sun: {
    color: "#fff1de",
    intensity: 1.65,
    /** Low raking sun — carves stucco grit + yaki board seams */
    position: [14, 11, 16] as [number, number, number],
    shadowMap: 2048,
    shadowFar: 70,
    shadowExtent: 22,
  },
  /**
   * Genkan recess key lights (plan space, mirrored with house).
   * Without these, 内縮 west wall + door sit in shadow → pure black.
   */
  genkanRecess: {
    /** Soft fill from parking toward door */
    fill: {
      position: [7.1, 2.0, 1.4] as [number, number, number],
      intensity: 1.15,
      distance: 7,
      color: "#fff6ea",
    },
    /** Raking strip along west jog (LDK outer → parking) */
    rakeWest: {
      position: [5.9, 1.85, 1.6] as [number, number, number],
      intensity: 0.85,
      distance: 5,
      color: "#ffe8c8",
    },
  },
  /** Soft interior fills so rooms stay readable under roofs */
  interiorFills: [
    // 1F LDK approx center
    { id: "fill-1f-ldk", position: [3.0, 2.1, 2.8] as [number, number, number], intensity: 0.55, distance: 8, color: "#fff8f0" },
    // 1F genkan / east
    { id: "fill-1f-east", position: [8.5, 2.1, 3.5] as [number, number, number], intensity: 0.45, distance: 6, color: "#f5f8ff" },
    // 2F corridor / stair hall
    { id: "fill-2f-hall", position: [5.4, 4.3, 4.2] as [number, number, number], intensity: 0.5, distance: 7, color: "#fff8f0" },
    // 2F NE room
    { id: "fill-2f-ne", position: [8.5, 4.3, 5.0] as [number, number, number], intensity: 0.45, distance: 6, color: "#f0f6ff" },
    // PH hall
    { id: "fill-ph", position: [5.4, 6.5, 5.0] as [number, number, number], intensity: 0.4, distance: 5, color: "#fff8f0" },
  ],
  /**
   * Hero-prop local keys (plan space, live inside house group).
   * Keep weak — must not wash genkan yaki or whole dust zone.
   * Primary placement also on PROP_1F_SCL_COAT.light; this is documentation mirror.
   */
  heroPropKeys: {
    sclCoat: "see PROP_1F_SCL_COAT.light",
  },
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
