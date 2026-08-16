
import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { PROP_1F_SENMEN } from "@/data/dimensions";

/**
 * Rounded rectangle in XZ (extrude along +Y after rotate).
 * Shape lies in XY; we extrude in Z then rotate to stand as a slab.
 */
function roundedRectShape(w: number, d: number, r: number): THREE.Shape {
  const hw = w / 2;
  const hd = d / 2;
  const rr = Math.min(r, hw - 0.002, hd - 0.002);
  const s = new THREE.Shape();
  s.moveTo(-hw + rr, -hd);
  s.lineTo(hw - rr, -hd);
  s.absarc(hw - rr, -hd + rr, rr, -Math.PI / 2, 0, false);
  s.lineTo(hw, hd - rr);
  s.absarc(hw - rr, hd - rr, rr, 0, Math.PI / 2, false);
  s.lineTo(-hw + rr, hd);
  s.absarc(-hw + rr, hd - rr, rr, Math.PI / 2, Math.PI, false);
  s.lineTo(-hw, -hd + rr);
  s.absarc(-hw + rr, -hd + rr, rr, Math.PI, Math.PI * 1.5, false);
  return s;
}

function extrudeSlab(
  w: number,
  d: number,
  thick: number,
  r: number,
  bevel = 0.004,
): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(roundedRectShape(w, d, r), {
    depth: thick,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, thick / 2, 0);
  geo.computeVertexNormals();
  return geo;
}

function basinUrl(): string {
  const rel = PROP_1F_SENMEN.vanity.vessel.gltf.replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${rel}`;
}

useGLTF.preload(basinUrl());

function SenmenBasinGltf({
  matPorcelain,
  matInner,
}: {
  matPorcelain: THREE.Material;
  matInner: THREE.Material;
}) {
  const gltf = useGLTF(basinUrl());
  const root = useMemo(() => {
    const g = gltf.scene.clone(true);
    g.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const n = o.name.toLowerCase();
      if (n.includes("inner")) {
        o.material = matInner;
        o.castShadow = false;
      } else {
        o.material = matPorcelain;
        o.castShadow = true;
      }
      o.receiveShadow = true;
    });
    return g;
  }, [gltf.scene, matPorcelain, matInner]);
  return <primitive object={root} />;
}

type SenmenVanityProps = {
  position: [number, number, number];
};

/**
 * Open-console vanity (tokonoma-card wet, cinematic Path B):
 * white deck + chrome legs + glTF vessel basin + chrome mixer facing the bowl (−Z).
 * Reference: docs/S__112345090.jpg — no trademarks.
 */
export function SenmenVanity({ position }: SenmenVanityProps) {
  const v = PROP_1F_SENMEN.vanity;
  const ves = v.vessel;

  const geoDeck = useMemo(
    () => extrudeSlab(v.w + 0.06, v.d + 0.04, 0.028, 0.012, 0.003),
    [v.w, v.d],
  );

  const matDeck = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f4f2ee",
        roughness: 0.22,
        metalness: 0.06,
        envMapIntensity: 0.4,
      }),
    [],
  );
  const matPorcelain = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f8f6f3",
        roughness: 0.09,
        metalness: 0.12,
        envMapIntensity: 0.85,
      }),
    [],
  );
  const matInner = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ece8e3",
        roughness: 0.11,
        metalness: 0.08,
        envMapIntensity: 0.55,
      }),
    [],
  );
  const matChrome = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e2e8ee",
        roughness: 0.08,
        metalness: 0.96,
        envMapIntensity: 1.2,
      }),
    [],
  );
  const matDrain = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1c1c1c",
        roughness: 0.4,
        metalness: 0.4,
      }),
    [],
  );
  const matBottle = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#f0eeea",
        roughness: 0.12,
        metalness: 0.02,
        transmission: 0.55,
        thickness: 0.02,
        transparent: true,
        opacity: 0.85,
        envMapIntensity: 0.8,
      }),
    [],
  );
  const matPump = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f5eef0",
        roughness: 0.45,
        metalness: 0.05,
      }),
    [],
  );

  useLayoutEffect(() => {
    return () => {
      geoDeck.dispose();
      for (const m of [
        matDeck,
        matPorcelain,
        matInner,
        matChrome,
        matDrain,
        matBottle,
        matPump,
      ]) {
        m.dispose();
      }
    };
  }, [
    geoDeck,
    matDeck,
    matPorcelain,
    matInner,
    matChrome,
    matDrain,
    matBottle,
    matPump,
  ]);

  const deckY = v.h;
  const legH = v.h - 0.04;
  const hx = v.w * 0.42;
  const hz = v.d * 0.36;
  const floorY = ves.h - ves.innerDepth;

  return (
    <group name="senmen-vanity" position={position}>
      {/* Chrome legs (open console — not a lumber box) */}
      {(
        [
          [-hx, -hz],
          [hx, -hz],
          [-hx, hz],
          [hx, hz],
        ] as const
      ).map(([lx, lz], i) => (
        <mesh
          key={`leg-${i}`}
          position={[lx, 0.02 + legH / 2, lz]}
          material={matChrome}
          castShadow
        >
          <cylinderGeometry args={[0.016, 0.017, legH, 14]} />
        </mesh>
      ))}
      {/* Thin rear rail */}
      <mesh
        position={[0, v.h * 0.55, v.d * 0.42]}
        rotation={[0, 0, Math.PI / 2]}
        material={matChrome}
      >
        <cylinderGeometry args={[0.008, 0.008, v.w * 0.82, 10]} />
      </mesh>

      {/* White deck */}
      <mesh
        position={[0, deckY, 0]}
        geometry={geoDeck}
        material={matDeck}
        castShadow
        receiveShadow
      />

      {/* Path B vessel (glTF). +Z = wall, −Z = user */}
      <group position={[0, deckY + 0.014, -0.015]} name="senmen-basin">
        <SenmenBasinGltf matPorcelain={matPorcelain} matInner={matInner} />
        {/* Drain in the loft hole */}
        <mesh
          position={[0, floorY + 0.003, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          material={matDrain}
        >
          <cylinderGeometry args={[0.016, 0.016, 0.005, 20]} />
        </mesh>
        <mesh
          position={[0, floorY + 0.005, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          material={matChrome}
        >
          <torusGeometry args={[0.017, 0.0025, 8, 20]} />
        </mesh>

        {/* Mixer at back deck (+Z), spout toward −Z */}
        <group position={[0, ves.h + 0.002, ves.d * 0.32]} name="senmen-faucet">
          <mesh position={[0, 0.005, 0]} material={matChrome} castShadow>
            <cylinderGeometry args={[0.022, 0.025, 0.01, 22]} />
          </mesh>
          <mesh position={[0, 0.072, 0]} material={matChrome} castShadow>
            <cylinderGeometry args={[0.015, 0.0165, 0.125, 22]} />
          </mesh>
          <mesh position={[0, 0.138, 0]} material={matChrome} castShadow>
            <sphereGeometry args={[0.016, 18, 14]} />
          </mesh>
          <mesh
            position={[0, 0.128, -0.042]}
            rotation={[-Math.PI / 2.5, 0, 0]}
            material={matChrome}
            castShadow
          >
            <cylinderGeometry args={[0.009, 0.0105, 0.092, 16]} />
          </mesh>
          <mesh position={[0, 0.102, -0.082]} material={matChrome} castShadow>
            <cylinderGeometry args={[0.0125, 0.01, 0.016, 16]} />
          </mesh>
          <mesh
            position={[0, 0.158, 0.014]}
            rotation={[0.4, 0, 0]}
            material={matChrome}
            castShadow
          >
            <boxGeometry args={[0.01, 0.007, 0.04]} />
          </mesh>
        </group>

        {/* Generic pump bottles (no logos) — right rear like reference */}
        <group position={[0.16, ves.h, 0.06]}>
          <mesh position={[0, 0.055, 0]} material={matBottle} castShadow>
            <cylinderGeometry args={[0.022, 0.024, 0.1, 16]} />
          </mesh>
          <mesh position={[0, 0.112, 0]} material={matPump}>
            <cylinderGeometry args={[0.012, 0.018, 0.02, 12]} />
          </mesh>
          <mesh position={[0, 0.145, 0]} material={matPump} castShadow>
            <cylinderGeometry args={[0.008, 0.01, 0.048, 10]} />
          </mesh>
          <mesh position={[0.012, 0.168, 0]} material={matPump}>
            <sphereGeometry args={[0.01, 10, 8]} />
          </mesh>
        </group>
        <group position={[0.21, ves.h, 0.02]} scale={[0.88, 0.82, 0.88]}>
          <mesh position={[0, 0.055, 0]} material={matBottle} castShadow>
            <cylinderGeometry args={[0.022, 0.024, 0.1, 16]} />
          </mesh>
          <mesh position={[0, 0.112, 0]} material={matPump}>
            <cylinderGeometry args={[0.012, 0.018, 0.02, 12]} />
          </mesh>
          <mesh position={[0, 0.145, 0]} material={matPump}>
            <cylinderGeometry args={[0.008, 0.01, 0.048, 10]} />
          </mesh>
        </group>
      </group>

      {/* Weak key for porcelain spec — local, does not wash the house */}
      <pointLight
        position={[0.05, deckY + 0.55, -0.22]}
        intensity={0.22}
        distance={1.4}
        decay={2}
        color="#fff4e8"
      />
    </group>
  );
}
