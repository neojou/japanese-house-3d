"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  BUILDING,
  COLORS,
  FLOOR_LEVELS,
  GENKAN_ENTRY,
  MATERIAL_PRESETS,
  PARKING_1F,
} from "@/data/dimensions";
import {
  createMatteBlackHandleMaterial,
  createYakiSugiMaterial,
  ensureFaçadeTextures,
} from "@/lib/houseMaterials";

/** Negative Y: hinge east, open toward parking (−Z). */
const OPEN_RAD = -THREE.MathUtils.degToRad(GENKAN_ENTRY.openAngleDeg);

/** Shallow portal depth for right cheek + soffit (does not change plan walls). */
const PORTAL_DEPTH = 0.42;
/** Cladding thickness on top of existing geometry */
const CLAD_T = 0.022;
/** Vertical bar handle */
const HANDLE_H = 1.15;
const HANDLE_W = 0.018;
const HANDLE_D = 0.032;
const HANDLE_OFF = 0.07; // inset from free (west) edge

/**
 * Parking + steps + 玄関大门 (DESIGN: flush yaki-sugi portal).
 * - 内凹三面燒杉：左（既有 jog 牆材）、右頰板、頂部 soffit
 * - 門扇與門框同燒杉、同豎紋 → 遠看「外牆即大門」
 * - 霧面消光黑一體式垂直長條把手
 * Plan wall layout unchanged.
 */
export function GenkanEntry() {
  const y0 = FLOOR_LEVELS["1f"];
  const g = GENKAN_ENTRY;
  const bayW = g.x1 - g.x0;
  const wallZ = g.z;
  const sillY = g.sill;
  const wallH = BUILDING.wallHeight;
  const halfT = BUILDING.wallThickness / 2;

  // Flush leaf: minimal frame so door reads as continuous cladding
  const frameReveal = 0.012;
  const leafW = bayW - 2 * frameReveal;
  const leafH = g.openingHeight - frameReveal * 0.5;
  const leafT = Math.max(g.leafThickness, 0.048);
  const leafZ = wallZ - halfT + leafT / 2 + 0.002;
  const hingeX = g.x1 - frameReveal;

  const [open, setOpen] = useState(false);
  const hingeRef = useRef<THREE.Group>(null);
  const angleRef = useRef(0);

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const matLeaf = useMemo(
    () => createYakiSugiMaterial(leafW, leafH),
    [leafW, leafH],
  );
  const matFrame = useMemo(
    () => createYakiSugiMaterial(bayW, wallH),
    [bayW, wallH],
  );
  const matSoffit = useMemo(
    () => createYakiSugiMaterial(bayW, PORTAL_DEPTH),
    [bayW],
  );
  const matCheek = useMemo(
    () => createYakiSugiMaterial(PORTAL_DEPTH, wallH),
    [wallH],
  );
  const matHandle = useMemo(() => createMatteBlackHandleMaterial(), []);

  useLayoutEffect(() => {
    return () => {
      for (const m of [matLeaf, matFrame, matSoffit, matCheek, matHandle]) {
        m.map?.dispose();
        m.normalMap?.dispose();
        m.roughnessMap?.dispose();
        m.dispose();
      }
    };
  }, [matLeaf, matFrame, matSoffit, matCheek, matHandle]);

  const onDoorClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setOpen((v) => !v);
  }, []);

  useFrame((_, dt) => {
    const target = open ? OPEN_RAD : 0;
    angleRef.current = THREE.MathUtils.damp(angleRef.current, target, 10, dt);
    if (hingeRef.current) {
      hingeRef.current.rotation.y = angleRef.current;
    }
  });

  const midX = (g.x0 + g.x1) / 2;
  const frameBaseY = y0 + sillY;
  const face = wallZ - halfT;
  const soffitY = frameBaseY + g.openingHeight + CLAD_T * 0.5;
  const cheekX = g.x1 - CLAD_T / 2;
  const cheekZ = face - PORTAL_DEPTH / 2;

  const doorPointer = {
    onClick: onDoorClick,
    onPointerOver: () => {
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "auto";
    },
  };

  return (
    <group name="genkan-entry">
      {/* Parking */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[
          PARKING_1F.x + PARKING_1F.width / 2,
          y0 - 0.01,
          PARKING_1F.z + PARKING_1F.depth / 2,
        ]}
        receiveShadow
      >
        <planeGeometry args={[PARKING_1F.width, PARKING_1F.depth]} />
        <meshStandardMaterial
          color={COLORS.parking}
          roughness={MATERIAL_PRESETS.parking.roughness}
          metalness={MATERIAL_PRESETS.parking.metalness}
        />
      </mesh>

      {/* Steps — dark stone, low contrast under portal */}
      {Array.from({ length: g.stepCount }, (_, i) => {
        const level = i + 1;
        const topY = g.stepHeight * level;
        const centerY = topY - g.stepHeight / 2;
        const fromDoor = g.stepCount - i;
        const centerZ = face - g.stepDepth * (fromDoor - 0.5);
        return (
          <mesh
            key={i}
            position={[midX, y0 + centerY, centerZ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[g.stepWidth, g.stepHeight, g.stepDepth]} />
            <meshStandardMaterial
              color="#4a4844"
              roughness={0.92}
              metalness={0.02}
            />
          </mesh>
        );
      })}

      {/* ── Portal: 頂燒杉 soffit ── */}
      <mesh
        position={[midX, soffitY, face - PORTAL_DEPTH / 2]}
        castShadow
        receiveShadow
        material={matSoffit}
      >
        <boxGeometry args={[bayW + CLAD_T * 2, CLAD_T, PORTAL_DEPTH]} />
      </mesh>

      {/* ── Portal: 右頰燒杉（東側；左側由 1f-jog-ldk-east 牆材負責）── */}
      <mesh
        position={[cheekX, y0 + wallH / 2, cheekZ]}
        castShadow
        receiveShadow
        material={matCheek}
      >
        <boxGeometry args={[CLAD_T, wallH, PORTAL_DEPTH]} />
      </mesh>

      {/* Flush yaki frame — same material as leaf; interactable for lock priority */}
      {/* West reveal */}
      <mesh
        position={[g.x0 + frameReveal / 2, frameBaseY + leafH / 2, leafZ]}
        castShadow
        receiveShadow
        material={matFrame}
        userData={{ interactable: "door" }}
        {...doorPointer}
      >
        <boxGeometry args={[frameReveal, leafH + frameReveal, leafT * 0.95]} />
      </mesh>
      {/* East reveal */}
      <mesh
        position={[g.x1 - frameReveal / 2, frameBaseY + leafH / 2, leafZ]}
        castShadow
        receiveShadow
        material={matFrame}
        userData={{ interactable: "door" }}
        {...doorPointer}
      >
        <boxGeometry args={[frameReveal, leafH + frameReveal, leafT * 0.95]} />
      </mesh>
      {/* Head */}
      <mesh
        position={[
          midX,
          frameBaseY + leafH + frameReveal / 2,
          leafZ,
        ]}
        castShadow
        receiveShadow
        material={matFrame}
        userData={{ interactable: "door" }}
        {...doorPointer}
      >
        <boxGeometry args={[bayW, frameReveal, leafT * 0.95]} />
      </mesh>
      {/* Threshold — nearly invisible dark strip */}
      <mesh
        position={[midX, frameBaseY + 0.008, leafZ]}
        castShadow
        receiveShadow
        material={matFrame}
        userData={{ interactable: "door" }}
        {...doorPointer}
      >
        <boxGeometry args={[leafW + frameReveal, 0.016, leafT * 1.05]} />
      </mesh>

      {/*
        Door leaf — full bay yaki-sugi, no glass light (subtraction).
        Hinge east; free edge west with matte-black vertical bar.
      */}
      <group
        ref={hingeRef}
        position={[hingeX, frameBaseY, leafZ]}
        name="genkan-door-hinge"
        userData={{ interactable: "door" }}
      >
        <mesh
          position={[-leafW / 2, leafH / 2, 0]}
          castShadow
          receiveShadow
          userData={{ interactable: "door" }}
          material={matLeaf}
          {...doorPointer}
        >
          <boxGeometry args={[leafW, leafH, leafT]} />
        </mesh>

        {/* Hairline shadow groove (closed look: almost invisible seam) */}
        <mesh
          position={[-leafW + 0.004, leafH / 2, -leafT / 2 - 0.001]}
          userData={{ interactable: "door" }}
          {...doorPointer}
        >
          <boxGeometry args={[0.004, leafH * 0.98, 0.003]} />
          <meshStandardMaterial color="#0c0c0c" roughness={0.95} metalness={0} />
        </mesh>

        {/* Exterior vertical bar handle — matte black, free edge (west) */}
        <mesh
          position={[
            -leafW + HANDLE_OFF,
            leafH * 0.48,
            -leafT / 2 - HANDLE_D / 2 - 0.002,
          ]}
          castShadow
          userData={{ interactable: "door" }}
          material={matHandle}
          {...doorPointer}
        >
          <boxGeometry args={[HANDLE_W, HANDLE_H, HANDLE_D]} />
        </mesh>
        {/* Slim standoffs */}
        <mesh
          position={[
            -leafW + HANDLE_OFF,
            leafH * 0.48 + HANDLE_H * 0.38,
            -leafT / 2 - 0.006,
          ]}
          material={matHandle}
          userData={{ interactable: "door" }}
          {...doorPointer}
        >
          <boxGeometry args={[0.012, 0.012, 0.014]} />
        </mesh>
        <mesh
          position={[
            -leafW + HANDLE_OFF,
            leafH * 0.48 - HANDLE_H * 0.38,
            -leafT / 2 - 0.006,
          ]}
          material={matHandle}
          userData={{ interactable: "door" }}
          {...doorPointer}
        >
          <boxGeometry args={[0.012, 0.012, 0.014]} />
        </mesh>

        {/* Interior pull — same bar language, slightly lower profile */}
        <mesh
          position={[
            -leafW + HANDLE_OFF,
            leafH * 0.48,
            leafT / 2 + HANDLE_D * 0.35,
          ]}
          userData={{ interactable: "door" }}
          material={matHandle}
          {...doorPointer}
        >
          <boxGeometry args={[HANDLE_W * 0.85, HANDLE_H * 0.9, HANDLE_D * 0.55]} />
        </mesh>
      </group>

      {/* West portal cheek hint at LDK corner (reinforces left of 内凹 next to door) */}
      <mesh
        position={[
          g.x0 + CLAD_T / 2,
          y0 + wallH / 2,
          face - PORTAL_DEPTH / 2,
        ]}
        castShadow
        receiveShadow
        material={matCheek}
      >
        <boxGeometry args={[CLAD_T, wallH, PORTAL_DEPTH]} />
      </mesh>
    </group>
  );
}
