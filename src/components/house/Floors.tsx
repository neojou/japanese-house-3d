"use client";

import {
  ALL_FLOOR_SLABS,
  COLORS,
  MATERIAL_PRESETS,
  type FloorSlab,
} from "@/data/dimensions";

/** Category materials (T-301) — distinct indoor wood / outdoor / stair. */
function floorLook(slab: FloorSlab): {
  color: string;
  roughness: number;
  metalness: number;
} {
  const id = slab.id;
  if (
    id.includes("balc") ||
    id.includes("balcony") ||
    id.includes("parking")
  ) {
    return {
      color: COLORS.floorOutdoor,
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
  // Optional per-slab tint still allowed via slab.color; default warm wood
  return {
    color: slab.color && slab.color !== "#d4d0c8" ? slab.color : COLORS.floor,
    ...MATERIAL_PRESETS.floorInterior,
  };
}

/**
 * Renders each floor slab as a thin box.
 * Slab top sits at `slab.y`; geometry extends downward by `thickness`.
 */
export function Floors() {
  return (
    <group name="floors">
      {ALL_FLOOR_SLABS.map((slab) => {
        const { rect, thickness, y, id } = slab;
        const centerX = rect.x + rect.width / 2;
        const centerZ = rect.z + rect.depth / 2;
        const centerY = y - thickness / 2;
        const mat = floorLook(slab);

        return (
          <mesh
            key={id}
            position={[centerX, centerY, centerZ]}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[rect.width, thickness, rect.depth]} />
            <meshStandardMaterial
              color={mat.color}
              roughness={mat.roughness}
              metalness={mat.metalness}
            />
          </mesh>
        );
      })}
    </group>
  );
}
