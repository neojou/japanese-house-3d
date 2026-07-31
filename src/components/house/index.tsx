"use client";

import { Floors } from "./Floors";
import { Walls } from "./Walls";
import { Stairs } from "./Stairs";
import { Doors } from "./Doors";
import { GenkanEntry } from "./GenkanEntry";
import { Ceilings } from "./Ceilings";
import { PlanLabels } from "./PlanLabels";
import { Compass } from "./Compass";
import { BUILDING, COLORS } from "@/data/dimensions";

/**
 * Phase 1 — 1F/2F shell, interior, stairs, genkan, 1F ceilings.
 */
export function House() {
  return (
    <group name="house">
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[BUILDING.width / 2, -0.02, BUILDING.depth / 2]}
        receiveShadow
      >
        <planeGeometry args={[BUILDING.width + 10, BUILDING.depth + 10]} />
        <meshStandardMaterial color={COLORS.ground} roughness={1} />
      </mesh>

      <Floors />
      <Ceilings />
      <Walls />
      <Stairs />
      <Doors />
      <GenkanEntry />
      <PlanLabels />
      <Compass />
    </group>
  );
}

export {
  Floors,
  Ceilings,
  Walls,
  Stairs,
  Doors,
  GenkanEntry,
  PlanLabels,
  Compass,
};
