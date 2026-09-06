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

/**
 * Hero genkan door overlay. Mesh only — yaki material from houseMaterials.
 * Parent this at the hinge; pass `staticFrame` for the non-rotating frame.
 */
export function GenkanDoorHero({
  material,
  ptr,
  part,
}: {
  material: THREE.MeshStandardMaterial;
  ptr: Ptr;
  part: "door" | "frame";
}) {
  const gltf = useGLTF(HERO_URL);
  const group = useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    const pred =
      part === "door"
        ? (n: string) =>
            n.startsWith("Hero_GenkanDoor") || n.startsWith("board-")
        : (n: string) =>
            n.startsWith("Hero_GenkanFrame") || n.startsWith("frame-");
    return cloneNamed(gltf.scene, pred);
  }, [gltf.scene, part]);

  useLayoutEffect(() => {
    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = material;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.interactable = "door";
      mesh.userData.doorId = "genkan";
    });
  }, [group, material]);

  return <primitive object={group} userData={{ interactable: "door" }} {...ptr} />;
}

useGLTF.preload(HERO_URL);
