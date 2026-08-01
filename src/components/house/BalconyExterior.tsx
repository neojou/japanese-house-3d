"use client";

import { useMemo } from "react";
import { BALCONY_2F, BUILDING, COLORS } from "@/data/dimensions";

/**
 * 2F NE balcony exterior finish + genkan-related lights.
 * - Slab edges (warm grey) under/around dual balcony bays
 * - West soffit plate (warm ivory) — rain canopy over genkan
 * - 3 recessed downlights under west bay
 * - Matte-black European wall sconce east of main door
 *
 * Plan walls unchanged; uses BALCONY_2F dimensions.
 */
export function BalconyExterior() {
  const b = BALCONY_2F;
  const w = b.west;
  const e = b.east;
  const slabT = b.slabT;
  const yTop = b.y;
  const yBot = yTop - slabT;
  const edgeH = 0.08;
  const edgeT = 0.04;

  const soffitMat = useMemo(
    () => ({
      color: COLORS.balconySoffit,
      roughness: 0.9,
      metalness: 0,
    }),
    [],
  );
  const edgeMat = useMemo(
    () => ({
      color: "#9a958c",
      roughness: 0.88,
      metalness: 0.02,
    }),
    [],
  );

  const westCx = (w.x0 + w.x1) / 2;
  const westCz = (w.z0 + w.z1) / 2;
  const eastCx = (e.x0 + e.x1) / 2;
  const eastCz = (e.z0 + e.z1) / 2;

  const sc = b.sconce;

  return (
    <group name="balcony-exterior">
      {/* West bay soffit underside (full west rectangle) */}
      <mesh
        position={[westCx, yBot - 0.005, westCz]}
        receiveShadow
      >
        <boxGeometry args={[w.width - 0.02, 0.012, w.depth - 0.02]} />
        <meshStandardMaterial {...soffitMat} />
      </mesh>

      {/* East bay soffit (shallower) */}
      <mesh
        position={[eastCx, yBot - 0.005, eastCz]}
        receiveShadow
      >
        <boxGeometry args={[e.width - 0.02, 0.012, e.depth - 0.02]} />
        <meshStandardMaterial {...soffitMat} />
      </mesh>

      {/* Thin fascia edges — south faces */}
      <mesh position={[westCx, yBot + edgeH / 2, w.z0 - edgeT / 2]} castShadow>
        <boxGeometry args={[w.width, edgeH, edgeT]} />
        <meshStandardMaterial {...edgeMat} />
      </mesh>
      <mesh position={[eastCx, yBot + edgeH / 2, e.z0 - edgeT / 2]} castShadow>
        <boxGeometry args={[e.width, edgeH, edgeT]} />
        <meshStandardMaterial {...edgeMat} />
      </mesh>
      {/* West free west edge (over parking / genkan west) */}
      <mesh position={[w.x0 - edgeT / 2, yBot + edgeH / 2, westCz]} castShadow>
        <boxGeometry args={[edgeT, edgeH, w.depth]} />
        <meshStandardMaterial {...edgeMat} />
      </mesh>
      {/* East free east edge */}
      <mesh position={[e.x1 + edgeT / 2, yBot + edgeH / 2, eastCz]} castShadow>
        <boxGeometry args={[edgeT, edgeH, e.depth]} />
        <meshStandardMaterial {...edgeMat} />
      </mesh>
      {/* Step fascia where west projects past east (z e.z0 → w.z0 band at x join) */}
      <mesh
        position={[
          (w.x1 + e.x0) / 2,
          yBot + edgeH / 2,
          (w.z0 + e.z0) / 2,
        ]}
        castShadow
      >
        <boxGeometry args={[edgeT * 1.2, edgeH, e.z0 - w.z0]} />
        <meshStandardMaterial {...edgeMat} />
      </mesh>

      {/* ── 3 recessed downlights under west soffit (genkan bay) ── */}
      {b.downlights.map((dl) => (
        <group key={dl.id} position={dl.position}>
          {/* Housing ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.02, 20]} />
            <meshStandardMaterial
              color="#2a2826"
              roughness={0.7}
              metalness={0.25}
            />
          </mesh>
          {/* Diffuser */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
            <cylinderGeometry args={[0.042, 0.042, 0.008, 20]} />
            <meshStandardMaterial
              color="#fff8ee"
              emissive={dl.color}
              emissiveIntensity={0.55}
              roughness={0.4}
              metalness={0}
            />
          </mesh>
          <pointLight
            intensity={dl.intensity}
            distance={dl.distance}
            decay={2}
            color={dl.color}
            castShadow={false}
          />
        </group>
      ))}

      {/* ── European wall sconce east of genkan door ── */}
      <group name="genkan-sconce" position={[sc.x, sc.y, sc.z]}>
        {/* Backplate */}
        <mesh position={[0, 0, 0.01]} castShadow>
          <boxGeometry args={[0.12, 0.22, 0.02]} />
          <meshStandardMaterial
            color={sc.colorMetal}
            roughness={0.65}
            metalness={0.4}
          />
        </mesh>
        {/* Arm */}
        <mesh position={[0, -0.02, -0.06]} rotation={[0.35, 0, 0]} castShadow>
          <boxGeometry args={[0.02, 0.02, 0.12]} />
          <meshStandardMaterial
            color={sc.colorMetal}
            roughness={0.65}
            metalness={0.4}
          />
        </mesh>
        {/* Lantern cage */}
        <mesh position={[0, -0.08, -0.12]} castShadow>
          <boxGeometry args={[0.1, 0.16, 0.1]} />
          <meshStandardMaterial
            color={sc.colorMetal}
            roughness={0.6}
            metalness={0.35}
            transparent
            opacity={0.92}
          />
        </mesh>
        {/* Warm glass / glow */}
        <mesh position={[0, -0.08, -0.12]}>
          <boxGeometry args={[0.08, 0.13, 0.08]} />
          <meshStandardMaterial
            color={sc.colorGlass}
            emissive={sc.colorGlass}
            emissiveIntensity={0.7}
            roughness={0.35}
            metalness={0}
            transparent
            opacity={0.85}
          />
        </mesh>
        {/* Cap */}
        <mesh position={[0, 0.02, -0.12]} castShadow>
          <boxGeometry args={[0.12, 0.03, 0.12]} />
          <meshStandardMaterial
            color={sc.colorMetal}
            roughness={0.6}
            metalness={0.4}
          />
        </mesh>
        <pointLight
          position={[0, -0.08, -0.14]}
          intensity={sc.intensity}
          distance={sc.distance}
          decay={2}
          color={sc.colorGlass}
        />
      </group>

      {/* Unused BUILDING ref guard for thickness context */}
      <group userData={{ wallT: BUILDING.wallThickness, outdoor: COLORS.floorOutdoor }} />
    </group>
  );
}
