"use client";

import {
  COLORS,
  FLOOR_LEVELS,
  STAIRS,
  type Cardinal,
  type StairFlight,
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
  const baseY = FLOOR_LEVELS[flight.fromFloor];
  const steps = [];

  for (let i = 0; i < flight.stepCount; i++) {
    const along = (i + 0.5) * flight.treadDepth;
    const [dx, dz] = directionOffset(flight.direction, along);
    const y = baseY + (i + 0.5) * flight.riserHeight;
    const x = flight.x + dx;
    const z = flight.z + dz;

    // Tread box: thin top; size oriented by travel direction
    const alongX =
      flight.direction === "east" || flight.direction === "west";
    const sizeX = alongX ? flight.treadDepth : flight.width;
    const sizeZ = alongX ? flight.width : flight.treadDepth;

    steps.push(
      <mesh key={`${flight.id}-step-${i}`} position={[x, y, z]} castShadow receiveShadow>
        <boxGeometry args={[sizeX, flight.riserHeight, sizeZ]} />
        <meshStandardMaterial color={COLORS.stair} roughness={0.9} metalness={0} />
      </mesh>,
    );
  }

  return <group name={flight.id}>{steps}</group>;
}

export function Stairs() {
  return (
    <group name="stairs">
      {STAIRS.map((flight) => (
        <StairFlightMesh key={flight.id} flight={flight} />
      ))}
    </group>
  );
}
