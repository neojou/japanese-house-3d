
import { useLayoutEffect, useMemo } from "react";
import {
  ALL_CEILINGS,
  CEILING_1F,
  CEILING_2F,
} from "@/data/dimensions";
import {
  createCeilingMaterial,
  createRevealMaterial,
  ensureFaçadeTextures,
} from "@/lib/houseMaterials";

const REVEAL_W = 0.012;
const REVEAL_H = 0.008;
const REVEAL_INSET = 0.02;

/**
 * Ceiling slabs — oat plaster (interior main 70%).
 * Shadow-gap 分模線 at soffit perimeter (DESIGN: 陰影留白).
 */
export function Ceilings() {
  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const ceilMat = useMemo(() => createCeilingMaterial(), []);
  const revealMat = useMemo(() => createRevealMaterial(), []);

  useLayoutEffect(() => {
    return () => {
      ceilMat.map?.dispose();
      ceilMat.normalMap?.dispose();
      ceilMat.dispose();
      revealMat.dispose();
    };
  }, [ceilMat, revealMat]);

  return (
    <group name="ceilings">
      {ALL_CEILINGS.map((slab) => {
        const { rect, thickness, y, id } = slab;
        const centerX = rect.x + rect.width / 2;
        const centerZ = rect.z + rect.depth / 2;
        const centerY = y - thickness / 2;
        // Soffit underside Y (room-facing)
        const soffitY = y - thickness;
        const rx0 = rect.x + REVEAL_INSET;
        const rz0 = rect.z + REVEAL_INSET;
        const rw = Math.max(rect.width - REVEAL_INSET * 2, 0.05);
        const rd = Math.max(rect.depth - REVEAL_INSET * 2, 0.05);

        return (
          <group key={id} name={id}>
            <mesh
              position={[centerX, centerY, centerZ]}
              receiveShadow
              material={ceilMat}
            >
              <boxGeometry args={[rect.width, thickness, rect.depth]} />
            </mesh>
            {/* Perimeter shadow gaps on soffit (natural black accent line) */}
            <mesh
              position={[rx0 + rw / 2, soffitY - REVEAL_H / 2, rz0 + REVEAL_W / 2]}
              material={revealMat}
            >
              <boxGeometry args={[rw, REVEAL_H, REVEAL_W]} />
            </mesh>
            <mesh
              position={[
                rx0 + rw / 2,
                soffitY - REVEAL_H / 2,
                rz0 + rd - REVEAL_W / 2,
              ]}
              material={revealMat}
            >
              <boxGeometry args={[rw, REVEAL_H, REVEAL_W]} />
            </mesh>
            <mesh
              position={[rx0 + REVEAL_W / 2, soffitY - REVEAL_H / 2, rz0 + rd / 2]}
              material={revealMat}
            >
              <boxGeometry args={[REVEAL_W, REVEAL_H, rd]} />
            </mesh>
            <mesh
              position={[
                rx0 + rw - REVEAL_W / 2,
                soffitY - REVEAL_H / 2,
                rz0 + rd / 2,
              ]}
              material={revealMat}
            >
              <boxGeometry args={[REVEAL_W, REVEAL_H, rd]} />
            </mesh>
          </group>
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
