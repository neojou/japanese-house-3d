
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { PROP_1F_SENMEN } from "@/data/dimensions";
import { senmenProbePlanFrom } from "@/lib/senmenMirror";
import { SENMEN_1F } from "@/data/dimensions";
import {
  createInteriorWoodMaterial,
  ensureFaçadeTextures,
} from "@/lib/houseMaterials";
import { SenmenMirrorGlass } from "./SenmenMirrorGlass";

/**
 * 1F 洗面 north wall — tokonoma-card vignette (DESIGN.md §2.7):
 * west laundry basket, center warm-wood vanity + vertical mirror,
 * east closed front-load washer.
 *
 * Mirror: indoor cube fallback, then 3 CubeCamera shots from inside the
 * senmen (sees UB through shower). No planar FBO. Plan dims unchanged.
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
  /** Soft enamel body — quiet luxury appliance */
  const matWasher = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: w.body,
        roughness: 0.3,
        metalness: 0.08,
        envMapIntensity: 0.45,
      }),
    [w.body],
  );
  const matWasherEdge = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: w.bodyEdge,
        roughness: 0.38,
        metalness: 0.06,
        envMapIntensity: 0.3,
      }),
    [w.bodyEdge],
  );
  const matWasherPanel = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: w.panel,
        roughness: 0.34,
        metalness: 0.08,
        envMapIntensity: 0.32,
      }),
    [w.panel],
  );
  const matDoorChrome = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: w.doorChrome,
        roughness: 0.28,
        metalness: 0.55,
        envMapIntensity: 0.55,
      }),
    [w.doorChrome],
  );
  /** High-gloss semi-transparent porthole “mirror glass” */
  const matGlass = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: w.glass,
        transparent: true,
        opacity: w.glassOpacity,
        roughness: 0.06,
        metalness: 0.35,
        envMapIntensity: 0.85,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [w.glass, w.glassOpacity],
  );
  const matDrum = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: w.drum,
        roughness: 0.48,
        metalness: 0.4,
        envMapIntensity: 0.45,
        side: THREE.DoubleSide,
      }),
    [w.drum],
  );
  const matGasket = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: w.gasket,
        roughness: 0.88,
        metalness: 0.02,
      }),
    [w.gasket],
  );
  const matDrawer = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: w.drawer,
        roughness: 0.36,
        metalness: 0.08,
        envMapIntensity: 0.25,
      }),
    [w.drawer],
  );
  /** Soft laundry folds inside drum (light neutrals) */
  const matDrumCloth = useMemo(
    () => [
      new THREE.MeshStandardMaterial({
        color: "#f0ebe4",
        roughness: 0.92,
        metalness: 0,
      }),
      new THREE.MeshStandardMaterial({
        color: "#e2ddd4",
        roughness: 0.9,
        metalness: 0,
      }),
      new THREE.MeshStandardMaterial({
        color: "#d4cfc6",
        roughness: 0.91,
        metalness: 0,
      }),
    ],
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
        matWasherEdge,
        matWasherPanel,
        matDoorChrome,
        matGlass,
        matDrum,
        matGasket,
        matDrawer,
        matFrame,
        matRattan,
        ...matCloth,
        ...matDrumCloth,
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
    matWasherEdge,
    matWasherPanel,
    matDoorChrome,
    matGlass,
    matDrum,
    matGasket,
    matDrawer,
    matFrame,
    matRattan,
    matCloth,
    matDrumCloth,
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

      {/* Frame + glass. Probe sits in senmen (south of vanity) so the cube
          env includes UB through the shower — plan dims unchanged. */}
      <mesh position={[v.x, mirrorY, mirrorZ]} material={matFrame} castShadow>
        <boxGeometry
          args={[m.w + m.frame * 2, m.h + m.frame * 2, m.t + 0.01]}
        />
      </mesh>
      <SenmenMirrorGlass
        position={[v.x, mirrorY, mirrorZ - 0.008]}
        probePosition={(() => {
          const pr = senmenProbePlanFrom(v.x, y0, SENMEN_1F.z0, SENMEN_1F.z1);
          return [pr.x, pr.y, pr.z];
        })()}
        width={m.w}
        height={m.h}
        thickness={m.t}
      />

      {/* ── East: closed front-load washer (tokonoma-card) ──
          Ivory enamel body; large high-gloss glass; no wood; no door handle.
          Subtle top controls; stainless drum + light folded laundry inside. */}
      <group position={[w.x, y0, washerZ]} name="senmen-washer">
        {(() => {
          const bodyH = w.h;
          const bodyY = bodyH / 2;
          // Front faces room (−Z)
          const fz = -1;
          const frontZ = fz * (w.d / 2);
          const out = (t: number) => frontZ + fz * t;
          const doorR = w.doorR;
          const doorCy = bodyH * 0.42;
          const panelH = 0.07;
          const panelY = bodyH - panelH / 2 - 0.018;
          const glassR = doorR - 0.028;
          const drumR = doorR - 0.055;

          return (
            <>
              {/* Main body */}
              <mesh
                position={[0, bodyY, 0]}
                material={matWasher}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[w.w, bodyH, w.d]} />
              </mesh>

              {/* Soft front vertical edge rounds */}
              {([-1, 1] as const).map((side) => (
                <mesh
                  key={`edge-${side}`}
                  position={[side * (w.w / 2 - 0.022), bodyY, out(-0.03)]}
                  material={matWasherEdge}
                  castShadow
                >
                  <cylinderGeometry args={[0.024, 0.024, bodyH * 0.96, 12]} />
                </mesh>
              ))}

              {/* Front face plate (quiet, not a second box) */}
              <mesh
                position={[0, bodyY - 0.02, out(0.003)]}
                material={matWasherPanel}
                castShadow
              >
                <boxGeometry args={[w.w * 0.9, bodyH * 0.72, 0.01]} />
              </mesh>

              {/* Top crown lip */}
              <mesh
                position={[0, bodyH - 0.01, 0]}
                material={matWasherEdge}
                castShadow
              >
                <boxGeometry args={[w.w * 0.98, 0.018, w.d * 0.98]} />
              </mesh>

              {/* Subtle control band (smaller / quieter) */}
              <mesh
                position={[0, panelY, out(0.008)]}
                material={matWasherPanel}
                castShadow
              >
                <boxGeometry args={[w.w * 0.88, panelH, 0.016]} />
              </mesh>
              <mesh
                position={[0, panelY - panelH / 2 - 0.004, out(0.008)]}
                material={matGasket}
              >
                <boxGeometry args={[w.w * 0.82, 0.003, 0.005]} />
              </mesh>
              {/* Small detergent drawer */}
              <mesh
                position={[-w.w * 0.26, panelY, out(0.02)]}
                material={matDrawer}
                castShadow
              >
                <boxGeometry args={[0.12, panelH * 0.55, 0.028]} />
              </mesh>
              {/* Small program dial */}
              <mesh
                position={[w.w * 0.24, panelY, out(0.022)]}
                rotation={[Math.PI / 2, 0, 0]}
                material={matDoorChrome}
                castShadow
              >
                <cylinderGeometry args={[0.018, 0.02, 0.016, 16]} />
              </mesh>
              <mesh
                position={[w.w * 0.24, panelY, out(0.032)]}
                rotation={[Math.PI / 2, 0, 0]}
                material={matGasket}
              >
                <cylinderGeometry args={[0.007, 0.007, 0.006, 10]} />
              </mesh>
              {/* Tiny status pips */}
              {[-0.02, 0.0, 0.02].map((dx, i) => (
                <mesh
                  key={`pip-${i}`}
                  position={[w.w * 0.08 + dx, panelY + 0.008, out(0.016)]}
                  material={matDoorChrome}
                >
                  <boxGeometry args={[0.008, 0.006, 0.005]} />
                </mesh>
              ))}

              {/* ── Closed porthole (face-on circle, NOT edge-on “handle”) ──
                  TorusGeometry lies in XY by default — do NOT rotX π/2 or it
                  becomes a horizontal hoop that reads as a metal semicircle. */}
              {/* Single quiet body-tone bezel */}
              <mesh
                position={[0, doorCy, out(0.012)]}
                material={matWasherEdge}
                castShadow
              >
                <torusGeometry args={[doorR, 0.012, 10, 48]} />
              </mesh>
              {/* Thin dark gasket just inside glass */}
              <mesh
                position={[0, doorCy, out(0.016)]}
                material={matGasket}
              >
                <torusGeometry args={[glassR + 0.004, 0.008, 8, 40]} />
              </mesh>
              {/* Large high-gloss glass (closed door) */}
              <mesh
                position={[0, doorCy, out(0.022)]}
                material={matGlass}
              >
                <circleGeometry args={[glassR, 48]} />
              </mesh>

              {/* Inner stainless drum (no chrome ribs — those read as a handle) */}
              <mesh
                position={[0, doorCy, out(-0.07)]}
                rotation={[Math.PI / 2, 0, 0]}
                material={matDrum}
              >
                <cylinderGeometry
                  args={[drumR, drumR * 0.98, 0.24, 32, 1, true]}
                />
              </mesh>
              <mesh
                position={[0, doorCy, out(-0.18)]}
                material={matDrum}
              >
                <circleGeometry args={[drumR * 0.98, 32]} />
              </mesh>

              {/* Soft folded laundry inside drum */}
              <mesh
                position={[-0.04, doorCy - 0.06, out(-0.08)]}
                rotation={[0.4, 0.3, 0.2]}
                material={matDrumCloth[0]}
                castShadow
              >
                <boxGeometry args={[0.14, 0.04, 0.1]} />
              </mesh>
              <mesh
                position={[0.05, doorCy - 0.04, out(-0.1)]}
                rotation={[-0.25, -0.4, 0.15]}
                material={matDrumCloth[1]}
                castShadow
              >
                <boxGeometry args={[0.12, 0.035, 0.11]} />
              </mesh>
              <mesh
                position={[0.0, doorCy - 0.02, out(-0.12)]}
                rotation={[0.15, 0.5, -0.1]}
                material={matDrumCloth[2]}
                castShadow
              >
                <boxGeometry args={[0.1, 0.03, 0.09]} />
              </mesh>

              {/* Recessed feet (no loud chrome pads) */}
              {(
                [
                  [-1, -1],
                  [-1, 1],
                  [1, -1],
                  [1, 1],
                ] as const
              ).map(([sx, sz], i) => (
                <mesh
                  key={`ft-${i}`}
                  position={[sx * w.w * 0.36, 0.012, sz * w.d * 0.34]}
                  material={matWasherEdge}
                >
                  <cylinderGeometry args={[0.014, 0.016, 0.024, 8]} />
                </mesh>
              ))}
            </>
          );
        })()}
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
