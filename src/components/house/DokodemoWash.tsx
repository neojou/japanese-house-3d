import { useGLTF } from "@react-three/drei";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { PROP_2F_SINK } from "@/data/dimensions";

/**
 * 2F wall handwash (どこでも手洗 inspired, Path B glTF).
 * tools/dcc/build_dokodemo_wash.py → public/models/hero/dokodemo-wash.glb
 *
 * Local: floor y=0, +Z toward the wall, faucet at +X. Click the mixer for a stream.
 * Materials stay glTF metallic-roughness; scene HDR is the IBL. No embedded lights.
 */

function washUrl(): string {
  const rel = PROP_2F_SINK.gltf.replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${rel}`;
}

useGLTF.preload(washUrl());

export function DokodemoWash() {
  const p = PROP_2F_SINK;
  const gltf = useGLTF(washUrl());
  const root = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const [flow, setFlow] = useState(false);
  const stream = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) {
        if (o.name.startsWith("Hero_DokodemoFaucet")) o.userData.interactable = "faucet";
        return;
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      let climb: THREE.Object3D | null = o;
      while (climb) {
        if (climb.name.startsWith("Hero_DokodemoFaucet")) {
          o.userData.interactable = "faucet";
          break;
        }
        climb = climb.parent;
      }
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (!(m instanceof THREE.MeshStandardMaterial)) continue;
        const n = (m.name || mesh.name).toLowerCase();
        if (n.includes("chrome")) {
          m.metalness = 1;
          m.roughness = Math.min(m.roughness, 0.14);
          m.envMapIntensity = 1.2;
        } else if (n.includes("mirror")) {
          m.metalness = 0.92;
          m.roughness = 0.05;
          m.envMapIntensity = 1.25;
        } else if (n.includes("bowl") || n.includes("inner")) {
          m.metalness = 0.02;
          m.envMapIntensity = 0.85;
        } else if (n.includes("wood")) {
          m.metalness = 0.02;
          m.envMapIntensity = 0.4;
        } else {
          m.metalness = Math.min(m.metalness, 0.08);
          m.envMapIntensity = 0.35;
        }
        m.needsUpdate = true;
      }
    });
  }, [root]);

  useFrame((_, dt) => {
    if (!stream.current) return;
    const s = THREE.MathUtils.damp(stream.current.scale.y, flow ? 1 : 0.001, 10, dt);
    stream.current.scale.y = s;
    stream.current.visible = s > 0.04;
  });

  const onClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    let node: THREE.Object3D | null = e.object;
    while (node) {
      if (node.name.startsWith("Hero_DokodemoFaucet")) {
        e.stopPropagation();
        setFlow((v) => !v);
        return;
      }
      node = node.parent;
    }
  }, []);

  return (
    <group name="dokodemo-wash">
      <primitive
        object={root}
        onClick={onClick}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          let n: THREE.Object3D | null = e.object;
          while (n) {
            if (n.name.startsWith("Hero_DokodemoFaucet")) {
              document.body.style.cursor = "pointer";
              return;
            }
            n = n.parent;
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      />
      <mesh
        ref={stream}
        position={[p.stream.x, p.stream.y, p.stream.z]}
        visible={false}
      >
        <cylinderGeometry args={[0.004, 0.005, p.stream.h, 8]} />
        <meshPhysicalMaterial
          color="#c5d8e4"
          transparent
          opacity={0.45}
          roughness={0.08}
          metalness={0}
          transmission={0.4}
        />
      </mesh>
    </group>
  );
}
