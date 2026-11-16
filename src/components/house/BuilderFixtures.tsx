import { useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { CanvasTexture, type PointLight } from "three";
import { BUILDER_FIXTURE_DEFAULTS } from "@/data/dimensions";
import {
  assignLightPool,
  faceOffset,
  faceYaw,
  fixtureEmitColor,
  fixtureWorldY,
  gangOffsetY,
  switchWorldY,
} from "@/lib/fixtures/logic";
import type { Fixture, SwitchGang, SwitchPlate } from "@/lib/fixtures/types";
import { useLightingStore } from "@/store/useLightingStore";
import { useViewerStore } from "@/store/useViewerStore";

const POOL = BUILDER_FIXTURE_DEFAULTS.lightPool;

/**
 * Plan-space fixtures inside the mirrored house group.
 * The point-light pool stays mounted in every mode so the light count does not change.
 */
export function BuilderFixtures() {
  return (
    <group name="builder-lighting">
      <BuilderLightPool />
      <BuilderBodies />
    </group>
  );
}

function BuilderLightPool() {
  const refs = useRef<Array<PointLight | null>>([]);

  useFrame(() => {
    const { data, mode, circuitOn } = useLightingStore.getState();
    const { position, activeFloor } = useViewerStore.getState();
    const slots =
      data && mode === "builder"
        ? assignLightPool({
            poolSize: POOL,
            floor: activeFloor,
            fixtures: data.fixtures,
            circuitOn,
            playerX: position.x,
            playerZ: position.z,
          })
        : [];
    for (let i = 0; i < POOL; i++) {
      const light = refs.current[i];
      if (!light) continue;
      const slot = slots[i];
      if (!slot) {
        light.intensity = 0;
        light.position.set(0, -20, 0);
        continue;
      }
      light.position.set(slot.x, slot.y, slot.z);
      light.color.set(slot.color);
      light.intensity = BUILDER_FIXTURE_DEFAULTS.pointIntensity;
      light.distance = BUILDER_FIXTURE_DEFAULTS.pointDistance;
    }
  });

  return (
    <group name="builder-light-pool">
      {Array.from({ length: POOL }, (_, i) => (
        <pointLight
          key={i}
          ref={(node) => {
            refs.current[i] = node;
          }}
          intensity={0}
          decay={2}
          distance={BUILDER_FIXTURE_DEFAULTS.pointDistance}
          castShadow={false}
        />
      ))}
    </group>
  );
}

function BuilderBodies() {
  const data = useLightingStore((s) => s.data);
  const mode = useLightingStore((s) => s.mode);
  const circuitOn = useLightingStore((s) => s.circuitOn);
  const showSwitches = useLightingStore((s) => s.showSwitches);
  if (!data || mode !== "builder") return null;
  return (
    <group name="builder-fixtures">
      {data.fixtures.map((fixture) => (
        <FixtureMesh
          key={fixture.id}
          fixture={fixture}
          on={circuitOn[fixture.circuit] === true}
        />
      ))}
      {showSwitches &&
        data.switches.map((plate) => <SwitchPlateMesh key={plate.id} plate={plate} />)}
    </group>
  );
}

function FixtureMesh({ fixture, on }: { fixture: Fixture; on: boolean }) {
  const y = fixtureWorldY(fixture);
  const wall = fixture.mount === "wall";
  const depth = BUILDER_FIXTURE_DEFAULTS.wallBox.depth;
  const [ox, oz] = wall
    ? faceOffset(fixture.face, BUILDER_FIXTURE_DEFAULTS.proud + depth / 2)
    : [0, 0];
  const yaw = wall ? faceYaw(fixture.face) : 0;
  return (
    <group
      name={fixture.id}
      position={[fixture.x + ox, y, fixture.z + oz]}
      rotation={[0, yaw, 0]}
    >
      {fixture.type === "換" ? (
        <FanMark on={on} />
      ) : (
        <LampMesh fixture={fixture} on={on} />
      )}
    </group>
  );
}

function LampMesh({ fixture, on }: { fixture: Fixture; on: boolean }) {
  const color = fixtureEmitColor(fixture);
  const emissiveIntensity = on
    ? BUILDER_FIXTURE_DEFAULTS.emissiveOn
    : BUILDER_FIXTURE_DEFAULTS.emissiveOff;
  const material = (
    <meshStandardMaterial
      color={BUILDER_FIXTURE_DEFAULTS.fixtureBody}
      emissive={color}
      emissiveIntensity={emissiveIntensity}
      roughness={0.45}
      metalness={0}
    />
  );
  if (fixture.type === "B" || fixture.type === "外") {
    const box = BUILDER_FIXTURE_DEFAULTS.wallBox;
    return (
      <mesh castShadow={false} receiveShadow={false}>
        <boxGeometry args={[box.width, box.height, box.depth]} />
        {material}
      </mesh>
    );
  }
  const radius =
    fixture.type === "D"
      ? BUILDER_FIXTURE_DEFAULTS.downlightRadius
      : BUILDER_FIXTURE_DEFAULTS.ceilingDiscRadius;
  return (
    <mesh castShadow={false} receiveShadow={false}>
      <cylinderGeometry
        args={[radius, radius, BUILDER_FIXTURE_DEFAULTS.ceilingDiscThickness, 24]}
      />
      {material}
    </mesh>
  );
}

const pointer = {
  onPointerOver: (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = "pointer";
  },
  onPointerOut: () => {
    document.body.style.cursor = "auto";
  },
};

function SwitchPlateMesh({ plate }: { plate: SwitchPlate }) {
  const plateSize = BUILDER_FIXTURE_DEFAULTS.switchPlate;
  const [ox, oz] = faceOffset(
    plate.face,
    BUILDER_FIXTURE_DEFAULTS.proud + plateSize.depth / 2,
  );
  return (
    <group
      name={plate.id}
      position={[plate.x + ox, switchWorldY(plate), plate.z + oz]}
      rotation={[0, faceYaw(plate.face), 0]}
    >
      <mesh castShadow={false} receiveShadow={false}>
        <boxGeometry args={[plateSize.width, plateSize.height, plateSize.depth]} />
        <meshStandardMaterial
          color={BUILDER_FIXTURE_DEFAULTS.switchBody}
          roughness={0.65}
          metalness={0}
        />
      </mesh>
      {plate.gangs.map((gang, index) => (
        <SwitchGangMesh
          key={`${plate.id}-${index}`}
          gang={gang}
          index={index}
          count={plate.gangs.length}
        />
      ))}
    </group>
  );
}

function SwitchGangMesh({
  gang,
  index,
  count,
}: {
  gang: SwitchGang;
  index: number;
  count: number;
}) {
  const on = useLightingStore((s) => s.circuitOn[gang.circuit] === true);
  const plate = BUILDER_FIXTURE_DEFAULTS.switchPlate;
  const y = gangOffsetY(index, count, plate.height);
  const buttonH = Math.min(plate.height * 0.34, (plate.height * 0.7) / count);
  const mark = gang.threeWay ? threeMarkTexture() : null;
  return (
    <group position={[0, y, plate.depth / 2 + plate.depth * 0.15]}>
      <mesh
        castShadow={false}
        userData={{ interactable: "switch" }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          useLightingStore.getState().toggleCircuit(gang.circuit);
        }}
        {...pointer}
      >
        <boxGeometry args={[plate.width * 0.72, buttonH, plate.depth * 0.4]} />
        <meshStandardMaterial
          color={on ? BUILDER_FIXTURE_DEFAULTS.switchOn : "#d7d0c4"}
          roughness={0.5}
          metalness={0}
        />
      </mesh>
      {mark && (
        <mesh position={[plate.width * 0.22, 0, plate.depth * 0.4]} renderOrder={1}>
          <planeGeometry args={[plate.width * 0.22, plate.width * 0.22]} />
          <meshBasicMaterial map={mark} transparent toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

let threeMark: CanvasTexture | null = null;

function threeMarkTexture(): CanvasTexture | null {
  if (threeMark) return threeMark;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext("2d");
  if (!g) return null;
  g.clearRect(0, 0, 64, 64);
  g.fillStyle = "#1c1916";
  g.font = "bold 46px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("3", 32, 34);
  threeMark = new CanvasTexture(canvas);
  threeMark.needsUpdate = true;
  return threeMark;
}

function FanMark({ on }: { on: boolean }) {
  const size = BUILDER_FIXTURE_DEFAULTS.fanSize;
  const thick = BUILDER_FIXTURE_DEFAULTS.fanThickness;
  const slats = 4;
  return (
    <group>
      <mesh castShadow={false} receiveShadow={false}>
        <boxGeometry args={[size, thick, size]} />
        <meshStandardMaterial
          color={on ? "#8a8175" : "#4a453f"}
          roughness={0.85}
          metalness={0}
        />
      </mesh>
      {Array.from({ length: slats }, (_, i) => {
        const z = (i - (slats - 1) / 2) * (size / slats);
        return (
          <mesh key={i} position={[0, thick, z]} castShadow={false}>
            <boxGeometry args={[size * 0.82, thick * 0.4, size * 0.08]} />
            <meshStandardMaterial color="#2a2622" roughness={0.7} metalness={0} />
          </mesh>
        );
      })}
    </group>
  );
}
