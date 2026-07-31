"use client";

import { CEILINGS_1F, CEILING_1F, COLORS } from "@/data/dimensions";
import * as THREE from "three";

/**
 * 1F ceiling slabs — soffit at wall top so sky is not visible indoors.
 * Stair well has no ceiling (void in CEILINGS_1F layout).
 */
export function Ceilings() {
  return (
    <group name="ceilings-1f">
      {CEILINGS_1F.map((slab) => {
        const { rect, thickness, y, id, color } = slab;
        const centerX = rect.x + rect.width / 2;
        const centerZ = rect.z + rect.depth / 2;
        // y = top of plate; bottom (soffit) = y - thickness = CEILING_1F.soffitY
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
      {/* Debug: ensure soffit height is documented for tooling */}
      <group userData={{ soffitY: CEILING_1F.soffitY }} />
    </group>
  );
}
