import { useGLTF } from "@react-three/drei";
import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { PROP_1F_SENMEN, SENMEN_1F } from "@/data/dimensions";
import { createInteriorCubeEnv } from "@/lib/interiorEnvMap";
import { senmenProbePlanFrom } from "@/lib/senmenMirror";

/**
 * 1F senmen Piara-inspired vanity (tokonoma-card, Path B glTF).
 * tools/dcc/build_senmen_piara.py → public/models/hero/senmen-piara.glb
 *
 * Drawers pull −Z; CabDoor_R / MirrorDoor_R swing −Y; L/C swing +Y.
 * Three glass panes parent to MirrorDoor_*; CubeCamera stays in plan space
 * (do not overwrite with world). Click faucet for a short stream.
 */

function piaraUrl(): string {
  const rel = PROP_1F_SENMEN.piara.gltf.replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${rel}`;
}

useGLTF.preload(piaraUrl());

const PANEL_W = PROP_1F_SENMEN.piara.w / 3;
const GLASS_W = PANEL_W - 0.014;
const GLASS_H = PROP_1F_SENMEN.piara.mirrorH - 0.06;

type SenmenPiaraProps = {
  position: [number, number, number];
};

export function SenmenPiara({ position }: SenmenPiaraProps) {
  const p = PROP_1F_SENMEN;
  const pi = p.piara;
  const { gl, scene } = useThree();
  const gltf = useGLTF(piaraUrl());
  const root = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  const drawers = useMemo(() => {
    const found: THREE.Object3D[] = [];
    root.traverse((o) => {
      if (/^Drawer_L\d+$/.test(o.name)) found.push(o);
    });
    found.sort((a, b) => a.name.localeCompare(b.name));
    return found;
  }, [root]);

  const cabDoor = useMemo(
    () => root.getObjectByName("CabDoor_R") ?? null,
    [root],
  );

  const mirrorDoors = useMemo(() => {
    return ["MirrorDoor_L", "MirrorDoor_C", "MirrorDoor_R"]
      .map((id) => root.getObjectByName(id))
      .filter((o): o is THREE.Object3D => Boolean(o));
  }, [root]);

  const closedZ = useRef<number[]>([]);
  const [openDraw, setOpenDraw] = useState<boolean[]>([]);
  const [openCab, setOpenCab] = useState(false);
  const [openMirror, setOpenMirror] = useState([false, false, false]);
  const [flow, setFlow] = useState(false);
  const stream = useRef<THREE.Mesh>(null);
  const glassMeshes = useRef<THREE.Mesh[]>([]);
  const frames = useRef(0);
  const shots = useRef(0);

  const fallback = useMemo(() => createInteriorCubeEnv(), []);
  const rt = useMemo(
    () =>
      new THREE.WebGLCubeRenderTarget(256, {
        type: THREE.HalfFloatType,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
      }),
    [],
  );
  const cubeCam = useMemo(() => new THREE.CubeCamera(0.18, 12, rt), [rt]);
  const glassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e4eaf0",
        roughness: 0.04,
        metalness: 0.96,
        envMap: fallback,
        envMapIntensity: 1.28,
      }),
    [fallback],
  );
  const glassGeo = useMemo(
    () => new THREE.BoxGeometry(GLASS_W, GLASS_H, 0.004),
    [],
  );

  const probeLocal = useMemo(() => {
    const pr = senmenProbePlanFrom(p.vanity.x, p.y, SENMEN_1F.z0, SENMEN_1F.z1);
    return [pr.x - position[0], pr.y - position[1], pr.z - position[2]] as [
      number,
      number,
      number,
    ];
  }, [p.vanity.x, p.y, position]);

  useLayoutEffect(() => {
    closedZ.current = drawers.map((n) => n.position.z);
    setOpenDraw(drawers.map(() => false));
    const q = new URLSearchParams(window.location.search);
    if (q.get("cabOpen") === "1") {
      setOpenDraw(drawers.map(() => true));
      setOpenCab(true);
    }
    if (q.get("mirrorOpen") === "1") {
      setOpenMirror([true, true, true]);
    }

    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) {
        if (/^(Drawer_L\d+|CabDoor_R|MirrorDoor_[LCR])$/.test(o.name)) {
          o.userData.interactable = "door";
        }
        if (o.name.startsWith("Hero_PiaraFaucet") || o.name.startsWith("Hero_PiaraMixer")) {
          o.userData.interactable = "faucet";
        }
        return;
      }
      o.castShadow = true;
      o.receiveShadow = true;
      let climb: THREE.Object3D | null = o;
      while (climb) {
        if (/^(Drawer_L\d+|CabDoor_R|MirrorDoor_[LCR])$/.test(climb.name)) {
          o.userData.interactable = "door";
          break;
        }
        if (
          climb.name.startsWith("Hero_PiaraFaucet") ||
          climb.name.startsWith("Hero_PiaraMixer")
        ) {
          o.userData.interactable = "faucet";
          break;
        }
        climb = climb.parent;
      }
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!(m instanceof THREE.MeshStandardMaterial)) continue;
        const n = (m.name || o.name).toLowerCase();
        if (n.includes("chrome") || n.includes("steel")) {
          m.envMapIntensity = n.includes("chrome") ? 1.2 : 0.75;
          m.needsUpdate = true;
        } else if (n.includes("bowl")) {
          m.envMapIntensity = 0.85;
          m.needsUpdate = true;
        } else if (n.includes("white") || n.includes("tray")) {
          m.envMapIntensity = 0.38;
          m.needsUpdate = true;
        }
      }
    });

    const created: THREE.Mesh[] = [];
    for (const door of mirrorDoors) {
      const dir = door.name.endsWith("_R") ? -1 : 1;
      const mesh = new THREE.Mesh(glassGeo, glassMat);
      mesh.name = `${door.name}_glass`;
      mesh.position.set(dir * (PANEL_W / 2), 0, -0.008);
      mesh.userData.interactable = "door";
      mesh.castShadow = true;
      door.add(mesh);
      created.push(mesh);
    }
    glassMeshes.current = created;

    return () => {
      for (const mesh of created) {
        mesh.parent?.remove(mesh);
      }
    };
  }, [root, drawers, mirrorDoors, glassGeo, glassMat]);

  useLayoutEffect(() => {
    return () => {
      rt.dispose();
      glassMat.dispose();
      glassGeo.dispose();
    };
  }, [rt, glassMat, glassGeo]);

  useFrame((_, dt) => {
    drawers.forEach((n, i) => {
      const base = closedZ.current[i] ?? n.position.z;
      const target = base - (openDraw[i] ? pi.drawerTravel : 0);
      n.position.z = THREE.MathUtils.damp(n.position.z, target, 8, dt);
    });
    if (cabDoor) {
      const target = openCab ? -pi.doorOpen : 0;
      cabDoor.rotation.y = THREE.MathUtils.damp(cabDoor.rotation.y, target, 8, dt);
    }
    mirrorDoors.forEach((n, i) => {
      const sign = n.name.endsWith("_R") ? -1 : 1;
      const target = openMirror[i] ? sign * pi.mirrorOpen : 0;
      n.rotation.y = THREE.MathUtils.damp(n.rotation.y, target, 8, dt);
    });
    if (stream.current) {
      const s = THREE.MathUtils.damp(stream.current.scale.y, flow ? 1 : 0.001, 10, dt);
      stream.current.scale.y = s;
      stream.current.visible = s > 0.04;
    }

    frames.current += 1;
    if (frames.current < 75) return;
    if (shots.current >= 3) return;
    if ((frames.current - 75) % 45 !== 0) return;
    const hidden = glassMeshes.current;
    try {
      for (const m of hidden) m.visible = false;
      // cubeCam is parented in plan space — do not overwrite with world
      cubeCam.updateMatrixWorld();
      cubeCam.update(gl, scene);
      glassMat.envMap = rt.texture;
      glassMat.needsUpdate = true;
      shots.current += 1;
    } catch {
      /* keep fallback */
    } finally {
      for (const m of hidden) m.visible = true;
    }
  });

  const onClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    let node: THREE.Object3D | null = e.object;
    while (node) {
      if (/^Drawer_L\d+$/.test(node.name)) {
        e.stopPropagation();
        const idx = Number(node.name.slice("Drawer_L".length));
        setOpenDraw((prev) => {
          const next = prev.slice();
          next[idx] = !next[idx];
          return next;
        });
        return;
      }
      if (node.name === "CabDoor_R") {
        e.stopPropagation();
        setOpenCab((v) => !v);
        return;
      }
      if (/^MirrorDoor_[LCR]/.test(node.name)) {
        e.stopPropagation();
        const tag = node.name.charAt("MirrorDoor_".length);
        const idx = tag === "L" ? 0 : tag === "C" ? 1 : 2;
        setOpenMirror((prev) => {
          const next = prev.slice();
          next[idx] = !next[idx];
          return next;
        });
        return;
      }
      if (
        node.name.startsWith("Hero_PiaraFaucet") ||
        node.name.startsWith("Hero_PiaraMixer")
      ) {
        e.stopPropagation();
        setFlow((v) => !v);
        return;
      }
      node = node.parent;
    }
  }, []);

  const onOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    let n: THREE.Object3D | null = e.object;
    while (n) {
      if (
        /^Drawer_L/.test(n.name) ||
        n.name.startsWith("CabDoor_R") ||
        n.name.startsWith("MirrorDoor_") ||
        n.name.startsWith("Hero_PiaraFaucet") ||
        n.name.startsWith("Hero_PiaraMixer")
      ) {
        document.body.style.cursor = "pointer";
        return;
      }
      n = n.parent;
    }
  }, []);

  return (
    <group name="senmen-piara" position={position}>
      <primitive
        object={root}
        onClick={onClick}
        onPointerOver={onOver}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      />
      {/* Inherits plan-mirror; local = plan meters */}
      <primitive object={cubeCam} position={probeLocal} />
      <mesh
        ref={stream}
        position={[pi.stream.x, pi.stream.y, pi.stream.z]}
        visible={false}
      >
        <cylinderGeometry args={[0.004, 0.005, pi.stream.h, 8]} />
        <meshPhysicalMaterial
          color="#c5d8e4"
          transparent
          opacity={0.45}
          roughness={0.08}
          transmission={0.4}
        />
      </mesh>
      <pointLight
        position={[pi.w / 2, pi.bowlH + 0.16, pi.d - pi.mirrorD + 0.02]}
        intensity={p.light.intensity}
        distance={p.light.distance}
        decay={2}
        color={p.light.color}
        castShadow={false}
      />
    </group>
  );
}
