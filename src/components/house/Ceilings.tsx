"use client";

import {
  ALL_CEILINGS,
  CEILING_1F,
  CEILING_2F,
  COLORS,
} from "@/data/dimensions";
import * as THREE from "three";

/**
 * 1F + 2F ceiling slabs — soffit at each story wall top.
 * Stair well and 2F balcony have no ceiling (open in data layout).
 */
export function Ceilings() {
  return (
    <group name="ceilings">
      {ALL_CEILINGS.map((slab) => {
        const { rect, thickness, y, id, color } = slab;
        const centerX = rect.x + rect.width / 2;
        const centerZ = rect.z + rect.depth / 2;
        // y = top of plate; bottom (soffit) = y - thickness
        const centerY = y - thickness / 2;

        return (
          <mesh
            key={id}
            position={[centerX, centerY, centerZ]}
            receiveShadow
          >
            <boxGeometry args={[rect.width, thickness, rect.depth]} />
            <meshStandardMaterial
              color={color ?? COLORS.wall}
              roughness={0.95}
              metalness={0}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
      <group
        userData={{
          soffit1f: CEILING_1F.soffitY,
          soffit2f: CEILING_2F.soffitY,
        }}
      />
    </group>
  );
}
