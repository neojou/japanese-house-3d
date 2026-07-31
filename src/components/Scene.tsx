"use client";

import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { House } from "@/components/house";
import { Player } from "@/components/Player";
import { FirstPersonCamera } from "@/components/cameras/FirstPersonCamera";
import { TopDownCamera } from "@/components/cameras/TopDownCamera";
import { ModeSwitcher } from "@/components/ui/ModeSwitcher";
import { BUILDING, PLAYER, SOUTH_FACADE, SZ } from "@/data/dimensions";
import { planToWorldX } from "@/lib/coords";
import { useViewerStore } from "@/store/useViewerStore";

function Lights() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        castShadow
        intensity={1.15}
        position={[14, 22, 10]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />
      <hemisphereLight args={["#e8f0ff", "#6a7a5a", 0.35]} />
    </>
  );
}

function SceneContent() {
  const mode = useViewerStore((s) => s.mode);

  // Player / free camera live in world space (outside mirror group)
  const spawnWorldX = useMemo(
    () => planToWorldX(PLAYER.spawn.x),
    [],
  );

  return (
    <>
      <color attach="background" args={["#c5d4e0"]} />
      <fog attach="fog" args={["#c5d4e0", 40, 90]} />
      <Lights />

      <PerspectiveCamera
        makeDefault={mode === "first-person"}
        fov={70}
        near={0.05}
        far={200}
        position={[
          spawnWorldX,
          PLAYER.spawn.y + PLAYER.eyeHeight,
          PLAYER.spawn.z,
        ]}
      />

      <TopDownCamera />
      <FirstPersonCamera />
      <Player />

      {/*
        Mirror house in X so Three.js north-facing views match the plan:
        looking at the south façade → left=LDK, right=genkan.
        Data in dimensions.ts stays in plan space (LDK = west = small plan X).
      */}
      <group
        name="plan-mirror"
        scale={[-1, 1, 1]}
        position={[BUILDING.width, 0, 0]}
      >
        <House />
        {/* Plan SW origin axes (inside mirror = correct plan corner) */}
        <axesHelper args={[2.5]} position={[0, 0.02, 0]} />
      </group>
    </>
  );
}

function HelpOverlay() {
  const mode = useViewerStore((s) => s.mode);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4">
      <header className="flex items-start justify-between gap-4">
        <div className="rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-white shadow-lg backdrop-blur-md">
          <h1 className="text-base font-semibold tracking-tight">
            日本住宅 3D · 1F 外牆校正
          </h1>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-white/75">
            僅 1 樓外殼 + 玄関大门。南面：
            {SOUTH_FACADE.ldkA}+{SOUTH_FACADE.ldkB} LDK → 内縮 {SZ.recess} →
            门 {SOUTH_FACADE.genkanDoor} → SCL {SOUTH_FACADE.sclSouth} → UB{" "}
            {SOUTH_FACADE.ubSouth}
          </p>
          <p className="mt-1 text-[11px] text-white/50">
            {BUILDING.width}m × {BUILDING.depth}m · 滾輪可再縮小看全貌
          </p>
        </div>
        <ModeSwitcher />
      </header>

      <div className="flex items-end justify-between gap-3">
        <div className="rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-[11px] leading-relaxed text-white/80 backdrop-blur-md">
          {mode === "first-person" ? (
            <ul className="space-y-0.5">
              <li>駐車區面朝大门（北）</li>
              <li>
                <strong>左 = LDK 南牆 · 右 = 玄関门 / SCL / UB</strong>
              </li>
              <li>
                <kbd className="rounded bg-white/15 px-1">點擊</kbd> 鎖定 ·{" "}
                <kbd className="rounded bg-white/15 px-1">WASD</kbd> ·{" "}
                <kbd className="rounded bg-white/15 px-1">Esc</kbd>
              </li>
            </ul>
          ) : (
            <ul className="space-y-0.5">
              <li>
                <strong>上北 · 下南 · 左 LDK · 右 玄関/UB</strong>
              </li>
              <li>滾輪縮小可看全貌 · 拖曳平移</li>
              <li>紅/橘線 = LDK 南 2.175+4.195</li>
            </ul>
          )}
        </div>
        <p className="rounded-lg bg-black/40 px-2 py-1 text-[10px] text-white/50 backdrop-blur">
          與平面圖同向：玄関在 LDK 右側（東）
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
        // PCFSoftShadowMap is deprecated in current three — use PCF explicitly
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        className="h-full w-full touch-none"
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
