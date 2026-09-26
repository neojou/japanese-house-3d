
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import {
  BUILDING,
  PROP_1F_TOILET,
  PROP_2F_TOILET,
  TOILET_1F,
  TOILET_2F,
} from "@/data/dimensions";
import {
  createInteriorWoodMaterial,
  ensureFaçadeTextures,
} from "@/lib/houseMaterials";
import { AmageToilet } from "./AmageToilet";

type SitToiletProp = typeof PROP_1F_TOILET | typeof PROP_2F_TOILET;
type ToiletRoom = typeof TOILET_1F | typeof TOILET_2F;

function WoodEndscape({
  p,
  position,
  size,
}: {
  p: SitToiletProp;
  position: [number, number, number];
  size: [number, number, number];
}) {
  const matWood = useMemo(
    () => createInteriorWoodMaterial(p.board.width, p.board.height),
    [p.board.width, p.board.height],
  );
  useLayoutEffect(() => {
    return () => {
      matWood.map?.dispose();
      matWood.normalMap?.dispose();
      matWood.dispose();
    };
  }, [matWood]);
  return (
    <mesh position={position} castShadow receiveShadow material={matWood}>
      <boxGeometry args={size} />
    </mesh>
  );
}

/** Wall remote + paper + ring (catalog vignette, no trademarks). */
function WallKit({
  localZ,
}: {
  localZ: number;
}) {
  const matWhite = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f0eeea",
        roughness: 0.42,
        metalness: 0.04,
      }),
    [],
  );
  const matChrome = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c8cdd2",
        roughness: 0.22,
        metalness: 0.72,
        envMapIntensity: 0.7,
      }),
    [],
  );
  const matPaper = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f4f1ea",
        roughness: 0.78,
      }),
    [],
  );
  const matBtn = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d8d4ce",
        roughness: 0.35,
      }),
    [],
  );
  useLayoutEffect(() => {
    return () => {
      matWhite.dispose();
      matChrome.dispose();
      matPaper.dispose();
      matBtn.dispose();
    };
  }, [matWhite, matChrome, matPaper, matBtn]);

  const z = localZ;
  return (
    <group name="toilet-wall-kit">
      {/* Remote — 263 × 73 × 34 mm, no labels */}
      <mesh position={[0.10, 0.98, z]} material={matWhite} castShadow>
        <boxGeometry args={[0.263, 0.073, 0.034]} />
      </mesh>
      {[-0.08, -0.04, 0, 0.04, 0.08].map((dx, i) => (
        <mesh
          key={`btn-${i}`}
          position={[0.10 + dx, 0.98, z - 0.02]}
          material={matBtn}
        >
          <boxGeometry args={[0.028, 0.018, 0.006]} />
        </mesh>
      ))}
      {/* Paper holder + roll */}
      <mesh position={[0.10, 0.68, z]} material={matWhite} castShadow>
        <boxGeometry args={[0.18, 0.04, 0.06]} />
      </mesh>
      <mesh
        position={[0.10, 0.64, z - 0.04]}
        rotation={[0, 0, Math.PI / 2]}
        material={matPaper}
        castShadow
      >
        <cylinderGeometry args={[0.055, 0.055, 0.11, 20]} />
      </mesh>
      <mesh
        position={[0.10, 0.64, z - 0.04]}
        rotation={[0, 0, Math.PI / 2]}
        material={matChrome}
      >
        <cylinderGeometry args={[0.012, 0.012, 0.14, 10]} />
      </mesh>
      {/* Towel ring */}
      <mesh position={[-0.02, 1.18, z - 0.02]} material={matChrome} castShadow>
        <torusGeometry args={[0.055, 0.007, 8, 24]} />
      </mesh>
      <mesh position={[-0.02, 1.18, z + 0.01]} material={matChrome}>
        <boxGeometry args={[0.04, 0.016, 0.02]} />
      </mesh>
    </group>
  );
}

function ToiletHero({
  p,
  room,
}: {
  p: SitToiletProp;
  room: ToiletRoom;
}) {
  const halfT = BUILDING.wallThickness / 2;

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const wallFaceX = room.x0 + halfT;
  const boardX = wallFaceX + p.board.standoff + p.board.thickness / 2;
  const northFace = room.z1 - halfT;

  return (
    <group name={p.label} position={[p.x, p.y, p.z]}>
      <WoodEndscape
        p={p}
        position={[boardX - p.x, p.board.height * 0.48, 0]}
        size={[p.board.thickness, p.board.height, p.board.width]}
      />
      <mesh position={[boardX - p.x + p.board.thickness * 0.55, p.board.height * 0.48, 0]}>
        <boxGeometry args={[0.005, p.board.height + 0.02, p.board.width + 0.02]} />
        <meshStandardMaterial color="#1e1c1a" roughness={0.92} />
      </mesh>
      <AmageToilet position={[0, 0, 0]} />
      <WallKit localZ={northFace - p.z - 0.02} />
      <pointLight
        position={[p.light.dx, p.light.dy, p.light.dz]}
        intensity={p.light.intensity}
        distance={p.light.distance}
        decay={2}
        color={p.light.color}
        castShadow={false}
      />
    </group>
  );
}

/** 1F toilet — west half, face +X (tank west, bowl east). */
export function ToiletDisplay() {
  return <ToiletHero p={PROP_1F_TOILET} room={TOILET_1F} />;
}

/** 2F toilet — same as 1F: west half, face +X (tank west, bowl east). */
export function Toilet2FDisplay() {
  return <ToiletHero p={PROP_2F_TOILET} room={TOILET_2F} />;
}
