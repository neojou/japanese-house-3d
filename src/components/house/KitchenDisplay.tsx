
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { PROP_1F_LDK_KITCHEN } from "@/data/dimensions";
import {
  createInteriorWoodMaterial,
  ensureFaçadeTextures,
} from "@/lib/houseMaterials";

/**
 * 1F LDK west open kitchen — tokonoma-card vignette:
 * NS island with sink facing living; west fridge (south) + tall cab + uppers;
 * warm wood + light stone; bar overhang; weak island key light.
 */
export function KitchenDisplay() {
  const k = PROP_1F_LDK_KITCHEN;
  const isl = k.island;
  const fr = k.fridge;
  const tall = k.tallCab;
  const up = k.upper;

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const matWood = useMemo(
    () => createInteriorWoodMaterial(isl.length, isl.height),
    [isl.length, isl.height],
  );
  const matWoodFine = useMemo(
    () => createInteriorWoodMaterial(0.6, 2.0),
    [],
  );
  const matStone = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isl.stone,
        roughness: 0.42,
        metalness: 0.06,
        envMapIntensity: 0.35,
      }),
    [isl.stone],
  );
  const matSink = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c8cdd2",
        roughness: 0.35,
        metalness: 0.45,
      }),
    [],
  );
  const matMetal = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isl.handle,
        roughness: 0.4,
        metalness: 0.55,
      }),
    [isl.handle],
  );
  const matFridge = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: fr.door,
        roughness: 0.35,
        metalness: 0.15,
        envMapIntensity: 0.4,
      }),
    [fr.door],
  );
  const matFridgeBody = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: fr.body,
        roughness: 0.45,
        metalness: 0.08,
      }),
    [fr.body],
  );

  useLayoutEffect(() => {
    return () => {
      matWood.map?.dispose();
      matWood.normalMap?.dispose();
      matWood.dispose();
      matWoodFine.map?.dispose();
      matWoodFine.normalMap?.dispose();
      matWoodFine.dispose();
      matStone.dispose();
      matSink.dispose();
      matMetal.dispose();
      matFridge.dispose();
      matFridgeBody.dispose();
    };
  }, [
    matWood,
    matWoodFine,
    matStone,
    matSink,
    matMetal,
    matFridge,
    matFridgeBody,
  ]);

  const y0 = k.y;
  const ix = isl.x;
  const iz = isl.z;
  const iLen = isl.length;
  const iDep = isl.depth;
  const iH = isl.height;
  const topT = isl.topT;
  const bar = isl.barOverhang;

  // Island body center
  const bodyY = y0 + iH / 2;
  const topY = y0 + iH + topT / 2;
  // Top plate extends east for bar
  const topDepth = iDep + bar;
  const topX = ix + bar / 2;

  // Sink on island top, slightly east of center
  const sinkX = ix + 0.02;
  const sinkZ = iz - 0.15;
  const sinkY = y0 + iH + topT + 0.005;

  // Fridge
  const fridgeX = fr.x;
  const fridgeZ = fr.z;
  const fridgeY = y0 + fr.h / 2;

  // Tall cab immediately north of fridge
  const tallX = 0.04 + tall.d / 2;
  const tallZ = fridgeZ + fr.w / 2 + 0.04 + tall.w / 2;
  const tallY = y0 + tall.h / 2;

  // Upper run along west wall
  const upperLen = up.z1 - up.z0;
  const upperX = 0.04 + up.depth / 2;
  const upperZ = (up.z0 + up.z1) / 2;
  const upperY = y0 + up.yBottom + up.height / 2;

  const lightPos: [number, number, number] = [
    ix,
    y0 + 2.05,
    iz,
  ];

  // Door panel reveals on island (east face)
  const panelCount = 4;
  const panelH = iH * 0.72;
  const panelW = (iLen - 0.12) / panelCount - 0.02;

  return (
    <group name={k.label}>
      {/* ── Island carcass ── */}
      <mesh
        position={[ix, bodyY, iz]}
        material={matWood}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[iDep, iH, iLen]} />
      </mesh>
      {/* Toe kick recess */}
      <mesh position={[ix, y0 + 0.05, iz]} material={matWoodFine}>
        <boxGeometry args={[iDep * 0.92, 0.1, iLen * 0.96]} />
      </mesh>
      {/* East face door panels + handles */}
      {Array.from({ length: panelCount }, (_, i) => {
        const pz =
          iz - iLen / 2 + 0.08 + panelW / 2 + i * (panelW + 0.04);
        return (
          <group key={`ip-${i}`}>
            <mesh
              position={[ix + iDep / 2 + 0.004, y0 + 0.12 + panelH / 2, pz]}
              material={matWoodFine}
              castShadow
            >
              <boxGeometry args={[0.012, panelH, panelW]} />
            </mesh>
            <mesh
              position={[
                ix + iDep / 2 + 0.014,
                y0 + 0.12 + panelH * 0.55,
                pz + panelW * 0.28,
              ]}
              material={matMetal}
            >
              <boxGeometry args={[0.01, 0.1, 0.012]} />
            </mesh>
          </group>
        );
      })}
      {/* Stone top + bar overhang east */}
      <mesh
        position={[topX, topY, iz]}
        material={matStone}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[topDepth, topT, iLen + 0.04]} />
      </mesh>
      {/* Thin edge band */}
      <mesh
        position={[topX + topDepth / 2 - 0.008, topY, iz]}
        material={matMetal}
      >
        <boxGeometry args={[0.006, topT * 0.9, iLen + 0.04]} />
      </mesh>

      {/* Sink basin */}
      <mesh
        position={[sinkX, sinkY - k.sink.depth / 2, sinkZ]}
        material={matSink}
        castShadow
      >
        <boxGeometry args={[k.sink.d, k.sink.depth, k.sink.w]} />
      </mesh>
      {/* Faucet */}
      <mesh
        position={[sinkX + 0.06, sinkY + 0.12, sinkZ]}
        material={matMetal}
        castShadow
      >
        <cylinderGeometry args={[0.012, 0.014, 0.24, 12]} />
      </mesh>
      <mesh
        position={[sinkX + 0.02, sinkY + 0.22, sinkZ]}
        rotation={[0, 0, Math.PI / 2]}
        material={matMetal}
        castShadow
      >
        <cylinderGeometry args={[0.009, 0.009, 0.12, 10]} />
      </mesh>
      <mesh
        position={[sinkX - 0.04, sinkY + 0.18, sinkZ]}
        material={matMetal}
        castShadow
      >
        <sphereGeometry args={[0.014, 10, 8]} />
      </mesh>

      {/* ── Fridge (south, west wall) ── */}
      <mesh
        position={[fridgeX, fridgeY, fridgeZ]}
        material={matFridgeBody}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[fr.d, fr.h, fr.w]} />
      </mesh>
      {/* Door */}
      <mesh
        position={[fridgeX + fr.d / 2 + 0.008, fridgeY + 0.02, fridgeZ]}
        material={matFridge}
        castShadow
      >
        <boxGeometry args={[0.04, fr.h * 0.92, fr.w * 0.92]} />
      </mesh>
      {/* Door seam (French-style vertical) */}
      <mesh
        position={[fridgeX + fr.d / 2 + 0.03, fridgeY + 0.02, fridgeZ]}
        material={matMetal}
      >
        <boxGeometry args={[0.006, fr.h * 0.88, 0.008]} />
      </mesh>
      {/* Handle */}
      <mesh
        position={[
          fridgeX + fr.d / 2 + 0.04,
          fridgeY + fr.h * 0.15,
          fridgeZ + fr.w * 0.28,
        ]}
        material={matMetal}
        castShadow
      >
        <boxGeometry args={[0.02, 0.28, 0.025]} />
      </mesh>
      {/* Vent grille bottom */}
      <mesh
        position={[fridgeX + fr.d / 2 + 0.02, y0 + 0.08, fridgeZ]}
        material={matMetal}
      >
        <boxGeometry args={[0.02, 0.1, fr.w * 0.85]} />
      </mesh>

      {/* Tall cabinet north of fridge */}
      <mesh
        position={[tallX, tallY, tallZ]}
        material={matWood}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[tall.d, tall.h, tall.w]} />
      </mesh>
      <mesh
        position={[tallX + tall.d / 2 + 0.006, tallY, tallZ]}
        material={matWoodFine}
        castShadow
      >
        <boxGeometry args={[0.014, tall.h * 0.9, tall.w * 0.88]} />
      </mesh>
      <mesh
        position={[
          tallX + tall.d / 2 + 0.016,
          tallY + tall.h * 0.1,
          tallZ + tall.w * 0.25,
        ]}
        material={matMetal}
      >
        <boxGeometry args={[0.01, 0.14, 0.012]} />
      </mesh>

      {/* West wall upper cabinets */}
      <mesh
        position={[upperX, upperY, upperZ]}
        material={matWood}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[up.depth, up.height, upperLen]} />
      </mesh>
      {/* Upper door grid (3 panels) */}
      {[0, 1, 2].map((i) => {
        const pw = upperLen / 3 - 0.04;
        const pz = up.z0 + 0.06 + pw / 2 + i * (pw + 0.04);
        return (
          <mesh
            key={`up-${i}`}
            position={[
              upperX + up.depth / 2 + 0.005,
              upperY,
              pz,
            ]}
            material={matWoodFine}
            castShadow
          >
            <boxGeometry args={[0.012, up.height * 0.85, pw]} />
          </mesh>
        );
      })}

      {/* Low base cabinets under west wall between fridge and island aisle */}
      <mesh
        position={[
          0.04 + 0.55 / 2,
          y0 + 0.42,
          tallZ + tall.w / 2 + 0.35,
        ]}
        material={matWood}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.55, 0.84, 0.55]} />
      </mesh>
      <mesh
        position={[
          0.04 + 0.55 / 2,
          y0 + 0.86,
          tallZ + tall.w / 2 + 0.35,
        ]}
        material={matStone}
        castShadow
      >
        <boxGeometry args={[0.58, 0.035, 0.58]} />
      </mesh>

      {/* Island key light */}
      <pointLight
        position={lightPos}
        intensity={k.light.intensity}
        distance={k.light.distance}
        decay={2}
        color={k.light.color}
        castShadow={false}
      />
    </group>
  );
}
