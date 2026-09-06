import { useGLTF } from "@react-three/drei";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useViewerStore } from "@/store/useViewerStore";

/** Archived full-house bake — opt-in via `?houseGltf=1`, not the default scene. */
const GLB_URL = `${import.meta.env.BASE_URL}models/archive/house-full-box-bevel.glb`;

type SwingBind = {
  kind: "swing" | "genkan";
  object: THREE.Object3D;
  doorId: string;
  baseYaw: number;
  openSign: number;
  openAngleDeg: number;
  angle: number;
};

type SlideBind = {
  kind: "slide";
  object: THREE.Object3D;
  doorId: string;
  axis: "x" | "z";
  dir: number;
  travel: number;
  closed: number;
  t: number;
};

type DoorBind = SwingBind | SlideBind;

function extrasOf(o: THREE.Object3D): Record<string, unknown> {
  return (o.userData ?? {}) as Record<string, unknown>;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" ? v : fallback;
}

/**
 * Archived full-house GLB (opt-in). Collision / height still from dimensions.ts.
 */
export function HouseGltf() {
  const gltf = useGLTF(GLB_URL);
  const doorOpen = useViewerStore((s) => s.doorOpen);
  const toggleDoor = useViewerStore((s) => s.toggleDoor);
  const bindsRef = useRef<DoorBind[]>([]);
  const openRef = useRef(doorOpen);
  openRef.current = doorOpen;

  const scene = useMemo(() => gltf.scene, [gltf.scene]);

  useLayoutEffect(() => {
    const binds: DoorBind[] = [];
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
      const ex = extrasOf(o);
      const doorId = typeof ex.doorId === "string" ? ex.doorId : null;
      if (!doorId) return;
      o.userData.interactable = "door";
      o.userData.doorId = doorId;
      const kind = ex.kind;
      if (kind === "swing" || kind === "genkan") {
        binds.push({
          kind,
          object: o,
          doorId,
          baseYaw: num(ex.baseYaw, o.rotation.y),
          openSign: num(ex.openSign, 1),
          openAngleDeg: num(ex.openAngleDeg, 90),
          angle: 0,
        });
      } else if (kind === "slide") {
        const axis = ex.along === "z" ? "z" : "x";
        binds.push({
          kind: "slide",
          object: o,
          doorId,
          axis,
          dir: num(ex.dir, -1),
          travel: num(ex.travel, 0.6),
          closed: axis === "z" ? o.position.z : o.position.x,
          t: 0,
        });
      }
    });
    bindsRef.current = binds;
  }, [scene]);

  useFrame((_, dt) => {
    const openMap = openRef.current;
    for (const b of bindsRef.current) {
      const open = !!openMap[b.doorId];
      if (b.kind === "slide") {
        const target = open ? 1 : 0;
        b.t = THREE.MathUtils.damp(b.t, target, 8, dt);
        const along = b.closed + b.dir * b.travel * b.t;
        if (b.axis === "z") b.object.position.z = along;
        else b.object.position.x = along;
      } else {
        const target = open
          ? b.openSign * THREE.MathUtils.degToRad(b.openAngleDeg)
          : 0;
        b.angle = THREE.MathUtils.damp(b.angle, target, 10, dt);
        b.object.rotation.y = b.baseYaw + b.angle;
      }
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    let o: THREE.Object3D | null = e.object;
    while (o) {
      const id = o.userData?.doorId;
      if (typeof id === "string") {
        toggleDoor(id);
        return;
      }
      o = o.parent;
    }
  };

  return (
    <primitive
      object={scene}
      onClick={onClick}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        let o: THREE.Object3D | null = e.object;
        while (o) {
          if (typeof o.userData?.doorId === "string") {
            document.body.style.cursor = "pointer";
            return;
          }
          o = o.parent;
        }
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    />
  );
}

useGLTF.preload(GLB_URL);
