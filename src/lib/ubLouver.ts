/**
 * 1F UB east 目隠し可動ルーバー — LIXIL inspired, no trademarks.
 * GLB local: origin at the opening centre, +X east (out), +Y up, +Z north.
 */
import {
  BUILDING,
  PROP_1F_UB_LOUVER,
  SX,
  SZ,
  UB_EAST_WINDOW,
} from "@/data/dimensions";

export const UB_LOUVER_GLB = PROP_1F_UB_LOUVER.gltf;

export function ubLouverOrigin(): { x: number; y: number; z: number } {
  return {
    x: SX.xEast - BUILDING.wallThickness / 2,
    y: UB_EAST_WINDOW.sill + UB_EAST_WINDOW.height / 2,
    z: SZ.ubSouth + UB_EAST_WINDOW.fromStart + UB_EAST_WINDOW.width / 2,
  };
}

export function bladeName(i: number): string {
  return `Blade_${String(i).padStart(2, "0")}`;
}
