"use client";

import { useCallback, useRef, useState } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  BUILDING,
  COLORS,
  FLOOR_LEVELS,
  INTERIOR_FLOOR_Y,
  MATERIAL_PRESETS,
  SWING_DOORS,
  WALLS,
  type Opening,
  type SwingDoorDef,
  type WallSegment,
} from "@/data/dimensions";

const LEAF_T = 0.04;
const FRAME_T = 0.05;

/**
 * Clickable interior swing door — quarter-circle open (default 90°).
 * Plan-space geometry (parent house group may mirror X).
 */
function SwingDoor({ def }: { def: SwingDoorDef }) {
  const [open, setOpen] = useState(false);
  const hingeRef = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const openRad = def.openSign * THREE.MathUtils.degToRad(def.openAngleDeg);

  const leafW = Math.abs(def.alongMax - def.alongMin) - 0.02;
  const leafH = def.height - FRAME_T - 0.01;
  const baseY = FLOOR_LEVELS[def.floor ?? "1f"];
  const sillY = baseY + def.sill;

  // Hinge world position on wall centerline
  const hingeAlong = def.hingeAt === "min" ? def.alongMin : def.alongMax;
  // Leaf extends from hinge toward the other end
  const leafDir = def.hingeAt === "min" ? 1 : -1;

  const hingePos: [number, number, number] =
    def.axis === "ew"
      ? [hingeAlong, sillY, def.wallZ]
      : [def.wallX, sillY, hingeAlong];

  const onClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setOpen((v) => !v);
  }, []);

  useFrame((_, dt) => {
    const target = open ? openRad : 0;
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

  // Local leaf: along +X in hinge local space, then rotate group for NS walls
  const groupRotY = def.axis === "ns" ? Math.PI / 2 : 0;
  // For NS walls: local +X should map to +Z or -Z depending on hinge
  // wall NS: opening along Z. hinge at min Z, leaf toward +Z → local +X after rotY(π/2) goes to +Z.
  // hinge at max Z, leafDir -1 → leaf toward -Z. Good if we place leaf at leafDir * leafW/2 on local X.

  return (
    <group name={def.id}>
      {/* Simple frame posts at opening ends (thin) — not interactable */}
      {def.axis === "ew" ? (
        <>
          <mesh
            position={[def.alongMin + FRAME_T / 2, sillY + def.height / 2, def.wallZ]}
          >
            <boxGeometry args={[FRAME_T, def.height, BUILDING.wallThickness]} />
            <meshStandardMaterial
              color={COLORS.genkanDoorFrame}
              roughness={MATERIAL_PRESETS.doorFrame.roughness}
              metalness={MATERIAL_PRESETS.doorFrame.metalness}
            />
          </mesh>
          <mesh
            position={[def.alongMax - FRAME_T / 2, sillY + def.height / 2, def.wallZ]}
          >
            <boxGeometry args={[FRAME_T, def.height, BUILDING.wallThickness]} />
            <meshStandardMaterial
              color={COLORS.genkanDoorFrame}
              roughness={MATERIAL_PRESETS.doorFrame.roughness}
              metalness={MATERIAL_PRESETS.doorFrame.metalness}
            />
          </mesh>
          <mesh
            position={[
              (def.alongMin + def.alongMax) / 2,
              sillY + def.height - FRAME_T / 2,
              def.wallZ,
            ]}
          >
            <boxGeometry
              args={[leafW + 0.02, FRAME_T, BUILDING.wallThickness]}
            />
            <meshStandardMaterial
              color={COLORS.genkanDoorFrame}
              roughness={MATERIAL_PRESETS.doorFrame.roughness}
              metalness={MATERIAL_PRESETS.doorFrame.metalness}
            />
          </mesh>
        </>
      ) : (
        <>
          <mesh
            position={[def.wallX, sillY + def.height / 2, def.alongMin + FRAME_T / 2]}
          >
            <boxGeometry args={[BUILDING.wallThickness, def.height, FRAME_T]} />
            <meshStandardMaterial
              color={COLORS.genkanDoorFrame}
              roughness={MATERIAL_PRESETS.doorFrame.roughness}
              metalness={MATERIAL_PRESETS.doorFrame.metalness}
            />
          </mesh>
          <mesh
            position={[def.wallX, sillY + def.height / 2, def.alongMax - FRAME_T / 2]}
          >
            <boxGeometry args={[BUILDING.wallThickness, def.height, FRAME_T]} />
            <meshStandardMaterial
              color={COLORS.genkanDoorFrame}
              roughness={MATERIAL_PRESETS.doorFrame.roughness}
              metalness={MATERIAL_PRESETS.doorFrame.metalness}
            />
          </mesh>
          <mesh
            position={[
              def.wallX,
              sillY + def.height - FRAME_T / 2,
              (def.alongMin + def.alongMax) / 2,
            ]}
          >
            <boxGeometry
              args={[BUILDING.wallThickness, FRAME_T, leafW + 0.02]}
            />
            <meshStandardMaterial
              color={COLORS.genkanDoorFrame}
              roughness={MATERIAL_PRESETS.doorFrame.roughness}
              metalness={MATERIAL_PRESETS.doorFrame.metalness}
            />
          </mesh>
        </>
      )}

      <group
        ref={hingeRef}
        position={hingePos}
        rotation={[0, groupRotY, 0]}
        userData={{ interactable: "door" }}
      >
        <mesh
          position={[(leafDir * leafW) / 2, leafH / 2, 0]}
          castShadow
          receiveShadow
          userData={{ interactable: "door" }}
          {...ptr}
        >
          <boxGeometry args={[leafW, leafH, LEAF_T]} />
          <meshStandardMaterial
            color={COLORS.genkanDoor}
            roughness={MATERIAL_PRESETS.doorWood.roughness}
            metalness={MATERIAL_PRESETS.doorWood.metalness}
          />
        </mesh>
        {/* Handle near free edge */}
        <mesh
          position={[leafDir * leafW * 0.85, leafH * 0.45, LEAF_T / 2 + 0.015]}
          userData={{ interactable: "door" }}
          {...ptr}
        >
          <boxGeometry args={[0.02, 0.12, 0.03]} />
          <meshStandardMaterial
            color="#b8b8b8"
            metalness={MATERIAL_PRESETS.handle.metalness}
            roughness={MATERIAL_PRESETS.handle.roughness}
          />
        </mesh>
      </group>
    </group>
  );
}

/** Fixed glass window in a wall opening */
function WindowPanel({
  wall,
  opening,
}: {
  wall: WallSegment;
  opening: Opening;
}) {
  const alongX = wall.lengthX >= wall.lengthZ;
  const startCoord = alongX
    ? wall.x - wall.lengthX / 2
    : wall.z - wall.lengthZ / 2;
  const mid = startCoord + opening.fromStart + opening.width / 2;
  const baseY = FLOOR_LEVELS[wall.floor];
  const sill = opening.sill ?? INTERIOR_FLOOR_Y;
  const y = baseY + sill + opening.height / 2;
  const t = 0.03;
  const x = alongX ? mid : wall.x;
  const z = alongX ? wall.z : mid;
  const sizeX = alongX ? opening.width * 0.92 : t;
  const sizeZ = alongX ? t : opening.width * 0.92;

  return (
    <group>
      <mesh position={[x, y, z]}>
        <boxGeometry args={[sizeX, opening.height * 0.92, sizeZ]} />
        <meshStandardMaterial
          color={COLORS.glass}
          transparent={MATERIAL_PRESETS.glass.transparent}
          opacity={MATERIAL_PRESETS.glass.opacity}
          roughness={MATERIAL_PRESETS.glass.roughness}
          metalness={MATERIAL_PRESETS.glass.metalness}
        />
      </mesh>
      {/* Simple frame */}
      <mesh position={[x, baseY + sill + opening.height / 2, z]}>
        <boxGeometry
          args={[
            alongX ? opening.width : BUILDING.wallThickness * 1.05,
            opening.height,
            alongX ? BUILDING.wallThickness * 1.05 : opening.width,
          ]}
        />
        <meshStandardMaterial
          color={COLORS.genkanDoorFrame}
          transparent
          opacity={0.15}
          wireframe={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

const SKIP_OPENING_IDS = new Set([
  "1f-door-genkan-main", // GenkanEntry
  ...SWING_DOORS.map((d) => d.openingId),
]);

export function Doors() {
  const windows: { wall: WallSegment; opening: Opening }[] = [];
  for (const wall of WALLS) {
    for (const opening of wall.openings ?? []) {
      if (opening.type === "window") {
        windows.push({ wall, opening });
      }
    }
  }

  return (
    <group name="doors">
      {SWING_DOORS.map((def) => (
        <SwingDoor key={def.id} def={def} />
      ))}
      {windows.map(({ wall, opening }) => (
        <WindowPanel
          key={`${wall.id}-${opening.id}`}
          wall={wall}
          opening={opening}
        />
      ))}
    </group>
  );
}
