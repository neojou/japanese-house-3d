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
    id: "1f-genkan-scl",
    floor: "1f",
    y: INTERIOR_FLOOR_Y,
    // 玄関 + SCL above parking recess
    rect: {
      x: SX.xLdkE,
      z: SZ.recess,
      width: SX.xSclE - SX.xLdkE,
      depth: SZ.mid - SZ.recess,
    },
    thickness: INTERIOR_SLAB_THICKNESS,
    label: "玄関/SCL",
    color: "#b8b2a8",
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
    // Corridor / wet north of genkan to mid-east
    rect: {
      x: SX.xLdkE,
      z: SZ.mid,
      width: SX.xEast - SX.xLdkE,
      depth: SZ.north - SZ.mid,
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

  // 内縮 return: LDK 東外牆 (臨駐車) z: 0 → 2.755
  {
    id: "1f-jog-ldk-east",
    ...wallNS(SX.xLdkE, SZ.outer, SZ.recess),
    floor: "1f",
    label: "内縮西壁 2.755",
  },

  // 玄関大门牆 1.520 at z=2.755 — full-bay opening; frame/leaf in GenkanEntry
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
  recess: SZ.recess, // 2.755
  mid: SZ.mid, // 3.64 = north − 2.73
  /** South end of stair-east wall (north − 1.82) */
  stairS: SZ.north - M182, // 4.55
  /** LDK pocket south of CL (0.91 × 0.91 under CL) */
  clPocketS: SZ.mid - M91, // 2.73
  wetS: SZ.ubSouth + 1.82, // 4.54
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

  // ── 階段 east wall: from north south 1.82 (x = genkanW − 0.91) ──
  {
    id: "1f-int-stair-e",
    ...wallNS(IR.stairE, IR.stairS, IR.north),
    floor: "1f",
    label: "階段東 1.82",
  },

  // 階段南：開放接 LDK（可從 LDK 走上樓）— 無南牆

  // ── LDK | 玄関 south segment: solid wall ──
  {
    id: "1f-int-ldk-genkan",
    ...wallNS(IR.genkanW, IR.recess, IR.mid),
    floor: "1f",
    label: "LDK|玄関(壁)",
  },
  // ── LDK | 玄関 北側通道 + door ──
  {
    id: "1f-int-ldk-e-hall",
    ...wallNS(IR.genkanW, IR.mid, IR.wetS),
    floor: "1f",
    label: "LDK|玄関 北通道",
    openings: [
      {
        id: "1f-door-ldk-genkan",
        fromStart: 0.2,
        width: INT_DOOR_W,
        height: INT_DOOR_H,
        sill: INT_SILL,
        type: "door",
      },
    ],
  },

  // ── SCL: open west to 玄関; N/E/S closed (S = exterior already) ──
  {
    id: "1f-int-scl-n",
    ...wallEW(IR.genkanE, IR.sclE, IR.mid),
    floor: "1f",
    label: "SCL北",
  },
  {
    id: "1f-int-scl-e",
    ...wallNS(IR.sclE, IR.recess, IR.mid),
    floor: "1f",
    label: "SCL東",
  },

  // ── トイレ: open south (no door); N window; E/W closed ──
  {
    id: "1f-int-toilet-w",
    ...wallNS(IR.genkanW, IR.wetS, IR.north),
    floor: "1f",
    label: "トイレ西",
  },
  {
    id: "1f-int-toilet-e",
    ...wallNS(IR.genkanE, IR.wetS, IR.north),
    floor: "1f",
    label: "トイレ東",
  },

  // ── 洗面 west + door; south to UB + door ──
  {
    id: "1f-int-senmen-w",
    ...wallNS(IR.sclE, IR.wetS, IR.north),
    floor: "1f",
    label: "洗面西",
    openings: [
      {
        id: "1f-door-senmen",
        fromStart: 0.4,
        width: INT_DOOR_W,
        height: INT_DOOR_H,
        sill: INT_SILL,
        type: "door",
      },
    ],
  },
  {
    id: "1f-int-senmen-ub",
    ...wallEW(IR.sclE, IR.east, IR.wetS),
    floor: "1f",
    label: "洗面|UB",
    openings: [
      {
        id: "1f-door-ub",
        fromStart: 0.5,
        width: INT_DOOR_W,
        height: INT_DOOR_H,
        sill: INT_SILL,
        type: "door",
      },
    ],
  },

  // ── UB west ──
  {
    id: "1f-int-ub-w",
    ...wallNS(IR.sclE, IR.ubS, IR.wetS),
    floor: "1f",
    label: "UB西",
  },

  // ── 玄関北 (passage to トイレ) ──
  {
    id: "1f-int-genkan-n",
    ...wallEW(IR.genkanW, IR.genkanE, IR.mid),
    floor: "1f",
    label: "玄関北",
    openings: [
      {
        id: "1f-pass-toilet",
        fromStart: 0.25,
        width: 0.9,
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
    ...wallEW(IR.genkanW, IR.genkanE, IR.north),
    floor: "1f",
    label: "北外牆 トイレ",
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
    id: "1f-north-mono",
    ...wallEW(IR.genkanE, IR.sclE, IR.north),
    floor: "1f",
    label: "北外牆 物入帯",
  },
  {
    id: "1f-north-senmen",
    ...wallEW(IR.sclE, IR.east, IR.north),
    floor: "1f",
    label: "北外牆 洗面",
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
    // Northern passage: wall IR.mid → IR.wetS, fromStart 0.2
    alongMin: IR.mid + 0.2,
    alongMax: IR.mid + 0.2 + INT_DOOR_W,
    axis: "ns",
    sill: INT_SILL,
    height: INT_DOOR_H,
    /**
     * Entering LDK (facing west): handle left = south (min Z),
     * hinge right = north (max Z). Open into LDK clockwise.
     */
    hingeAt: "max",
    openSign: -1,
    openAngleDeg: 90,
    label: "LDK|玄関 北通道",
  },
  {
    id: "swing-senmen",
    openingId: "1f-door-senmen",
    wallX: IR.sclE,
    wallZ: 0,
    alongMin: IR.wetS + 0.4,
    alongMax: IR.wetS + 0.4 + INT_DOOR_W,
    axis: "ns",
    sill: INT_SILL,
    height: INT_DOOR_H,
    // From genkan/hall into 洗面; hinge south, open into 洗面 (+X)
    hingeAt: "min",
    openSign: 1,
    openAngleDeg: 90,
    label: "洗面",
  },
  {
    id: "swing-ub",
    openingId: "1f-door-ub",
    wallX: 0,
    wallZ: IR.wetS,
    alongMin: IR.sclE + 0.5,
    alongMax: IR.sclE + 0.5 + INT_DOOR_W,
    axis: "ew",
    sill: INT_SILL,
    height: INT_DOOR_H,
    // From 洗面 into UB (south); hinge east, open into UB (−Z)
    hingeAt: "max",
    openSign: -1,
    openAngleDeg: 90,
    label: "UB",
  },
  // ── 2F NE 洋室 west door ──
  // hinge south (min Z), handle north; open into room (+X east)
  {
    id: "swing-2f-ne",
    openingId: "2f-door-ne-yoshitsu",
    wallX: IR.genkanW,
    wallZ: 0,
    alongMin: IR.mid + (IR.stairS - IR.mid - 0.8) / 2,
    alongMax: IR.mid + (IR.stairS - IR.mid - 0.8) / 2 + 0.8,
    axis: "ns",
    sill: 0,
    height: 1.95,
    hingeAt: "min",
    openSign: -1,
    openAngleDeg: 90,
    floor: "2f",
    label: "2F梯|洋室",
  },
  // Balcony access door deferred (south wall is fixed G2 glass for now)
];

/** Exterior shell without the old single north wall (replaced by WALLS_1F_NORTH). */
export const WALLS_1F_SHELL: WallSegment[] = WALLS_1F.filter(
  (w) => w.id !== "1f-north",
);

// ─────────────────────────────────────────────────────────────
// Stairs 1F → 2F (U-turn at north)
// Rise 2.2 m: lower 6×0.20 → platform 1.7; upper 5×0.20 → 2.7
// Lower north x 4.55–5.46; mid landing; upper south x 5.46–6.37
// ─────────────────────────────────────────────────────────────

const STAIR_TREAD = 0.22;
const STAIR_RISER = 0.2;
const STAIR_LOWER_N = 6;
const STAIR_UPPER_N = 5;
const STAIR_PLATFORM_Y = INTERIOR_FLOOR_Y + STAIR_LOWER_N * STAIR_RISER; // 1.7
const STAIR_LOWER_RUN = STAIR_LOWER_N * STAIR_TREAD; // 1.32
const STAIR_UPPER_RUN = STAIR_UPPER_N * STAIR_TREAD; // 1.10
/** Overlap between flights and mid landing (closes gap / eases turn). */
const STAIR_OVERLAP = 0.05;

/**
 * Geometry chain (must stay continuous — no void between lower end and landing):
 *   lower z0 (≈3.74) → +1.32 run → lowerEnd (≈5.06)
 *   landing z0 = lowerEnd − overlap (≈5.01) → north 6.37
 *   upper starts at landing z0 + overlap (≈5.06) going south
 */
const STAIR_LOWER_Z0 = IR.mid + 0.1; // ≈ 3.74 (into LDK past mid)
const STAIR_LOWER_END = STAIR_LOWER_Z0 + STAIR_LOWER_RUN; // ≈ 5.06
const STAIR_LAND_Z0 = STAIR_LOWER_END - STAIR_OVERLAP; // ≈ 5.01
const STAIR_LAND_Z1 = IR.north; // 6.37
const STAIR_UPPER_Z_NORTH = STAIR_LAND_Z0 + STAIR_OVERLAP; // ≈ 5.06 into landing
const STAIR_UPPER_Z_SOUTH = STAIR_UPPER_Z_NORTH - STAIR_UPPER_RUN; // ≈ 3.96

export const STAIR_U = {
  lower: {
    x0: IR.clE,
    x1: IR.stairE,
    z0: STAIR_LOWER_Z0,
    /** North edge of last lower tread */
    z1: STAIR_LOWER_END,
    steps: STAIR_LOWER_N,
  },
  landing: {
    x0: IR.clE,
    x1: IR.genkanW,
    /** South edge abuts lower flight (with overlap) */
    z0: STAIR_LAND_Z0,
    z1: STAIR_LAND_Z1,
    y: STAIR_PLATFORM_Y,
  },
  upper: {
    x0: IR.stairE,
    x1: IR.genkanW,
    zNorth: STAIR_UPPER_Z_NORTH,
    zSouth: STAIR_UPPER_Z_SOUTH,
    steps: STAIR_UPPER_N,
  },
  tread: STAIR_TREAD,
  riser: STAIR_RISER,
  overlap: STAIR_OVERLAP,
  baseY: INTERIOR_FLOOR_Y,
  topY: FLOOR_LEVELS["2f"],
  /** Plan hole under stair runs + landing (1F y=0.5 slab kept only south of lower z0) */
  voidRect: {
    x: IR.clE,
    z: STAIR_LOWER_Z0,
    width: IR.genkanW - IR.clE, // 4.55–6.37
    depth: IR.north - STAIR_LOWER_Z0,
  },
} as const;

/** @deprecated use STAIR_U */
export const STAIR_1F_2F = STAIR_U;

export const STAIRS: StairFlight[] = [
  {
    id: "stair-1f-mid",
    fromFloor: "1f",
    x: (STAIR_U.lower.x0 + STAIR_U.lower.x1) / 2,
    z: STAIR_U.lower.z0,
    direction: "north",
    stepCount: STAIR_U.lower.steps,
    treadDepth: STAIR_U.tread,
    riserHeight: STAIR_U.riser,
    width: STAIR_U.lower.x1 - STAIR_U.lower.x0,
    baseY: STAIR_U.baseY,
    topY: STAIR_U.landing.y,
    label: "1F→平台(北上)",
  },
  {
    id: "stair-mid-2f",
    fromFloor: "1f",
    x: (STAIR_U.upper.x0 + STAIR_U.upper.x1) / 2,
    z: STAIR_U.upper.zNorth,
    direction: "south",
    stepCount: STAIR_U.upper.steps,
    treadDepth: STAIR_U.tread,
    riserHeight: STAIR_U.riser,
    width: STAIR_U.upper.x1 - STAIR_U.upper.x0,
    baseY: STAIR_U.landing.y,
    topY: STAIR_U.topY,
    label: "平台→2F(南上)",
  },
];

/** Mid-level turning platform Y=1.7 */
export const FLOOR_STAIR_MID_LANDING: FloorSlab = {
  id: "stair-mid-landing",
  floor: "1f",
  y: STAIR_U.landing.y,
  rect: {
    x: STAIR_U.landing.x0,
    z: STAIR_U.landing.z0,
    width: STAIR_U.landing.x1 - STAIR_U.landing.x0,
    depth: STAIR_U.landing.z1 - STAIR_U.landing.z0,
  },
  thickness: 0.15,
  label: "階段轉折平台",
  color: "#9a958c",
};

/** @deprecated alias */
export const FLOOR_2F_LANDING = FLOOR_STAIR_MID_LANDING;

// ─────────────────────────────────────────────────────────────
// 2F footprint (north-aligned: north=6.37, south=0.91, depth 5.46)
// ─────────────────────────────────────────────────────────────

export const Z2 = {
  south: IR.north - 5.46, // 0.91
  mid: IR.north - 2.73, // 3.64
  balcS: IR.north - 2.73 - 0.91, // 2.73
  north: IR.north, // 6.37
} as const;

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
 *
 * Stair well (open hole, no slab): x 4.55–6.37, z stairS(4.55)–north(6.37) = NS 1.82.
 * Lower U-spur into LDK remains (option A); 2F only voids the north 1.82 well.
 *
 * NE 洋室6.5: x 6.37–east, z mid(3.64)–north(6.37) = NS 2.73.
 * South G2 wall full width 4.55 (2.73+1.82) at z=mid. Balcony slab south
 * of mid kept (visual only; door deferred).
 */
export const FLOORS_2F: FloorSlab[] = [
  {
    id: "2f-sw-room",
    floor: "2f",
    y: Y2,
    rect: { x: 0, z: Z2.south, width: 2.73, depth: 2.73 },
    thickness: T2,
    label: "2F洋室西",
    color: "#cfc9be",
  },
  {
    id: "2f-s-cl",
    floor: "2f",
    y: Y2,
    rect: { x: 2.73, z: Z2.south, width: 0.91, depth: 2.73 },
    thickness: T2,
    label: "2F-CL",
    color: "#c8c2b8",
  },
  {
    id: "2f-s-center",
    floor: "2f",
    y: Y2,
    rect: { x: 3.64, z: Z2.south, width: 2.73, depth: 2.73 },
    thickness: T2,
    label: "2F洋室6",
    color: "#cfc9be",
  },
  {
    id: "2f-balcony",
    floor: "2f",
    y: Y2,
    rect: { x: IR.genkanW, z: Z2.balcS, width: 2.73, depth: 0.91 },
    thickness: T2,
    label: "2Fバルコニー",
    color: "#a8b0a4",
  },
  // North wing west of stair well (x < 4.55)
  {
    id: "2f-n-west",
    floor: "2f",
    y: Y2,
    rect: {
      x: 2.73,
      z: Z2.mid,
      width: IR.clE - 2.73,
      depth: Z2.north - Z2.mid,
    },
    thickness: T2,
    label: "2F北翼西",
    color: "#c5c0b6",
  },
  /**
   * NE 洋室6.5 — east of stair|room wall at x=6.37.
   * NS 2.73 (mid→north); EW full to east façade.
   */
  {
    id: "2f-ne-yoshitsu",
    floor: "2f",
    y: Y2,
    rect: {
      x: IR.genkanW,
      z: Z2.mid,
      width: BUILDING.width - IR.genkanW,
      depth: Z2.north - Z2.mid, // 2.73
    },
    thickness: T2,
    label: "2F洋室6.5(東北)",
    color: "#c5c0b6",
  },
  /**
   * Bridge only: upper flight exit (z≈3.96) → 2F mid (3.64).
   * Do NOT slab over rising upper treads (z > STAIR_UPPER_Z_SOUTH) or
   * height sampling snaps climbers to Y=2.7 mid-flight.
   * NE door (0.91 band) is reachable from the last treads + this strip.
   * Stair well void remains x 4.55–6.37, z stairS(4.55)–north = NS 1.82.
   */
  {
    id: "2f-stair-exit-bridge",
    floor: "2f",
    y: Y2,
    rect: {
      x: IR.clE,
      z: Z2.mid,
      width: IR.genkanW - IR.clE, // 4.55–6.37
      depth: Math.max(STAIR_UPPER_Z_SOUTH - Z2.mid, 0.05),
    },
    thickness: T2,
    label: "2F梯口接板",
    color: "#b8b4ac",
  },
];

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
   * A: full-width approach mid → first lower tread (x 4.55–6.37)
   * Fixes X=5.8,Z=3.65 hole between LDK door and stairs.
   */
  {
    id: "1f-n-stair-approach-wide",
    floor: "1f",
    y: INTERIOR_FLOOR_Y,
    rect: {
      x: IR.clE,
      z: SZ.mid,
      width: IR.genkanW - IR.clE, // 4.55–6.37
      depth: Math.max(STAIR_LOWER_Z0 - SZ.mid, 0.05),
    },
    thickness: INTERIOR_SLAB_THICKNESS,
    label: "1F梯南走廊A",
    color: "#cfc8bc",
  },
  /**
   * B: east bay under/near upper run — 1F deck from mid up to upper south end
   * (y=0.5; stair treads still win when climbing via height sampling).
   */
  {
    id: "1f-n-stair-east-corridor",
    floor: "1f",
    y: INTERIOR_FLOOR_Y,
    rect: {
      x: IR.stairE,
      z: SZ.mid,
      width: IR.genkanW - IR.stairE, // 5.46–6.37
      depth: Math.max(STAIR_UPPER_Z_SOUTH - SZ.mid, 0.05),
    },
    thickness: INTERIOR_SLAB_THICKNESS,
    label: "1F梯東走廊B",
    color: "#cfc8bc",
  },
  // East of genkanW: 1f-hall-north-east
];

/** All walkable slabs for Floors + height sampling */
export const ALL_FLOOR_SLABS: FloorSlab[] = [
  ...FLOORS,
  ...FLOORS_1F_NORTH_SPLIT,
  FLOOR_STAIR_MID_LANDING,
  ...FLOORS_2F,
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
const CEIL_COLOR = "#ddd8d0";

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
  // Approach / corridor south of stair void (full width to genkanW)
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
  // Genkan + SCL band
  {
    id: "ceil-1f-genkan-scl",
    floor: "1f",
    y: CEIL_TOP_Y,
    rect: {
      x: SX.xLdkE,
      z: SZ.recess,
      width: SX.xSclE - SX.xLdkE,
      depth: SZ.mid - SZ.recess,
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
  // North-east hall / wet (east of stair void)
  {
    id: "ceil-1f-n-east",
    floor: "1f",
    y: CEIL_TOP_Y,
    rect: {
      x: SX.xLdkE,
      z: SZ.mid,
      width: SX.xEast - SX.xLdkE,
      depth: SZ.north - SZ.mid,
    },
    thickness: CEIL_T,
    label: "天花 北側東",
    color: CEIL_COLOR,
  },
];

// ─────────────────────────────────────────────────────────────
// 2F walls (base Y = 2.7)
// NE 洋室: W wall at x=6.37 + door in 0.91 hall band; N/E solid;
// S G2 floor-to-ceiling glass full width 2.73+1.82=4.55 → east wall.
// Balcony slab kept (visual); no door / parapet (access deferred).
// ─────────────────────────────────────────────────────────────

/** 2F interior door / glass (sill relative to floor top of story). */
const INT2_DOOR_W = 0.8;
const INT2_DOOR_H = 1.95;
const INT2_SILL = 0;

/**
 * NE 洋室 south wall (G2): plan bottom chain balcony bay 2.73 + east 1.82.
 * x 6.37 → 10.92, z = mid (3.64); meets east exterior at SE corner.
 */
const NE_S_X0 = IR.genkanW; // 6.37
const NE_S_X1 = BUILDING.width; // 10.92
const NE_S_LEN = NE_S_X1 - NE_S_X0; // 4.55 = 2.73 + 1.82

/** Single full-width floor-to-ceiling glass (small edge posts for wall solid). */
const G2_SILL = 0.1;
const G2_H = BUILDING.wallHeight - G2_SILL - 0.08;
const G2_EDGE = 0.08; // solid wall posts at each end
const G2_FROM = G2_EDGE;
const G2_W = NE_S_LEN - 2 * G2_EDGE;

/**
 * Door on stair|room wall: in south 0.91 band (z mid→stairS).
 * Wall NS from mid; fromStart from min Z.
 */
const DOOR_2F_NE_FROM = (IR.stairS - IR.mid - INT2_DOOR_W) / 2; // center in 0.91

export const WALLS_2F: WallSegment[] = [
  // ── South face of south block ──
  {
    id: "2f-ext-south-w",
    ...wallEW(0, IR.genkanW, Z2.south),
    floor: "2f",
    label: "2F南(西〜中央)",
  },
  // ── West ──
  {
    id: "2f-ext-west-s",
    ...wallNS(halfT, Z2.south, Z2.mid),
    floor: "2f",
    label: "2F西(南翼)",
  },
  {
    id: "2f-ext-west-n",
    ...wallNS(2.73 + halfT, Z2.mid, Z2.north),
    floor: "2f",
    label: "2F西(北翼起)",
  },
  // ── North exterior (solid for NE room) ──
  {
    id: "2f-ext-north",
    ...wallEW(2.73, BUILDING.width, Z2.north),
    floor: "2f",
    label: "2F北",
  },
  // ── East exterior (solid for NE room) ──
  {
    id: "2f-ext-east",
    ...wallNS(BUILDING.width - halfT, Z2.mid, Z2.north),
    floor: "2f",
    label: "2F東(北翼)",
  },
  // ── South block east end at x=6.37 (south of mid only) ──
  {
    id: "2f-ext-s-block-e",
    ...wallNS(IR.genkanW, Z2.south, Z2.mid),
    floor: "2f",
    label: "2F南翼東",
  },

  // ── NE 洋室 west: stair|room at x=6.37, full NS 2.73 ──
  // Door in 0.91 hall band (z mid–stairS); hinge S / handle N; open into room (+X)
  {
    id: "2f-int-ne-west",
    ...wallNS(IR.genkanW, Z2.mid, Z2.north),
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

  // ── NE 洋室 south G2: full 4.55 m (2.73+1.82) to east wall ──
  // Fixed glass only; balcony door deferred. Slab south of wall kept for later.
  {
    id: "2f-ne-room-s",
    ...wallEW(NE_S_X0, NE_S_X1, Z2.mid),
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
];

// ─────────────────────────────────────────────────────────────
// Player / camera
// ─────────────────────────────────────────────────────────────

export const PLAYER = {
  eyeHeight: 1.5,
  moveSpeed: 2.0,
  /** A / D discrete yaw step (degrees). A = left, D = right. */
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
