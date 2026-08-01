"use client";

import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { PROP_1F_UB_TUB } from "@/data/dimensions";

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
    else r = halfW * (1.02 - (t - 0.9) * 0.15); // slight rim tuck
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
    const t = i / n; // 0 inner floor → 1 rim inside
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
 * 高貴典雅 + 細節優先 — sculptural oval porcelain, NS long axis,
 * champagne floor faucet on south, decorative water plane, weak warm key.
 */
export function TubDisplay() {
  const p = PROP_1F_UB_TUB;

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
        side: THREE.BackSide,
      }),
    [p.porcelainInner],
  );
  const matWater = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.water.color,
        transparent: true,
        opacity: p.water.opacity,
        roughness: 0.15,
        metalness: 0.05,
        depthWrite: false,
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

  const halfLen = p.length / 2;
  const halfW = p.width / 2;
  // Lathe radius uses half-width; scale Z for length
  const scaleZ = halfLen / halfW;

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
    };
  }, [outerGeo, innerGeo, matOut, matIn, matWater, matMetal]);

  const floorY = p.y;
  const cx = p.x;
  const cz = p.z;
  const waterY = floorY + p.rimH - p.water.insetY;
  const tubSouth = cz - halfLen;
  const faucetZ = tubSouth - p.faucet.southGap;
  const faucetX = cx;
  const colH = p.faucet.columnH;
  const spoutY = floorY + colH * 0.88;

  const lightPos: [number, number, number] = [
    cx + p.light.dx,
    floorY + p.light.dy,
    cz + p.light.dz,
  ];

  return (
    <group name={p.label}>
      {/* Outer sculptural shell — scale Z for NS length */}
      <mesh
        geometry={outerGeo}
        position={[cx, floorY, cz]}
        scale={[1, 1, scaleZ]}
        material={matOut}
        castShadow
        receiveShadow
      />
      {/* Inner basin */}
      <mesh
        geometry={innerGeo}
        position={[cx, floorY, cz]}
        scale={[1, 1, scaleZ * 0.94]}
        material={matIn}
      />
      {/* Rim bead (ellipse approx via scaled torus) */}
      <mesh
        position={[cx, floorY + p.rimH - 0.012, cz]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[1, scaleZ, 1]}
        material={matOut}
        castShadow
      >
        <torusGeometry args={[halfW * 0.96, 0.018, 10, 36]} />
      </mesh>

      {/* Decorative water plane (elliptical) */}
      <mesh
        position={[cx, waterY, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1, scaleZ * 0.88, 1]}
        material={matWater}
      >
        <circleGeometry args={[halfW * 0.78, 32]} />
      </mesh>

      {/* ── South floor-mount faucet (champagne gold) ── */}
      <group position={[faucetX, floorY, faucetZ]}>
        {/* Base rosette */}
        <mesh position={[0, 0.008, 0]} material={matMetal} castShadow>
          <cylinderGeometry args={[0.055, 0.06, 0.016, 20]} />
        </mesh>
        {/* Column */}
        <mesh position={[0, colH / 2, 0]} material={matMetal} castShadow>
          <cylinderGeometry args={[0.018, 0.022, colH, 16]} />
        </mesh>
        {/* Spout arch toward tub (+Z north into tub) */}
        <mesh
          position={[0, spoutY, p.faucet.spoutReach * 0.35]}
          rotation={[0.55, 0, 0]}
          material={matMetal}
          castShadow
        >
          <cylinderGeometry
            args={[0.012, 0.012, p.faucet.spoutReach * 1.15, 12]}
          />
        </mesh>
        {/* Spout tip */}
        <mesh
          position={[0, spoutY - 0.06, p.faucet.spoutReach * 0.85]}
          material={matMetal}
          castShadow
        >
          <sphereGeometry args={[0.016, 12, 10]} />
        </mesh>
        {/* Single lever */}
        <mesh
          position={[0.04, spoutY - 0.12, 0]}
          rotation={[0, 0, 0.4]}
          material={matMetal}
          castShadow
        >
          <boxGeometry args={[0.06, 0.012, 0.014]} />
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
