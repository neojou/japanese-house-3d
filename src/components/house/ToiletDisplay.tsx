
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
import { sitToiletLayout } from "@/lib/sitToilet";

type SitToiletProp = typeof PROP_1F_TOILET | typeof PROP_2F_TOILET;

/** Soft boutique bowl profile (lathe around Y): wide rim → narrow trap. */
function makeBowlLathe(height: number, rimR: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = height * (1 - t);
    let r: number;
    if (t < 0.08) r = rimR;
    else if (t < 0.25) r = rimR * (0.92 - (t - 0.08) * 0.5);
    else if (t < 0.55) r = rimR * (0.78 - (t - 0.25) * 0.9);
    else if (t < 0.85) r = rimR * (0.45 - (t - 0.55) * 0.55);
    else r = rimR * 0.22;
    pts.push(new THREE.Vector2(Math.max(r, 0.035), y));
  }
  return new THREE.LatheGeometry(pts, 32);
}

function makeInnerBowl(height: number, rimR: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = height * 0.92 * (1 - t) + height * 0.04;
    const r = rimR * (0.72 - t * 0.45);
    pts.push(new THREE.Vector2(Math.max(r, 0.04), y));
  }
  return new THREE.LatheGeometry(pts, 24);
}

/**
 * Porcelain sit toilet in local space: floor at y=0, tank −X, sit facing +X.
 */
function SitToilet({ p }: { p: SitToiletProp }) {
  const matPorcelain = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.porcelain,
        roughness: 0.22,
        metalness: 0.07,
        envMapIntensity: 0.65,
      }),
    [p.porcelain],
  );
  const matInner = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.porcelainInner,
        roughness: 0.42,
        metalness: 0.02,
        side: THREE.DoubleSide,
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
  const matWater = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#9eb8c4",
        transparent: true,
        opacity: 0.45,
        roughness: 0.08,
        metalness: 0.04,
        transmission: 0.35,
        thickness: 0.02,
        depthWrite: false,
      }),
    [],
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
      matChrome.dispose();
      matWater.dispose();
    };
  }, [
    bowlGeo,
    innerGeo,
    matPorcelain,
    matInner,
    matButton,
    matChrome,
    matWater,
  ]);

  const floorY = p.y;
  const L = sitToiletLayout(p);
  const tankD = p.tank.d;
  const tankW = p.tank.w;
  const tankH = p.tank.h;
  const { tankLocalX, tankCenterY, tankTopY, bowlLocalX, bowlScaleX, seatY } =
    L;
  const baseY = floorY + 0.06;

  return (
    <group name={p.label}>
      <group position={[tankLocalX, 0, 0]}>
        <mesh
          position={[0, tankCenterY, 0]}
          material={matPorcelain}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[tankD * 0.92, tankH * 0.92, tankW * 0.88]} />
        </mesh>
        <mesh
          position={[0, tankCenterY, tankW * 0.38]}
          material={matPorcelain}
          castShadow
        >
          <cylinderGeometry
            args={[tankD * 0.42, tankD * 0.42, tankH * 0.9, 18]}
          />
        </mesh>
        <mesh
          position={[0, tankCenterY, -tankW * 0.38]}
          material={matPorcelain}
          castShadow
        >
          <cylinderGeometry
            args={[tankD * 0.42, tankD * 0.42, tankH * 0.9, 18]}
          />
        </mesh>
        <mesh
          position={[0, tankTopY - 0.012, 0]}
          material={matPorcelain}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[tankD * 1.02, 0.028, tankW * 0.98]} />
        </mesh>
        <mesh
          position={[0, tankTopY - 0.012, tankW * 0.4]}
          material={matPorcelain}
        >
          <cylinderGeometry args={[tankD * 0.45, tankD * 0.45, 0.028, 16]} />
        </mesh>
        <mesh
          position={[0, tankTopY - 0.012, -tankW * 0.4]}
          material={matPorcelain}
        >
          <cylinderGeometry args={[tankD * 0.45, tankD * 0.45, 0.028, 16]} />
        </mesh>
        <mesh
          position={[tankD * 0.15, tankTopY + 0.006, 0]}
          rotation={[0, 0, Math.PI / 2]}
          material={matButton}
          castShadow
        >
          <cylinderGeometry args={[0.018, 0.02, 0.01, 16]} />
        </mesh>
        <mesh
          position={[tankD * 0.15, tankTopY + 0.012, 0]}
          material={matChrome}
        >
          <cylinderGeometry args={[0.008, 0.008, 0.004, 12]} />
        </mesh>
      </group>

      <mesh
        position={[L.deckCenterX, seatY - 0.09, 0]}
        material={matPorcelain}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[L.deckLen, 0.16, p.width * 0.52]} />
      </mesh>
      <mesh
        position={[L.deckCenterX, baseY + 0.02, 0]}
        material={matPorcelain}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[L.deckLen * 0.92, 0.12, p.width * 0.46]} />
      </mesh>

      <mesh
        position={[bowlLocalX - 0.04, baseY, 0]}
        material={matPorcelain}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[p.bowl.length * 0.72, 0.1, p.width * 0.62]} />
      </mesh>

      <group position={[bowlLocalX, 0, 0]} scale={[bowlScaleX, 1, 1]}>
        <mesh
          position={[0.015 / bowlScaleX, baseY - 0.01, 0]}
          material={matPorcelain}
          castShadow
        >
          <cylinderGeometry
            args={[p.bowl.rimR * 0.95, p.bowl.rimR * 1.05, 0.12, 28]}
          />
        </mesh>
        <mesh
          geometry={bowlGeo}
          position={[0, floorY + 0.08, 0]}
          material={matPorcelain}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={innerGeo}
          position={[0, floorY + 0.1, 0]}
          material={matInner}
        />
        <mesh
          position={[0, floorY + 0.168, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={matWater}
        >
          <circleGeometry args={[p.bowl.rimR * 0.42, 20]} />
        </mesh>
        <mesh
          position={[0, seatY - 0.01, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          material={matPorcelain}
          castShadow
        >
          <torusGeometry args={[p.bowl.rimR * 0.82, 0.022, 10, 32]} />
        </mesh>
      </group>

      <mesh
        position={[bowlLocalX + 0.02, floorY + 0.055, 0]}
        material={matChrome}
      >
        <torusGeometry args={[0.028, 0.004, 8, 16]} />
      </mesh>
      <mesh
        position={[bowlLocalX - p.bowl.length * 0.08, seatY - 0.005, 0]}
        material={matPorcelain}
        castShadow
      >
        <boxGeometry args={[p.bowl.length * 0.28, 0.018, p.width * 0.48]} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`hinge-${side}`}
          position={[L.hingeX + 0.02, seatY + 0.006, side * p.width * 0.18]}
          rotation={[0, 0, Math.PI / 2]}
          material={matChrome}
        >
          <cylinderGeometry args={[0.007, 0.007, 0.028, 10]} />
        </mesh>
      ))}

      <group
        position={[L.hingeX, seatY + 0.01, 0]}
        rotation={[0, 0, -p.lidOpenRad]}
      >
        <mesh
          position={[p.bowl.length * 0.36, 0.012, 0]}
          material={matPorcelain}
          castShadow
        >
          <boxGeometry args={[p.bowl.length * 0.68, 0.022, p.width * 0.58]} />
        </mesh>
        <mesh
          position={[p.bowl.length * 0.56, 0.012, 0]}
          material={matPorcelain}
          castShadow
        >
          <cylinderGeometry
            args={[p.bowl.rimR * 0.62, p.bowl.rimR * 0.62, 0.022, 22]}
          />
        </mesh>
      </group>
    </group>
  );
}

function WoodEndscape({
  p,
  position,
  size,
}: {
  p: SitToiletProp;
  position: [number, number, number];
  /** [thickness along wall-normal, height, width along wall] */
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
    <>
      <mesh position={position} castShadow receiveShadow material={matWood}>
        <boxGeometry args={size} />
      </mesh>
    </>
  );
}

/**
 * 1F toilet — west half, face +X (tank west, bowl east).
 */
export function ToiletDisplay() {
  const p = PROP_1F_TOILET;
  const halfT = BUILDING.wallThickness / 2;

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const floorY = p.y;
  const wallFaceX = TOILET_1F.x0 + halfT;
  const boardX = wallFaceX + p.board.standoff + p.board.thickness / 2;
  const boardY = floorY + p.board.height * 0.48;
  const lightPos: [number, number, number] = [
    p.x + p.light.dx,
    floorY + p.light.dy,
    p.z + p.light.dz,
  ];

  return (
    <group name={p.label} position={[p.x, 0, p.z]}>
      <WoodEndscape
        p={p}
        position={[boardX - p.x, boardY, 0]}
        size={[p.board.thickness, p.board.height, p.board.width]}
      />
      <mesh position={[boardX - p.x + p.board.thickness * 0.55, boardY, 0]}>
        <boxGeometry args={[0.005, p.board.height + 0.02, p.board.width + 0.02]} />
        <meshStandardMaterial color="#1e1c1a" roughness={0.92} />
      </mesh>
      <SitToilet p={p} />
      <pointLight
        position={[lightPos[0] - p.x, lightPos[1], lightPos[2] - p.z]}
        intensity={p.light.intensity}
        distance={p.light.distance}
        decay={2}
        color={p.light.color}
        castShadow={false}
      />
    </group>
  );
}

/**
 * 2F toilet — tank on north wall, sit facing south (−Z).
 * Local +X fixture yawed +π/2 so tank maps to +Z.
 */
export function Toilet2FDisplay() {
  const p = PROP_2F_TOILET;
  const halfT = BUILDING.wallThickness / 2;

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const floorY = p.y;
  const wallFaceZ = TOILET_2F.z1 - halfT;
  const boardZ = wallFaceZ - p.board.standoff - p.board.thickness / 2;
  const boardY = floorY + p.board.height * 0.48;

  return (
    <group name={p.label}>
      <WoodEndscape
        p={p}
        position={[p.x, boardY, boardZ]}
        size={[p.board.width, p.board.height, p.board.thickness]}
      />
      <mesh position={[p.x, boardY, boardZ - p.board.thickness * 0.55]}>
        <boxGeometry args={[p.board.width + 0.02, p.board.height + 0.02, 0.005]} />
        <meshStandardMaterial color="#1e1c1a" roughness={0.92} />
      </mesh>
      <group position={[p.x, 0, p.z]} rotation={[0, Math.PI / 2, 0]}>
        <SitToilet p={p} />
      </group>
      <pointLight
        position={[p.x + p.light.dx, floorY + p.light.dy, p.z + p.light.dz]}
        intensity={p.light.intensity}
        distance={p.light.distance}
        decay={2}
        color={p.light.color}
        castShadow={false}
      />
    </group>
  );
}
