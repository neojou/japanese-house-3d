import { useGLTF } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";

const HERO_URL = `${import.meta.env.BASE_URL}models/hero/genkan-door.glb`;

type Ptr = {
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
};

function cloneNamed(
  scene: THREE.Object3D,
  pred: (name: string) => boolean,
): THREE.Group {
  const g = new THREE.Group();
  const wp = new THREE.Vector3();
  const wq = new THREE.Quaternion();
  const ws = new THREE.Vector3();
  scene.traverse((o) => {
    const src = o as THREE.Mesh;
    if (!src.isMesh) return;
    let p: THREE.Object3D | null = o;
    let hit = false;
    while (p) {
      if (pred(p.name)) {
        hit = true;
        break;
      }
      p = p.parent;
    }
    if (!hit) return;
    const mesh = src.clone();
    if (src.material) {
      mesh.material = Array.isArray(src.material)
        ? src.material.map((m) => m.clone())
        : src.material.clone();
    }
    src.getWorldPosition(wp);
    src.getWorldQuaternion(wq);
    src.getWorldScale(ws);
    mesh.position.copy(wp);
    mesh.quaternion.copy(wq);
    mesh.scale.copy(ws);
    g.add(mesh);
  });
  return g;
}

function enhanceMaterials(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.interactable = "door";
    mesh.userData.doorId = "genkan";
    const name = mesh.name + (mesh.parent?.name ?? "");
    const src = mesh.material as THREE.MeshStandardMaterial;
    if (!src || Array.isArray(mesh.material)) return;
    if (/glass/i.test(name) || /Glass/.test(mesh.name)) {
      const phys = new THREE.MeshPhysicalMaterial({
        color: src.color,
        roughness: 0.16,
        metalness: 0,
        transmission: 0.72,
        thickness: 0.012,
        ior: 1.48,
        transparent: true,
        opacity: 0.82,
        envMapIntensity: 1.15,
      });
      src.dispose();
      mesh.material = phys;
      return;
    }
    src.envMapIntensity = src.metalness > 0.3 ? 0.85 : 0.28;
  });
}

/**
 * Giesta-inspired hero. Keep baked PBR; only boost glass + shadows for R3F.
 */
export function GenkanDoorHero({
  ptr,
  part,
}: {
  ptr: Ptr;
  part: "door" | "frame";
}) {
  const gltf = useGLTF(HERO_URL);
  const group = useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    const pred =
      part === "door"
        ? (n: string) =>
            /Hero_GenkanDoor|Hero_GenkanGlass|Hero_GenkanSlat|Hero_GenkanHandle|Hero_GenkanHinge|^board-/.test(
              n,
            )
        : (n: string) =>
            /Hero_GenkanFrame|^frame-/.test(n);
    const g = cloneNamed(gltf.scene, pred);
    enhanceMaterials(g);
    return g;
  }, [gltf.scene, part]);

  useLayoutEffect(() => {
    group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.userData.interactable = "door";
        o.userData.doorId = "genkan";
      }
    });
  }, [group]);

  return (
    <primitive object={group} userData={{ interactable: "door" }} {...ptr} />
  );
}

useGLTF.preload(HERO_URL);
