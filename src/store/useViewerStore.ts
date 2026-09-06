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
  /** Door id → open. Shared by R3F doors, genkan hero overlay, and HouseGltf preview. */
  doorOpen: Record<string, boolean>;
  setActiveFloor: (floor: FloorId) => void;
  setPosition: (position: ViewerPosition) => void;
  toggleDoor: (id: string) => void;
  setDoorOpen: (id: string, open: boolean) => void;
};

export const useViewerStore = create<ViewerState>((set) => ({
  activeFloor: "1f",
  position: { x: 0, y: 0, z: 0 },
  doorOpen: {},
  setActiveFloor: (activeFloor) => set({ activeFloor }),
  setPosition: (position) => set({ position }),
  toggleDoor: (id) =>
    set((s) => ({ doorOpen: { ...s.doorOpen, [id]: !s.doorOpen[id] } })),
  setDoorOpen: (id, open) =>
    set((s) => ({ doorOpen: { ...s.doorOpen, [id]: open } })),
}));
