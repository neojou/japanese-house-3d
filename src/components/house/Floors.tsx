"use client";

import { useLayoutEffect, useMemo } from "react";
import {
  ALL_FLOOR_SLABS,
  COLORS,
  GENKAN_INTERIOR,
  MATERIAL_PRESETS,
  type FloorSlab,
} from "@/data/dimensions";
import {
  createGenkanSlateMaterial,
  ensureFaçadeTextures,
} from "@/lib/houseMaterials";

const GENKAN_FLOOR_IDS = new Set<string>(GENKAN_INTERIOR.floorIds);

/** Category materials — genkan dust slate vs wood vs outdoor. */
function floorLook(slab: FloorSlab): {
  color: string;
  roughness: number;
  metalness: number;
  genkanSlate?: boolean;
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

  const slateMat = useMemo(() => {
    if (!look.genkanSlate) return null;
    return createGenkanSlateMaterial(
      rect.width,
      rect.depth,
      GENKAN_INTERIOR.tileM,
    );
  }, [look.genkanSlate, rect.width, rect.depth]);

  useLayoutEffect(() => {
    return () => {
      if (slateMat) {
        slateMat.map?.dispose();
        slateMat.normalMap?.dispose();
        slateMat.dispose();
      }
    };
  }, [slateMat]);

  return (
    <mesh
      key={id}
      position={[centerX, centerY, centerZ]}
      receiveShadow
      castShadow
    >
      <boxGeometry args={[rect.width, thickness, rect.depth]} />
      {slateMat ? (
        <primitive object={slateMat} attach="material" />
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
