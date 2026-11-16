import type { FloorId } from "../../data/dimensions.ts";

export type { FloorId };

export type Face = "N" | "S" | "E" | "W";

/** C ceiling, B wall, D recessed, 外 outdoor, 換 fan (no light). */
export type FixtureType = "C" | "B" | "D" | "外" | "換";

export type LightingMode = "art" | "builder";

export interface Fixture {
  id: string;
  floor: FloorId;
  room: string;
  type: FixtureType;
  /** Plan-space meters. */
  x: number;
  z: number;
  mount: "ceiling" | "wall";
  /** Direction the device faces, into the room. Null stands free. */
  face: Face | null;
  /** Meters above that floor's datum. Null on a ceiling mount uses the soffit. */
  heightAboveFloor: number | null;
  circuit: string;
  sensor: boolean;
  /** Unset reads as warm. */
  color?: "warm" | "daylight";
  note?: string;
}

export interface SwitchGang {
  circuit: string;
  threeWay?: boolean;
}

export interface SwitchPlate {
  id: string;
  floor: FloorId;
  room: string;
  x: number;
  z: number;
  face: Face | null;
  heightAboveFloor: number;
  gangs: SwitchGang[];
}

export type OutletKind =
  | "W"
  | "E"
  | "専"
  | "AC100"
  | "AC200"
  | "VP"
  | "LAN"
  | "TV"
  | "IP"
  | "床"
  | "給";

export interface Outlet {
  id: string;
  floor: FloorId;
  room: string;
  kind: OutletKind;
  x: number;
  z: number;
  face: Face | null;
  heightAboveFloor: number;
  count: number;
  outdoor: boolean;
  note?: string;
}

export interface BuilderFixtures {
  version: 1;
  fixtures: Fixture[];
  switches: SwitchPlate[];
  outlets: Outlet[];
  /** Set only on the gitignored local module. */
  sentinel?: string;
}
