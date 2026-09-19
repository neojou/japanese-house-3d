import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import {
  BUILDING,
  PROP_2F_MONO,
  storyWallHeight,
} from "@/data/dimensions";
import {
  createHinokiMaterial,
  ensureFaçadeTextures,
} from "@/lib/houseMaterials";

/**
 * 2F 物入 — west alcove, open east (tokonoma-card).
 * N/S/W are plan walls; this is the hinoki carcass + shelves + a few boxes.
 */
export function Mono2FDisplay() {
  const p = PROP_2F_MONO;
  const halfT = BUILDING.wallThickness / 2;

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const west = p.x0 + halfT;
  const south = p.z0 + halfT;
  const north = p.z1 - halfT;
  const innerNS = north - south;
  const innerEW = p.x1 - west;
  const shelfD = Math.min(p.shelfD, innerEW - 0.03);
  const alcoveH = storyWallHeight("2f") - 0.1;
  const cz = (south + north) / 2;
  const shelfX = west + p.boardT + shelfD / 2;
  const stileX = p.x1 - p.boardT / 2;

  const matBack = useMemo(
    () => createHinokiMaterial(innerNS, alcoveH),
    [innerNS, alcoveH],
  );
  const matShelf = useMemo(
    () => createHinokiMaterial(innerNS, shelfD),
    [innerNS, shelfD],
  );
  const matBox = useMemo(
    () => createHinokiMaterial(0.28, 0.16),
    [],
  );
  const matLid = useMemo(
    () => createHinokiMaterial(0.3, 0.18),
    [],
  );
  const matRattan = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c4a574",
        roughness: 0.82,
        metalness: 0.04,
      }),
    [],
  );
  const matCloth = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d8cfc2",
        roughness: 0.9,
        metalness: 0,
      }),
    [],
  );
  const matJar = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e8e0d4",
        roughness: 0.28,
        metalness: 0.08,
      }),
    [],
  );

  useLayoutEffect(() => {
    return () => {
      for (const m of [matBack, matShelf, matBox, matLid]) {
        m.map?.dispose();
        m.normalMap?.dispose();
        m.dispose();
      }
      matRattan.dispose();
      matCloth.dispose();
      matJar.dispose();
    };
  }, [matBack, matShelf, matBox, matLid, matRattan, matCloth, matJar]);

  const headerY = p.y + alcoveH - 0.03;

  return (
    <group name={p.label}>
      {/* West back panel (interior face of the exterior wall) */}
      <mesh
        position={[west + p.boardT / 2, p.y + alcoveH / 2, cz]}
        material={matBack}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[p.boardT, alcoveH, innerNS - 0.02]} />
      </mesh>

      {/* East opening frame — stiles + header, no east wall */}
      <mesh
        position={[stileX, p.y + alcoveH / 2, south + p.boardT]}
        material={matShelf}
        castShadow
      >
        <boxGeometry args={[p.boardT, alcoveH, p.boardT * 1.4]} />
      </mesh>
      <mesh
        position={[stileX, p.y + alcoveH / 2, north - p.boardT]}
        material={matShelf}
        castShadow
      >
        <boxGeometry args={[p.boardT, alcoveH, p.boardT * 1.4]} />
      </mesh>
      <mesh
        position={[stileX, headerY, cz]}
        material={matShelf}
        castShadow
      >
        <boxGeometry args={[p.boardT, 0.06, innerNS - 0.02]} />
      </mesh>

      {p.shelves.map((sy, i) => (
        <mesh
          key={`shelf-${i}`}
          position={[shelfX, p.y + sy, cz]}
          material={matShelf}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[shelfD, 0.018, innerNS - 0.05]} />
        </mesh>
      ))}

      {/* Bottom: rattan basket + folded cloth */}
      <mesh
        position={[shelfX + 0.02, p.y + p.shelves[0] + 0.09, cz - 0.12]}
        material={matRattan}
        castShadow
      >
        <boxGeometry args={[0.22, 0.16, 0.28]} />
      </mesh>
      <mesh
        position={[shelfX + 0.02, p.y + p.shelves[0] + 0.175, cz - 0.1]}
        rotation={[0.15, 0.2, 0.08]}
        material={matCloth}
        castShadow
      >
        <boxGeometry args={[0.16, 0.04, 0.2]} />
      </mesh>

      {/* Second: two lidded boxes */}
      <mesh
        position={[shelfX, p.y + p.shelves[1] + 0.06, cz + 0.14]}
        material={matBox}
        castShadow
      >
        <boxGeometry args={[0.24, 0.11, 0.18]} />
      </mesh>
      <mesh
        position={[shelfX, p.y + p.shelves[1] + 0.12, cz + 0.14]}
        material={matLid}
        castShadow
      >
        <boxGeometry args={[0.26, 0.016, 0.2]} />
      </mesh>
      <mesh
        position={[shelfX + 0.01, p.y + p.shelves[1] + 0.05, cz - 0.16]}
        material={matBox}
        castShadow
      >
        <boxGeometry args={[0.2, 0.09, 0.16]} />
      </mesh>
      <mesh
        position={[shelfX + 0.01, p.y + p.shelves[1] + 0.1, cz - 0.16]}
        material={matLid}
        castShadow
      >
        <boxGeometry args={[0.22, 0.014, 0.18]} />
      </mesh>

      {/* Third: ceramic jar + smaller box */}
      <mesh
        position={[shelfX, p.y + p.shelves[2] + 0.08, cz + 0.12]}
        material={matJar}
        castShadow
      >
        <cylinderGeometry args={[0.055, 0.06, 0.14, 20]} />
      </mesh>
      <mesh
        position={[shelfX, p.y + p.shelves[2] + 0.045, cz - 0.14]}
        material={matBox}
        castShadow
      >
        <boxGeometry args={[0.22, 0.08, 0.2]} />
      </mesh>

      {/* Top: long box */}
      <mesh
        position={[shelfX, p.y + p.shelves[3] + 0.05, cz]}
        material={matBox}
        castShadow
      >
        <boxGeometry args={[0.28, 0.09, 0.42]} />
      </mesh>
      <mesh
        position={[shelfX, p.y + p.shelves[3] + 0.1, cz]}
        material={matLid}
        castShadow
      >
        <boxGeometry args={[0.3, 0.014, 0.44]} />
      </mesh>

      <pointLight
        position={[p.x1 + 0.12, p.y + 1.35, cz]}
        intensity={p.light.intensity}
        distance={p.light.distance}
        decay={2}
        color={p.light.color}
        castShadow={false}
      />
    </group>
  );
}
