"use client";

import { useLayoutEffect, useMemo } from "react";
import {
  BUILDING,
  FLOOR_LEVELS,
  GENKAN_ENTRY,
  INTERIOR_FLOOR_Y,
  IR,
  SX,
  SZ,
} from "@/data/dimensions";
import {
  createInteriorWoodMaterial,
  ensureFaçadeTextures,
  INTERIOR,
} from "@/lib/houseMaterials";

/** Must match 1f-int-genkan-n passage (centered 1.15 m). */
const GENKAN_N_PASS_W = 1.15;
const GENKAN_N_BAY = SX.xGenkanE - SX.xLdkE; // 1.52
const GENKAN_N_PASS_FROM = (GENKAN_N_BAY - GENKAN_N_PASS_W) / 2;

/**
 * Additive interior wood accents (no plan-wall line changes).
 * Genkan north: wood only on solid stubs beside passage — never seals the opening.
 */
export function InteriorFinishes() {
  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const matWood = useMemo(() => createInteriorWoodMaterial(0.5, 2.2), []);
  const matBeam = useMemo(() => createInteriorWoodMaterial(6, 0.2), []);

  useLayoutEffect(() => {
    return () => {
      for (const m of [matWood, matBeam]) {
        m.map?.dispose();
        m.normalMap?.dispose();
        m.dispose();
      }
    };
  }, [matWood, matBeam]);

  const y0 = FLOOR_LEVELS["1f"];
  const wallH = BUILDING.wallHeight;
  const halfT = BUILDING.wallThickness / 2;
  const clad = 0.018;

  const genkanN = IR.stairS;
  const panelH = wallH - 0.12;
  const panelY = y0 + INTERIOR_FLOOR_Y + panelH / 2 + 0.02;
  const zPanel = genkanN - halfT - clad / 2 - 0.002;

  // Solid stubs left/right of passage (same split as wall opening)
  const passX0 = IR.genkanW + GENKAN_N_PASS_FROM;
  const passX1 = passX0 + GENKAN_N_PASS_W;
  const leftW = Math.max(passX0 - IR.genkanW - 0.02, 0.08);
  const rightW = Math.max(IR.genkanE - passX1 - 0.02, 0.08);
  const leftCx = IR.genkanW + 0.01 + leftW / 2;
  const rightCx = passX1 + 0.01 + rightW / 2;

  const beamY = 2.5 - 0.08;
  const beamZ = (SZ.outer + SZ.mid) / 2;
  const beamX = SX.xLdkE / 2;

  return (
    <group name="interior-finishes">
      {/* 玄関北 — wood only on side stubs (passage clear) */}
      <mesh
        position={[leftCx, panelY, zPanel]}
        castShadow
        receiveShadow
        material={matWood}
      >
        <boxGeometry args={[leftW, panelH, clad]} />
      </mesh>
      <mesh
        position={[rightCx, panelY, zPanel]}
        castShadow
        receiveShadow
        material={matWood}
      >
        <boxGeometry args={[rightW, panelH, clad]} />
      </mesh>
      {/* Slim charcoal baseboards under stubs only */}
      <mesh position={[leftCx, y0 + INTERIOR_FLOOR_Y + 0.04, zPanel]}>
        <boxGeometry args={[leftW, 0.08, clad * 1.1]} />
        <meshStandardMaterial
          color={INTERIOR.accent}
          roughness={0.85}
          metalness={0.04}
        />
      </mesh>
      <mesh position={[rightCx, y0 + INTERIOR_FLOOR_Y + 0.04, zPanel]}>
        <boxGeometry args={[rightW, 0.08, clad * 1.1]} />
        <meshStandardMaterial
          color={INTERIOR.accent}
          roughness={0.85}
          metalness={0.04}
        />
      </mesh>

      {/* LDK decorative beam */}
      <mesh position={[beamX, beamY, beamZ]} castShadow material={matBeam}>
        <boxGeometry args={[SX.xLdkE * 0.72, 0.12, 0.18]} />
      </mesh>

      {/* 2F G2 interior sill band (wood warm) */}
      <mesh
        position={[
          (IR.genkanW + SX.xEast) / 2,
          FLOOR_LEVELS["2f"] + 0.12,
          IR.mid + halfT + 0.015,
        ]}
        material={matWood}
      >
        <boxGeometry args={[SX.xEast - IR.genkanW - 0.16, 0.06, 0.03]} />
      </mesh>

      <pointLight
        position={[
          (GENKAN_ENTRY.x0 + GENKAN_ENTRY.x1) / 2,
          y0 + 2.1,
          (GENKAN_ENTRY.z + IR.stairS) / 2,
        ]}
        intensity={0.35}
        distance={4.5}
        decay={2}
        color="#ffe8c4"
      />
    </group>
  );
}
