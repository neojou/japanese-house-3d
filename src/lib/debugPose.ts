import {
  FLOOR_LEVELS,
  MONO_2F,
  PROP_1F_UB_TUB,
  PROP_2F_SINK,
  PROP_2F_TOILET_CURTAIN,
  SENMEN_1F,
  TOILET_2F,
} from "@/data/dimensions";

export type DebugPose = {
  x: number;
  z: number;
  /** Feet Y hint for height sampling (2F poses must pass 2F floor). */
  y?: number;
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
      x: PROP_1F_UB_TUB.x - 0.72,
      z: PROP_1F_UB_TUB.z - 0.22,
      /** East + a little north so the NW deck button is in frame. */
      yaw: Math.PI / 2 + 0.42,
      pitch: -0.55,
    };
  }
  if (id === "toilet2f") {
    return {
      x: PROP_2F_TOILET_CURTAIN.x,
      z: TOILET_2F.z0 - 0.38,
      y: FLOOR_LEVELS["2f"],
      yaw: Math.PI,
      pitch: -0.12,
    };
  }
  if (id === "wash2f") {
    return {
      x: PROP_2F_SINK.x - 0.55,
      z: PROP_2F_SINK.z,
      y: FLOOR_LEVELS["2f"],
      yaw: Math.PI / 2,
      pitch: -0.28,
    };
  }
  if (id === "mono2f") {
    return {
      x: MONO_2F.x1 + 0.42,
      z: (MONO_2F.z0 + MONO_2F.z1) / 2,
      y: FLOOR_LEVELS["2f"],
      yaw: -Math.PI / 2,
      pitch: -0.12,
    };
  }
  return null;
}
