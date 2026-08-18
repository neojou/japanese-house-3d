
import { Canvas } from "@react-three/fiber";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { House } from "@/components/house";
import { Player } from "@/components/Player";
import { FirstPersonCamera } from "@/components/cameras/FirstPersonCamera";
import { MobileDpad } from "@/components/ui/MobileDpad";
import { PositionHud } from "@/components/ui/PositionHud";
import { BUILDING, LIGHTING, PLAYER } from "@/data/dimensions";
import { planToWorldX } from "@/lib/coords";
import { isCoarsePointer } from "@/lib/input";

function Lights() {
  const sun = LIGHTING.sun;
  const genkan = LIGHTING.genkanRecess;
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
      {/* Soft interior + genkan recess fills (plan-space; house group is X-mirrored) */}
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
        {/* Reveal yaki-sugi grain on west jog + door (otherwise pure black) */}
        <pointLight
          position={genkan.fill.position}
          intensity={genkan.fill.intensity}
          distance={genkan.fill.distance}
          decay={2}
          color={genkan.fill.color}
        />
        <pointLight
          position={genkan.rakeWest.position}
          intensity={genkan.rakeWest.intensity}
          distance={genkan.rakeWest.distance}
          decay={2}
          color={genkan.rakeWest.color}
        />
      </group>
      {/* Low-intensity env for micro-specular on char ridges (no new deps) */}
      <Environment preset="city" environmentIntensity={0.28} />
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

/**
 * Minimal chrome:
 * - Top-right: compact plan coordinates (all devices)
 * - Bottom-left: keyboard help on fine pointer only (desktop)
 * - Mobile: no text help — only MobileDpad (sibling) + PositionHud
 */
function HelpOverlay() {
  const [desktopHelp, setDesktopHelp] = useState(false);

  useEffect(() => {
    const update = () => setDesktopHelp(!isCoarsePointer());
    update();
    const mq = window.matchMedia("(pointer: coarse)");
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-4">
      <header className="flex justify-end">
        <PositionHud />
      </header>

      {desktopHelp && (
        <div className="self-start rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-[11px] leading-relaxed text-white/75 backdrop-blur-sm">
          <ul className="space-y-0.5">
            <li>
              <kbd className="rounded bg-white/15 px-1">W S</kbd> 前進/後退 ·{" "}
              <kbd className="rounded bg-white/15 px-1">A D</kbd> 左轉/右轉 10°
            </li>
            <li>
              <strong>點空白</strong>：鎖定視角 ·{" "}
              <kbd className="rounded bg-white/15 px-1">Esc</kbd> 解鎖 ·{" "}
              <strong>點門／龍頭</strong>：開關
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

type SceneProps = {
  /** Fired once after WebGL context + first content frame are ready */
  onReady?: () => void;
};

function ReadySignal({ onReady }: { onReady?: () => void }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current || !onReady) return;
    // Double rAF: after first layout + paint of 3D content
    let id2 = 0;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        if (!sent.current) {
          sent.current = true;
          onReady();
        }
      });
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, [onReady]);
  return null;
}

export function Scene({ onReady }: SceneProps = {}) {
  return (
    <div className="relative h-full w-full min-h-0 flex-1">
      <HelpOverlay />
      <MobileDpad />
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          /** Slightly brighter midtones for ivory stucco under raking sun */
          toneMappingExposure: 1.12,
        }}
        className="h-full w-full touch-none"
        style={{ touchAction: "none" }}
        onCreated={() => {
          // Context up; final ready after House mounts (ReadySignal)
        }}
      >
        <Suspense fallback={null}>
          <SceneContent />
          <ReadySignal onReady={onReady} />
        </Suspense>
      </Canvas>
    </div>
  );
}
