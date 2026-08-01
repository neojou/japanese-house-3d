"use client";

import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { BUILDING, PROP_1F_TOILET, TOILET_1F } from "@/data/dimensions";
import {
  createInteriorWoodMaterial,
  ensureFaçadeTextures,
} from "@/lib/houseMaterials";

/** Soft boutique bowl profile (lathe around Y): wide rim → narrow trap. */
function makeBowlLathe(height: number, rimR: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n; // 0 rim top → 1 bottom
    const y = height * (1 - t);
    let r: number;
    if (t < 0.08) r = rimR;
    else if (t < 0.25) r = rimR * (0.92 - (t - 0.08) * 0.5);
    else if (t < 0.55) r = rimR * (0.78 - (t - 0.25) * 0.9);
    else if (t < 0.85) r = rimR * (0.45 - (t - 0.55) * 0.55);
    else r = rimR * 0.22;
    pts.push(new THREE.Vector2(Math.max(r, 0.035), y));
  }
  return new THREE.LatheGeometry(pts, 28);
}

/** Inner water / cavity (smaller lathe). */
function makeInnerBowl(height: number, rimR: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = height * 0.92 * (1 - t) + height * 0.04;
    const r = rimR * (0.72 - t * 0.45);
    pts.push(new THREE.Vector2(Math.max(r, 0.04), y));
  }
  return new THREE.LatheGeometry(pts, 20);
}

/**
 * 1F toilet — tokonoma-card wet fixture (DESIGN.md §2.7):
 * 高貴典雅 + 細節優先 · boutique rounded porcelain.
 * Placement locked: west half, face +X (tank west, bowl east).
 * Thin wood endscape behind tank; lid ajar ~12°; single flush button; weak key.
 */
export function ToiletDisplay() {
  const p = PROP_1F_TOILET;
  const halfT = BUILDING.wallThickness / 2;

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const matPorcelain = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.porcelain,
        roughness: 0.28,
        metalness: 0.06,
        envMapIntensity: 0.55,
      }),
    [p.porcelain],
  );
  const matInner = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.porcelainInner,
        roughness: 0.45,
        metalness: 0.02,
      }),
    [p.porcelainInner],
  );
  const matButton = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.button,
        roughness: 0.4,
        metalness: 0.35,
      }),
    [p.button],
  );
  const matWood = useMemo(
    () => createInteriorWoodMaterial(p.board.width, p.board.height),
    [p.board.width, p.board.height],
  );

  const bowlGeo = useMemo(
    () => makeBowlLathe(p.bowl.seatH * 0.72, p.bowl.rimR),
    [p.bowl.seatH, p.bowl.rimR],
  );
  const innerGeo = useMemo(
    () => makeInnerBowl(p.bowl.seatH * 0.55, p.bowl.rimR * 0.88),
    [p.bowl.seatH, p.bowl.rimR],
  );

  useLayoutEffect(() => {
    return () => {
      bowlGeo.dispose();
      innerGeo.dispose();
      matPorcelain.dispose();
      matInner.dispose();
      matButton.dispose();
      matWood.map?.dispose();
      matWood.normalMap?.dispose();
      matWood.dispose();
    };
  }, [bowlGeo, innerGeo, matPorcelain, matInner, matButton, matWood]);

  const floorY = p.y;
  const ax = p.x;
  const az = p.z;

  // Local layout along +X (east): tank west of anchor, bowl east
  const tankD = p.tank.d;
  const tankW = p.tank.w;
  const tankH = p.tank.h;
  const tankTop = floorY + p.tank.topY;
  const tankCenterY = tankTop - tankH / 2;
  // Tank sits toward west wall
  const tankLocalX = -p.depth * 0.28;
  const bowlLocalX = tankLocalX + tankD * 0.55 + p.bowl.length * 0.38;
  const seatY = floorY + p.bowl.seatH;
  const baseY = floorY + 0.06;

  // West wall interior face (toilet room is east of wall @ x0)
  const wallFaceX = TOILET_1F.x0 + halfT;
  const boardX = wallFaceX + p.board.standoff + p.board.thickness / 2;
  const boardY = floorY + p.board.height * 0.48;

  const lightPos: [number, number, number] = [
    ax + p.light.dx,
    floorY + p.light.dy,
    az + p.light.dz,
  ];

  // Soft rounded tank: core + soft chamfer slabs
  const tankX = ax + tankLocalX;
  const bowlX = ax + bowlLocalX;

  return (
    <group name={p.label}>
      {/* Wood endscape behind tank (west wall) */}
      <mesh
        position={[boardX, boardY, az]}
        castShadow
        receiveShadow
        material={matWood}
      >
        <boxGeometry
          args={[p.board.thickness, p.board.height, p.board.width]}
        />
      </mesh>
      <mesh position={[boardX + p.board.thickness * 0.55, boardY, az]}>
        <boxGeometry
          args={[0.005, p.board.height + 0.02, p.board.width + 0.02]}
        />
        <meshStandardMaterial color="#1e1c1a" roughness={0.92} />
      </mesh>

      {/* ── Tank (boutique rounded) ── */}
      <group position={[tankX, 0, az]}>
        <mesh
          position={[0, tankCenterY, 0]}
          material={matPorcelain}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[tankD * 0.92, tankH * 0.92, tankW * 0.88]} />
        </mesh>
        {/* Soft vertical rounds (side caps) */}
        <mesh
          position={[0, tankCenterY, tankW * 0.38]}
          material={matPorcelain}
          castShadow
        >
          <cylinderGeometry
            args={[tankD * 0.42, tankD * 0.42, tankH * 0.9, 16]}
          />
        </mesh>
        <mesh
          position={[0, tankCenterY, -tankW * 0.38]}
          material={matPorcelain}
          castShadow
        >
          <cylinderGeometry
            args={[tankD * 0.42, tankD * 0.42, tankH * 0.9, 16]}
          />
        </mesh>
        {/* Top lid slab (slightly larger, soft) */}
        <mesh
          position={[0, tankTop - 0.012, 0]}
          material={matPorcelain}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[tankD * 1.02, 0.028, tankW * 0.98]} />
        </mesh>
        <mesh
          position={[0, tankTop - 0.012, tankW * 0.4]}
          material={matPorcelain}
        >
          <cylinderGeometry args={[tankD * 0.45, tankD * 0.45, 0.028, 16]} />
        </mesh>
        <mesh
          position={[0, tankTop - 0.012, -tankW * 0.4]}
          material={matPorcelain}
        >
          <cylinderGeometry args={[tankD * 0.45, tankD * 0.45, 0.028, 16]} />
        </mesh>
        {/* Single flush button */}
        <mesh
          position={[tankD * 0.15, tankTop + 0.006, 0]}
          rotation={[0, 0, Math.PI / 2]}
          material={matButton}
          castShadow
        >
          <cylinderGeometry args={[0.018, 0.02, 0.01, 16]} />
        </mesh>
        {/* Tank–bowl neck */}
        <mesh
          position={[tankD * 0.55, seatY - 0.08, 0]}
          material={matPorcelain}
          castShadow
        >
          <boxGeometry args={[0.08, 0.1, 0.14]} />
        </mesh>
      </group>

      {/* ── Base skirt (sculptural) ── */}
      <mesh
        position={[bowlX - 0.04, baseY, az]}
        material={matPorcelain}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[p.bowl.length * 0.75, 0.1, p.width * 0.72]} />
      </mesh>
      <mesh
        position={[bowlX + 0.02, baseY - 0.01, az]}
        material={matPorcelain}
        castShadow
      >
        <cylinderGeometry
          args={[p.bowl.rimR * 0.95, p.bowl.rimR * 1.05, 0.12, 24]}
        />
      </mesh>

      {/* ── Bowl lathe ── */}
      <mesh
        geometry={bowlGeo}
        position={[bowlX, floorY + 0.08, az]}
        material={matPorcelain}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={innerGeo}
        position={[bowlX, floorY + 0.1, az]}
        material={matInner}
      />

      {/* Seat ring (torus flattened) */}
      <mesh
        position={[bowlX, seatY - 0.01, az]}
        rotation={[Math.PI / 2, 0, 0]}
        material={matPorcelain}
        castShadow
      >
        <torusGeometry args={[p.bowl.rimR * 0.82, 0.022, 10, 28]} />
      </mesh>
      {/* Seat pad front */}
      <mesh
        position={[bowlX + 0.02, seatY - 0.005, az]}
        material={matPorcelain}
        castShadow
      >
        <boxGeometry args={[p.bowl.length * 0.35, 0.018, p.width * 0.55]} />
      </mesh>

      {/* Lid — hinged at tank side, ajar ~12° (open toward +X / east) */}
      <group
        position={[bowlX - p.bowl.length * 0.28, seatY + 0.01, az]}
        rotation={[0, 0, -p.lidOpenRad]}
      >
        <mesh
          position={[p.bowl.length * 0.28, 0.012, 0]}
          material={matPorcelain}
          castShadow
        >
          <boxGeometry args={[p.bowl.length * 0.72, 0.022, p.width * 0.62]} />
        </mesh>
        <mesh
          position={[p.bowl.length * 0.48, 0.012, 0]}
          material={matPorcelain}
          castShadow
        >
          <cylinderGeometry
            args={[p.bowl.rimR * 0.55, p.bowl.rimR * 0.55, 0.022, 20]}
          />
        </mesh>
      </group>

      {/* Weak warm key — porcelain glaze only */}
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
