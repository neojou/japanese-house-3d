import { useCallback, useMemo, useRef } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  BUILDING,
  COLORS,
  FLOOR_LEVELS,
  GENKAN_ENTRY,
  MATERIAL_PRESETS,
  PARKING_1F,
} from "@/data/dimensions";
import { GENKAN_DOOR_HERO } from "@/lib/genkanDoorHero";
import { useViewerStore } from "@/store/useViewerStore";
import { GenkanDoorHero } from "./GenkanDoorHero";

/** West hinge, leaf +X; +Y rot swings free edge to −Z (parking / 西南). */
const OPEN_RAD = THREE.MathUtils.degToRad(GENKAN_ENTRY.openAngleDeg);

/**
 * Parking + steps + Giesta-inspired hero door (no yaki leaf).
 * Hinge west, handle east, opens toward southwest (parking).
 */
export function GenkanEntry() {
  const y0 = FLOOR_LEVELS["1f"];
  const g = GENKAN_ENTRY;
  const wallZ = g.z;
  const sillY = g.sill;
  const halfT = BUILDING.wallThickness / 2;
  const leafT = GENKAN_DOOR_HERO.leafT;
  const leafZ = wallZ - halfT + leafT / 2 + 0.002;
  const hingeX = g.x0 + GENKAN_DOOR_HERO.frameReveal;

  const open = useViewerStore((s) => !!s.doorOpen.genkan);
  const toggleDoor = useViewerStore((s) => s.toggleDoor);
  const hingeRef = useRef<THREE.Group>(null);
  const angleRef = useRef(0);

  const onDoorClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      toggleDoor("genkan");
    },
    [toggleDoor],
  );

  useFrame((_, dt) => {
    const target = open ? OPEN_RAD : 0;
    angleRef.current = THREE.MathUtils.damp(angleRef.current, target, 10, dt);
    if (hingeRef.current) {
      hingeRef.current.rotation.y = angleRef.current;
    }
  });

  const midX = (g.x0 + g.x1) / 2;
  const frameBaseY = y0 + sillY;
  const face = wallZ - halfT;

  const doorPointer = useMemo(
    () => ({
      onClick: onDoorClick,
      onPointerOver: () => {
        document.body.style.cursor = "pointer";
      },
      onPointerOut: () => {
        document.body.style.cursor = "auto";
      },
    }),
    [onDoorClick],
  );

  return (
    <group name="genkan-entry">
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[
          PARKING_1F.x + PARKING_1F.width / 2,
          y0 - 0.01,
          PARKING_1F.z + PARKING_1F.depth / 2,
        ]}
        receiveShadow
      >
        <planeGeometry args={[PARKING_1F.width, PARKING_1F.depth]} />
        <meshStandardMaterial
          color={COLORS.parking}
          roughness={MATERIAL_PRESETS.parking.roughness}
          metalness={MATERIAL_PRESETS.parking.metalness}
        />
      </mesh>

      {Array.from({ length: g.stepCount }, (_, i) => {
        const level = i + 1;
        const topY = g.stepHeight * level;
        const centerY = topY - g.stepHeight / 2;
        const fromDoor = g.stepCount - i;
        const centerZ = face - g.stepDepth * (fromDoor - 0.5);
        return (
          <mesh
            key={i}
            position={[midX, y0 + centerY, centerZ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[g.stepWidth, g.stepHeight, g.stepDepth]} />
            <meshStandardMaterial
              color="#4a4844"
              roughness={0.92}
              metalness={0.02}
            />
          </mesh>
        );
      })}

      <group position={[hingeX, frameBaseY, leafZ]} name="genkan-door-portal">
        <GenkanDoorHero part="frame" ptr={doorPointer} />
        <group
          ref={hingeRef}
          name="genkan-door-hinge"
          userData={{ interactable: "door" }}
        >
          <GenkanDoorHero part="door" ptr={doorPointer} />
        </group>
      </group>
    </group>
  );
}
