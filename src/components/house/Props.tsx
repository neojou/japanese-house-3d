"use client";

import { FLOOR_LEVELS, PROP_2F_SINK } from "@/data/dimensions";

/**
 * Sparse Phase-1 placeholders (not full furniture).
 */
export function Props() {
  const s = PROP_2F_SINK;
  const baseY = FLOOR_LEVELS[s.floor];
  const cabinetH = s.height - s.basinH;
  const cx = s.x;
  const cz = s.z;

  return (
    <group name="props">
      <group name={s.label}>
        {/* Cabinet */}
        <mesh
          position={[cx, baseY + cabinetH / 2, cz]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[s.width, cabinetH, s.depth]} />
          <meshStandardMaterial color="#c4b8a8" roughness={0.75} />
        </mesh>
        {/* Basin top */}
        <mesh
          position={[cx, baseY + cabinetH + s.basinH / 2, cz]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[s.width * 0.92, s.basinH, s.depth * 0.85]} />
          <meshStandardMaterial
            color="#e8eef2"
            roughness={0.25}
            metalness={0.05}
          />
        </mesh>
      </group>
    </group>
  );
}
