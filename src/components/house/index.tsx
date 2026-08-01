"use client";

import { Floors } from "./Floors";
import { Walls } from "./Walls";
import { Stairs } from "./Stairs";
import { Doors } from "./Doors";
import { GenkanEntry } from "./GenkanEntry";
import { BalconyExterior } from "./BalconyExterior";
import { Ceilings } from "./Ceilings";
import { InteriorFinishes } from "./InteriorFinishes";
import { PlanLabels } from "./PlanLabels";
import { Compass } from "./Compass";
import { Props } from "./Props";
import { CoatDisplay } from "./CoatDisplay";
import { GetabakoDisplay } from "./GetabakoDisplay";
import { ToiletDisplay } from "./ToiletDisplay";
import { TubDisplay } from "./TubDisplay";
import { BUILDING, COLORS, MATERIAL_PRESETS } from "@/data/dimensions";

/**
 * House shell — floors / walls / stairs / genkan / ceilings / sparse props.
 * Exterior L1 + interior 70/25/5 (DESIGN.md / houseMaterials).
 * M8 hero props mount via Props (e.g. SCL trench).
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
      <BalconyExterior />
      <InteriorFinishes />
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
  BalconyExterior,
  InteriorFinishes,
  Props,
  CoatDisplay,
  GetabakoDisplay,
  ToiletDisplay,
  TubDisplay,
  PlanLabels,
  Compass,
};
