
import { useGLTF } from "@react-three/drei";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { PROP_1F_SENMEN } from "@/data/dimensions";
import {
  createHinokiMaterial,
  ensureFaçadeTextures,
} from "@/lib/houseMaterials";
import {
  SENMEN_PLUMBING,
  senmenWasteSegments,
} from "@/lib/senmenPlumbing";

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
        o.castShadow = n.includes("outer") || n.includes("rim");
      }
      o.receiveShadow = true;
    });
    return g;
  }, [gltf.scene, matPorcelain, matInner]);
  return <primitive object={root} />;
}

function cabinetStartsOpen(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("cabOpen") === "1";
}

function CabinetLeaf({
  hingeX,
  hingeY,
  hingeZ,
  leafDir,
  doorW,
  doorH,
  doorT,
  frame,
  panelRecess,
  openSign,
  openRad,
  matFrame,
  matPanel,
  matPull,
}: {
  hingeX: number;
  hingeY: number;
  hingeZ: number;
  /** +1 = leaf extends +X from hinge (west door). */
  leafDir: 1 | -1;
  doorW: number;
  doorH: number;
  doorT: number;
  frame: number;
  panelRecess: number;
  openSign: 1 | -1;
  openRad: number;
  matFrame: THREE.Material;
  matPanel: THREE.Material;
  matPull: THREE.Material;
}) {
  const [open, setOpen] = useState(cabinetStartsOpen);
  const angle = useRef(0);
  const hingeRef = useRef<THREE.Group>(null);

  const onClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setOpen((v) => !v);
  }, []);

  useFrame((_, dt) => {
    const target = open ? openSign * openRad : 0;
    angle.current = THREE.MathUtils.damp(angle.current, target, 10, dt);
    if (hingeRef.current) hingeRef.current.rotation.y = angle.current;
  });

  const ptr = {
    onClick,
    onPointerOver: () => {
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "auto";
    },
  };

  const midX = leafDir * (doorW / 2);
  const panelW = doorW - frame * 2;
  const panelH = doorH - frame * 2;
  const pullX = leafDir * (doorW - 0.02);

  return (
    <group
      ref={hingeRef}
      position={[hingeX, hingeY, hingeZ]}
      name={leafDir > 0 ? "senmen-cab-door-w" : "senmen-cab-door-e"}
      userData={{ interactable: "door" }}
    >
      <mesh
        position={[midX, 0, doorT / 2]}
        material={matFrame}
        castShadow
        userData={{ interactable: "door" }}
        {...ptr}
      >
        <boxGeometry args={[doorW, doorH, doorT]} />
      </mesh>
      <mesh
        position={[midX, 0, doorT / 2 - panelRecess]}
        material={matPanel}
        userData={{ interactable: "door" }}
        {...ptr}
      >
        <boxGeometry args={[panelW, panelH, doorT * 0.4]} />
      </mesh>
      <mesh
        position={[pullX, 0, -0.003]}
        material={matPull}
        castShadow
        userData={{ interactable: "door" }}
        {...ptr}
      >
        <cylinderGeometry args={[0.004, 0.004, 0.072, 10]} />
      </mesh>
    </group>
  );
}

function faucetStartsOn(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("faucet") === "1";
}

const HANDLE_OFF = 0.12;
const HANDLE_ON = 0.85;

function SenmenFaucet({
  vesH,
  vesD,
  poolY,
  tipZ,
  streamH,
  streamR,
  poolR,
  matChrome,
  matWater,
}: {
  vesH: number;
  vesD: number;
  poolY: number;
  tipZ: number;
  streamH: number;
  streamR: number;
  poolR: number;
  matChrome: THREE.Material;
  matWater: THREE.Material;
}) {
  const [on, setOn] = useState(faucetStartsOn);
  const handleRef = useRef<THREE.Mesh>(null);
  const streamRef = useRef<THREE.Mesh>(null);
  const poolRef = useRef<THREE.Mesh>(null);
  const pitch = useRef(on ? HANDLE_ON : HANDLE_OFF);
  const flow = useRef(on ? 1 : 0);

  const onClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setOn((v) => !v);
  }, []);

  useFrame((_, dt) => {
    const hTarget = on ? HANDLE_ON : HANDLE_OFF;
    pitch.current = THREE.MathUtils.damp(pitch.current, hTarget, 12, dt);
    if (handleRef.current) handleRef.current.rotation.x = pitch.current;

    const fTarget = on ? 1 : 0;
    flow.current = THREE.MathUtils.damp(flow.current, fTarget, 10, dt);
    const f = flow.current;
    if (streamRef.current) {
      streamRef.current.visible = f > 0.03;
      streamRef.current.scale.set(f, f, 1);
    }
    if (poolRef.current) {
      poolRef.current.visible = f > 0.03;
      const s = 0.15 + 0.85 * f;
      poolRef.current.scale.set(s, s, 1);
    }
  });

  const ptr = {
    onClick,
    onPointerOver: () => {
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "auto";
    },
  };

  return (
    <group name="senmen-faucet">
      <mesh
        ref={poolRef}
        position={[0, poolY, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={matWater}
        visible={on}
      >
        <circleGeometry args={[poolR, 28]} />
      </mesh>
      <mesh
        ref={streamRef}
        position={[0, poolY + streamH / 2, tipZ]}
        material={matWater}
        visible={on}
      >
        <cylinderGeometry args={[streamR, streamR * 0.85, streamH, 8]} />
      </mesh>

      <group
        position={[0, vesH + 0.002, vesD * 0.32]}
        userData={{ interactable: "faucet" }}
      >
        {/* Fat click volume so first-person can hit the mixer */}
        <mesh
          position={[0, 0.08, -0.03]}
          userData={{ interactable: "faucet" }}
          {...ptr}
        >
          <boxGeometry args={[0.07, 0.2, 0.14]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
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
          ref={handleRef}
          position={[0, 0.158, 0.014]}
          rotation={[HANDLE_OFF, 0, 0]}
          material={matChrome}
          castShadow
          userData={{ interactable: "faucet" }}
          {...ptr}
        >
          <boxGeometry args={[0.01, 0.007, 0.04]} />
        </mesh>
      </group>
    </group>
  );
}

type SenmenVanityProps = {
  position: [number, number, number];
};

/**
 * Physical wet stack: opaque porcelain vessel, running faucet,
 * P-trap to the wall, hollow hinoki cabinet, click-to-open doors.
 */
export function SenmenVanity({ position }: SenmenVanityProps) {
  const v = PROP_1F_SENMEN.vanity;
  const ves = v.vessel;
  const c = v.cabinet;
  const wtr = v.water;

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const bodyH = v.h - c.toeKick;
  const shell = c.shell;

  const matHinokiV = useMemo(() => createHinokiMaterial(v.w, bodyH), [v.w, bodyH]);
  const matHinokiFine = useMemo(
    () => createHinokiMaterial(v.w * 0.42, bodyH * 0.72),
    [v.w, bodyH],
  );
  const matHinokiToe = useMemo(
    () => createHinokiMaterial(v.w, c.toeKick),
    [v.w, c.toeKick],
  );
  const matInterior = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e6d8b8",
        roughness: 0.72,
        metalness: 0.02,
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
        side: THREE.DoubleSide,
        transparent: false,
        depthWrite: true,
      }),
    [],
  );
  const matInner = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#eeeae4",
        roughness: 0.12,
        metalness: 0.08,
        envMapIntensity: 0.5,
        side: THREE.DoubleSide,
        transparent: false,
        depthWrite: true,
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
  const matPipe = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c5ced4",
        roughness: 0.22,
        metalness: 0.72,
        envMapIntensity: 0.75,
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
  const matPull = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c4b49a",
        roughness: 0.32,
        metalness: 0.55,
        envMapIntensity: 0.5,
      }),
    [],
  );
  const matWater = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: wtr.color,
        roughness: 0.06,
        metalness: 0.04,
        transmission: 0.55,
        thickness: 0.02,
        transparent: true,
        opacity: wtr.opacity,
        envMapIntensity: 0.7,
        depthWrite: false,
      }),
    [wtr.color, wtr.opacity],
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

  const waste = useMemo(() => senmenWasteSegments(SENMEN_PLUMBING), []);

  useLayoutEffect(() => {
    return () => {
      for (const m of [
        matHinokiV,
        matHinokiFine,
        matHinokiToe,
        matInterior,
        matPorcelain,
        matInner,
        matChrome,
        matPipe,
        matDrain,
        matPull,
        matWater,
        matBottle,
        matPump,
      ]) {
        m.map?.dispose();
        m.normalMap?.dispose();
        m.dispose();
      }
    };
  }, [
    matHinokiV,
    matHinokiFine,
    matHinokiToe,
    matInterior,
    matPorcelain,
    matInner,
    matChrome,
    matPipe,
    matDrain,
    matPull,
    matWater,
    matBottle,
    matPump,
  ]);

  const bodyY = c.toeKick + bodyH / 2;
  const basinY = v.h + c.sitGap;
  const floorY = ves.h - ves.innerDepth;
  const frontZ = -v.d / 2;
  const doorH = bodyH - 0.036;
  const doorW = (v.w - c.doorGap) / 2 - 0.002;
  const doorY = c.toeKick + 0.012 + doorH / 2;
  const openRad = THREE.MathUtils.degToRad(c.openDeg);

  const tipY = ves.h + 0.104;
  const tipZ = ves.d * 0.32 - 0.082;
  const poolY = floorY + 0.01;
  const streamH = Math.max(tipY - poolY, 0.04);

  return (
    <group name="senmen-vanity" position={position}>
      {/* Toe-kick */}
      <mesh
        position={[0, c.toeKick / 2, c.toeInset / 2]}
        material={matHinokiToe}
        receiveShadow
      >
        <boxGeometry args={[v.w - c.toeInset * 2, c.toeKick, v.d - c.toeInset]} />
      </mesh>

      {/* Hollow carcass — sides / back / bottom / front rail. No lid. */}
      <mesh
        position={[-(v.w / 2 - shell / 2), bodyY, 0]}
        material={matHinokiV}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[shell, bodyH, v.d]} />
      </mesh>
      <mesh
        position={[v.w / 2 - shell / 2, bodyY, 0]}
        material={matHinokiV}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[shell, bodyH, v.d]} />
      </mesh>
      <mesh
        position={[0, bodyY, v.d / 2 - shell / 2]}
        material={matHinokiV}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[v.w - 2 * shell, bodyH, shell]} />
      </mesh>
      <mesh
        position={[0, c.toeKick + 0.007, shell / 2]}
        material={matInterior}
        receiveShadow
      >
        <boxGeometry args={[v.w - 2 * shell, 0.014, v.d - shell]} />
      </mesh>
      <mesh
        position={[0, v.h - 0.014, frontZ + 0.012]}
        material={matHinokiV}
        castShadow
      >
        <boxGeometry args={[v.w - 2 * shell, 0.028, 0.024]} />
      </mesh>

      {/* Outward = toward the room (−Z). +Y rot takes +X → −Z, so
          west leaf (+X) opens with +angle; east leaf (−X) with −angle.
          Do not flip these to “fix” plan-mirror — Z is not mirrored. */}
      <CabinetLeaf
        hingeX={-v.w / 2 + 0.001}
        hingeY={doorY}
        hingeZ={frontZ}
        leafDir={1}
        doorW={doorW}
        doorH={doorH}
        doorT={c.doorT}
        frame={c.frame}
        panelRecess={c.panelRecess}
        openSign={1}
        openRad={openRad}
        matFrame={matHinokiV}
        matPanel={matHinokiFine}
        matPull={matPull}
      />
      <CabinetLeaf
        hingeX={v.w / 2 - 0.001}
        hingeY={doorY}
        hingeZ={frontZ}
        leafDir={-1}
        doorW={doorW}
        doorH={doorH}
        doorT={c.doorT}
        frame={c.frame}
        panelRecess={c.panelRecess}
        openSign={-1}
        openRad={openRad}
        matFrame={matHinokiV}
        matPanel={matHinokiFine}
        matPull={matPull}
      />

      {/* Waste: tailpiece → P-trap → wall (hidden until a door opens) */}
      <group position={[0, basinY, 0]} name="senmen-waste">
        {waste.map((seg) =>
          seg.kind === "bend" ? (
            <mesh
              key={seg.name}
              position={seg.pos}
              rotation={seg.rot}
              material={matPipe}
            >
              <torusGeometry
                args={[SENMEN_PLUMBING.trapR, seg.r, 10, 20, Math.PI]}
              />
            </mesh>
          ) : (
            <mesh
              key={seg.name}
              position={seg.pos}
              rotation={seg.rot}
              material={seg.kind === "flange" ? matChrome : matPipe}
            >
              <cylinderGeometry args={[seg.r, seg.r, Math.max(seg.len, 0.008), 14]} />
            </mesh>
          ),
        )}
      </group>

      {/* Opaque porcelain vessel */}
      <group position={[0, basinY, 0]} name="senmen-basin">
        <SenmenBasinGltf matPorcelain={matPorcelain} matInner={matInner} />
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

        <SenmenFaucet
          vesH={ves.h}
          vesD={ves.d}
          poolY={poolY}
          tipZ={tipZ}
          streamH={streamH}
          streamR={wtr.streamR}
          poolR={wtr.poolR}
          matChrome={matChrome}
          matWater={matWater}
        />

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

      <pointLight
        position={[0.05, basinY + 0.55, -0.22]}
        intensity={0.22}
        distance={1.4}
        decay={2}
        color="#fff4e8"
      />
    </group>
  );
}
