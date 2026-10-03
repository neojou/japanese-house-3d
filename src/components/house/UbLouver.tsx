import { useGLTF } from "@react-three/drei";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { PROP_1F_UB_LOUVER } from "@/data/dimensions";
import { ubLouverOrigin, UB_LOUVER_GLB } from "@/lib/ubLouver";

function heroUrl(): string {
  const rel = UB_LOUVER_GLB.replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${rel}`;
}

useGLTF.preload(heroUrl());

function queryOpen(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("louver") === "open";
}

function tuneMaterial(mesh: THREE.Mesh): void {
  const src = mesh.material;
  if (!src || Array.isArray(src)) return;
  if (!(src instanceof THREE.MeshStandardMaterial)) return;
  const n = `${mesh.name}${src.name}${mesh.parent?.name ?? ""}`.toLowerCase();
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (n.includes("glass")) {
    const phys = new THREE.MeshPhysicalMaterial({
      color: src.color,
      roughness: 0.04,
      metalness: 0,
      transmission: 0.92,
      thickness: 0.006,
      ior: 1.5,
      transparent: true,
      opacity: 1,
      envMapIntensity: 1.15,
    });
    src.dispose();
    mesh.material = phys;
    return;
  }
  if (n.includes("gasket") || n.includes("pin") || n.includes("bead")) {
    src.metalness = 0;
    src.roughness = Math.max(src.roughness, 0.68);
    src.envMapIntensity = 0.2;
    src.needsUpdate = true;
    return;
  }
  src.metalness = Math.max(src.metalness, 0.86);
  src.roughness = THREE.MathUtils.clamp(src.roughness, 0.22, 0.42);
  src.envMapIntensity = 1.12;
  src.needsUpdate = true;
}

/**
 * 1F UB east 目隠し可動ルーバー overlay. Click blades or the interior
 * lever to rotate 0°–88°. Default closed (bathroom privacy).
 */
export function UbLouver() {
  const spec = PROP_1F_UB_LOUVER;
  const origin = ubLouverOrigin();
  const gltf = useGLTF(heroUrl());
  const [open, setOpen] = useState(queryOpen);
  const amount = useRef(open ? 1 : 0);

  const { root, blades, slider, sliderY0 } = useMemo(() => {
    const g = gltf.scene.clone(true);
    g.updateMatrixWorld(true);
    const list: THREE.Object3D[] = [];
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) tuneMaterial(o as THREE.Mesh);
      if (/^Blade_\d{2}$/.test(o.name)) list.push(o);
      if (
        o.name.startsWith("Blade") ||
        o.name.startsWith("Pin_") ||
        o.name.startsWith("Operator_")
      ) {
        o.userData.interactable = "louver";
      }
    });
    list.sort((a, b) => a.name.localeCompare(b.name));
    const slide = g.getObjectByName("Operator_Slider") ?? null;
    return {
      root: g,
      blades: list,
      slider: slide,
      sliderY0: slide ? slide.position.y : 0,
    };
  }, [gltf.scene]);

  useLayoutEffect(() => {
    root.traverse((o) => {
      if (o.userData.interactable === "louver") return;
      const n = o.name;
      if (
        n.startsWith("Frame_") ||
        n.startsWith("Sash_") ||
        n.startsWith("Operator_")
      ) {
        o.userData.interactable = "louver";
      }
    });
  }, [root]);

  useFrame((_, dt) => {
    const target = open ? 1 : 0;
    amount.current = THREE.MathUtils.damp(amount.current, target, 8, dt);
    const t = amount.current;
    const deg = spec.closedDeg + (spec.openDeg - spec.closedDeg) * t;
    const rad = THREE.MathUtils.degToRad(deg);
    for (const b of blades) b.rotation.z = rad;
    if (slider) slider.position.y = sliderY0 + 0.28 * t;
  });

  const onClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    let n: THREE.Object3D | null = e.object;
    while (n) {
      if (n.userData.interactable === "louver") {
        e.stopPropagation();
        setOpen((v) => !v);
        return;
      }
      n = n.parent;
    }
  }, []);

  const onOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    let n: THREE.Object3D | null = e.object;
    while (n) {
      if (n.userData.interactable === "louver") {
        document.body.style.cursor = "pointer";
        return;
      }
      n = n.parent;
    }
  }, []);

  const onOut = useCallback(() => {
    document.body.style.cursor = "auto";
  }, []);

  return (
    <group name={spec.id} position={[origin.x, origin.y, origin.z]}>
      <primitive
        object={root}
        onClick={onClick}
        onPointerOver={onOver}
        onPointerOut={onOut}
        userData={{ interactable: "louver" }}
      />
    </group>
  );
}
