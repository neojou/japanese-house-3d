import { create } from "zustand";
import type { FloorId } from "@/data/dimensions";

export type { FloorId };

export type ViewerPosition = {
  /** Plan-space X (m): matches dimensions.ts / 平面圖 west→east */
  x: number;
  /** Eye height Y (m) */
  y: number;
  /** Plan-space Z (m): south→north */
  z: number;
};

type ViewerState = {
  activeFloor: FloorId;
  position: ViewerPosition;
  setActiveFloor: (floor: FloorId) => void;
  setPosition: (position: ViewerPosition) => void;
};

export const useViewerStore = create<ViewerState>((set) => ({
  activeFloor: "1f",
  position: { x: 0, y: 0, z: 0 },
  setActiveFloor: (activeFloor) => set({ activeFloor }),
  setPosition: (position) => set({ position }),
}));
