import { useLayoutEffect } from "react";
import { PROP_2F_SINK } from "@/data/dimensions";
import { ensureFaçadeTextures } from "@/lib/houseMaterials";
import { DokodemoWash } from "./DokodemoWash";

/**
 * 2F wash — east wall, facing west (tokonoma-card).
 * Path B wall counter. Local +Z of the GLB is toward the wall;
 * +π/2 yaw maps that to plan +X (east).
 */
export function Wash2FDisplay() {
  const p = PROP_2F_SINK;

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const originX = p.wallFaceX - p.standoff - p.counter.d;

  return (
    <group name={p.label}>
      <group position={[originX, p.y, p.z]} rotation={[0, Math.PI / 2, 0]}>
        <DokodemoWash />
      </group>
      <pointLight
        position={[p.x - 0.28, p.y + 1.15, p.z]}
        intensity={p.light.intensity}
        distance={p.light.distance}
        decay={2}
        color={p.light.color}
        castShadow={false}
      />
    </group>
  );
}
