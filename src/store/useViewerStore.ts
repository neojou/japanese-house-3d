import { create } from "zustand";
import type { FloorId } from "@/data/dimensions";

export type ViewerMode = "first-person" | "top-down";
export type { FloorId };

type ViewerState = {
  mode: ViewerMode;
  /** Which floor the first-person player is currently on (Phase 1: manual / spawn). */
  activeFloor: FloorId;
  setMode: (mode: ViewerMode) => void;
  setActiveFloor: (floor: FloorId) => void;
};

export const useViewerStore = create<ViewerState>((set) => ({
  mode: "top-down",
  activeFloor: "1f",
  setMode: (mode) => set({ mode }),
  setActiveFloor: (activeFloor) => set({ activeFloor }),
}));
