
import { useLayoutEffect, useMemo } from "react";
import {
  ALL_FLOOR_SLABS,
  COLORS,
  GENKAN_INTERIOR,
  MATERIAL_PRESETS,
  UB_BATH,
  type FloorSlab,
} from "@/data/dimensions";
import {
  createBathFloorMaterial,
  createGenkanSlateMaterial,
  ensureFaçadeTextures,
} from "@/lib/houseMaterials";

const GENKAN_FLOOR_IDS = new Set<string>(GENKAN_INTERIOR.floorIds);
const UB_FLOOR_IDS = new Set<string>(UB_BATH.floorIds);

/** Category materials — genkan dust slate vs UB bath vs wood vs outdoor. */
function floorLook(slab: FloorSlab): {
  color: string;
  roughness: number;
  metalness: number;
  genkanSlate?: boolean;
  bathFloor?: boolean;
} {
  const id = slab.id;
  if (GENKAN_FLOOR_IDS.has(id)) {
    return {
      color: GENKAN_INTERIOR.floorColor,
      roughness: 0.9,
      metalness: 0.03,
      genkanSlate: true,
    };
  }
  if (UB_FLOOR_IDS.has(id)) {
    return {
      color: "#a8acb0",
      roughness: 0.86,
      metalness: 0.04,
      bathFloor: true,
    };
  }
  if (
    id.includes("balc") ||
    id.includes("balcony") ||
    id.includes("parking")
  ) {
    return {
      color: slab.color ?? COLORS.floorOutdoor,
      ...MATERIAL_PRESETS.floorOutdoor,
    };
  }
  if (
    id.includes("stair") ||
    id.includes("deck") ||
    id.includes("landing") ||
    id.includes("approach")
  ) {
    return {
      color: COLORS.floorStair,
      ...MATERIAL_PRESETS.floorStair,
    };
  }
  return {
    color: slab.color && slab.color !== "#d4d0c8" ? slab.color : COLORS.floor,
    ...MATERIAL_PRESETS.floorInterior,
  };
}

function FloorMesh({ slab }: { slab: FloorSlab }) {
  const { rect, thickness, y, id } = slab;
  const centerX = rect.x + rect.width / 2;
  const centerZ = rect.z + rect.depth / 2;
  const centerY = y - thickness / 2;
  const look = floorLook(slab);

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const specialMat = useMemo(() => {
    if (look.genkanSlate) {
      return createGenkanSlateMaterial(
        rect.width,
        rect.depth,
        GENKAN_INTERIOR.tileM,
      );
    }
    if (look.bathFloor) {
      return createBathFloorMaterial(
        rect.width,
        rect.depth,
        UB_BATH.floorTileM,
      );
    }
    return null;
  }, [look.genkanSlate, look.bathFloor, rect.width, rect.depth]);

  useLayoutEffect(() => {
    return () => {
      if (specialMat) {
        specialMat.map?.dispose();
        specialMat.normalMap?.dispose();
        specialMat.dispose();
      }
    };
  }, [specialMat]);

  return (
    <mesh
      key={id}
      position={[centerX, centerY, centerZ]}
      receiveShadow
      castShadow
    >
      <boxGeometry args={[rect.width, thickness, rect.depth]} />
      {specialMat ? (
        <primitive object={specialMat} attach="material" />
      ) : (
        <meshStandardMaterial
          color={look.color}
          roughness={look.roughness}
          metalness={look.metalness}
        />
      )}
    </mesh>
  );
}

/**
 * Renders each floor slab as a thin box.
 * Slab top sits at `slab.y`; geometry extends downward by `thickness`.
 */
export function Floors() {
  return (
    <group name="floors">
      {ALL_FLOOR_SLABS.map((slab) => (
        <FloorMesh key={slab.id} slab={slab} />
      ))}
    </group>
  );
}
