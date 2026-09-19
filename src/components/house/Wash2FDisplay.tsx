import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { PROP_1F_SENMEN, PROP_2F_SINK } from "@/data/dimensions";
import { ensureFaçadeTextures } from "@/lib/houseMaterials";
import { SenmenVanity } from "./SenmenVanity";

/**
 * 2F wash — east wall of the south bay, facing west (tokonoma-card).
 * Reuses the 1F senmen Path B vessel + hinoki cabinet. South of the bay
 * is open to the corridor (no door).
 */
export function Wash2FDisplay() {
  const p = PROP_2F_SINK;
  const sv = PROP_1F_SENMEN.vanity;
  const m = p.mirror;

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const matFrame = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3a3632",
        roughness: 0.5,
        metalness: 0.35,
      }),
    [],
  );
  const matGlass = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#9aa8b0",
        roughness: 0.08,
        metalness: 0.82,
        envMapIntensity: 1.15,
      }),
    [],
  );

  useLayoutEffect(() => {
    return () => {
      matFrame.dispose();
      matGlass.dispose();
    };
  }, [matFrame, matGlass]);

  const vanityX = p.wallFaceX - p.standoff - p.vanity.d / 2;
  const vanityZ = p.z;
  const vanityTopY =
    p.y + sv.h + sv.cabinet.sitGap + sv.vessel.h;
  const mirrorBottomY = vanityTopY + m.gapAboveVanity;
  const mirrorY = mirrorBottomY + m.h / 2;
  const mirrorX = p.wallFaceX - p.standoff - 0.02;

  return (
    <group name={p.label}>
      {/* Local +Z = wall; +π/2 yaw → wall = east, user faces east. */}
      <group position={[vanityX, p.y, vanityZ]} rotation={[0, Math.PI / 2, 0]}>
        <SenmenVanity position={[0, 0, 0]} />
      </group>
      <mesh position={[mirrorX, mirrorY, vanityZ]} material={matFrame} castShadow>
        <boxGeometry args={[m.t + 0.01, m.h + m.frame * 2, m.w + m.frame * 2]} />
      </mesh>
      <mesh
        position={[mirrorX - 0.008, mirrorY, vanityZ]}
        material={matGlass}
      >
        <boxGeometry args={[m.t, m.h, m.w]} />
      </mesh>
      <pointLight
        position={[vanityX - 0.22, mirrorBottomY + m.h * 0.25, vanityZ]}
        intensity={p.light.intensity}
        distance={p.light.distance}
        decay={2}
        color={p.light.color}
        castShadow={false}
      />
    </group>
  );
}
