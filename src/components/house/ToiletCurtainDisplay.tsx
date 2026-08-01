"use client";

import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import {
  INTERIOR_FLOOR_Y,
  PROP_1F_TOILET_CURTAIN,
} from "@/data/dimensions";
import {
  createToiletCurtainMaterials,
  ensureFaçadeTextures,
} from "@/lib/houseMaterials";

/**
 * 1F toilet south-passage café curtains — tokonoma-card:
 * upper third pink fabric; enter-view left brown chihuahua, right black Pomeranian;
 * slim rod + rings. Lower 2/3 clear.
 */
export function ToiletCurtainDisplay() {
  const c = PROP_1F_TOILET_CURTAIN;

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const mats = useMemo(() => createToiletCurtainMaterials(), []);

  useLayoutEffect(() => {
    return () => {
      for (const m of [mats.left, mats.right]) {
        m.normalMap?.dispose();
        m.dispose();
      }
    };
  }, [mats]);

  const curtainH = c.openingH * c.heightFrac;
  const panelW = (c.passW - c.panelGap) / 2;
  const sillY = INTERIOR_FLOOR_Y;
  const topY = sillY + c.openingH - 0.04;
  const midY = topY - curtainH / 2;
  const z = c.z + c.thickness + 0.01;
  const midX = c.x;
  const leftX = midX - panelW / 2 - c.panelGap / 2;
  const rightX = midX + panelW / 2 + c.panelGap / 2;
  const rodY = topY + 0.012;
  const rodLen = c.passW + 0.06;

  const matRod = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: c.rod.color,
        roughness: 0.4,
        metalness: 0.55,
      }),
    [c.rod.color],
  );

  useLayoutEffect(() => {
    return () => {
      matRod.dispose();
    };
  }, [matRod]);

  const ringXs = [
    leftX - panelW * 0.28,
    leftX,
    leftX + panelW * 0.28,
    rightX - panelW * 0.28,
    rightX,
    rightX + panelW * 0.28,
  ];

  return (
    <group name={c.label}>
      {/* Rod */}
      <mesh
        position={[midX, rodY, z]}
        rotation={[0, 0, Math.PI / 2]}
        material={matRod}
        castShadow
      >
        <cylinderGeometry args={[c.rod.radius, c.rod.radius, rodLen, 12]} />
      </mesh>
      {/* End caps */}
      <mesh position={[midX - rodLen / 2, rodY, z]} material={matRod}>
        <sphereGeometry args={[c.rod.radius * 1.6, 10, 8]} />
      </mesh>
      <mesh position={[midX + rodLen / 2, rodY, z]} material={matRod}>
        <sphereGeometry args={[c.rod.radius * 1.6, 10, 8]} />
      </mesh>
      {/* Rings */}
      {ringXs.map((rx, i) => (
        <mesh
          key={`ring-${i}`}
          position={[rx, rodY - 0.012, z]}
          rotation={[Math.PI / 2, 0, 0]}
          material={matRod}
        >
          <torusGeometry args={[0.012, 0.003, 6, 12]} />
        </mesh>
      ))}

      {/* Left panel — chihuahua (west when entering from south) */}
      <mesh
        position={[leftX, midY, z]}
        material={mats.left}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[panelW, curtainH, c.thickness]} />
      </mesh>
      {/* Right panel — Pomeranian (east) */}
      <mesh
        position={[rightX, midY, z]}
        material={mats.right}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[panelW, curtainH, c.thickness]} />
      </mesh>
    </group>
  );
}
