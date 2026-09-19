import { useGLTF } from "@react-three/drei";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import { ALL_FLOOR_SLABS, PROP_1F_UB_TUB, UB_BATH } from "@/data/dimensions";
import { ensureFaçadeTextures } from "@/lib/houseMaterials";
import {
  buildRunoffStrip,
  isTubSpilling,
  lerp3,
  overflowWetRadius,
  runoffVisible,
  stepFloorWet,
  stepTubFill,
  waterSurfaceY,
} from "@/lib/tubWater";
import {
  createTubFloorWetMaterial,
  createTubWetUniforms,
} from "@/lib/tubWetMaterial";
import {
  drainButtonPlan,
  drainHolePlan,
  mixerPlan,
  spoutTipPlan,
  tubInner,
  ubOrigin,
} from "@/lib/ubBathHero";

function heroUrl(): string {
  const rel = (PROP_1F_UB_TUB.gltf ?? UB_BATH.gltf).replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${rel}`;
}

useGLTF.preload(heroUrl());

function queryFlag(name: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(name) === value;
}

function roundedRectShape(w: number, d: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const hw = w / 2;
  const hd = d / 2;
  const rad = Math.min(r, hw - 0.01, hd - 0.01);
  s.moveTo(-hw + rad, -hd);
  s.lineTo(hw - rad, -hd);
  s.quadraticCurveTo(hw, -hd, hw, -hd + rad);
  s.lineTo(hw, hd - rad);
  s.quadraticCurveTo(hw, hd, hw - rad, hd);
  s.lineTo(-hw + rad, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - rad);
  s.lineTo(-hw, -hd + rad);
  s.quadraticCurveTo(-hw, -hd, -hw + rad, -hd);
  return s;
}

function enhanceMaterials(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const name = `${mesh.name}${mesh.parent?.name ?? ""}`;
    const src = mesh.material as THREE.MeshStandardMaterial;
    if (!src || Array.isArray(mesh.material)) return;
    const chrome =
      /chrome|faucet|shower|spout|drainbutton|floordrain_bar/i.test(name) ||
      src.metalness > 0.6;
    if (chrome) {
      src.metalness = Math.max(src.metalness, 0.92);
      src.roughness = Math.min(src.roughness, 0.16);
      src.envMapIntensity = 1.15;
      return;
    }
    if (/charcoal|wall_s/i.test(name)) {
      src.envMapIntensity = 0.38;
      src.roughness = Math.min(src.roughness, 0.68);
      src.color.offsetHSL(0, 0, 0.06);
      return;
    }
    if (/window|shelf/i.test(name)) {
      src.envMapIntensity = 0.45;
      src.roughness = Math.min(src.roughness, 0.48);
      return;
    }
    if (/tub|porcelain/i.test(name)) {
      src.envMapIntensity = 0.55;
      src.roughness = Math.min(src.roughness, 0.32);
      return;
    }
    src.envMapIntensity = src.metalness > 0.3 ? 0.8 : 0.28;
  });
}

function UbBathGltf({
  buttonRef,
  plugRef,
}: {
  buttonRef: MutableRefObject<THREE.Object3D | null>;
  plugRef: MutableRefObject<THREE.Object3D | null>;
}) {
  const gltf = useGLTF(heroUrl());
  const origin = ubOrigin();
  const root = useMemo(() => {
    const g = gltf.scene.clone(true);
    g.updateMatrixWorld(true);
    enhanceMaterials(g);
    g.traverse((o) => {
      if (/Hero_UbDrainButton$/i.test(o.name) && !/ring/i.test(o.name)) {
        buttonRef.current = o;
      }
      if (/Hero_UbDrainPlug$/i.test(o.name)) {
        plugRef.current = o;
      }
    });
    return g;
  }, [gltf.scene, buttonRef, plugRef]);

  return (
    <primitive
      object={root}
      position={[origin.x, origin.y, origin.z]}
    />
  );
}

/**
 * 1F UB Type-M unit bath — Path B hero GLB + live water.
 * Click mixer to run; click corner push-button to plug / drain.
 */
export function TubDisplay() {
  const p = PROP_1F_UB_TUB;
  const plug = p.plug;

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const [faucetOn, setFaucetOn] = useState(() => queryFlag("tubFaucet", "1"));
  const [plugged, setPlugged] = useState(() => !queryFlag("tubPlug", "out"));
  const fill = useRef(queryFlag("tubFill", "1") ? 0.85 : 0);
  const floorWet = useRef({ front: 0, moisture: 0 });
  const streamRef = useRef<THREE.Mesh>(null);
  const waterRef = useRef<THREE.Mesh>(null);
  const waterBodyRef = useRef<THREE.Mesh>(null);
  const buttonRef = useRef<THREE.Object3D | null>(null);
  const plugMeshRef = useRef<THREE.Object3D | null>(null);
  const buttonBaseY = useRef<number | null>(null);
  const plugBaseY = useRef<number | null>(null);
  const runoffRef = useRef<THREE.Group>(null);
  const splashRef = useRef<THREE.Mesh>(null);
  const gulpRef = useRef<THREE.Mesh>(null);
  const beadRefs = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const spillRef = useRef<THREE.Group>(null);
  const wetOverlayRef = useRef<THREE.Mesh>(null);
  const flow = useRef(faucetOn ? 1 : 0);
  const plugT = useRef(plugged ? 0 : 1);

  const matWater = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: p.water.color,
        transparent: true,
        opacity: p.water.opacity,
        roughness: 0.08,
        metalness: 0.04,
        transmission: 0.38,
        thickness: 0.05,
        envMapIntensity: 0.7,
        depthWrite: false,
      }),
    [p.water.color, p.water.opacity],
  );
  const matRunoff = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#b7d4e2",
        transparent: true,
        opacity: 0.72,
        roughness: 0.06,
        metalness: 0.05,
        transmission: 0.28,
        thickness: 0.02,
        envMapIntensity: 0.8,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const ubSlab = ALL_FLOOR_SLABS.find((s) => s.id === "1f-ub");
  const ubCx = ubSlab ? ubSlab.rect.x + ubSlab.rect.width / 2 : (UB_BATH.x0 + UB_BATH.x1) / 2;
  const ubCz = ubSlab ? ubSlab.rect.z + ubSlab.rect.depth / 2 : (UB_BATH.z0 + UB_BATH.z1) / 2;
  const ubW = ubSlab?.rect.width ?? UB_BATH.x1 - UB_BATH.x0;
  const ubD = ubSlab?.rect.depth ?? UB_BATH.z1 - UB_BATH.z0;

  const floorWetU = useMemo(
    () =>
      createTubWetUniforms(
        p.x,
        p.z,
        p.width / 2,
        p.length / 2,
        ubCx,
        ubCz,
        "#e4d4bc",
        "#b08958",
      ),
    [p.x, p.z, p.width, p.length, ubCx, ubCz],
  );
  const matFloorWet = useMemo(
    () => createTubFloorWetMaterial(floorWetU),
    [floorWetU],
  );

  const inner = tubInner();
  const innerW = inner.w - 0.008;
  const innerL = inner.l - 0.008;
  const waterShape = useMemo(
    () => roundedRectShape(innerW, innerL, inner.r),
    [innerW, innerL, inner.r],
  );
  const waterSurfGeo = useMemo(() => {
    const g = new THREE.ShapeGeometry(waterShape, 12);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [waterShape]);

  useLayoutEffect(() => {
    return () => {
      matWater.dispose();
      matRunoff.dispose();
      matFloorWet.dispose();
      waterSurfGeo.dispose();
    };
  }, [matWater, matRunoff, matFloorWet, waterSurfGeo]);

  const floorY = p.y;
  const cx = p.x;
  const cz = p.z;
  const brimY = floorY + p.rimH - p.water.insetY;
  const bottomY = floorY + p.rimH - p.basinDepth + 0.012;
  const halfW = p.width / 2;
  const btn = drainButtonPlan();
  const hole = drainHolePlan();
  const mix = mixerPlan();
  const spout = spoutTipPlan();
  const tipY = spout.y - p.faucet.spoutDrop;
  const tipZ = spout.z;
  const tipX = spout.x;
  const drainY = hole.y;
  const impact: [number, number, number] = [tipX, bottomY + 0.006, tipZ];
  const drainPt: [number, number, number] = [hole.x, hole.y + 0.002, hole.z];

  const runoffGeo = useMemo(() => {
    const strip = buildRunoffStrip(
      impact[0],
      impact[1],
      impact[2],
      drainPt[0],
      drainPt[1],
      drainPt[2],
      0.034,
      0.011,
      20,
      0.022,
    );
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(strip.positions, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(strip.uvs, 2));
    g.setIndex(new THREE.BufferAttribute(strip.indices, 1));
    g.computeVertexNormals();
    return g;
  }, [impact, drainPt]);

  useLayoutEffect(() => {
    return () => runoffGeo.dispose();
  }, [runoffGeo]);

  const onFaucet = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setFaucetOn((v) => !v);
  }, []);
  const onPlug = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setPlugged((v) => !v);
  }, []);

  const faucetPtr = {
    onClick: onFaucet,
    onPointerOver: () => {
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "auto";
    },
  };
  const plugPtr = {
    onClick: onPlug,
    onPointerOver: () => {
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "auto";
    },
  };

  useFrame((state, dt) => {
    fill.current = stepTubFill(fill.current, dt, plugged, faucetOn, {
      fillRate: p.water.fillRate,
      drainRate: p.water.drainRate,
      spreadRate: p.water.spreadRate,
      dryRate: p.water.dryRate,
    });
    floorWet.current = stepFloorWet(
      floorWet.current,
      dt,
      fill.current,
      plugged,
      faucetOn,
      {
        fillRate: p.water.fillRate,
        drainRate: p.water.drainRate,
        spreadRate: p.water.spreadRate,
        dryRate: p.water.dryRate,
      },
    );
    const f = fill.current;
    const fw = floorWet.current;
    const spilling = isTubSpilling(f, plugged, faucetOn);
    const wetR = overflowWetRadius(fw.front);
    floorWetU.uWetR.value = wetR;
    floorWetU.uMoisture.value = fw.moisture;
    floorWetU.uPuddle.value = spilling ? 0.85 : fw.moisture * 0.25;
    if (wetOverlayRef.current) wetOverlayRef.current.visible = fw.moisture > 0.015;
    if (spillRef.current) spillRef.current.visible = spilling;
    const surfY = spilling
      ? floorY + p.rimH - 0.008
      : waterSurfaceY(f, bottomY + 0.008, brimY);
    const waterH = Math.max(surfY - bottomY, 0.002);

    if (waterRef.current) {
      waterRef.current.visible = f > 0.025;
      waterRef.current.position.y = surfY;
    }
    if (waterBodyRef.current) {
      waterBodyRef.current.visible = f > 0.025;
      waterBodyRef.current.position.y = bottomY + waterH / 2;
      waterBodyRef.current.scale.y = waterH / 0.1;
    }

    flow.current = THREE.MathUtils.damp(flow.current, faucetOn ? 1 : 0, 10, dt);
    const fl = flow.current;
    if (streamRef.current) {
      const bot = f > 0.025 ? surfY : impact[1];
      const h = Math.max(tipY - bot, 0.02);
      streamRef.current.visible = fl > 0.04;
      streamRef.current.position.set(tipX, (tipY + bot) / 2, tipZ);
      streamRef.current.scale.set(fl, h / 0.2, fl);
    }

    const runOn = runoffVisible(faucetOn, plugged, f) && fl > 0.05;
    if (runoffRef.current) runoffRef.current.visible = runOn;
    if (splashRef.current) {
      splashRef.current.visible = runOn;
      const pulse = 0.85 + 0.18 * Math.sin(state.clock.elapsedTime * 11);
      splashRef.current.scale.setScalar(pulse * fl);
    }
    if (gulpRef.current) {
      gulpRef.current.visible = runOn || (!plugged && f > 0.04);
      gulpRef.current.rotation.z = state.clock.elapsedTime * 3.2;
      const g = 0.75 + 0.25 * Math.sin(state.clock.elapsedTime * 8);
      gulpRef.current.scale.setScalar(g * Math.max(fl, f));
    }
    if (runOn) {
      const beads = beadRefs.current;
      for (let i = 0; i < beads.length; i += 1) {
        const bead = beads[i];
        if (!bead) continue;
        const u = (state.clock.elapsedTime * 0.55 + i / beads.length) % 1;
        const [x, y, z] = lerp3(
          impact[0],
          impact[1] + 0.004,
          impact[2],
          drainPt[0],
          drainPt[1] + 0.003,
          drainPt[2],
          u,
        );
        bead.visible = true;
        bead.position.set(x, y, z);
        bead.scale.setScalar((0.55 + 0.45 * (1 - u)) * fl);
      }
    } else {
      for (const bead of beadRefs.current) {
        if (bead) bead.visible = false;
      }
    }

    const pTarget = plugged ? 0 : 1;
    plugT.current = THREE.MathUtils.damp(plugT.current, pTarget, 14, dt);
    const btnObj = buttonRef.current;
    if (btnObj) {
      if (buttonBaseY.current == null) buttonBaseY.current = btnObj.position.y;
      btnObj.position.y = buttonBaseY.current - plugT.current * plug.travel;
    }
    const plugObj = plugMeshRef.current;
    if (plugObj) {
      if (plugBaseY.current == null) plugBaseY.current = plugObj.position.y;
      plugObj.position.y = plugBaseY.current - plugT.current * p.drain.travel;
    }
  });

  const lightPos: [number, number, number] = [
    cx + p.light.dx,
    floorY + p.light.dy,
    cz + p.light.dz,
  ];

  return (
    <group name={p.label}>
      <UbBathGltf buttonRef={buttonRef} plugRef={plugMeshRef} />

      <mesh
        ref={waterBodyRef}
        position={[cx, bottomY, cz]}
        material={matWater}
        visible={false}
      >
        <boxGeometry args={[innerW * 0.98, 0.1, innerL * 0.98]} />
      </mesh>
      <mesh
        ref={waterRef}
        position={[cx, bottomY, cz]}
        geometry={waterSurfGeo}
        material={matWater}
        visible={false}
      />
      <mesh ref={streamRef} position={[tipX, tipY, tipZ]} material={matWater} visible={false}>
        <cylinderGeometry args={[p.water.streamR, p.water.streamR * 0.8, 0.2, 8]} />
      </mesh>

      <group ref={runoffRef} name="tub-runoff" visible={false}>
        <mesh
          ref={splashRef}
          position={impact}
          rotation={[-Math.PI / 2, 0, 0]}
          material={matRunoff}
        >
          <circleGeometry args={[0.042, 20]} />
        </mesh>
        <mesh geometry={runoffGeo} material={matRunoff} />
        {([0, 1, 2] as const).map((i) => (
          <mesh
            key={`bead-${i}`}
            ref={(el) => {
              beadRefs.current[i] = el;
            }}
            material={matRunoff}
            visible={false}
          >
            <sphereGeometry args={[0.012, 10, 8]} />
          </mesh>
        ))}
        <mesh
          ref={gulpRef}
          position={[hole.x, drainY + 0.004, hole.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={matRunoff}
        >
          <ringGeometry args={[0.006, 0.02, 16]} />
        </mesh>
      </group>

      <mesh
        ref={wetOverlayRef}
        position={[ubCx, floorY + 0.0018, ubCz]}
        material={matFloorWet}
        visible={false}
        renderOrder={2}
      >
        <boxGeometry args={[ubW, 0.003, ubD]} />
      </mesh>
      <group ref={spillRef} name="tub-spill" visible={false}>
        <mesh
          position={[cx - halfW - 0.01, floorY + p.rimH * 0.45, cz]}
          material={matRunoff}
        >
          <boxGeometry args={[0.03, p.rimH - 0.06, innerL * 0.92]} />
        </mesh>
        <mesh
          position={[cx - halfW - 0.08, floorY + 0.004, cz]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={matRunoff}
        >
          <planeGeometry args={[0.28, innerL * 0.95]} />
        </mesh>
      </group>

      <group
        position={[mix.x, mix.y, mix.z]}
        name="tub-faucet"
        userData={{ interactable: "faucet" }}
      >
        <mesh userData={{ interactable: "faucet" }} {...faucetPtr}>
          <boxGeometry args={[0.28, 0.16, 0.12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <group
        position={[btn.x, btn.y, btn.z]}
        name="tub-plug"
        userData={{ interactable: "plug" }}
      >
        <mesh userData={{ interactable: "plug" }} {...plugPtr}>
          <cylinderGeometry args={[plug.r * 3.2, plug.r * 3.2, 0.04, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      <pointLight
        position={lightPos}
        intensity={p.light.intensity}
        distance={p.light.distance}
        decay={2}
        color={p.light.color}
        castShadow={false}
      />
      <pointLight
        position={[UB_BATH.x0 + 0.55, floorY + UB_BATH.ceilingH - 0.04, UB_BATH.z0 + 0.5]}
        intensity={0.55}
        distance={2.4}
        decay={2}
        color="#fff6e8"
        castShadow={false}
      />
      <pointLight
        position={[UB_BATH.x0 + 0.55, floorY + UB_BATH.ceilingH - 0.04, UB_BATH.z0 + 1.05]}
        intensity={0.5}
        distance={2.4}
        decay={2}
        color="#fff6e8"
        castShadow={false}
      />
    </group>
  );
}
