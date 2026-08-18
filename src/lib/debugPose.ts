import { PROP_1F_UB_TUB, SENMEN_1F } from "@/data/dimensions";

export type DebugPose = {
  x: number;
  z: number;
  /** Three.js YXZ yaw. π = look +Z (north). */
  yaw: number;
  pitch: number;
};

/**
 * Agent visual gates (`?pose=senmen`). Not a user mode switch.
 * First-person only — does not add a camera type.
 */
export function poseFromQuery(): DebugPose | null {
  if (typeof window === "undefined") return null;
  const id = new URLSearchParams(window.location.search).get("pose");
  if (id === "senmen") {
    return {
      x: (SENMEN_1F.x0 + SENMEN_1F.x1) / 2,
      z: SENMEN_1F.z0 + 0.78,
      yaw: Math.PI,
      pitch: -0.38,
    };
  }
  if (id === "senmen-cab") {
    return {
      x: (SENMEN_1F.x0 + SENMEN_1F.x1) / 2,
      z: SENMEN_1F.z0 + 0.22,
      yaw: Math.PI,
      pitch: -0.28,
    };
  }
  if (id === "tub") {
    return {
      x: PROP_1F_UB_TUB.x - 0.82,
      z: PROP_1F_UB_TUB.z,
      yaw: -Math.PI / 2,
      pitch: -0.28,
    };
  }
  return null;
}
