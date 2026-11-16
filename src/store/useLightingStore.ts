import { create } from "zustand";
import { toggleCircuit as flipCircuit } from "@/lib/fixtures/logic";
import { readLighting } from "@/lib/fixtures/runtime";
import type { BuilderFixtures, LightingMode } from "@/lib/fixtures/types";

const initial = readLighting(
  typeof window === "undefined" ? "" : window.location.search,
);

type LightingState = {
  data: BuilderFixtures | null;
  mode: LightingMode;
  circuitOn: Record<string, boolean>;
  showOutlets: boolean;
  showSwitches: boolean;
  setMode: (mode: LightingMode) => void;
  toggleMode: () => void;
  toggleCircuit: (id: string) => void;
  setAllCircuits: (on: boolean) => void;
  toggleOutlets: () => void;
};

export const useLightingStore = create<LightingState>((set, get) => ({
  data: initial.data,
  mode: initial.mode,
  circuitOn: initial.circuitOn,
  showOutlets: initial.showOutlets,
  showSwitches: initial.showSwitches,
  setMode: (mode) => {
    if (mode === "builder" && !get().data) return;
    set({ mode, showSwitches: mode === "builder" });
  },
  toggleMode: () => {
    const { mode, data } = get();
    if (!data) return;
    const next: LightingMode = mode === "art" ? "builder" : "art";
    set({ mode: next, showSwitches: next === "builder" });
  },
  toggleCircuit: (id) => set({ circuitOn: flipCircuit(get().circuitOn, id) }),
  setAllCircuits: (on) => {
    const circuitOn = { ...get().circuitOn };
    for (const id of Object.keys(circuitOn)) circuitOn[id] = on;
    set({ circuitOn });
  },
  toggleOutlets: () => set((s) => ({ showOutlets: !s.showOutlets })),
}));
