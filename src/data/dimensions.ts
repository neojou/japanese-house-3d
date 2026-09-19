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
  /** Windows: frosted for wet rooms so the street cannot look in. */
  glazing?: "clear" | "frosted";
  /** Default charcoal slim frame; unit-bath TW-FIX uses white. */
  frameFinish?: "charcoal" | "white";
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
   * Dual bypass: pocket stacks past the jamb; overlap stacks on the other leaf
   * and stays inside the original opening.
   */
  openToward: "min" | "max";
  /** 1 = single leaf; 2 = bypass pair */
  panels: 1 | 2;
  /**
   * pocket (default): both leaves travel toward openToward, may leave the bay
   * (shower). overlap: one leaf slides over the other; passage is the free half.
   */
  slideStyle?: "pocket" | "overlap";
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
  /** 1F 階高 (床→床). 2F 階高 is STORY.rise2f. */
  floorHeight: 2.9,
  slabThickness: 0.2,
  /**
   * 1F wall from grade (Y=0) to soffit. 2F/PH must use `storyWallHeight`.
   * 3.509 − 0.20 = 3.309.
   */
  wallHeight: 3.309,
  doorWidth: 0.8,
  doorHeight: 2.0,
  genkanDoorWidth: 1.52,
  genkanDoorHeight: 2.15,
} as const;

/**
 * 2026-09-13 elevation lock (outlook E/W).
 * GL=0; 1F floor 0.609; 1F rise 2.90 → 2F 3.509; 2F rise 2.80 → PH 6.309.
 */
export const STORY = {
  floor1f: 0.609,
  rise1f: 2.9,
  floor2f: 3.509,
  rise2f: 2.8,
  floorPh: 6.309,
  phVolume: 2.6,
  peak: 9.577,
  railH: 1.1,
  /** South-high / north-low, from PH hall 0.668 over 2.73 m. */
  roofPitch: 0.668 / 2.73,
} as const;

export const FLOOR_LEVELS: Record<FloorId, number> = {
  "1f": 0,
  "2f": STORY.floor2f,
  ph: STORY.floorPh,
};

/** Per-story wall height from that floor's `FLOOR_LEVELS` base. */
export function storyWallHeight(floor: FloorId): number {
  const slab = BUILDING.slabThickness;
  if (floor === "1f") return STORY.floor2f - slab;
  if (floor === "2f") return STORY.floorPh - STORY.floor2f - slab;
  return STORY.phVolume;
}

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

/**
 * 1F UB east opening — LIXIL リデア Mタイプ BD21B catalog
 * 「TW FIX窓 … W1200×H1200（特注寸法）」.
 * That 特注 size is the **window**, not the tub. Aligns above the east apron tub
 * (`docs/refs/images/bath_tank.jpg`, outlook_E).
 */
export const UB_EAST_WINDOW = {
  width: 1.2,
  height: 1.2,
  /** Story-base Y (1F = 0). Deck is 0.609; ~0.73 m above floor = rim + tile band. */
  sill: 1.34,
  /** From east-wall start at SZ.ubSouth; matches 1.20 m NS tub. */
  fromStart: 0.125,
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
   * Clear opening above sill. sill(0.609)+height 1.95 < 1F soffit 3.309.
   */
  openingHeight: 1.95,
  /** Door bottom / interior platform = 1F bed (elevation 0.609). */
  sill: STORY.floor1f,
  frameThickness: 0.055,
  frameDepth: BUILDING.wallThickness,
  leafThickness: 0.04,
  leafClearance: 0.006,
  /** Stop short of LDK east slider (was 100°, overswung into the room). */
  openAngleDeg: 85,
  stepCount: 2,
  stepDepth: 0.32,
  stepHeight: STORY.floor1f / 2,
  stepWidth: SOUTH_FACADE.genkanDoor * 0.95,
} as const;

/**
 * 2F NE balcony (plan space).
 * North = NE 洋室 south = south-room north = 3.64.
 * SW corner = SE east-window north edge = 2.685 → west NS 0.955.
 * (Owner also wrote west NS 1.36 m; that would put the north edge at 4.045
 * and collide with the 3.64 room split. Locked to 2.685 + 3.64.)
 */
export const BALCONY_2F = {
  y: FLOOR_LEVELS["2f"], // 2.7
  slabT: BUILDING.slabThickness,
  west: {
    x0: SX.xLdkE, // 6.37
    x1: SX.xLdkE + 2.73, // 9.10
    z0: 2.685,
    z1: 3.64,
    width: 2.73,
    depth: 3.64 - 2.685, // 0.955
  },
  east: {
    x0: SX.xLdkE + 2.73, // 9.10
    x1: SX.xEast, // 10.92
    z0: 3.64 - 0.91, // 2.73
    z1: 3.64,
    width: 1.82,
    depth: 0.91,
  },
  /** West bay south vs genkan recess */
  genkanOverhang: SZ.recess - 2.685,
  /**
   * Three recessed downlights under west soffit, aligned to genkan door bay.
   */
  downlights: (() => {
    const g0 = SX.xLdkE;
    const g1 = SX.xGenkanE;
    const mid = (g0 + g1) / 2;
    const span = (g1 - g0) * 0.72;
    const xs = [mid - span / 2, mid, mid + span / 2];
    const z = (2.685 + SZ.recess) / 2;
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
 * = genkan sill / top of exterior steps (0.609).
 * Standing eye Y = INTERIOR_FLOOR_Y + PLAYER.eyeHeight = 0.609 + 1.5 = 2.109.
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
    id: "1f-ub",
    floor: "1f",
    y: INTERIOR_FLOOR_Y,
    // UB only (south of 洗面南) — bath marble floor
    rect: {
      x: SX.xSclE,
      z: SZ.ubSouth,
      width: SX.xEast - SX.xSclE,
      depth: SENMEN_SOUTH_Z - SZ.ubSouth, // ≈ 1.83
    },
    thickness: INTERIOR_SLAB_THICKNESS,
    label: "UB",
    color: "#e4d4bc",
  },
  {
    id: "1f-senmen",
    floor: "1f",
    y: INTERIOR_FLOOR_Y,
    // 洗面 only (north of 洗面南) — keep warm interior floor
    rect: {
      x: SX.xSclE,
      z: SENMEN_SOUTH_Z,
      width: SX.xEast - SX.xSclE,
      depth: SZ.north - SENMEN_SOUTH_Z, // 1.82
    },
    thickness: INTERIOR_SLAB_THICKNESS,
    label: "洗面",
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
    openings: [
      /**
       * South elevation: west tall 2-pane stack on LDK south.
       * Sill from grade; tops align with the pair to the east.
       */
      {
        id: "1f-win-ldk-s-tall",
        fromStart: 0.72,
        width: 0.6,
        height: 1.3,
        sill: 1.2,
        type: "window",
      },
    ],
  },
  // LDK 南 4.195
  {
    id: "1f-south-ldk-b",
    ...wallEW(SX.xLdkA, SX.xLdkE, SZ.outer),
    floor: "1f",
    label: "LDK南 4.195",
    openings: [
      /** South elevation: horizontal 2-pane; same head as the tall west window. */
      {
        id: "1f-win-ldk-s-pair",
        fromStart: 0.12,
        width: 1.28,
        height: 0.64,
        sill: 2.16,
        type: "window",
      },
    ],
  },

  // 内縮 return: LDK 東外牆 (臨駐車) z: 0 → genkan/SCL 南
  {
    id: "1f-jog-ldk-east",
    ...wallNS(SX.xLdkE, SZ.outer, SZ.recess),
    floor: "1f",
    label: "内縮西壁→玄関南",
    openings: [
      {
        id: "1f-door-ldk-east",
        fromStart: (SZ.recess - SZ.outer - 1.7) / 2,
        width: 1.7,
        height: 2.15,
        sill: STORY.floor1f,
        type: "door",
      },
    ],
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
    openings: [
      {
        id: "1f-win-ub-e",
        fromStart: UB_EAST_WINDOW.fromStart,
        width: UB_EAST_WINDOW.width,
        height: UB_EAST_WINDOW.height,
        sill: UB_EAST_WINDOW.sill,
        type: "window",
        glazing: "clear",
        frameFinish: "white",
      },
      {
        id: "1f-door-senmen-east",
        fromStart: SZ.north - SZ.ubSouth - 0.85 - 0.35,
        width: 0.85,
        height: 2.05,
        sill: STORY.floor1f,
        type: "door",
      },
    ],
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
    openings: [
      {
        id: "1f-win-ldk-w-glass",
        fromStart: 0.55,
        width: 1.52,
        height: 2.15,
        sill: STORY.floor1f,
        type: "window",
      },
      {
        id: "1f-win-ldk-w-small",
        fromStart: 2.25,
        width: 0.7,
        height: 1.2,
        sill: 1.1,
        type: "window",
      },
    ],
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
/**
 * 1F トイレ north high vent (日式高窓).
 * Small + high: ventilates, seated / standing user is below the sill,
 * so the street cannot look in. Story-base Y (1F = 0); walk floor is +0.5.
 */
const TOILET_WIN = {
  w: 0.48,
  h: 0.36,
  /** 1.88 above grade ≈ 1.38 above interior floor; top 2.24 < wall 2.5 */
  sill: 1.88,
} as const;

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
 * Shared sit-toilet envelope — typical JP close-coupled 組み合わせ (not tankless).
 * Mainstream tank fixtures: length 680–770 mm, width 360–400 mm, sit ~420 mm
 * (bowl rim ~380 + seat), tank top 760–820 mm. Declared depth/width **are**
 * the visual tank-back → bowl-front box (`src/lib/sitToilet.ts`).
 */
export const SIT_TOILET = {
  /** Tank-back → bowl-front (m). Mid of 680–770 mm. */
  depth: 0.72,
  /** Across the seat (m). */
  width: 0.38,
  /** Finished wall face → tank back (supply + board). */
  wallGap: 0.03,
  tank: {
    w: 0.38,
    d: 0.175,
    h: 0.36,
    /** Top of tank above finished floor */
    topY: 0.78,
  },
  bowl: {
    /** Sit surface including seat (ceramic rim ~0.38). */
    seatH: 0.42,
    /** Circular lathe radius; mesh is X-scaled to `length` (oval plan). */
    rimR: 0.185,
    /** Oval bowl along the sit axis (rear deck tucks under the tank). */
    length: 0.5,
  },
  lidOpenRad: 0.22, // ~12.5°
  porcelain: "#f5f0e8",
  porcelainInner: "#c8c2ba",
  button: "#4a4642",
} as const;

/**
 * 1F sit toilet — tokonoma-card wet fixture (DESIGN.md §2.7).
 * West half of トイレ, face +X east (tank west, bowl east).
 * Origin = envelope center; tank back = west wall face + wallGap.
 */
export const PROP_1F_TOILET = {
  id: "hero-1f-toilet",
  style: "tokonoma-card" as const,
  floor: "1f" as FloorId,
  label: "1Fトイレ便器",
  x:
    TOILET_1F.x0 +
    BUILDING.wallThickness / 2 +
    SIT_TOILET.wallGap +
    SIT_TOILET.depth / 2,
  z: (TOILET_1F.z0 + TOILET_1F.z1) / 2,
  y: INTERIOR_FLOOR_Y,
  ...SIT_TOILET,
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
} as const;

/**
 * 1F UB — LIXIL リデア Mタイプ / BDUS-1616LBM-A+H *inspired* (no trademarks).
 * Interior liner + ミナモ-style apron tub are the hero GLB (`ub-bath.glb`).
 * Visual lock: `docs/refs/images/bath_tank.jpg` + Type-M BD21B catalog.
 */
export const UB_BATH = {
  floorIds: ["1f-ub"] as const,
  style: "lidea-type-m" as const,
  /** Interior faces of the room (plan, inside the 0.15 m shells). */
  x0: SX.xSclE + BUILDING.wallThickness / 2,
  x1: SX.xEast - BUILDING.wallThickness,
  z0: SZ.ubSouth + BUILDING.wallThickness / 2,
  z1: IR.wetS - BUILDING.wallThickness / 2,
  y0: INTERIOR_FLOOR_Y,
  /** Liner ceiling above deck (catalog 天井高 2225). */
  ceilingH: 2.225,
  cladT: 0.014,
  /** Anti-slip floor UV (small grid). */
  floorTileM: 0.18,
  wallTileM: 0.33,
  /** R3F extra clads off — the GLB is the liner. */
  clad: {
    thickness: 0.014,
    south: false,
    east: false,
    north: false,
    west: false,
  },
  /** 洗面|UB shower slide (north wall), plan X. */
  showerDoor: {
    x0: SX.xSclE + 0.5,
    width: 0.8,
    height: 2.0,
  },
  gltf: "/models/hero/ub-bath.glb",
} as const;

/**
 * 1F UB Type-M apron tub against the east wall.
 * Owner W1200 = NS length along the window wall. Catalog W1200×H1200 特注 is the
 * east window (`UB_EAST_WINDOW`), not the tub height. Apron depth ~700 mm.
 */
export const PROP_1F_UB_TUB = {
  id: "hero-1f-ub-tub",
  style: "tokonoma-card" as const,
  floor: "1f" as FloorId,
  label: "UBユニットバス",
  /** East face almost on the east interior; 0.70 m apron depth. */
  x: SX.xEast - BUILDING.wallThickness - 0.008 - 0.7 / 2,
  /** South-biased so the wash floor / dark wall sit to the north. */
  z: SZ.ubSouth + BUILDING.wallThickness / 2 + 0.05 + 1.2 / 2,
  y: INTERIOR_FLOOR_Y,
  /** Outer length along Z (north–south) — W1200. */
  length: 1.2,
  /** Outer width along X (east–west) — Type-M apron. */
  width: 0.7,
  rimH: 0.55,
  basinDepth: 0.42,
  /**
   * Deck lip around the water (m). Photos `bath_tank-1.png` / `bath_tank-2.png`:
   * thin rim, inner fill ~90% of the top.
   */
  innerInset: 0.04,
  /** Inner rounded-rect corner (Minamo). */
  innerCornerR: 0.11,
  porcelain: "#f4f1ec",
  porcelainInner: "#ebe6de",
  water: {
    color: "#8eb8c8",
    opacity: 0.58,
    insetY: 0.028,
    fillRate: 0.12,
    drainRate: 0.32,
    streamR: 0.006,
    spreadRate: 0.085,
    dryRate: 0.05,
  },
  /**
   * Deck push-button on the **northwest** top surface (photo lower-right).
   * Press toggles the **bottom** plug — does not lift out.
   */
  plug: {
    kind: "push-button" as const,
    r: 0.018,
    h: 0.006,
    travel: 0.003,
    /** Inset from the outer west + north edges of the deck. */
    deckInset: 0.036,
  },
  /** Basin-floor drain that opens when the deck button is pressed. */
  drain: {
    r: 0.024,
    travel: 0.016,
  },
  /** Inner I-bar 600 mm (catalog 浴槽内握りバー). */
  grab: {
    length: 0.6,
    r: 0.014,
    belowRim: 0.07,
  },
  /** Chrome, not champagne. */
  metal: "#c5c8cc",
  metalness: 0.92,
  faucet: {
    kind: "column-shower" as const,
    mixerH: 0.95,
    barH: 1.85,
    spoutReach: 0.14,
    spoutDrop: 0.08,
  },
  light: {
    dx: -0.35,
    dy: 1.55,
    dz: 0.05,
    intensity: 0.42,
    distance: 2.2,
    color: "#fff4e6",
  },
  gltf: "/models/hero/ub-bath.glb",
} as const;

/**
 * 1F toilet south-passage café curtains (tokonoma-card).
 * Upper third only; entering from south: left=chihuahua, right=Pomeranian.
 */
export const PROP_1F_TOILET_CURTAIN = {
  id: "hero-1f-toilet-curtain",
  style: "tokonoma-card" as const,
  floor: "1f" as FloorId,
  /** Passage center X */
  x: TOILET_1F.x0 + TOILET_1F.solidW + TOILET_1F.passW / 2,
  z: TOILET_1F.z0,
  passW: TOILET_1F.passW,
  /** Full clear opening height (for top alignment) */
  openingH: INT_DOOR_H,
  floorY: INTERIOR_FLOOR_Y,
  /** Café curtain = upper third */
  heightFrac: 1 / 3,
  panelGap: 0.025,
  thickness: 0.018,
  rod: {
    radius: 0.008,
    color: "#c4a574",
  },
  label: "1Fトイレ門簾",
} as const;

/**
 * 1F LDK west open kitchen — tokonoma-card vignette (DESIGN.md §2.7).
 * Zone x 0–2.175 (ldkA). Island on east of zone faces living (east);
 * west wall: fridge (south) + tall storage + wall cabs.
 */
export const PROP_1F_LDK_KITCHEN = {
  id: "hero-1f-ldk-kitchen",
  style: "tokonoma-card" as const,
  floor: "1f" as FloorId,
  label: "LDK開放廚房",
  /** Kitchen strip (south façade ldkA) */
  x0: 0,
  x1: SX.xLdkA, // 2.175
  y: INTERIOR_FLOOR_Y,
  /** Island: long N–S, short E–W, east edge near x1 */
  island: {
    length: 2.8, // NS
    depth: 0.62, // EW
    height: 0.9,
    topT: 0.04,
    /** Bar overhang toward LDK (+X) */
    barOverhang: 0.12,
    /** Island center z (south of mid, clear of 洋室) */
    z: 1.55,
    /** Island center x — leave ~0.8 m aisle to west wall gear */
    x: 1.78,
    wood: "#c4a882",
    stone: "#e8e4dc",
    handle: "#3a3632",
  },
  sink: {
    w: 0.48,
    d: 0.38,
    depth: 0.16,
  },
  fridge: {
    w: 0.7,
    d: 0.68,
    h: 1.92,
    /** Center — south on west wall */
    x: 0.04 + 0.68 / 2,
    z: 0.12 + 0.7 / 2,
    body: "#f0eeea",
    door: "#e8e4de",
    seal: "#2a2826",
  },
  /** Tall cabinet north of fridge */
  tallCab: {
    w: 0.6,
    d: 0.58,
    h: 2.15,
  },
  /** West wall uppers */
  upper: {
    depth: 0.35,
    height: 0.72,
    yBottom: 1.45,
    /** NS span along west wall */
    z0: 0.15,
    z1: 2.95,
  },
  light: {
    intensity: 0.32,
    distance: 2.4,
    color: "#fff0e0",
  },
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
 * 1F 洗面 north-wall vignette — tokonoma-card (DESIGN.md §2.7).
 * Facing north: west basket + laundry, center vanity + vertical mirror, east washer.
 */
export const PROP_1F_SENMEN = {
  id: "hero-1f-senmen",
  style: "tokonoma-card" as const,
  floor: "1f" as FloorId,
  label: "1F洗面",
  y: INTERIOR_FLOOR_Y,
  /** North wall interior face */
  wallZ: IR.north,
  wallFaceZ: IR.north - BUILDING.wallThickness / 2,
  standoff: 0.04,
  /**
   * Vertical mirror above vanity.
   * Indoor cube fallback + few CubeCamera captures from senmen (sees UB).
   * No planar FBO. Geometry / plan locks unchanged.
   */
  mirror: {
    w: 0.48,
    h: 0.95,
    t: 0.02,
    frame: 0.03,
    /** Bottom of mirror above vanity top */
    gapAboveVanity: 0.12,
  },
  vanity: {
    /**
     * Cabinet footprint = vessel W×D (flush stack).
     * h = hinoki cabinet to top; ceramic vessel sits on it.
     */
    w: 0.56,
    d: 0.38,
    h: 0.72,
    /** Center X — middle of senmen */
    x: (SENMEN_1F.x0 + SENMEN_1F.x1) / 2,
    wood: "#efe0c4",
    stone: "#f4f2ee",
    cabinet: {
      toeKick: 0.068,
      toeInset: 0.02,
      topT: 0.016,
      doorGap: 0.004,
      frame: 0.026,
      panelRecess: 0.004,
      cornerR: 0.01,
      sitGap: 0.003,
      doorT: 0.016,
      shell: 0.016,
      openDeg: 88,
    },
    plumbing: {
      pipeR: 0.018,
      tailH: 0.26,
      trapR: 0.042,
      armL: 0.18,
    },
    water: {
      streamR: 0.004,
      poolR: 0.052,
      color: "#c8deea",
      opacity: 0.42,
    },
    /**
     * Rectangular porcelain vessel (docs/S__112345090.jpg).
     * Path B glTF — plan room box unchanged.
     * Keep fields in sync with SENMEN_VESSEL_SPEC (`src/lib/vesselBasin.ts`).
     */
    vessel: {
      w: 0.56,
      d: 0.38,
      h: 0.12,
      innerDepth: 0.09,
      wall: 0.009,
      rim: 0.015,
      outerR: 0.016,
      innerR: 0.06,
      floorR: 0.072,
      gltf: "props/senmen-basin/basin.glb",
    },
  },
  /**
   * East front-load washer — tokonoma-card appliance (detail-first).
   * Closed porthole with large high-gloss glass; no wood plinth / no door handle.
   */
  washer: {
    w: 0.6,
    d: 0.62,
    h: 0.85,
    /** East — clearance from east wall */
    x: SENMEN_1F.x1 - 0.1 - 0.6 / 2,
    /** Warm ivory enamel */
    body: "#f2f0ec",
    bodyEdge: "#e4e0da",
    panel: "#ebe7e1",
    /** Quiet door bezel tint (face-on ring only; no handle) */
    doorRing: "#c8c4be",
    /** Small control dial only — not used for door hardware */
    doorChrome: "#b8b4ae",
    /** High-gloss semi-transparent “mirror glass” */
    glass: "#9aadb8",
    glassOpacity: 0.28,
    drum: "#6a7278",
    gasket: "#2a2826",
    drawer: "#e8e4de",
    /** Porthole outer radius (m) — large mirror face */
    doorR: 0.22,
  },
  basket: {
    w: 0.42,
    d: 0.38,
    h: 0.36,
    /** West of vanity */
    x: SENMEN_1F.x0 + 0.14 + 0.42 / 2,
    rattan: "#c4a574",
  },
  light: {
    intensity: 0.28,
    distance: 1.8,
    color: "#fff2e4",
  },
} as const;

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

  /**
   * Stair east screen — blocks genkan→LDK door sightline into the well.
   * x = stairE (5.46); z stairS→north (4.55–6.37); **solid full length**
   * (no opening on this z-band — a south 0.91 pass aligned with the LDK door
   * and let you look straight through to the stairs).
   * Circulation: from LDK south of z=4.55 into lower flight (well option A).
   * Finish: oat main (default).
   */
  {
    id: "1f-int-stair-e-screen",
    ...wallNS(IR.stairE, IR.stairS, IR.north),
    floor: "1f",
    label: "階段東屏(玄関視線)",
  },

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
    openings: [
      {
        id: "1f-win-yoshitsu-n",
        fromStart: 0.45,
        width: 0.765,
        height: 1.05,
        sill: 1.2,
        type: "window",
      },
    ],
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
        fromStart: (TOILET_1F.width - TOILET_WIN.w) / 2,
        width: TOILET_WIN.w,
        height: TOILET_WIN.h,
        sill: TOILET_WIN.sill,
        type: "window",
        glazing: "frosted",
      },
    ],
  },
  {
    id: "1f-north-senmen",
    ...wallEW(SENMEN_1F.x0, IR.east, IR.north),
    floor: "1f",
    label: "北外牆 洗面 2.73",
    openings: [
      {
        id: "1f-win-senmen-n",
        fromStart: 1.4,
        width: 1.2,
        height: 1.85,
        sill: STORY.floor1f,
        type: "window",
      },
    ],
  },
];

/** Interactive interior swing doors (90° quarter-arc, plan-accurate hinge). */
export const SWING_DOORS: SwingDoorDef[] = [
  {
    id: "swing-1f-senmen-east",
    openingId: "1f-door-senmen-east",
    wallX: SX.xEast - BUILDING.wallThickness / 2,
    wallZ: 0,
    alongMin: SZ.ubSouth + (SZ.north - SZ.ubSouth) - 0.85 - 0.35,
    alongMax: SZ.ubSouth + (SZ.north - SZ.ubSouth) - 0.35,
    axis: "ns",
    sill: STORY.floor1f,
    height: 2.05,
    hingeAt: "max",
    openSign: 1,
    openAngleDeg: 90,
    floor: "1f",
    label: "1F洗面東門",
  },
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
  // ── 2F NE west door (z 3.64–4.55, 0.91 m) ──
  {
    id: "swing-2f-ne",
    openingId: "2f-door-ne-yoshitsu",
    wallX: IR.genkanW,
    wallZ: 0,
    alongMin: 3.64,
    alongMax: 4.55,
    axis: "ns",
    sill: 0,
    height: 1.95,
    hingeAt: "min",
    openSign: -1,
    openAngleDeg: 90,
    floor: "2f",
    label: "2F東北室",
  },
  // ── 2F south-wing doors @ clN=3.64, adjacent, swing south 85° into rooms ──
  {
    id: "swing-2f-sw",
    openingId: "2f-door-sw-yoshitsu",
    wallX: 0,
    wallZ: 3.64,
    alongMin: 2.73,
    alongMax: 3.64,
    axis: "ew",
    sill: 0,
    height: 1.95,
    /** Hinge east, handle west; −Y opens south into the room. */
    hingeAt: "max",
    openSign: -1,
    openAngleDeg: 85,
    floor: "2f",
    label: "2F西洋室",
  },
  {
    id: "swing-2f-sc",
    openingId: "2f-door-sc-yoshitsu",
    wallX: 0,
    wallZ: 3.64,
    alongMin: 3.64,
    alongMax: 4.55,
    axis: "ew",
    sill: 0,
    height: 1.95,
    /** Hinge west, handle east; +Y opens south into the room. */
    hingeAt: "min",
    openSign: 1,
    openAngleDeg: 85,
    floor: "2f",
    label: "2F中央洋室",
  },
  // 2F トイレ: no south door — curtains on z=5.46 like 1F
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
    id: "slide-1f-ldk-east",
    openingId: "1f-door-ldk-east",
    style: "tokonoma-card",
    wallX: SX.xLdkE,
    wallZ: 0,
    alongMin: (SZ.recess - 1.7) / 2,
    alongMax: (SZ.recess - 1.7) / 2 + 1.7,
    axis: "ns",
    sill: STORY.floor1f,
    height: 2.15,
    openToward: "min",
    panels: 2,
    slideStyle: "overlap",
    floor: "1f",
    label: "1F LDK東拉門",
    glassColor: "#c5d4e0",
    glassOpacity: 0.28,
    frameColor: "#2c2824",
  },
  {
    id: "slide-2f-ne-balcony",
    openingId: "2f-door-ne-balcony",
    style: "tokonoma-card",
    wallX: 0,
    wallZ: 3.64,
    /** East edge 1.82 m west of room east wall (10.92 − 1.82 = 9.10). */
    alongMin: BUILDING.width - 1.82 - 2.1,
    alongMax: BUILDING.width - 1.82,
    axis: "ew",
    sill: 0,
    height: 2.15,
    openToward: "min",
    panels: 2,
    slideStyle: "overlap",
    floor: "2f",
    label: "2F陽台拉門",
    glassColor: "#c5d4e0",
    glassOpacity: 0.28,
    frameColor: "#2c2824",
  },
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
/** 1F→2F rise 2.90 / 14 treads. */
const STAIR_RISER = STORY.rise1f / 14;
const STAIR_STRAIGHT_N = 8;
const STAIR_WINDER_N = 6;
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
/** 2F→PH rise 2.80 / 12 treads. */
const PH_RISER = STORY.rise2f / 12;
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

/** PH hall shed roof: south high (peak), north low. */
export function phHallRoofY(z: number): number {
  return STORY.peak - STORY.roofPitch * (z - PH_HALL.z0);
}

/** South wall height from PH floor to roof ridge. */
export const PH_HALL_SOUTH_H = STORY.peak - FLOOR_LEVELS.ph;

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
export const PH_PARAPET_H = STORY.railH;

/** PH ルーフバルコニー */
export const PH_BALCONY = {
  x0: 0,
  x1: 6.37,
  z0: 0,
  z1: IR.mid, // 3.64 — north edge meets stair hall south
  y: FLOOR_LEVELS.ph,
  width: 6.37,
  depth: 3.64,
  /** L-north: west of hall, z 3.64–6.37, walkable */
  nw: {
    x0: 0,
    x1: IR.clE, // 4.55
    z0: IR.mid,
    z1: IR.north,
    width: IR.clE,
    depth: IR.north - IR.mid,
  },
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
  {
    id: "ph-balcony-nw",
    floor: "ph",
    y: Y_PH,
    rect: {
      x: PH_BALCONY.nw.x0,
      z: PH_BALCONY.nw.z0,
      width: PH_BALCONY.nw.width,
      depth: PH_BALCONY.nw.depth,
    },
    thickness: T_PH,
    label: "PHルーフ北塊",
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
   * PH L-stair exit bridge (east bay only) — open well over straight flight.
   * Same pattern as 2f-stair-deck: winder exit east → bridge south → corridor.
   */
  {
    id: "ph-stair-deck",
    floor: "ph",
    y: Y_PH,
    rect: {
      x: IR.stairE, // 5.46
      z: PH_HALL.wellZ0, // 4.55
      width: IR.genkanW - IR.stairE, // 0.91
      depth: PH_HALL.wellDepth, // 1.82
    },
    thickness: T_PH,
    label: "PH梯口東橋",
    color: "#b8b4ac",
  },
  // North band east only (overlaps east bridge; west well open)
  {
    id: "ph-hall-landing-top",
    floor: "ph",
    y: Y_PH,
    rect: {
      x: IR.stairE,
      z: PH_HALL.landZ0,
      width: IR.genkanW - IR.stairE,
      depth: PH_HALL.landZ1 - PH_HALL.landZ0,
    },
    thickness: T_PH,
    label: "PH梯間北東平台",
    color: "#b8b4ac",
  },
];

const PH_DOOR_W = 0.8;
const PH_DOOR_H = 1.95;
const PH_DOOR_FROM = (PH_HALL.width - PH_DOOR_W) / 2;

export const WALLS_PH: WallSegment[] = [
  // Stair hall — south to roof peak; E/W sloped in Walls.tsx
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
    height: PH_HALL_SOUTH_H,
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
    ...wallNS(PH_BALCONY.x0 + halfT, PH_BALCONY.z0, IR.north),
    floor: "ph",
    height: PH_PARAPET_H,
    label: "PH陽台西欄杆",
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
    ...wallEW(PH_BALCONY.nw.x0, PH_BALCONY.nw.x1, IR.north),
    floor: "ph",
    height: PH_PARAPET_H,
    label: "PH陽台北欄杆",
  },
];

export const CEILING_PH = {
  soffitY: STORY.floorPh + STORY.phVolume, // 8.909
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
// 2F footprint — NS total 6.37 aligned with 1F (owner 2026-09-19):
//   south rooms 3.64 + corridor 0.91 + north wing 1.82
//   NE 洋室 NS 2.73 (z 3.64–6.37) overlaps corridor + north wing
// At x=6.37: SE east wall 0–3.64; NE west door 3.64–4.55; CL/NE west 4.55–6.37
// ─────────────────────────────────────────────────────────────

/**
 * 2F plan NS — flush with 1F south (z=0), total 6.37.
 * South 洋室 NS **3.64**; corridor **0.91** (3.64–4.55); north of corridor
 * **1.82** (4.55–6.37): west = 物入／洗手 + トイレ, east = well + NE CL.
 * NE 洋室 NS **2.73** (3.64–6.37).
 */
export const Z2 = {
  /** 2F south face — flush with 1F SZ.outer */
  south: 0,
  /**
   * South-room north = corridor south = NE 洋室 south / G2 / balcony north.
   */
  clN: 3.64,
  /** @deprecated alias of clN */
  mid: 3.64,
  /** Corridor north = 物入／洗手 south = well south = NE CL south */
  corrN: 4.55,
  /** South-room north (same as clN). */
  sRoomN: 3.64,
  /** NE 南牆 / G2 / balcony north */
  balcN: 3.64,
  /**
   * SE east-window north edge = NE balcony SW corner (owner lock).
   * West balcony NS = clN − this = 0.955 m.
   */
  seWinNorth: 2.685,
  balcWestS: 2.685,
  balcEastS: 3.64 - 0.91, // 2.73
  /** @deprecated use balcEastS / balcWestS */
  balcS: 3.64 - 0.91,
  north: IR.north, // 6.37 (owner wrote 6.47; 4.55+1.82=6.37)
  /** 1F stair well south (fixed) — deck / void */
  wellS: IR.stairS, // 4.55
  sRoomDepth: 3.64,
  /** South-wing CL between the two 洋室 (full room NS) */
  clDepth: 3.64,
  corrDepth: 0.91,
  /** North wing west of well: トイレ 0.91 + 物入／洗手 0.91 */
  nWingDepth: 1.82,
  /** NE 洋室 NS */
  neRoomDepth: 2.73,
  /** NE CL NS (open to the room — no east wall) */
  neClDepth: 1.82,
  nwJogDepth: 2.73 / 2, // 1.365
  nwJogN: 4.55 + 2.73 / 2,
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
 * South rooms z 0–3.64; corridor 3.64–4.55; north wing 4.55–6.37.
 * Stair well z 4.55–6.37 open; east exit bridge only.
 * NE 洋室 z 3.64–6.37. Balcony south of G2 @ 3.64.
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
   * 2F NE balcony — south of G2 @ clN=3.64.
   * West: SW z=2.685 (SE window north), NS 0.955. East: NS 0.91.
   */
  {
    id: "2f-balcony-w",
    floor: "2f",
    y: Y2,
    rect: {
      x: IR.genkanW, // 6.37
      z: Z2.balcWestS,
      width: 2.73,
      depth: Z2.clN - Z2.balcWestS,
    },
    thickness: T2,
    label: "2F陽台西",
    color: "#b5b0a6",
  },
  {
    id: "2f-balcony-e",
    floor: "2f",
    y: Y2,
    rect: {
      x: IR.genkanW + 2.73, // 9.10
      z: Z2.balcEastS,
      width: 1.82,
      depth: Z2.clN - Z2.balcEastS,
    },
    thickness: T2,
    label: "2F陽台東 1.82×0.91",
    color: "#b5b0a6",
  },
  /**
   * 0.91 corridor: EW 3.64, x 2.73–6.37 (west wall = トイレ／西北角西牆).
   */
  {
    id: "2f-corridor",
    floor: "2f",
    y: Y2,
    rect: {
      x: 2.73,
      z: Z2.clN,
      width: IR.genkanW - 2.73, // 2.73 → 6.37 = 3.64
      depth: Z2.corrDepth, // 0.91
    },
    thickness: T2,
    label: "2F廊道3.64",
    color: "#b0aaa0",
  },
  /**
   * Corridor now sits at 3.64–4.55, so the old stair-approach bay is the
   * east end of 2f-corridor (no extra slab).
   */
  /**
   * L-stair exit bridge only (east bay of well) — NOT full well slab.
   * Winder exit faces east into x≈5.46–6.37; west bay (straight) stays open
   * so looking down sees stairs and height sampling can step onto treads.
   * Walk: bridge → south onto corridor (3.64–4.55).
   */
  {
    id: "2f-stair-deck",
    floor: "2f",
    y: Y2,
    rect: {
      x: IR.stairE, // 5.46 — east of straight flight
      z: Z2.wellS, // 4.55
      width: IR.genkanW - IR.stairE, // 0.91
      depth: Z2.north - Z2.wellS, // 1.82
    },
    thickness: T2,
    label: "2F梯口東橋",
    color: "#b8b4ac",
  },
  {
    id: "2f-n-toilet",
    floor: "2f",
    y: Y2,
    rect: {
      x: 2.73,
      z: Z2.north - 0.91, // 5.46
      width: IR.clE - 2.73,
      depth: 0.91,
    },
    thickness: T2,
    label: "2Fトイレ",
    color: "#c5c0b6",
  },
  {
    id: "2f-n-mono",
    floor: "2f",
    y: Y2,
    rect: { x: 2.73, z: Z2.corrN, width: 0.5, depth: 0.91 },
    thickness: T2,
    label: "2F物入",
    color: "#c8c2b8",
  },
  {
    id: "2f-n-wash",
    floor: "2f",
    y: Y2,
    rect: { x: 3.23, z: Z2.corrN, width: 1.32, depth: 0.91 },
    thickness: T2,
    label: "2F洗面",
    color: "#c5c0b6",
  },
  /**
   * 北翼 CL alcove — x 6.37–7.28, z 4.55–6.37. Open east (no east wall).
   */
  {
    id: "2f-ne-cl",
    floor: "2f",
    y: Y2,
    rect: {
      x: IR.genkanW,
      z: Z2.corrN,
      width: M91,
      depth: Z2.neClDepth,
    },
    thickness: T2,
    label: "2F北翼CL",
    color: "#c8c2b8",
  },
  /** Door bay west of the main NE room (x 6.37–7.28, z 3.64–4.55). */
  {
    id: "2f-ne-foyer",
    floor: "2f",
    y: Y2,
    rect: {
      x: IR.genkanW,
      z: Z2.clN,
      width: M91,
      depth: Z2.corrDepth,
    },
    thickness: T2,
    label: "2F東北室入口",
    color: "#c5c0b6",
  },
  /**
   * NE 洋室6.5 — west x=7.28. NS 2.73 from clN.
   */
  {
    id: "2f-ne-yoshitsu",
    floor: "2f",
    y: Y2,
    rect: {
      x: IR.genkanW + M91,
      z: Z2.clN,
      width: BUILDING.width - IR.genkanW - M91,
      depth: Z2.neRoomDepth,
    },
    thickness: T2,
    label: "2F洋室6.5(東北)",
    color: "#c5c0b6",
  },
];

/**
 * 2F トイレ — same envelope as 1F: EW 1.82 × NS 0.91, north strip.
 * z 5.46–6.37 (owner typed 5.46–5.37; 5.37 is 6.37). West-half sit toilet
 * facing east; south wall east 0.7 passage + café curtains (no door).
 */
export const TOILET_2F = {
  x0: 2.73,
  x1: IR.clE, // 4.55
  z0: Z2.north - 0.91, // 5.46
  z1: Z2.north, // 6.37
  width: 1.82,
  depth: 0.91,
  passW: 0.7,
  solidW: 1.82 - 0.7,
} as const;

/** 2F 物入 west of the wash bay. East face open. */
export const MONO_2F = {
  x0: 2.73,
  x1: 3.23,
  z0: Z2.corrN, // 4.55
  z1: Z2.north - 0.91, // 5.46
  width: 0.5,
  depth: 0.91,
} as const;

/** 2F 洗手 — east of 物入, open south to the corridor (no door). */
export const WASH_2F = {
  x0: 3.23,
  x1: IR.clE, // 4.55
  z0: Z2.corrN,
  z1: Z2.north - 0.91,
  width: IR.clE - 3.23, // 1.32
  depth: 0.91,
} as const;

/**
 * 2F sit toilet — same as 1F: west half, face +X (tank west, bowl east).
 */
export const PROP_2F_TOILET = {
  id: "hero-2f-toilet",
  style: "tokonoma-card" as const,
  floor: "2f" as FloorId,
  label: "2Fトイレ便器",
  x:
    TOILET_2F.x0 +
    BUILDING.wallThickness / 2 +
    SIT_TOILET.wallGap +
    SIT_TOILET.depth / 2,
  z: (TOILET_2F.z0 + TOILET_2F.z1) / 2,
  y: FLOOR_LEVELS["2f"],
  ...SIT_TOILET,
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
} as const;

export const PROP_2F_TOILET_CURTAIN = {
  id: "hero-2f-toilet-curtain",
  style: "tokonoma-card" as const,
  floor: "2f" as FloorId,
  x: TOILET_2F.x0 + TOILET_2F.solidW + TOILET_2F.passW / 2,
  z: TOILET_2F.z0,
  passW: TOILET_2F.passW,
  openingH: INT_DOOR_H,
  floorY: FLOOR_LEVELS["2f"],
  heightFrac: 1 / 3,
  panelGap: 0.025,
  thickness: 0.018,
  rod: {
    radius: 0.008,
    color: "#c4a574",
  },
  label: "2Fトイレ門簾",
} as const;

/**
 * 2F wash — east wall of the open south bay, facing west.
 * Vessel = 1F senmen Path B glTF (same W×D cabinet). South of the bay is
 * open to the corridor (no door).
 */
export const PROP_2F_SINK = {
  id: "hero-2f-wash",
  style: "tokonoma-card" as const,
  floor: "2f" as FloorId,
  label: "2F洗手台",
  y: FLOOR_LEVELS["2f"],
  wallX: WASH_2F.x1,
  wallFaceX: WASH_2F.x1 - BUILDING.wallThickness / 2,
  standoff: 0.03,
  /** Cabinet W×D matches `PROP_1F_SENMEN.vanity` (SenmenVanity reuse). */
  vanity: {
    w: 0.56, // NS
    d: 0.38, // EW, toward −X
    h: 0.72,
  },
  mirror: {
    w: 0.42,
    h: 0.72,
    t: 0.018,
    frame: 0.026,
    gapAboveVanity: 0.1,
  },
  light: {
    intensity: 0.24,
    distance: 1.5,
    color: "#fff2e4",
  },
  /** Cabinet AABB center X (standoff + half depth off the east interior). */
  x:
    WASH_2F.x1 -
    BUILDING.wallThickness / 2 -
    0.03 -
    0.38 / 2,
  z: (WASH_2F.z0 + WASH_2F.z1) / 2,
} as const;

/**
 * 2F 物入 — west alcove of the south bay. Walls N/S/W only; east open.
 */
export const PROP_2F_MONO = {
  id: "hero-2f-mono",
  style: "tokonoma-card" as const,
  floor: "2f" as FloorId,
  label: "2F物入",
  x0: MONO_2F.x0,
  x1: MONO_2F.x1,
  z0: MONO_2F.z0,
  z1: MONO_2F.z1,
  y: FLOOR_LEVELS["2f"],
  shelfD: 0.36,
  boardT: 0.016,
  /** Shelf tops above finished floor. */
  shelves: [0.28, 0.82, 1.36, 1.9],
  light: {
    intensity: 0.16,
    distance: 1.15,
    color: "#fff4e8",
  },
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
  /** Underside Y seen from indoors (flush with 1F wall top). */
  soffitY: STORY.floor2f - BUILDING.slabThickness, // 3.309
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
  /** Underside Y from 2F rooms (2F floor + 2F wall). */
  soffitY: STORY.floor2f + (STORY.floorPh - STORY.floor2f - BUILDING.slabThickness),
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
  {
    id: "ceil-2f-corridor",
    floor: "2f",
    y: CEIL2_TOP_Y,
    rect: {
      x: 2.73,
      z: Z2.clN,
      width: IR.genkanW - 2.73, // 3.64
      depth: Z2.corrDepth,
    },
    thickness: CEIL2_T,
    label: "天花 2F廊道",
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
    label: "天花 2Fトイレ・洗面・物入",
    color: CEIL2_COLOR,
  },
  {
    id: "ceil-2f-ne-foyer",
    floor: "2f",
    y: CEIL2_TOP_Y,
    rect: {
      x: IR.genkanW,
      z: Z2.clN,
      width: 0.91,
      depth: Z2.corrDepth,
    },
    thickness: CEIL2_T,
    label: "天花 2F東北室入口",
    color: CEIL2_COLOR,
  },
  {
    id: "ceil-2f-ne-cl",
    floor: "2f",
    y: CEIL2_TOP_Y,
    rect: {
      x: IR.genkanW,
      z: Z2.corrN,
      width: 0.91,
      depth: Z2.north - Z2.corrN,
    },
    thickness: CEIL2_T,
    label: "天花 2F北翼CL",
    color: CEIL2_COLOR,
  },
  {
    id: "ceil-2f-ne",
    floor: "2f",
    y: CEIL2_TOP_Y,
    rect: {
      x: IR.genkanW + 0.91,
      z: Z2.clN,
      width: BUILDING.width - IR.genkanW - 0.91,
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
const INT2_DOOR_W = 0.91;
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

/**
 * NE 洋室 south wall (G2): EW 3.64 @ z=clN=3.64. CL alcove has no east wall.
 */
const NE_S_X0 = IR.genkanW + M91; // 7.28
const NE_S_X1 = BUILDING.width; // 10.92
const NE_S_LEN = NE_S_X1 - NE_S_X0; // 3.64
const X2_NE_CL0 = IR.genkanW; // 6.37
const X2_NE_CL1 = NE_S_X0; // 7.28

const G2_SILL = 0.1;
const G2_H = storyWallHeight("2f") - G2_SILL - 0.08;
const G2_EDGE = 0.08;
const G2_FROM = G2_EDGE;
const G2_W = NE_S_LEN - 2 * G2_EDGE;

/** Room door on NE west wall: full corridor bay z 3.64–4.55 (0.91). */
const DOOR_2F_NE_FROM = 0;

/** Adjacent north doors on corridor south wall (fromStart from x=0). */
const DOOR_2F_SW_FROM = X2_CL0; // 2.73–3.64 (CL north = SW entry)
const DOOR_2F_SC_FROM = X2_CL1; // 3.64–4.55, adjacent to SW door

const CL_PASS_W = 0.7;
const CL_PASS_H = INT2_DOOR_H;
const CL_PASS_S_FROM = (Z2_CL_SPLIT - Z2.south - CL_PASS_W) / 2;

/** 2F NE room shed: north = 2F wall top, south higher by pitch × 3.64. */
export function neRoomRoofY(z: number): number {
  const yNorth = FLOOR_LEVELS["2f"] + storyWallHeight("2f");
  return yNorth + STORY.roofPitch * (Z2.north - z);
}

export const NE_ROOM_SOUTH_H = neRoomRoofY(Z2.clN) - FLOOR_LEVELS["2f"];

export const WALLS_2F: WallSegment[] = [
  // ── South face of south block ──
  {
    id: "2f-ext-south-w",
    ...wallEW(X2_SW0, X2_SE, Z2.south),
    floor: "2f",
    label: "2F南(西〜中央)",
    openings: [
      /**
       * South elevation: 2F west 洋室 — horizontal 2-pane, west of CL.
       * Wall is 0–6.37; this room is 0–2.73 EW, NS 3.64.
       */
      {
        id: "2f-win-sw-s",
        fromStart: 0.78,
        width: 1.32,
        height: 0.78,
        sill: 1.05,
        type: "window",
      },
      /**
       * South elevation: 2F center 洋室 — same 2-pane, east of CL (3.64–6.37).
       */
      {
        id: "2f-win-sc-s",
        fromStart: 4.36,
        width: 1.32,
        height: 0.78,
        sill: 1.05,
        type: "window",
      },
    ],
  },
  // ── West ──
  {
    id: "2f-ext-west-s",
    ...wallNS(halfT, Z2.south, Z2_CL_N),
    floor: "2f",
    label: "2F西(南翼)",
  },
  // トイレ＋廊道西牆 @ x=2.73 (z=4.1 走道西端 = 西北角西側牆壁)
  {
    id: "2f-ext-west-n",
    ...wallNS(X2_CL0 + halfT, Z2_CL_N, Z2.north),
    floor: "2f",
    label: "2F西(廊道＋物入＋トイレ)",
  },
  // ── North exterior (from x=2.73 east) ──
  {
    id: "2f-ext-north",
    ...wallEW(X2_CL0, BUILDING.width, Z2.north),
    floor: "2f",
    label: "2F北",
    openings: [
      {
        id: "2f-win-toilet-n",
        fromStart: (TOILET_2F.width - TOILET_WIN.w) / 2,
        width: TOILET_WIN.w,
        height: TOILET_WIN.h,
        sill: TOILET_WIN.sill,
        type: "window",
        glazing: "frosted",
      },
      {
        id: "2f-win-n-small-a",
        fromStart: 2.1,
        width: 0.45,
        height: 1.05,
        sill: 1.15,
        type: "window",
      },
      {
        id: "2f-win-n-small-b",
        fromStart: 3.15,
        width: 0.45,
        height: 1.05,
        sill: 1.15,
        type: "window",
      },
      {
        id: "2f-win-ne-n",
        fromStart: 5.6,
        width: 1.6,
        height: 1.4,
        sill: 0.8,
        type: "window",
      },
    ],
  },
  // ── East exterior (NE) ──
  {
    id: "2f-ext-east",
    ...wallNS(BUILDING.width - halfT, Z2_CL_N, Z2.north),
    floor: "2f",
    label: "2F東(NE)",
    openings: [
      {
        id: "2f-win-ne-e",
        /**
         * fromStart from wall south (Z2.clN = 3.64). Near the balcony / south
         * wall (outlook_E: window on the left of the NE 2F mass).
         */
        fromStart: 0.28,
        width: 1.4,
        height: 1.1,
        sill: 0.85,
        type: "window",
      },
    ],
  },
  // ── South block east @ x=6.37 (south rooms only; NE continues north of clN) ──
  {
    id: "2f-ext-s-block-e",
    ...wallNS(X2_SE, Z2.south, Z2_CL_N),
    floor: "2f",
    label: "2F南翼東",
    openings: [
      {
        id: "2f-win-se-e",
        /** North edge at Z2.seWinNorth = 2.685 (balcony SW). */
        fromStart: Z2.seWinNorth - 1.4,
        width: 1.4,
        height: 1.1,
        sill: 0.9,
        type: "window",
      },
    ],
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
    /** South CL only — north CL is open to the SW room (door at x 2.73–3.64). */
    ...wallNS(X2_CL0, Z2.south, Z2_CL_SPLIT),
    floor: "2f",
    label: "2F西洋室|CL南",
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
  // CL north face = SW room door (x 2.73–3.64) on 2f-int-sroom-n

  // ═══════════════════════════════════════════════════════════
  // West north-wing: 物入南 @ corrN; トイレ南 @ z=5.46 (east 0.7 門簾)
  // Corridor west is 2f-ext-west-n @ x=2.73 (no jog west of 2.73)
  // ═══════════════════════════════════════════════════════════

  {
    id: "2f-int-mono-s",
    ...wallEW(MONO_2F.x0, MONO_2F.x1, MONO_2F.z0),
    floor: "2f",
    label: "2F物入南",
  },
  {
    id: "2f-int-toilet-s",
    ...wallEW(TOILET_2F.x0, TOILET_2F.x1, TOILET_2F.z0),
    floor: "2f",
    label: "2Fトイレ南(東通道)",
    openings: [
      {
        id: "2f-pass-toilet-s",
        fromStart: TOILET_2F.solidW,
        width: TOILET_2F.passW,
        height: INT2_DOOR_H,
        sill: INT2_SILL,
        type: "passage",
      },
    ],
  },
  {
    id: "2f-int-toilet-e",
    ...wallNS(IR.clE, Z2_CORR_N, Z2.north),
    floor: "2f",
    label: "2Fトイレ・洗面東|梯井",
  },
  // ═══════════════════════════════════════════════════════════
  // 北翼 CL x 6.37–7.28, z corrN→north
  // Room door: west wall south (from corridor). Closet door: east only.
  // ═══════════════════════════════════════════════════════════
  {
    id: "2f-int-ne-cl-s",
    ...wallEW(X2_NE_CL0, X2_NE_CL1, Z2_CORR_N),
    floor: "2f",
    label: "2F北翼CL南",
  },
  {
    id: "2f-int-ne-cl-w",
    ...wallNS(X2_NE_CL0, Z2_CL_N, Z2.north),
    floor: "2f",
    label: "2F東北室門|CL西",
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
    ...wallEW(X2_NE_CL0, NE_S_X1, Z2_CL_N),
    floor: "2f",
    height: NE_ROOM_SOUTH_H,
    label: "2F洋室南 陽台拉門",
    openings: [
      {
        id: "2f-door-ne-balcony",
        fromStart: BUILDING.width - 1.82 - 2.1 - X2_NE_CL0,
        width: 2.1,
        height: 2.15,
        sill: INT2_SILL,
        type: "door",
      },
    ],
  },
  // 2F balcony rail 1.1 m
  {
    id: "2f-balc-s-w",
    ...wallEW(IR.genkanW, IR.genkanW + 2.73, Z2.balcWestS),
    floor: "2f",
    height: STORY.railH,
    label: "2F陽台南欄杆西",
  },
  {
    id: "2f-balc-s-e",
    ...wallEW(IR.genkanW + 2.73, BUILDING.width, Z2.balcEastS),
    floor: "2f",
    height: STORY.railH,
    label: "2F陽台南欄杆東",
  },
  {
    id: "2f-balc-w",
    ...wallNS(IR.genkanW + halfT, Z2.balcWestS, Z2_CL_N),
    floor: "2f",
    height: STORY.railH,
    label: "2F陽台西欄杆",
  },
  {
    id: "2f-balc-e",
    ...wallNS(BUILDING.width - halfT, Z2.balcEastS, Z2_CL_N),
    floor: "2f",
    height: STORY.railH,
    label: "2F陽台東欄杆",
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
  /** Touch drag look sensitivity (rad per pixel); slightly higher than mouse */
  touchLookSensitivity: 0.0035,
  /** A / D (and ← / →) discrete yaw step (degrees). A = left, D = right. */
  turnDegrees: 10,
  /**
   * Virtual D-pad ←→ hold-to-turn rate (degrees / second).
   * Keyboard A/D stay discrete `turnDegrees` steps.
   */
  virtualTurnSpeedDeg: 90,
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
      intensity: 1.32,
      distance: 7,
      color: "#fff6ea",
    },
    /** Raking strip along west jog (LDK outer → parking) */
    rakeWest: {
      position: [5.9, 1.85, 1.6] as [number, number, number],
      intensity: 1.05,
      distance: 5.4,
      color: "#ffe8c8",
    },
  },
  /** Soft interior fills so rooms stay readable under roofs */
  interiorFills: [
    // 1F LDK approx center
    { id: "fill-1f-ldk", position: [3.0, 2.3, 2.8] as [number, number, number], intensity: 0.55, distance: 8, color: "#fff8f0" },
    { id: "fill-1f-east", position: [8.5, 2.3, 3.5] as [number, number, number], intensity: 0.45, distance: 6, color: "#f5f8ff" },
    { id: "fill-2f-hall", position: [5.4, 5.2, 4.2] as [number, number, number], intensity: 0.5, distance: 7, color: "#fff8f0" },
    { id: "fill-2f-ne", position: [8.8, 5.2, 5.0] as [number, number, number], intensity: 0.45, distance: 6, color: "#f0f6ff" },
    { id: "fill-ph", position: [5.4, 7.5, 5.0] as [number, number, number], intensity: 0.4, distance: 5, color: "#fff8f0" },
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
