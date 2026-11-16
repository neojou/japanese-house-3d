import example from "../../data/fixtures.example.ts";
import local from "virtual:builder-fixtures";
import { initialLighting, type LightingQuery } from "./logic.ts";
import type { BuilderFixtures, LightingMode } from "./types.ts";

export type LightingSnapshot = {
  data: BuilderFixtures | null;
  mode: LightingMode;
  circuitOn: Record<string, boolean>;
  showOutlets: boolean;
  showSwitches: boolean;
  issues: string[];
};

/** Resolve once from the virtual module. Null keeps art lighting. */
export function readLighting(search: string): LightingSnapshot {
  const state = initialLighting({ local, example, search });
  if (state.issues.length > 0) {
    console.warn(`builder fixtures rejected: ${state.issues.join(", ")}`);
  }
  return state;
}

export type { LightingQuery };
