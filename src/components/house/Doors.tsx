"use client";

import {
  COLORS,
  FLOOR_LEVELS,
  WALLS,
  type Opening,
  type WallSegment,
} from "@/data/dimensions";

/**
 * Phase 1: visualize openings as thin translucent panels (not interactive).
 * Actual walkable gaps are already cut in Walls.tsx.
 */
function DoorPanel({
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
  const y = baseY + opening.height / 2;
  const thickness = 0.04;

  const x = alongX ? mid : wall.x;
  const z = alongX ? wall.z : mid;
  const sizeX = alongX ? opening.width * 0.95 : thickness;
  const sizeZ = alongX ? thickness : opening.width * 0.95;

  return (
    <mesh position={[x, y, z]}>
      <boxGeometry args={[sizeX, opening.height * 0.95, sizeZ]} />
      <meshStandardMaterial
        color={COLORS.doorFill}
        transparent
        opacity={0.35}
        roughness={0.7}
        metalness={0.1}
      />
    </mesh>
  );
}

/** Rendered by GenkanEntry with a full frame + leaf instead. */
const SKIP_OPENING_IDS = new Set(["1f-door-genkan-main"]);

export function Doors() {
  const items: { wall: WallSegment; opening: Opening }[] = [];
  for (const wall of WALLS) {
    for (const opening of wall.openings ?? []) {
      if (SKIP_OPENING_IDS.has(opening.id)) continue;
      items.push({ wall, opening });
    }
  }

  return (
    <group name="doors">
      {items.map(({ wall, opening }) => (
        <DoorPanel
          key={`${wall.id}-${opening.id}`}
          wall={wall}
          opening={opening}
        />
      ))}
    </group>
  );
}
