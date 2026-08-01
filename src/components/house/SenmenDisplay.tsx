"use client";

import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { PROP_1F_SENMEN } from "@/data/dimensions";
import {
  createInteriorWoodMaterial,
  ensureFaçadeTextures,
} from "@/lib/houseMaterials";

/**
 * 1F 洗面 north wall — tokonoma-card vignette:
 * west laundry basket, center warm-wood vanity + vertical mirror, east front-load washer.
 */
export function SenmenDisplay() {
  const p = PROP_1F_SENMEN;
  const v = p.vanity;
  const w = p.washer;
  const b = p.basket;
  const m = p.mirror;

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const matWood = useMemo(
    () => createInteriorWoodMaterial(v.w, v.h),
    [v.w, v.h],
  );
  const matStone = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: v.stone,
        roughness: 0.4,
        metalness: 0.05,
        envMapIntensity: 0.3,
      }),
    [v.stone],
  );
  const matMetal = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#4a4642",
        roughness: 0.4,
        metalness: 0.55,
      }),
    [],
  );
  const matBasin = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f5f2ec",
        roughness: 0.28,
        metalness: 0.06,
      }),
    [],
  );
  const matWasher = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: w.body,
        roughness: 0.38,
        metalness: 0.12,
        envMapIntensity: 0.35,
      }),
    [w.body],
  );
  const matWasherDoor = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: w.door,
        roughness: 0.32,
        metalness: 0.2,
      }),
    [w.door],
  );
  const matGlass = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: w.glass,
        transparent: true,
        opacity: 0.45,
        roughness: 0.15,
        metalness: 0.1,
        depthWrite: false,
      }),
    [w.glass],
  );
  const matMirror = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c8d0d8",
        roughness: 0.08,
        metalness: 0.85,
        envMapIntensity: 0.9,
      }),
    [],
  );
  const matFrame = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3a3632",
        roughness: 0.5,
        metalness: 0.35,
      }),
    [],
  );
  const matRattan = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: b.rattan,
        roughness: 0.82,
        metalness: 0.04,
      }),
    [b.rattan],
  );
  const matCloth = useMemo(
    () => [
      new THREE.MeshStandardMaterial({
        color: "#6a8aaa",
        roughness: 0.9,
      }),
      new THREE.MeshStandardMaterial({
        color: "#c47868",
        roughness: 0.9,
      }),
      new THREE.MeshStandardMaterial({
        color: "#e8e0d0",
        roughness: 0.88,
      }),
    ],
    [],
  );

  useLayoutEffect(() => {
    return () => {
      matWood.map?.dispose();
      matWood.normalMap?.dispose();
      matWood.dispose();
      for (const mat of [
        matStone,
        matMetal,
        matBasin,
        matWasher,
        matWasherDoor,
        matGlass,
        matMirror,
        matFrame,
        matRattan,
        ...matCloth,
      ]) {
        mat.dispose();
      }
    };
  }, [
    matWood,
    matStone,
    matMetal,
    matBasin,
    matWasher,
    matWasherDoor,
    matGlass,
    matMirror,
    matFrame,
    matRattan,
    matCloth,
  ]);

  const y0 = p.y;
  const faceZ = p.wallFaceZ;
  // Equipment south of north wall (into room −Z)
  const vanityZ = faceZ - p.standoff - v.d / 2;
  const washerZ = faceZ - p.standoff - w.d / 2;
  const basketZ = faceZ - p.standoff - b.d / 2 - 0.02;

  const vanityTopY = y0 + v.h;
  const mirrorBottomY = vanityTopY + m.gapAboveVanity;
  const mirrorY = mirrorBottomY + m.h / 2;
  const mirrorZ = faceZ - p.standoff - 0.02;

  const lightPos: [number, number, number] = [
    v.x,
    mirrorBottomY + m.h + 0.08,
    vanityZ - 0.15,
  ];

  return (
    <group name={p.label}>
      {/* ── West: rattan basket + laundry ── */}
      <group position={[b.x, y0, basketZ]}>
        {/* Basket outer */}
        <mesh
          position={[0, b.h / 2, 0]}
          material={matRattan}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[b.w, b.h, b.d]} />
        </mesh>
        {/* Inner hollow lip */}
        <mesh position={[0, b.h - 0.02, 0]} material={matRattan}>
          <boxGeometry args={[b.w * 0.88, 0.04, b.d * 0.88]} />
        </mesh>
        {/* Weave-ish vertical ribs */}
        {[-0.35, -0.12, 0.12, 0.35].map((t, i) => (
          <mesh
            key={`rib-${i}`}
            position={[t * b.w, b.h / 2, b.d / 2 + 0.004]}
            material={matRattan}
          >
            <boxGeometry args={[0.012, b.h * 0.9, 0.008]} />
          </mesh>
        ))}
        {/* Laundry pieces */}
        <mesh
          position={[-0.05, b.h * 0.55, 0.02]}
          rotation={[0.3, 0.2, 0.15]}
          material={matCloth[0]}
          castShadow
        >
          <boxGeometry args={[0.22, 0.06, 0.18]} />
        </mesh>
        <mesh
          position={[0.08, b.h * 0.72, -0.02]}
          rotation={[-0.2, -0.3, 0.1]}
          material={matCloth[1]}
          castShadow
        >
          <boxGeometry args={[0.18, 0.05, 0.2]} />
        </mesh>
        <mesh
          position={[0.02, b.h * 0.88, 0.04]}
          rotation={[0.1, 0.4, -0.2]}
          material={matCloth[2]}
          castShadow
        >
          <boxGeometry args={[0.2, 0.04, 0.16]} />
        </mesh>
      </group>

      {/* ── Center: vanity ── */}
      <group position={[v.x, y0, vanityZ]}>
        <mesh
          position={[0, v.h / 2, 0]}
          material={matWood}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[v.w, v.h, v.d]} />
        </mesh>
        {/* Door panels */}
        {[-1, 1].map((side) => (
          <mesh
            key={`vd-${side}`}
            position={[side * v.w * 0.22, v.h * 0.42, v.d / 2 + 0.006]}
            material={matWood}
            castShadow
          >
            <boxGeometry args={[v.w * 0.38, v.h * 0.7, 0.014]} />
          </mesh>
        ))}
        <mesh
          position={[-v.w * 0.12, v.h * 0.45, v.d / 2 + 0.016]}
          material={matMetal}
        >
          <boxGeometry args={[0.012, 0.1, 0.01]} />
        </mesh>
        <mesh
          position={[v.w * 0.32, v.h * 0.45, v.d / 2 + 0.016]}
          material={matMetal}
        >
          <boxGeometry args={[0.012, 0.1, 0.01]} />
        </mesh>
        {/* Stone top */}
        <mesh
          position={[0, v.h + 0.015, 0]}
          material={matStone}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[v.w + 0.04, 0.03, v.d + 0.02]} />
        </mesh>
        {/* Basin */}
        <mesh
          position={[0, v.h + 0.02, 0.02]}
          material={matBasin}
          castShadow
        >
          <boxGeometry args={[0.52, 0.1, 0.34]} />
        </mesh>
        <mesh
          position={[0, v.h + 0.01, 0.02]}
          material={matBasin}
        >
          <boxGeometry args={[0.42, 0.08, 0.26]} />
        </mesh>
        {/* Faucet */}
        <mesh
          position={[0, v.h + 0.14, -v.d * 0.28]}
          material={matMetal}
          castShadow
        >
          <cylinderGeometry args={[0.012, 0.014, 0.18, 12]} />
        </mesh>
        <mesh
          position={[0, v.h + 0.2, -v.d * 0.12]}
          rotation={[Math.PI / 2.4, 0, 0]}
          material={matMetal}
          castShadow
        >
          <cylinderGeometry args={[0.009, 0.009, 0.14, 10]} />
        </mesh>
      </group>

      {/* Vertical mirror + frame on north wall */}
      <mesh position={[v.x, mirrorY, mirrorZ]} material={matFrame} castShadow>
        <boxGeometry
          args={[m.w + m.frame * 2, m.h + m.frame * 2, m.t + 0.01]}
        />
      </mesh>
      <mesh
        position={[v.x, mirrorY, mirrorZ - 0.008]}
        material={matMirror}
        castShadow
      >
        <boxGeometry args={[m.w, m.h, m.t]} />
      </mesh>

      {/* ── East: front-load washer ── */}
      <group position={[w.x, y0, washerZ]}>
        <mesh
          position={[0, w.h / 2, 0]}
          material={matWasher}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[w.w, w.h, w.d]} />
        </mesh>
        {/* Soft corner top panel */}
        <mesh
          position={[0, w.h - 0.04, 0]}
          material={matWasherDoor}
          castShadow
        >
          <boxGeometry args={[w.w * 0.96, 0.08, w.d * 0.96]} />
        </mesh>
        {/* Control row */}
        <mesh
          position={[0, w.h - 0.06, w.d / 2 + 0.005]}
          material={matMetal}
        >
          <boxGeometry args={[w.w * 0.7, 0.04, 0.02]} />
        </mesh>
        <mesh
          position={[w.w * 0.22, w.h - 0.06, w.d / 2 + 0.02]}
          material={matMetal}
          castShadow
        >
          <cylinderGeometry args={[0.028, 0.028, 0.03, 16]} />
        </mesh>
        {/* Front door ring + glass */}
        <mesh
          position={[0, w.h * 0.42, w.d / 2 + 0.01]}
          rotation={[Math.PI / 2, 0, 0]}
          material={matWasherDoor}
          castShadow
        >
          <torusGeometry args={[0.2, 0.035, 10, 28]} />
        </mesh>
        <mesh
          position={[0, w.h * 0.42, w.d / 2 + 0.02]}
          material={matGlass}
        >
          <circleGeometry args={[0.18, 28]} />
        </mesh>
        {/* Handle */}
        <mesh
          position={[w.w * 0.28, w.h * 0.42, w.d / 2 + 0.04]}
          material={matMetal}
          castShadow
        >
          <boxGeometry args={[0.08, 0.02, 0.025]} />
        </mesh>
        {/* Feet */}
        {[
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ].map(([sx, sz], i) => (
          <mesh
            key={`ft-${i}`}
            position={[sx * w.w * 0.35, 0.02, sz * w.d * 0.35]}
            material={matMetal}
          >
            <cylinderGeometry args={[0.02, 0.022, 0.04, 8]} />
          </mesh>
        ))}
      </group>

      {/* Mirror-top weak warm light */}
      <pointLight
        position={lightPos}
        intensity={p.light.intensity}
        distance={p.light.distance}
        decay={2}
        color={p.light.color}
        castShadow={false}
      />
    </group>
  );
}
