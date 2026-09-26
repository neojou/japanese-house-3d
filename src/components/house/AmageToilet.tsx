import { useGLTF } from "@react-three/drei";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SIT_TOILET } from "@/data/dimensions";

/**
 * Amage シャワートイレ inspired sit fixture (tokonoma-card, Path B glTF).
 * tools/dcc/build_amage_toilet.py → public/models/hero/amage-toilet.glb
 *
 * Local: floor y=0, tank −X, sit +X. Click lid / seat; lid rotation.z toward the tank.
 * No LIXIL / INAX / アメージュ marks.
 */

function amageUrl(): string {
  const rel = SIT_TOILET.gltf.replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${rel}`;
}

useGLTF.preload(amageUrl());

type AmageToiletProps = {
  position: [number, number, number];
};

export function AmageToilet({ position }: AmageToiletProps) {
  const gltf = useGLTF(amageUrl());
  const root = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const lid = useMemo(() => root.getObjectByName("Lid") ?? null, [root]);
  const seat = useMemo(() => root.getObjectByName("Seat") ?? null, [root]);
  const [lidOpen, setLidOpen] = useState(false);
  const [seatOpen, setSeatOpen] = useState(false);

  useLayoutEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("lidOpen") === "1") {
      setLidOpen(true);
    }
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (!(m instanceof THREE.MeshStandardMaterial)) continue;
          const n = (m.name || o.name).toLowerCase();
          if (n.includes("chrome") || n.includes("hose")) {
            m.envMapIntensity = n.includes("chrome") ? 1.2 : 0.7;
            m.needsUpdate = true;
          } else if (n.includes("ceramic") || n.includes("inner")) {
            m.envMapIntensity = 0.85;
            m.needsUpdate = true;
          } else if (n.includes("seat")) {
            m.envMapIntensity = 0.4;
            m.needsUpdate = true;
          }
        }
      }
      let climb: THREE.Object3D | null = o;
      while (climb) {
        if (climb.name === "Lid" || climb.name.startsWith("Lid_")) {
          o.userData.interactable = "door";
          break;
        }
        if (climb.name === "Seat" || climb.name.startsWith("Seat_")) {
          o.userData.interactable = "door";
          break;
        }
        climb = climb.parent;
      }
    });
  }, [root]);

  useFrame((_, dt) => {
    if (lid) {
      const target = lidOpen ? SIT_TOILET.lidOpenRad : 0;
      lid.rotation.z = THREE.MathUtils.damp(lid.rotation.z, target, 7, dt);
    }
    if (seat) {
      const target = seatOpen ? SIT_TOILET.seatOpenRad : 0;
      seat.rotation.z = THREE.MathUtils.damp(seat.rotation.z, target, 7, dt);
    }
  });

  const onClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    let node: THREE.Object3D | null = e.object;
    while (node) {
      if (node.name === "Lid" || node.name.startsWith("Lid_")) {
        e.stopPropagation();
        setLidOpen((v) => {
          if (v) setSeatOpen(false);
          return !v;
        });
        return;
      }
      if (node.name === "Seat" || node.name.startsWith("Seat_")) {
        e.stopPropagation();
        setSeatOpen((v) => {
          if (!lidOpen) {
            setLidOpen(true);
            return false;
          }
          return !v;
        });
        return;
      }
      node = node.parent;
    }
  }, [lidOpen]);

  const onOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    let n: THREE.Object3D | null = e.object;
    while (n) {
      if (n.name === "Lid" || n.name.startsWith("Lid_") || n.name === "Seat" || n.name.startsWith("Seat_")) {
        document.body.style.cursor = "pointer";
        return;
      }
      n = n.parent;
    }
  }, []);

  return (
    <group name="amage-toilet" position={position}>
      <primitive
        object={root}
        onClick={onClick}
        onPointerOver={onOver}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      />
      {/* Pool in the inner bowl (GLB local). */}
      <mesh position={[0.12, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.09, 24]} />
        <meshPhysicalMaterial
          color="#9eb8c4"
          transparent
          opacity={0.42}
          roughness={0.08}
          transmission={0.35}
          thickness={0.02}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
