/**
 * 1F senmen waste path — local to the vessel bottom centre.
 * +Y up, +Z wall, −Z room. y=0 is the porcelain underside (pipe starts here).
 */

export type PlumbingSpec = {
  pipeR: number;
  tailH: number;
  trapR: number;
  armL: number;
};

export const SENMEN_PLUMBING: PlumbingSpec = {
  pipeR: 0.018,
  tailH: 0.26,
  trapR: 0.042,
  armL: 0.18,
};

export type PipeSeg = {
  name: string;
  kind: "tube" | "bend" | "flange";
  pos: [number, number, number];
  rot: [number, number, number];
  /** Tube length along local Y after rot. */
  len: number;
  r: number;
};

/** Tailpiece → P-trap → arm toward the wall. Pure numbers (testable). */
export function senmenWasteSegments(
  spec: PlumbingSpec = SENMEN_PLUMBING,
): PipeSeg[] {
  const r = spec.pipeR;
  const tailH = spec.tailH;
  const R = spec.trapR;
  const arm = spec.armL;
  const trapY = -tailH;
  // U faces the room (XY) so a front view reads as a P-trap, then the arm turns to the wall.
  const outX = 2 * R;

  return [
    {
      name: "tailpiece",
      kind: "tube",
      pos: [0, -tailH / 2, 0],
      rot: [0, 0, 0],
      len: tailH,
      r,
    },
    {
      name: "ptrap",
      kind: "bend",
      pos: [R, trapY, 0],
      rot: [0, 0, Math.PI],
      len: Math.PI,
      r,
    },
    {
      name: "trap-arm",
      kind: "tube",
      pos: [outX, trapY, arm / 2],
      rot: [Math.PI / 2, 0, 0],
      len: arm,
      r,
    },
    {
      name: "wall-flange",
      kind: "flange",
      pos: [outX, trapY, arm],
      rot: [Math.PI / 2, 0, 0],
      len: 0.008,
      r: r + 0.012,
    },
  ];
}

export function wasteReachesWall(
  segs: PipeSeg[],
  cabinetHalfD: number,
): boolean {
  const flange = segs.find((s) => s.name === "wall-flange");
  if (!flange) return false;
  return flange.pos[2] >= cabinetHalfD - 0.04;
}

export function wasteStaysInCabinet(
  segs: PipeSeg[],
  cabinetH: number,
  cabinetHalfD: number,
): boolean {
  for (const s of segs) {
    if (s.pos[1] > 0.002) return false;
    if (s.pos[1] < -cabinetH + 0.04) return false;
    if (Math.abs(s.pos[0]) > 0.16) return false;
    if (s.pos[2] < -0.02) return false;
    if (s.pos[2] > cabinetHalfD + 0.06) return false;
  }
  return true;
}
