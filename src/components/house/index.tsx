
import { Floors } from "./Floors";
import { Walls } from "./Walls";
import { Stairs } from "./Stairs";
import { Doors } from "./Doors";
import { GenkanEntry } from "./GenkanEntry";
import { BalconyExterior } from "./BalconyExterior";
import { Ceilings } from "./Ceilings";
import { InteriorFinishes } from "./InteriorFinishes";
import { Roofs } from "./Roofs";
import { PlanLabels } from "./PlanLabels";
import { Compass } from "./Compass";
import { Props } from "./Props";
import { CoatDisplay } from "./CoatDisplay";
import { GetabakoDisplay } from "./GetabakoDisplay";
import { Toilet2FDisplay, ToiletDisplay } from "./ToiletDisplay";
import { ToiletCurtainDisplay } from "./ToiletCurtainDisplay";
import { TubDisplay } from "./TubDisplay";
import { KitchenDisplay } from "./KitchenDisplay";
import { Mono2FDisplay } from "./Mono2FDisplay";
import { SenmenDisplay } from "./SenmenDisplay";
import { Wash2FDisplay } from "./Wash2FDisplay";
import { BathFinishes } from "./BathFinishes";
import { HouseGltf } from "./HouseGltf";
import { BUILDING, COLORS, MATERIAL_PRESETS } from "@/data/dimensions";
import { useGltfHouse } from "@/lib/houseGltfFlag";

/**
 * House shell — R3F floors / walls / stairs / doors by default.
 * `?houseGltf=1` previews the archived full-house GLB.
 * Exterior L1 + interior 70/25/5 (DESIGN.md / houseMaterials).
 */
export function House() {
  const gltfHouse = useGltfHouse();
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

      {gltfHouse ? (
        <HouseGltf />
      ) : (
        <>
          <Floors />
          <Ceilings />
          <Walls />
          <Stairs />
          <Doors />
          <GenkanEntry />
          <BalconyExterior />
          <InteriorFinishes />
          <Roofs />
        </>
      )}
      <BathFinishes />
      <Props />
      <PlanLabels />
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
  HouseGltf,
  Props,
  CoatDisplay,
  GetabakoDisplay,
  ToiletDisplay,
  Toilet2FDisplay,
  ToiletCurtainDisplay,
  TubDisplay,
  KitchenDisplay,
  SenmenDisplay,
  Wash2FDisplay,
  Mono2FDisplay,
  BathFinishes,
  PlanLabels,
  Compass,
};
