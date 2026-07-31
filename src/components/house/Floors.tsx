"use client";

import { ALL_FLOOR_SLABS, COLORS } from "@/data/dimensions";

/**
 * Renders each floor slab as a thin box.
 * Slab top sits at `slab.y`; geometry extends downward by `thickness`.
 */
export function Floors() {
  return (
    <group name="floors">
      {ALL_FLOOR_SLABS.map((slab) => {
        const { rect, thickness, y, id, color } = slab;
        const centerX = rect.x + rect.width / 2;
        const centerZ = rect.z + rect.depth / 2;
        const centerY = y - thickness / 2;

        return (
          <mesh
            key={id}
            position={[centerX, centerY, centerZ]}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[rect.width, thickness, rect.depth]} />
            <meshStandardMaterial
              color={color ?? COLORS.floor}
              roughness={0.9}
              metalness={0.05}
            />
          </mesh>
        );
      })}
    </group>
  );
}
