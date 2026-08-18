
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { INTERIOR_FLOOR_Y, PROP_1F_UB_BATHMAT, PROP_1F_UB_TUB } from "@/data/dimensions";
import {
  createWoolMatMaterial,
  ensureFaçadeTextures,
} from "@/lib/houseMaterials";
import {
  buildRunoffStrip,
  lerp3,
  runoffVisible,
  stepTubFill,
  waterSurfaceY,
} from "@/lib/tubWater";

/**
 * Horizontal oval freestanding tub shell (lathe around Y, then scale X/Z).
 * Profile: wide base flare → waist → outer rim.
 */
function makeTubOuterLathe(rimH: number, halfW: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = rimH * t;
    let r: number;
    if (t < 0.12) r = halfW * (0.55 + t * 1.2);
    else if (t < 0.45) r = halfW * (0.72 + (t - 0.12) * 0.35);
    else if (t < 0.75) r = halfW * (0.88 + (t - 0.45) * 0.25);
    else if (t < 0.9) r = halfW * (0.98 + (t - 0.75) * 0.15);
    else r = halfW * (1.02 - (t - 0.9) * 0.15);
    pts.push(new THREE.Vector2(Math.max(r, 0.08), y));
  }
  return new THREE.LatheGeometry(pts, 36);
}

function makeTubInnerLathe(
  rimH: number,
  basinDepth: number,
  halfW: number,
): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 14;
  const floorY = rimH - basinDepth;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = floorY + basinDepth * t;
    let r: number;
    if (t < 0.15) r = halfW * 0.42;
    else if (t < 0.7) r = halfW * (0.42 + (t - 0.15) * 0.7);
    else r = halfW * (0.82 + (t - 0.7) * 0.35);
    pts.push(new THREE.Vector2(Math.max(r, 0.06), y));
  }
  return new THREE.LatheGeometry(pts, 28);
}

function queryFlag(name: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(name) === value;
}

const LEVER_OFF = -1.05;
const LEVER_ON = -0.22;

/**
 * UB east freestanding tub — tokonoma-card wet fixture (DESIGN.md §2.7):
 * clickable floor faucet, lift-out plug, water fills only when plugged.
 */
export function TubDisplay() {
  const p = PROP_1F_UB_TUB;
  const mat = PROP_1F_UB_BATHMAT;
  const plug = p.plug;

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const [faucetOn, setFaucetOn] = useState(() => queryFlag("tubFaucet", "1"));
  const [plugged, setPlugged] = useState(() => !queryFlag("tubPlug", "out"));
  const fill = useRef(queryFlag("tubFill", "1") ? 0.85 : 0);
  const leverRef = useRef<THREE.Group>(null);
  const leverZ = useRef(faucetOn ? LEVER_ON : LEVER_OFF);
  const streamRef = useRef<THREE.Mesh>(null);
  const waterRef = useRef<THREE.Mesh>(null);
  const waterBodyRef = useRef<THREE.Mesh>(null);
  const plugRef = useRef<THREE.Group>(null);
  const runoffRef = useRef<THREE.Group>(null);
  const splashRef = useRef<THREE.Mesh>(null);
  const gulpRef = useRef<THREE.Mesh>(null);
  const beadRefs = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const flow = useRef(faucetOn ? 1 : 0);
  const plugT = useRef(plugged ? 0 : 1);

  const matOut = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.porcelain,
        roughness: 0.26,
        metalness: 0.05,
        envMapIntensity: 0.55,
      }),
    [p.porcelain],
  );
  const matIn = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.porcelainInner,
        roughness: 0.38,
        metalness: 0.03,
        side: THREE.DoubleSide,
      }),
    [p.porcelainInner],
  );
  const matWater = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: p.water.color,
        transparent: true,
        opacity: p.water.opacity,
        roughness: 0.08,
        metalness: 0.04,
        transmission: 0.35,
        thickness: 0.04,
        envMapIntensity: 0.65,
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
  const matMetal = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.metal,
        roughness: 0.32,
        metalness: p.metalness,
        envMapIntensity: 0.7,
      }),
    [p.metal, p.metalness],
  );
  const matDrain = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3a3836",
        roughness: 0.45,
        metalness: 0.35,
      }),
    [],
  );
  const matHole = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#141312",
        roughness: 0.85,
        metalness: 0.08,
      }),
    [],
  );
  const matRubber = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2c2622",
        roughness: 0.78,
        metalness: 0.04,
      }),
    [],
  );
  const matWool = useMemo(
    () => createWoolMatMaterial(mat.width, mat.depth, 0.12),
    [mat.width, mat.depth],
  );

  const halfLen = p.length / 2;
  const halfW = p.width / 2;
  const scaleZ = halfLen / halfW;
  const basinFloorLocalY = p.rimH - p.basinDepth;

  const outerGeo = useMemo(
    () => makeTubOuterLathe(p.rimH, halfW),
    [p.rimH, halfW],
  );
  const innerGeo = useMemo(
    () => makeTubInnerLathe(p.rimH, p.basinDepth, halfW * 0.92),
    [p.rimH, p.basinDepth, halfW],
  );

  useLayoutEffect(() => {
    return () => {
      outerGeo.dispose();
      innerGeo.dispose();
      matOut.dispose();
      matIn.dispose();
      matWater.dispose();
      matRunoff.dispose();
      matMetal.dispose();
      matDrain.dispose();
      matHole.dispose();
      matRubber.dispose();
      matWool.normalMap?.dispose();
      matWool.dispose();
    };
  }, [
    outerGeo,
    innerGeo,
    matOut,
    matIn,
    matWater,
    matRunoff,
    matMetal,
    matDrain,
    matHole,
    matRubber,
    matWool,
  ]);

  const floorY = p.y;
  const cx = p.x;
  const cz = p.z;
  const matX = cx - halfW - mat.gap - mat.width / 2;
  const matY = INTERIOR_FLOOR_Y + mat.thickness / 2 + 0.002;
  const matZ = cz;
  const brimY = floorY + p.rimH - p.water.insetY;
  const bottomY = floorY + basinFloorLocalY + 0.012;
  const tubSouth = cz - halfLen;
  const faucetZ = tubSouth - p.faucet.southGap;
  const faucetX = cx;
  const colH = p.faucet.columnH;
  const armY = floorY + colH * 0.9;
  const reach = p.faucet.spoutReach;
  const drop = p.faucet.spoutDrop;
  const tipY = armY - drop;
  const tipZ = faucetZ + reach * 0.82;
  const drainY = bottomY + 0.002;
  const plugSeated: [number, number, number] = [cx, drainY + plug.h / 2, cz];
  const plugAside: [number, number, number] = [
    cx - halfW * 0.78,
    floorY + p.rimH + 0.006,
    cz - halfLen * 0.22,
  ];
  const impact: [number, number, number] = [faucetX, bottomY + 0.006, tipZ];
  const drainPt: [number, number, number] = [cx, bottomY + 0.005, cz];
  const runoffGeo = useMemo(() => {
    const strip = buildRunoffStrip(
      faucetX,
      bottomY + 0.006,
      tipZ,
      cx,
      bottomY + 0.005,
      cz,
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
  }, [faucetX, tipZ, cx, cz, bottomY]);

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
    });
    const f = fill.current;
    const surfY = waterSurfaceY(f, bottomY + 0.008, brimY);
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

    const lTarget = faucetOn ? LEVER_ON : LEVER_OFF;
    leverZ.current = THREE.MathUtils.damp(leverZ.current, lTarget, 12, dt);
    if (leverRef.current) leverRef.current.rotation.z = leverZ.current;

    flow.current = THREE.MathUtils.damp(flow.current, faucetOn ? 1 : 0, 10, dt);
    const fl = flow.current;
    if (streamRef.current) {
      const bot = f > 0.025 ? surfY : impact[1];
      const h = Math.max(tipY - bot, 0.02);
      streamRef.current.visible = fl > 0.04;
      streamRef.current.position.set(faucetX, (tipY + bot) / 2, tipZ);
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
      gulpRef.current.visible = runOn;
      gulpRef.current.rotation.z = state.clock.elapsedTime * 3.2;
      const g = 0.75 + 0.25 * Math.sin(state.clock.elapsedTime * 8);
      gulpRef.current.scale.setScalar(g * fl);
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
    plugT.current = THREE.MathUtils.damp(plugT.current, pTarget, 8, dt);
    const t = plugT.current;
    const hop = Math.sin(t * Math.PI) * 0.07;
    if (plugRef.current) {
      plugRef.current.position.set(
        THREE.MathUtils.lerp(plugSeated[0], plugAside[0], t),
        THREE.MathUtils.lerp(plugSeated[1], plugAside[1], t) + hop,
        THREE.MathUtils.lerp(plugSeated[2], plugAside[2], t),
      );
    }
  });

  const lightPos: [number, number, number] = [
    cx + p.light.dx,
    floorY + p.light.dy,
    cz + p.light.dz,
  ];

  return (
    <group name={p.label}>
      <mesh
        geometry={outerGeo}
        position={[cx, floorY, cz]}
        scale={[1, 1, scaleZ]}
        material={matOut}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={innerGeo}
        position={[cx, floorY, cz]}
        scale={[1, 1, scaleZ * 0.94]}
        material={matIn}
      />
      <mesh
        position={[cx, bottomY, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1, scaleZ * 0.9, 1]}
        material={matIn}
        receiveShadow
      >
        <circleGeometry args={[halfW * 0.78, 32]} />
      </mesh>
      <mesh
        position={[cx, floorY + p.rimH - 0.012, cz]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[1, scaleZ, 1]}
        material={matOut}
        castShadow
      >
        <torusGeometry args={[halfW * 0.96, 0.018, 10, 36]} />
      </mesh>

      {/* Drain grate + dark bore (waste is unseen below) */}
      <mesh position={[cx, drainY, cz]} rotation={[-Math.PI / 2, 0, 0]} material={matDrain}>
        <ringGeometry args={[plug.r * 0.55, plug.r * 1.05, 24]} />
      </mesh>
      <mesh position={[cx, drainY - 0.001, cz]} rotation={[-Math.PI / 2, 0, 0]} material={matHole}>
        <circleGeometry args={[plug.r * 0.52, 20]} />
      </mesh>

      {/* Lift-out plug — seated on drain, or set on the west rim */}
      <group
        ref={plugRef}
        position={plugSeated}
        name="tub-plug"
        userData={{ interactable: "plug" }}
      >
        <mesh userData={{ interactable: "plug" }} {...plugPtr}>
          <cylinderGeometry args={[plug.r * 1.15, plug.r * 1.15, 0.02, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh material={matRubber} castShadow>
          <cylinderGeometry args={[plug.r, plug.r * 0.96, plug.h, 22]} />
        </mesh>
        <mesh position={[0, plug.h * 0.35, 0]} material={matMetal} castShadow>
          <cylinderGeometry args={[plug.r * 0.82, plug.r * 0.82, 0.004, 20]} />
        </mesh>
        <mesh
          position={[0, plug.h * 0.55 + plug.ringR, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          material={matMetal}
          castShadow
        >
          <torusGeometry args={[plug.ringR, 0.0022, 8, 16]} />
        </mesh>
      </group>

      {/* Water body + surface (hidden until fill > ~0) */}
      <mesh
        ref={waterBodyRef}
        position={[cx, bottomY, cz]}
        scale={[1, 0.01, scaleZ * 0.86]}
        material={matWater}
        visible={false}
      >
        <cylinderGeometry args={[halfW * 0.74, halfW * 0.74, 0.1, 32]} />
      </mesh>
      <mesh
        ref={waterRef}
        position={[cx, bottomY, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1, scaleZ * 0.88, 1]}
        material={matWater}
        visible={false}
      >
        <circleGeometry args={[halfW * 0.76, 36]} />
      </mesh>
      <mesh ref={streamRef} position={[faucetX, tipY, tipZ]} material={matWater} visible={false}>
        <cylinderGeometry args={[p.water.streamR, p.water.streamR * 0.8, 0.2, 8]} />
      </mesh>

      {/* Faucet on + plug out: stream hits the floor and runs to the grate */}
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
          position={[cx, drainY + 0.004, cz]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={matRunoff}
        >
          <ringGeometry args={[0.006, 0.02, 16]} />
        </mesh>
      </group>

      <mesh
        position={[matX, matY, matZ]}
        material={matWool}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[mat.width, mat.thickness, mat.depth]} />
      </mesh>
      <mesh position={[matX, matY + mat.thickness * 0.15, matZ]} material={matWool}>
        <boxGeometry
          args={[mat.width * 0.96, mat.thickness * 0.5, mat.depth * 0.96]}
        />
      </mesh>

      <group
        position={[faucetX, floorY, faucetZ]}
        name="tub-faucet"
        userData={{ interactable: "faucet" }}
      >
        <mesh
          position={[0.03, colH * 0.88, 0.04]}
          userData={{ interactable: "faucet" }}
          {...faucetPtr}
        >
          <boxGeometry args={[0.16, 0.18, 0.22]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.006, 0]} material={matMetal} castShadow>
          <cylinderGeometry args={[0.07, 0.075, 0.012, 24]} />
        </mesh>
        <mesh position={[0, 0.018, 0]} material={matMetal} castShadow>
          <cylinderGeometry args={[0.048, 0.052, 0.014, 20]} />
        </mesh>
        <mesh
          position={[0, 0.025 + (colH - 0.05) / 2, 0]}
          material={matMetal}
          castShadow
        >
          <cylinderGeometry args={[0.017, 0.02, colH - 0.05, 16]} />
        </mesh>
        <mesh position={[0, armY - floorY, 0]} material={matMetal} castShadow>
          <sphereGeometry args={[0.028, 14, 12]} />
        </mesh>
        <mesh
          position={[0, armY - floorY, reach * 0.42]}
          rotation={[Math.PI / 2, 0, 0]}
          material={matMetal}
          castShadow
        >
          <cylinderGeometry args={[0.011, 0.011, reach * 0.85, 12]} />
        </mesh>
        <mesh
          position={[0, armY - floorY, reach * 0.82]}
          material={matMetal}
          castShadow
        >
          <sphereGeometry args={[0.014, 12, 10]} />
        </mesh>
        <mesh
          position={[0, armY - floorY - drop * 0.5, reach * 0.82]}
          material={matMetal}
          castShadow
        >
          <cylinderGeometry args={[0.01, 0.012, drop, 12]} />
        </mesh>
        <mesh
          position={[0, armY - floorY - drop, reach * 0.82]}
          material={matMetal}
          castShadow
        >
          <cylinderGeometry args={[0.014, 0.011, 0.02, 12]} />
        </mesh>
        <group
          ref={leverRef}
          position={[0.045, armY - floorY - 0.02, 0.01]}
          rotation={[0, 0, LEVER_OFF]}
        >
          <mesh material={matMetal} castShadow userData={{ interactable: "faucet" }} {...faucetPtr}>
            <boxGeometry args={[0.07, 0.012, 0.016]} />
          </mesh>
          <mesh position={[0.033, -0.015, 0]} material={matMetal} castShadow>
            <sphereGeometry args={[0.012, 10, 8]} />
          </mesh>
        </group>
      </group>

      <pointLight
        position={lightPos}
        intensity={p.light.intensity}
        distance={p.light.distance}
        decay={2}
        color={p.light.color}
        castShadow={false}
      />
    </group>
  );
}
