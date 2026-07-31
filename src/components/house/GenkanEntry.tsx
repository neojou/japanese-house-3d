"use client";

import {
  BUILDING,
  COLORS,
  FLOOR_LEVELS,
  GENKAN_ENTRY,
  PARKING_1F,
  SOUTH_FACADE,
  SX,
  SZ,
} from "@/data/dimensions";

/**
 * Parking court + 玄関 main door on the recessed south face (z = 2.755).
 * Door bay width follows plan 1,520 mm.
 */
export function GenkanEntry() {
  const y0 = FLOOR_LEVELS["1f"];
  const door = GENKAN_ENTRY;
  const doorCenterX = (door.x0 + door.x1) / 2;
  const wallZ = door.z;
  const doorLeafZ = wallZ - BUILDING.wallThickness / 2 - 0.04;
  const frameDepth = 0.14;
  const frameT = 0.09;

  return (
    <group name="genkan-entry">
      {/* Parking asphalt */}
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
        <meshStandardMaterial color={COLORS.parking} roughness={0.95} />
      </mesh>

      {/* Dimension tick marks along south LDK (visual check of 2.175+4.195) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[SX.xLdkA / 2, y0 + 0.01, SZ.outer - 0.25]}
      >
        <planeGeometry args={[SOUTH_FACADE.ldkA * 0.95, 0.08]} />
        <meshStandardMaterial color="#e74c3c" />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[
          SX.xLdkA + SOUTH_FACADE.ldkB / 2,
          y0 + 0.01,
          SZ.outer - 0.25,
        ]}
      >
        <planeGeometry args={[SOUTH_FACADE.ldkB * 0.95, 0.08]} />
        <meshStandardMaterial color="#e67e22" />
      </mesh>

      {/* Steps into genkan */}
      {Array.from({ length: door.stepCount }, (_, i) => {
        const stepZ =
          wallZ -
          BUILDING.wallThickness / 2 -
          door.stepDepth * (i + 0.5) -
          0.02;
        const stepY =
          y0 + door.stepHeight * (door.stepCount - i) - door.stepHeight / 2;
        return (
          <mesh
            key={i}
            position={[doorCenterX, stepY, stepZ]}
            castShadow
            receiveShadow
          >
            <boxGeometry
              args={[door.stepWidth, door.stepHeight, door.stepDepth]}
            />
            <meshStandardMaterial color={COLORS.step} roughness={0.9} />
          </mesh>
        );
      })}

      {/* Door frame */}
      <mesh
        position={[
          doorCenterX - door.doorWidth / 2 - frameT / 2,
          y0 + door.doorHeight / 2,
          doorLeafZ,
        ]}
        castShadow
      >
        <boxGeometry args={[frameT, door.doorHeight, frameDepth]} />
        <meshStandardMaterial color={COLORS.genkanDoorFrame} />
      </mesh>
      <mesh
        position={[
          doorCenterX + door.doorWidth / 2 + frameT / 2,
          y0 + door.doorHeight / 2,
          doorLeafZ,
        ]}
        castShadow
      >
        <boxGeometry args={[frameT, door.doorHeight, frameDepth]} />
        <meshStandardMaterial color={COLORS.genkanDoorFrame} />
      </mesh>
      <mesh
        position={[
          doorCenterX,
          y0 + door.doorHeight + frameT / 2,
          doorLeafZ,
        ]}
        castShadow
      >
        <boxGeometry
          args={[door.doorWidth + frameT * 2, frameT, frameDepth]}
        />
        <meshStandardMaterial color={COLORS.genkanDoorFrame} />
      </mesh>

      {/* Door leaf — ajar toward parking */}
      <group
        position={[doorCenterX - door.doorWidth / 2, y0, doorLeafZ]}
        rotation={[0, -Math.PI * 0.15, 0]}
      >
        <mesh
          position={[door.doorWidth / 2, door.doorHeight * 0.35, 0]}
          castShadow
        >
          <boxGeometry
            args={[door.doorWidth * 0.95, door.doorHeight * 0.68, 0.05]}
          />
          <meshStandardMaterial color={COLORS.genkanDoor} roughness={0.7} />
        </mesh>
        <mesh
          position={[door.doorWidth / 2, door.doorHeight * 0.82, 0]}
          castShadow
        >
          <boxGeometry
            args={[door.doorWidth * 0.88, door.doorHeight * 0.28, 0.03]}
          />
          <meshStandardMaterial
            color="#dce8f2"
            transparent
            opacity={0.5}
            roughness={0.15}
          />
        </mesh>
        <mesh
          position={[door.doorWidth * 0.85, door.doorHeight * 0.42, 0.04]}
        >
          <boxGeometry args={[0.03, 0.14, 0.04]} />
          <meshStandardMaterial
            color="#c0c0c0"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* Blue lintel marker (easy to spot) */}
      <mesh
        position={[
          doorCenterX,
          y0 + door.doorHeight + 0.22,
          doorLeafZ - 0.02,
        ]}
      >
        <boxGeometry args={[SOUTH_FACADE.genkanDoor, 0.1, 0.1]} />
        <meshStandardMaterial color={COLORS.accent} />
      </mesh>
    </group>
  );
}
