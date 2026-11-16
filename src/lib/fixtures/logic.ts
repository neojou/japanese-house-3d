import {
  BUILDER_FIXTURE_DEFAULTS,
  BUILDING,
  CEILING_1F,
  CEILING_2F,
  CEILING_PH,
  FLOOR_LEVELS,
  INTERIOR_FLOOR_Y,
  PLAYER,
  STORY,
  type FloorId,
} from "../../data/dimensions.ts";
import type {
  BuilderFixtures,
  Face,
  Fixture,
  FixtureType,
  LightingMode,
  Outlet,
  OutletKind,
  SwitchPlate,
} from "./types.ts";

const FLOOR_IDS = new Set<FloorId>(["1f", "2f", "ph"]);
const FIXTURE_TYPES = new Set<FixtureType>(["C", "B", "D", "外", "換"]);
const OUTLET_KINDS = new Set<OutletKind>([
  "W",
  "E",
  "専",
  "AC100",
  "AC200",
  "VP",
  "LAN",
  "TV",
  "IP",
  "床",
  "給",
]);
const FACES = new Set<Face>(["N", "S", "E", "W"]);

function finite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function faceOk(face: unknown): boolean {
  return face === null || (typeof face === "string" && FACES.has(face as Face));
}

/**
 * Returns issue codes. Empty means the set may drive the scene.
 * Callers warn and fall back; this function does not throw.
 */
export function validateFixtures(data: BuilderFixtures): string[] {
  const issues: string[] = [];
  if (!data || data.version !== 1) return ["version"];
  if (
    !Array.isArray(data.fixtures) ||
    !Array.isArray(data.switches) ||
    !Array.isArray(data.outlets)
  ) {
    return ["shape"];
  }

  const ids = new Set<string>();
  const takeId = (id: unknown) => {
    if (typeof id !== "string" || id.length === 0) {
      issues.push("id");
      return;
    }
    if (ids.has(id)) issues.push("duplicate id");
    ids.add(id);
  };

  for (const f of data.fixtures) {
    takeId(f?.id);
    if (!FLOOR_IDS.has(f?.floor)) issues.push("floor");
    if (!FIXTURE_TYPES.has(f?.type)) issues.push("fixture type");
    if (f?.mount !== "ceiling" && f?.mount !== "wall") issues.push("mount");
    if (!faceOk(f?.face)) issues.push("face");
    if (!finite(f?.x) || !finite(f?.z)) issues.push("position");
    if (!(f?.heightAboveFloor === null || finite(f?.heightAboveFloor))) {
      issues.push("height");
    }
    if (typeof f?.circuit !== "string" || f.circuit.length === 0) issues.push("circuit");
    if (typeof f?.sensor !== "boolean") issues.push("sensor");
    if (f?.color !== undefined && f.color !== "warm" && f.color !== "daylight") {
      issues.push("color");
    }
  }

  const gangCount = new Map<string, number>();
  const threeWay = new Set<string>();
  for (const s of data.switches) {
    takeId(s?.id);
    if (!FLOOR_IDS.has(s?.floor)) issues.push("floor");
    if (!faceOk(s?.face)) issues.push("face");
    if (!finite(s?.x) || !finite(s?.z) || !finite(s?.heightAboveFloor)) {
      issues.push("position");
    }
    if (!Array.isArray(s?.gangs) || s.gangs.length === 0) {
      issues.push("gangs");
      continue;
    }
    for (const g of s.gangs) {
      if (typeof g?.circuit !== "string" || g.circuit.length === 0) {
        issues.push("circuit");
        continue;
      }
      gangCount.set(g.circuit, (gangCount.get(g.circuit) ?? 0) + 1);
      if (g.threeWay === true) threeWay.add(g.circuit);
    }
  }

  for (const o of data.outlets) {
    takeId(o?.id);
    if (!FLOOR_IDS.has(o?.floor)) issues.push("floor");
    if (!OUTLET_KINDS.has(o?.kind)) issues.push("outlet kind");
    if (!faceOk(o?.face)) issues.push("face");
    if (!finite(o?.x) || !finite(o?.z) || !finite(o?.heightAboveFloor)) {
      issues.push("position");
    }
    if (!finite(o?.count) || o.count < 1) issues.push("count");
    if (typeof o?.outdoor !== "boolean") issues.push("outdoor");
  }

  const fixtureCircuits = new Set(
    data.fixtures
      .map((f) => f?.circuit)
      .filter((c): c is string => typeof c === "string" && c.length > 0),
  );
  for (const c of fixtureCircuits) {
    if (!gangCount.has(c)) issues.push("fixture circuit has no switch");
  }
  for (const c of gangCount.keys()) {
    if (!fixtureCircuits.has(c)) issues.push("switch circuit has no fixture");
  }
  for (const c of threeWay) {
    if ((gangCount.get(c) ?? 0) < 2) issues.push("three-way circuit needs two switches");
  }
  return issues;
}

export function circuitIds(data: BuilderFixtures): string[] {
  const ids = new Set<string>();
  for (const f of data.fixtures) ids.add(f.circuit);
  for (const s of data.switches) for (const g of s.gangs) ids.add(g.circuit);
  return [...ids].sort();
}

export function initialCircuitOn(
  ids: readonly string[],
  on: boolean,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const id of ids) out[id] = on;
  return out;
}

/** One boolean per circuit. Either gang of a three-way calls this. */
export function toggleCircuit(
  on: Readonly<Record<string, boolean>>,
  id: string,
): Record<string, boolean> {
  return { ...on, [id]: !on[id] };
}

export function floorDatum(floor: FloorId, grade: boolean): number {
  if (grade && floor === "1f") return FLOOR_LEVELS["1f"];
  if (floor === "1f") return INTERIOR_FLOOR_Y;
  if (floor === "2f") return STORY.floor2f;
  return STORY.floorPh;
}

export function ceilingSoffitY(floor: FloorId): number {
  if (floor === "1f") return CEILING_1F.soffitY;
  if (floor === "2f") return CEILING_2F.soffitY;
  return CEILING_PH.soffitY;
}

/** Balcony underside, same expression as the porch downlights. */
export function porchSoffitY(): number {
  return (
    FLOOR_LEVELS["2f"] -
    BUILDING.slabThickness -
    BUILDER_FIXTURE_DEFAULTS.ceilingGap
  );
}

export function fixtureWorldY(f: Fixture): number {
  if (f.floor === "1f" && f.type === "D") return porchSoffitY();
  const grade = f.floor === "1f" && f.type === "外";
  const datum = floorDatum(f.floor, grade);
  const soffit = ceilingSoffitY(f.floor);
  let y: number;
  if (f.mount === "ceiling" && f.heightAboveFloor == null) {
    y = soffit - BUILDER_FIXTURE_DEFAULTS.ceilingGap;
  } else {
    y = datum + (f.heightAboveFloor ?? 0);
  }
  if (f.mount === "wall") {
    const cap = soffit - BUILDER_FIXTURE_DEFAULTS.belowCeiling;
    if (y > cap) y = cap;
  }
  return y;
}

export function deviceWorldY(
  floor: FloorId,
  heightAboveFloor: number,
  grade: boolean,
): number {
  return floorDatum(floor, grade) + heightAboveFloor;
}

export function floorFromEyeY(eyeY: number): FloorId {
  const feet = eyeY - PLAYER.eyeHeight;
  const margin = BUILDER_FIXTURE_DEFAULTS.floorMargin;
  if (feet < STORY.floor2f - margin) return "1f";
  if (feet < STORY.floorPh - margin) return "2f";
  return "ph";
}

/** Plan-space yaw. The house mirror group applies the X flip; do not negate again. */
export function faceYaw(face: Face | null): number {
  if (face === "S") return Math.PI;
  if (face === "E") return Math.PI / 2;
  if (face === "W") return -Math.PI / 2;
  return 0;
}

/** Local +Z points along the face, into the room, before the parent mirror. */
export function faceOffset(face: Face | null, distance: number): [number, number] {
  if (face === "S") return [0, -distance];
  if (face === "E") return [distance, 0];
  if (face === "W") return [-distance, 0];
  if (face === "N") return [0, distance];
  return [0, 0];
}

export function gangOffsetY(index: number, count: number, plateH: number): number {
  if (count <= 1) return 0;
  const span = plateH * 0.7;
  const step = span / (count - 1);
  return span / 2 - index * step;
}

export function repeatOffset(
  index: number,
  count: number,
  size: number,
  gap: number,
): number {
  if (count <= 1) return 0;
  const step = size + gap;
  const total = count * step - gap;
  return -total / 2 + size / 2 + index * step;
}

export type PoolSlot = {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
} | null;

export function assignLightPool(args: {
  poolSize: number;
  floor: FloorId;
  fixtures: readonly Fixture[];
  circuitOn: Readonly<Record<string, boolean>>;
  playerX: number;
  playerZ: number;
}): PoolSlot[] {
  const ranked = args.fixtures
    .filter(
      (f) =>
        f.floor === args.floor &&
        f.type !== "換" &&
        args.circuitOn[f.circuit] === true,
    )
    .map((f) => {
      const dx = f.x - args.playerX;
      const dz = f.z - args.playerZ;
      return { f, d2: dx * dx + dz * dz };
    })
    .sort((a, b) => a.d2 - b.d2 || (a.f.id < b.f.id ? -1 : a.f.id > b.f.id ? 1 : 0));

  const slots: PoolSlot[] = [];
  for (let i = 0; i < args.poolSize; i++) {
    const hit = ranked[i];
    if (!hit) {
      slots.push(null);
      continue;
    }
    const f = hit.f;
    slots.push({
      id: f.id,
      x: f.x,
      y: fixtureWorldY(f),
      z: f.z,
      color: f.color === "daylight" ? BUILDER_FIXTURE_DEFAULTS.daylight : BUILDER_FIXTURE_DEFAULTS.warm,
    });
  }
  return slots;
}

export type LightingQuery = {
  wantBuilder: boolean;
  showOutlets: boolean;
  allOn: boolean;
  useExample: boolean;
};

export function lightingQuery(search: string): LightingQuery {
  const q = new URLSearchParams(search);
  return {
    wantBuilder: q.get("lighting") === "builder",
    showOutlets: q.get("outlets") === "1",
    allOn: q.get("circuits") === "all",
    useExample: q.get("fixtures") === "example",
  };
}

export function resolveFixtureSource(opts: {
  local: BuilderFixtures | null;
  example: BuilderFixtures;
  search: string;
}): { data: BuilderFixtures | null; issues: string[] } {
  const query = lightingQuery(opts.search);
  const raw = opts.local ?? (query.useExample ? opts.example : null);
  if (!raw) return { data: null, issues: [] };
  const issues = validateFixtures(raw);
  if (issues.length > 0) return { data: null, issues };
  return { data: raw, issues: [] };
}

export function initialLighting(opts: {
  local: BuilderFixtures | null;
  example: BuilderFixtures;
  search: string;
}): {
  data: BuilderFixtures | null;
  mode: LightingMode;
  circuitOn: Record<string, boolean>;
  showOutlets: boolean;
  showSwitches: boolean;
  issues: string[];
} {
  const query = lightingQuery(opts.search);
  const resolved = resolveFixtureSource(opts);
  const data = resolved.data;
  const mode: LightingMode = query.wantBuilder && data ? "builder" : "art";
  const ids = data ? circuitIds(data) : [];
  return {
    data,
    mode,
    circuitOn: initialCircuitOn(ids, Boolean(data) && query.allOn),
    showOutlets: query.showOutlets,
    showSwitches: mode === "builder",
    issues: resolved.issues,
  };
}

export function shouldLoadLocalFixtures(opts: {
  exists: boolean;
  command: "serve" | "build";
  envFlag: boolean;
}): boolean {
  return opts.exists && (opts.command === "serve" || opts.envFlag);
}

export function fixtureEmitColor(f: Fixture): string {
  return f.color === "daylight"
    ? BUILDER_FIXTURE_DEFAULTS.daylight
    : BUILDER_FIXTURE_DEFAULTS.warm;
}

export function switchPlatesOnCircuit(
  switches: readonly SwitchPlate[],
  circuit: string,
): number {
  let n = 0;
  for (const s of switches) {
    for (const g of s.gangs) if (g.circuit === circuit) n += 1;
  }
  return n;
}

export function outletWorldY(o: Outlet): number {
  return deviceWorldY(o.floor, o.heightAboveFloor, o.outdoor && o.floor === "1f");
}

export function switchWorldY(s: SwitchPlate): number {
  return deviceWorldY(s.floor, s.heightAboveFloor, false);
}
