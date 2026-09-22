import { useGLTF } from "@react-three/drei";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { PROP_1F_LDK_KITCHEN } from "@/data/dimensions";

/**
 * 1F LDK Noct 壁付 I 型 hero (tokonoma-card).
 * West-wall tall storage is not part of this run.
 * Path B glTF: tools/dcc/build_kitchen_noct.py → public/models/hero/kitchen-noct.glb
 * Sink drawers click open toward the cook (west). Faucet click runs a short stream.
 */

function kitchenUrl(): string {
  const rel = PROP_1F_LDK_KITCHEN.gltf.replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${rel}`;
}

useGLTF.preload(kitchenUrl());

export function KitchenDisplay() {
  const k = PROP_1F_LDK_KITCHEN;
  const gltf = useGLTF(kitchenUrl());
  const root = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const drawers = useMemo(() => {
    const found: THREE.Object3D[] = [];
    root.traverse((o) => {
      if (/^Drawer_Sink_\d+$/.test(o.name)) found.push(o);
    });
    found.sort((a, b) => a.name.localeCompare(b.name));
    return found;
  }, [root]);
  const closedX = useRef<number[]>([]);
  const [open, setOpen] = useState<boolean[]>([]);
  const [flow, setFlow] = useState(false);
  const stream = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    closedX.current = drawers.map((n) => n.position.x);
    setOpen(drawers.map(() => false));
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.castShadow = !o.name.includes("plate");
      o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!(m instanceof THREE.MeshStandardMaterial)) continue;
        const n = (m.name || o.name).toLowerCase();
        if (n.includes("chrome") || n.includes("steel") || n.includes("ih") || n.includes("hood")) {
          m.envMapIntensity = n.includes("chrome") ? 1.15 : 0.7;
          m.needsUpdate = true;
        }
      }
    });
  }, [root, drawers]);

  useFrame((_, dt) => {
    drawers.forEach((n, i) => {
      const base = closedX.current[i] ?? n.position.x;
      const target = base - (open[i] ? k.drawerTravel : 0);
      n.position.x = THREE.MathUtils.damp(n.position.x, target, 8, dt);
    });
    if (stream.current) {
      const s = THREE.MathUtils.damp(stream.current.scale.y, flow ? 1 : 0.001, 10, dt);
      stream.current.scale.y = s;
      stream.current.visible = s > 0.04;
    }
  });

  const onClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    let node: THREE.Object3D | null = e.object;
    while (node) {
      if (/^Drawer_Sink_\d+$/.test(node.name)) {
        e.stopPropagation();
        const idx = Number(node.name.slice("Drawer_Sink_".length));
        setOpen((prev) => {
          const next = prev.slice();
          next[idx] = !next[idx];
          return next;
        });
        return;
      }
      if (node.name.startsWith("Hero_KitchenFaucet")) {
        e.stopPropagation();
        setFlow((v) => !v);
        return;
      }
      node = node.parent;
    }
  }, []);

  return (
    <group name={k.label} position={[k.originX, k.y, k.originZ]}>
      <primitive
        object={root}
        onClick={onClick}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          const n = e.object.name;
          if (n.startsWith("Drawer_Sink_") || n.startsWith("Hero_KitchenFaucet")) {
            document.body.style.cursor = "pointer";
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      />
      {/* Stream under the spout (local metres). */}
      <mesh ref={stream} position={[0.40, 0.86, 1.46]} visible={false}>
        <cylinderGeometry args={[0.004, 0.005, 0.26, 8]} />
        <meshPhysicalMaterial
          color="#c5d8e4"
          transparent
          opacity={0.45}
          roughness={0.08}
          transmission={0.4}
        />
      </mesh>
      <pointLight
        position={[0.28, 1.48, 0.38]}
        intensity={k.light.intensity}
        distance={k.light.distance}
        decay={2}
        color={k.light.color}
      />
    </group>
  );
}
