import { useGLTF } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import {
  SL_CANON_H,
  SL_CANON_W,
  SL_PH_W,
  SL_ROOT,
  STANDARD_LABEL_GLB,
  type StandardLabelKind,
} from "@/lib/standardLabelDoor";

/**
 * One Standard Label leaf from the shared Path B GLB.
 * Wood stays dielectric; chrome lever and frosted acrylic pick up the scene HDR.
 * No useFrame here — the parent door owns the open motion at priority 0.
 */

function doorUrl(): string {
  const rel = STANDARD_LABEL_GLB.replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${rel}`;
}

useGLTF.preload(doorUrl());

function tuneMaterial(m: THREE.Material): void {
  if (!(m instanceof THREE.MeshStandardMaterial)) return;
  const n = (m.name || "").toLowerCase();
  m.side = THREE.DoubleSide;
  if (n.includes("frost")) {
    const phys = m as THREE.MeshPhysicalMaterial;
    phys.metalness = 0;
    phys.roughness = Math.max(phys.roughness, 0.28);
    if ("transmission" in phys) {
      phys.transmission = 0.88;
      phys.thickness = 0.008;
      phys.ior = 1.45;
    }
    phys.envMapIntensity = 0.85;
  } else if (n.includes("chrome")) {
    m.metalness = 1;
    m.roughness = Math.min(m.roughness, 0.16);
    m.envMapIntensity = 1.25;
  } else if (n.includes("steel")) {
    m.metalness = 0.86;
    m.roughness = 0.32;
    m.envMapIntensity = 0.9;
  } else {
    m.metalness = 0.02;
    m.envMapIntensity = 0.62;
  }
  m.needsUpdate = true;
}

export function StandardLabelLeaf({
  kind,
  leafW,
  leafH,
  handleSign,
  anchor,
  yaw = 0,
  onClick,
}: {
  kind: StandardLabelKind;
  leafW: number;
  leafH: number;
  /** +1 keeps the lever on local +X. −1 mirrors it onto the other stile. */
  handleSign: 1 | -1;
  /** Hinge parent origin is the hinge. Center parent origin is the leaf centre. */
  anchor: "hinge" | "center";
  yaw?: number;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const gltf = useGLTF(doorUrl());
  const root = useMemo(() => {
    const src = gltf.scene.getObjectByName(SL_ROOT[kind]);
    if (!src) {
      throw new Error(`standard-label GLB missing ${SL_ROOT[kind]}`);
    }
    return src.clone(true);
  }, [gltf.scene, kind]);

  useLayoutEffect(() => {
    root.traverse((o) => {
      o.userData.interactable = "door";
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) tuneMaterial(m);
    });
  }, [root]);

  const canonW = kind === "ph" ? SL_PH_W : SL_CANON_W;
  const sx = handleSign * (leafW / canonW);
  const sy = leafH / SL_CANON_H;
  const px = anchor === "hinge" ? (handleSign * leafW) / 2 : 0;

  return (
    <primitive
      object={root}
      position={[px, leafH / 2, 0]}
      rotation={[0, yaw, 0]}
      scale={[sx, sy, 1]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick(e);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    />
  );
}
