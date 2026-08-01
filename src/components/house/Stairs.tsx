"use client";

import {
  COLORS,
  MATERIAL_PRESETS,
  STAIRS,
  STAIR_WINDERS,
  type Cardinal,
  type StairFlight,
  type StairWinder,
} from "@/data/dimensions";

function directionOffset(
  direction: Cardinal,
  distance: number,
): [number, number] {
  switch (direction) {
    case "north":
      return [0, distance];
    case "south":
      return [0, -distance];
    case "east":
      return [distance, 0];
    case "west":
      return [-distance, 0];
  }
}

function StairFlightMesh({ flight }: { flight: StairFlight }) {
  const steps = [];
  const alongX =
    flight.direction === "east" || flight.direction === "west";

  for (let i = 0; i < flight.stepCount; i++) {
    const along = (i + 0.5) * flight.treadDepth;
    const [dx, dz] = directionOffset(flight.direction, along);
    const y = flight.baseY + (i + 0.5) * flight.riserHeight;
    const x = flight.x + dx;
    const z = flight.z + dz;

    const sizeX = alongX ? flight.treadDepth : flight.width;
    const sizeZ = alongX ? flight.width : flight.treadDepth;

    steps.push(
      <mesh
        key={`${flight.id}-step-${i}`}
        position={[x, y, z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[sizeX, flight.riserHeight, sizeZ]} />
        <meshStandardMaterial
          color={COLORS.stair}
          roughness={MATERIAL_PRESETS.stair.roughness}
          metalness={MATERIAL_PRESETS.stair.metalness}
        />
      </mesh>,
    );
  }

  return <group name={flight.id}>{steps}</group>;
}

/**
 * 90° winders: boxes along an arc, rising each step.
 * Angle 0 = east (+X), π/2 = north (+Z).
 */
function StairWinderMesh({ winder }: { winder: StairWinder }) {
  const steps = [];
  const n = winder.stepCount;
  const rMid = (winder.rInner + winder.rOuter) / 2;
  const radial = winder.rOuter - winder.rInner;
  const dAng = winder.sweep / n;

  for (let i = 0; i < n; i++) {
    const a0 = winder.startAngle + i * dAng;
    const a1 = winder.startAngle + (i + 1) * dAng;
    const aMid = (a0 + a1) / 2;
    const x = winder.pivotX + rMid * Math.cos(aMid);
    const z = winder.pivotZ + rMid * Math.sin(aMid);
    const y = winder.baseY + (i + 0.5) * winder.riserHeight;
    // Chord length ≈ r * |dAng|
    const chord = Math.abs(rMid * dAng) * 1.05;
    // Face along radial direction (yaw so long axis is tangential)
    const yaw = aMid + Math.PI / 2;

    steps.push(
      <mesh
        key={`${winder.id}-w-${i}`}
        position={[x, y, z]}
        rotation={[0, -yaw, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[chord, winder.riserHeight, radial]} />
        <meshStandardMaterial
          color={COLORS.stair}
          roughness={MATERIAL_PRESETS.stair.roughness}
          metalness={MATERIAL_PRESETS.stair.metalness}
        />
      </mesh>,
    );
  }

  return <group name={winder.id}>{steps}</group>;
}

export function Stairs() {
  return (
    <group name="stairs">
      {STAIRS.map((flight) => (
        <StairFlightMesh key={flight.id} flight={flight} />
      ))}
      {STAIR_WINDERS.map((w) => (
        <StairWinderMesh key={w.id} winder={w} />
      ))}
    </group>
  );
}
