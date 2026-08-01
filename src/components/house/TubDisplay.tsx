"use client";

import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { INTERIOR_FLOOR_Y, PROP_1F_UB_BATHMAT, PROP_1F_UB_TUB } from "@/data/dimensions";
import {
  createWoolMatMaterial,
  ensureFaçadeTextures,
} from "@/lib/houseMaterials";

/**
 * Horizontal oval freestanding tub shell (lathe around Y, then scale X/Z).
 * Profile: wide base flare → waist → outer rim.
 */
function makeTubOuterLathe(rimH: number, halfW: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const t = i / n; // 0 floor → 1 rim
    const y = rimH * t;
    let r: number;
    if (t < 0.12) r = halfW * (0.55 + t * 1.2);
    else if (t < 0.45) r = halfW * (0.72 + (t - 0.12) * 0.35);
    else if (t < 0.75) r = halfW * (0.88 + (t - 0.45) * 0.25);
    else if (t < 0.9) r = halfW * (0.98 + (t - 0.75) * 0.15);
    else r = halfW * (1.02 - (t - 0.9) * 0.15);
    pts.push(new THREE.Vector2(Math.max(r, 0.08), y));
  }
  return new THREE.LatheGeometry(pts, 36);
}

function makeTubInnerLathe(
  rimH: number,
  basinDepth: number,
  halfW: number,
): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 14;
  const floorY = rimH - basinDepth;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = floorY + basinDepth * t;
    let r: number;
    if (t < 0.15) r = halfW * 0.42;
    else if (t < 0.7) r = halfW * (0.42 + (t - 0.15) * 0.7);
    else r = halfW * (0.82 + (t - 0.7) * 0.35);
    pts.push(new THREE.Vector2(Math.max(r, 0.06), y));
  }
  return new THREE.LatheGeometry(pts, 28);
}

/**
 * UB east freestanding tub — tokonoma-card wet fixture (DESIGN.md §2.7):
 * solid basin floor + denser water (no see-through), full champagne faucet.
 */
export function TubDisplay() {
  const p = PROP_1F_UB_TUB;
  const mat = PROP_1F_UB_BATHMAT;

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const matOut = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.porcelain,
        roughness: 0.26,
        metalness: 0.05,
        envMapIntensity: 0.55,
      }),
    [p.porcelain],
  );
  const matIn = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.porcelainInner,
        roughness: 0.38,
        metalness: 0.03,
        side: THREE.DoubleSide,
      }),
    [p.porcelainInner],
  );
  const matWater = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.water.color,
        transparent: true,
        opacity: p.water.opacity,
        roughness: 0.12,
        metalness: 0.08,
        depthWrite: true,
      }),
    [p.water.color, p.water.opacity],
  );
  const matMetal = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.metal,
        roughness: 0.32,
        metalness: p.metalness,
        envMapIntensity: 0.7,
      }),
    [p.metal, p.metalness],
  );
  const matWool = useMemo(
    () => createWoolMatMaterial(mat.width, mat.depth, 0.12),
    [mat.width, mat.depth],
  );

  const halfLen = p.length / 2;
  const halfW = p.width / 2;
  const scaleZ = halfLen / halfW;
  const basinFloorLocalY = p.rimH - p.basinDepth;

  const outerGeo = useMemo(
    () => makeTubOuterLathe(p.rimH, halfW),
    [p.rimH, halfW],
  );
  const innerGeo = useMemo(
    () => makeTubInnerLathe(p.rimH, p.basinDepth, halfW * 0.92),
    [p.rimH, p.basinDepth, halfW],
  );

  useLayoutEffect(() => {
    return () => {
      outerGeo.dispose();
      innerGeo.dispose();
      matOut.dispose();
      matIn.dispose();
      matWater.dispose();
      matMetal.dispose();
      matWool.normalMap?.dispose();
      matWool.dispose();
    };
  }, [outerGeo, innerGeo, matOut, matIn, matWater, matMetal, matWool]);

  const floorY = p.y;
  const cx = p.x;
  const cz = p.z;
  // Bath mat west of tub long side
  const matX = cx - halfW - mat.gap - mat.width / 2;
  const matY = INTERIOR_FLOOR_Y + mat.thickness / 2 + 0.002;
  const matZ = cz;
  const waterY = floorY + p.rimH - p.water.insetY;
  const bottomY = floorY + basinFloorLocalY + 0.012;
  const tubSouth = cz - halfLen;
  const faucetZ = tubSouth - p.faucet.southGap;
  const faucetX = cx;
  const colH = p.faucet.columnH;
  const armY = floorY + colH * 0.9;
  const reach = p.faucet.spoutReach;
  const drop = p.faucet.spoutDrop;

  const lightPos: [number, number, number] = [
    cx + p.light.dx,
    floorY + p.light.dy,
    cz + p.light.dz,
  ];

  return (
    <group name={p.label}>
      {/* Outer sculptural shell */}
      <mesh
        geometry={outerGeo}
        position={[cx, floorY, cz]}
        scale={[1, 1, scaleZ]}
        material={matOut}
        castShadow
        receiveShadow
      />
      {/* Inner basin walls */}
      <mesh
        geometry={innerGeo}
        position={[cx, floorY, cz]}
        scale={[1, 1, scaleZ * 0.94]}
        material={matIn}
      />
      {/* Solid basin floor — blocks see-through to room floor */}
      <mesh
        position={[cx, bottomY, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1, scaleZ * 0.9, 1]}
        material={matIn}
        receiveShadow
      >
        <circleGeometry args={[halfW * 0.78, 32]} />
      </mesh>
      {/* Rim bead */}
      <mesh
        position={[cx, floorY + p.rimH - 0.012, cz]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[1, scaleZ, 1]}
        material={matOut}
        castShadow
      >
        <torusGeometry args={[halfW * 0.96, 0.018, 10, 36]} />
      </mesh>

      {/* Water surface — denser so floor does not read through */}
      <mesh
        position={[cx, waterY, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1, scaleZ * 0.88, 1]}
        material={matWater}
      >
        <circleGeometry args={[halfW * 0.76, 32]} />
      </mesh>

      {/* White wool bath mat — west of tub (tokonoma-card accessory) */}
      <mesh
        position={[matX, matY, matZ]}
        material={matWool}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[mat.width, mat.thickness, mat.depth]} />
      </mesh>
      {/* Soft rounded look: thin edge roll */}
      <mesh
        position={[matX, matY + mat.thickness * 0.15, matZ]}
        material={matWool}
      >
        <boxGeometry
          args={[mat.width * 0.96, mat.thickness * 0.5, mat.depth * 0.96]}
        />
      </mesh>

      {/* ── South floor-mount faucet (complete champagne assembly) ── */}
      <group position={[faucetX, floorY, faucetZ]}>
        {/* Stepped base */}
        <mesh position={[0, 0.006, 0]} material={matMetal} castShadow>
          <cylinderGeometry args={[0.07, 0.075, 0.012, 24]} />
        </mesh>
        <mesh position={[0, 0.018, 0]} material={matMetal} castShadow>
          <cylinderGeometry args={[0.048, 0.052, 0.014, 20]} />
        </mesh>
        {/* Column */}
        <mesh
          position={[0, 0.025 + (colH - 0.05) / 2, 0]}
          material={matMetal}
          castShadow
        >
          <cylinderGeometry args={[0.017, 0.02, colH - 0.05, 16]} />
        </mesh>
        {/* Column top hub */}
        <mesh position={[0, armY, 0]} material={matMetal} castShadow>
          <sphereGeometry args={[0.028, 14, 12]} />
        </mesh>
        {/* Horizontal spout arm toward tub (+Z) */}
        <mesh
          position={[0, armY, reach * 0.42]}
          rotation={[Math.PI / 2, 0, 0]}
          material={matMetal}
          castShadow
        >
          <cylinderGeometry args={[0.011, 0.011, reach * 0.85, 12]} />
        </mesh>
        {/* Elbow */}
        <mesh
          position={[0, armY, reach * 0.82]}
          material={matMetal}
          castShadow
        >
          <sphereGeometry args={[0.014, 12, 10]} />
        </mesh>
        {/* Down spout */}
        <mesh
          position={[0, armY - drop * 0.5, reach * 0.82]}
          material={matMetal}
          castShadow
        >
          <cylinderGeometry args={[0.01, 0.012, drop, 12]} />
        </mesh>
        {/* Outlet tip */}
        <mesh
          position={[0, armY - drop, reach * 0.82]}
          material={matMetal}
          castShadow
        >
          <cylinderGeometry args={[0.014, 0.011, 0.02, 12]} />
        </mesh>
        {/* Single lever (side) */}
        <mesh
          position={[0.045, armY - 0.02, 0.01]}
          rotation={[0, 0, -0.5]}
          material={matMetal}
          castShadow
        >
          <boxGeometry args={[0.07, 0.012, 0.016]} />
        </mesh>
        <mesh
          position={[0.078, armY - 0.035, 0.01]}
          material={matMetal}
          castShadow
        >
          <sphereGeometry args={[0.012, 10, 8]} />
        </mesh>
      </group>

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
