"use client";

import { Floors } from "./Floors";
import { Walls } from "./Walls";
import { Stairs } from "./Stairs";
import { Doors } from "./Doors";
import { GenkanEntry } from "./GenkanEntry";
import { Ceilings } from "./Ceilings";
import { PlanLabels } from "./PlanLabels";
import { Compass } from "./Compass";
import { Props } from "./Props";
import { BUILDING, COLORS, MATERIAL_PRESETS } from "@/data/dimensions";

/**
 * Phase shell — floors / walls / stairs / genkan / ceilings / sparse props.
 * Materials: flat MeshStandard (T-301); no heavy textures.
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
        <meshStandardMaterial
          color={COLORS.ground}
          roughness={MATERIAL_PRESETS.ground.roughness}
          metalness={MATERIAL_PRESETS.ground.metalness}
        />
      </mesh>

      <Floors />
      <Ceilings />
      <Walls />
      <Stairs />
      <Doors />
      <GenkanEntry />
      <Props />
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
  Props,
  PlanLabels,
  Compass,
};
