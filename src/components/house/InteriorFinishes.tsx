"use client";

import { useLayoutEffect, useMemo } from "react";
import {
  BUILDING,
  FLOOR_LEVELS,
  GENKAN_ENTRY,
  GENKAN_INTERIOR,
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
 * Interior accents + genkan 落塵区 lighting (plan walls unchanged).
 * - Genkan north: wood stubs only
 * - N/S cove LED strips (warm, soft wash)
 * - Flat iron sconce on east wall near door (vs exterior lantern)
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

  const passX0 = IR.genkanW + GENKAN_N_PASS_FROM;
  const passX1 = passX0 + GENKAN_N_PASS_W;
  const leftW = Math.max(passX0 - IR.genkanW - 0.02, 0.08);
  const rightW = Math.max(IR.genkanE - passX1 - 0.02, 0.08);
  const leftCx = IR.genkanW + 0.01 + leftW / 2;
  const rightCx = passX1 + 0.01 + rightW / 2;

  const beamY = 2.5 - 0.08;
  const beamZ = (SZ.outer + SZ.mid) / 2;
  const beamX = SX.xLdkE / 2;

  // Genkan + SCL dust zone bounds for cove
  const dustX0 = SX.xLdkE;
  const dustX1 = SX.xSclE;
  const dustZ0 = SZ.recess;
  const dustZ1 = IR.stairS;
  const dustW = dustX1 - dustX0;
  const dustCx = (dustX0 + dustX1) / 2;
  const gi = GENKAN_INTERIOR;
  const cove = gi.cove;
  const sc = gi.sconce;

  return (
    <group name="interior-finishes">
      {/* 玄関北 — wood stubs only (passage clear) */}
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

      {/* ── N/S cove strips (Q3-B): warm, soft, not blasting ── */}
      {/* South cove (near door header, inside) */}
      <group
        position={[
          dustCx,
          cove.y,
          dustZ0 + cove.inset + cove.stripW / 2,
        ]}
      >
        <mesh>
          <boxGeometry args={[dustW - cove.inset * 2, cove.stripH, cove.stripW]} />
          <meshStandardMaterial
            color={cove.color}
            emissive={cove.color}
            emissiveIntensity={cove.emissiveIntensity}
            roughness={0.5}
            metalness={0}
          />
        </mesh>
        <pointLight
          position={[0, -0.08, 0.05]}
          intensity={cove.lightIntensity}
          distance={cove.lightDistance}
          decay={2}
          color={cove.color}
        />
      </group>
      {/* North cove (toward passage) */}
      <group
        position={[
          dustCx,
          cove.y,
          dustZ1 - cove.inset - cove.stripW / 2,
        ]}
      >
        <mesh>
          <boxGeometry args={[dustW - cove.inset * 2, cove.stripH, cove.stripW]} />
          <meshStandardMaterial
            color={cove.color}
            emissive={cove.color}
            emissiveIntensity={cove.emissiveIntensity}
            roughness={0.5}
            metalness={0}
          />
        </mesh>
        <pointLight
          position={[0, -0.08, -0.05]}
          intensity={cove.lightIntensity}
          distance={cove.lightDistance}
          decay={2}
          color={cove.color}
        />
      </group>

      {/* ── Flat iron sconce on east wall, south (Q4-C near door) ── */}
      <group name="genkan-sconce-int" position={[sc.x, sc.y, sc.z]}>
        {/* Slim backplate */}
        <mesh castShadow>
          <boxGeometry args={[0.02, 0.28, 0.1]} />
          <meshStandardMaterial
            color={sc.metal}
            roughness={0.7}
            metalness={0.45}
          />
        </mesh>
        {/* Flat arm */}
        <mesh position={[-0.04, 0, 0]} castShadow>
          <boxGeometry args={[0.06, 0.015, 0.015]} />
          <meshStandardMaterial
            color={sc.metal}
            roughness={0.7}
            metalness={0.45}
          />
        </mesh>
        {/* Thin vertical bar shade (flat, not lantern) */}
        <mesh position={[-0.07, 0, 0]} castShadow>
          <boxGeometry args={[0.02, 0.2, 0.05]} />
          <meshStandardMaterial
            color={sc.metal}
            roughness={0.65}
            metalness={0.4}
          />
        </mesh>
        {/* Warm slit glow */}
        <mesh position={[-0.075, 0, 0]}>
          <boxGeometry args={[0.008, 0.14, 0.035]} />
          <meshStandardMaterial
            color={sc.glow}
            emissive={sc.glow}
            emissiveIntensity={0.55}
            roughness={0.4}
            metalness={0}
          />
        </mesh>
        <pointLight
          position={[-0.1, 0, 0]}
          intensity={sc.intensity}
          distance={sc.distance}
          decay={2}
          color={sc.glow}
        />
      </group>

      {/* LDK decorative beam */}
      <mesh position={[beamX, beamY, beamZ]} castShadow material={matBeam}>
        <boxGeometry args={[SX.xLdkE * 0.72, 0.12, 0.18]} />
      </mesh>

      {/* 2F G2 interior sill band (NE south @ clN = 2.73) */}
      <mesh
        position={[
          (IR.genkanW + SX.xEast) / 2,
          FLOOR_LEVELS["2f"] + 0.12,
          2.73 + halfT + 0.015,
        ]}
        material={matWood}
      >
        <boxGeometry args={[SX.xEast - IR.genkanW - 0.16, 0.06, 0.03]} />
      </mesh>

      {/* Soft ambient only (cove does the wash) */}
      <pointLight
        position={[
          (GENKAN_ENTRY.x0 + GENKAN_ENTRY.x1) / 2,
          y0 + 2.0,
          (GENKAN_ENTRY.z + IR.stairS) / 2,
        ]}
        intensity={0.18}
        distance={4}
        decay={2}
        color="#ffe8c4"
      />
    </group>
  );
}
