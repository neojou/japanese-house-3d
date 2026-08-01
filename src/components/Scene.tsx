"use client";

import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { House } from "@/components/house";
import { Player } from "@/components/Player";
import { FirstPersonCamera } from "@/components/cameras/FirstPersonCamera";
import { PositionHud } from "@/components/ui/PositionHud";
import { BUILDING, LIGHTING, PLAYER } from "@/data/dimensions";
import { planToWorldX } from "@/lib/coords";

function Lights() {
  const sun = LIGHTING.sun;
  return (
    <>
      <ambientLight intensity={LIGHTING.ambient} />
      <hemisphereLight
        args={[LIGHTING.hemiSky, LIGHTING.hemiGround, LIGHTING.hemiIntensity]}
      />
      <directionalLight
        castShadow
        color={sun.color}
        intensity={sun.intensity}
        position={sun.position}
        shadow-mapSize-width={sun.shadowMap}
        shadow-mapSize-height={sun.shadowMap}
        shadow-camera-far={sun.shadowFar}
        shadow-camera-left={-sun.shadowExtent}
        shadow-camera-right={sun.shadowExtent}
        shadow-camera-top={sun.shadowExtent}
        shadow-camera-bottom={-sun.shadowExtent}
        shadow-bias={-0.0002}
      />
      {/* Soft interior fills under roofs (plan-space; house group is X-mirrored) */}
      <group
        name="interior-fills"
        scale={[-1, 1, 1]}
        position={[BUILDING.width, 0, 0]}
      >
        {LIGHTING.interiorFills.map((f) => (
          <pointLight
            key={f.id}
            position={f.position}
            intensity={f.intensity}
            distance={f.distance}
            decay={2}
            color={f.color}
          />
        ))}
      </group>
    </>
  );
}

function SceneContent() {
  const spawnWorldX = useMemo(() => planToWorldX(PLAYER.spawn.x), []);

  return (
    <>
      <color attach="background" args={[LIGHTING.background]} />
      <fog
        attach="fog"
        args={[LIGHTING.background, LIGHTING.fogNear, LIGHTING.fogFar]}
      />
      <Lights />

      <PerspectiveCamera
        makeDefault
        fov={70}
        near={0.05}
        far={200}
        position={[
          spawnWorldX,
          PLAYER.spawn.y + PLAYER.eyeHeight,
          PLAYER.spawn.z,
        ]}
      />

      <FirstPersonCamera />
      <Player />

      {/*
        Mirror house in X so north-facing views match the plan:
        left=LDK, right=genkan. Data stays in plan space.
      */}
      <group
        name="plan-mirror"
        scale={[-1, 1, 1]}
        position={[BUILDING.width, 0, 0]}
      >
        <House />
        <axesHelper args={[2.5]} position={[0, 0.02, 0]} />
      </group>
    </>
  );
}

function HelpOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4">
      <header className="flex items-start justify-between gap-4">
        <div className="rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-white shadow-lg backdrop-blur-md">
          <h1 className="text-base font-semibold tracking-tight">
            日本住宅 3D · 1F / 2F
          </h1>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-white/75">
            U 形樓梯 → 2F。東北洋室門（梯廳）· 南 G2 落地窗 4.55 m 接東牆。
          </p>
          <p className="mt-1 text-[11px] text-white/50">
            {BUILDING.width}m × {BUILDING.depth}m · 單位公尺
          </p>
        </div>
        <PositionHud />
      </header>

      <div className="flex items-end justify-between gap-3">
        <div className="rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-[11px] leading-relaxed text-white/80 backdrop-blur-md">
          <ul className="space-y-0.5">
            <li>
              <kbd className="rounded bg-white/15 px-1">W S</kbd> 前進/後退 ·{" "}
              <kbd className="rounded bg-white/15 px-1">A D</kbd> 左轉/右轉 10°
            </li>
            <li>
              <strong>點空白</strong>：鎖定視角 ·{" "}
              <kbd className="rounded bg-white/15 px-1">Esc</kbd> 解鎖
            </li>
            <li>
              <strong>點門</strong>：只開關門（不上鎖）
            </li>
          </ul>
        </div>
        <p className="rounded-lg bg-black/40 px-2 py-1 text-[10px] text-white/50 backdrop-blur">
          HUD 座標為平面圖空間（X 西→東）
        </p>
      </div>
    </div>
  );
}

export function Scene() {
  return (
    <div className="relative h-full w-full min-h-0 flex-1">
      <HelpOverlay />
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        className="h-full w-full touch-none"
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
