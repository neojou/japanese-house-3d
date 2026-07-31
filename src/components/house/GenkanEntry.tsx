"use client";

import { useCallback, useRef, useState } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import * as THREE from "three";
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

/** Negative Y: hinge east, open toward parking (−Z). */
const OPEN_RAD = -THREE.MathUtils.degToRad(GENKAN_ENTRY.openAngleDeg);

/**
 * Parking + steps (0.25 m each) + 玄関大门 (sill 0.5 m).
 * Handle left (LDK); hinge right; click to open/close.
 */
export function GenkanEntry() {
  const y0 = FLOOR_LEVELS["1f"];
  const g = GENKAN_ENTRY;
  const bayW = g.x1 - g.x0;
  const wallZ = g.z;
  const sillY = g.sill;
  const frameInnerW = bayW - 2 * g.frameThickness;
  const leafW = frameInnerW - 2 * g.leafClearance;
  const leafH = g.openingHeight - g.frameThickness - g.leafClearance;
  const leafZ = wallZ;
  const hingeX = g.x1 - g.frameThickness - g.leafClearance;

  const [open, setOpen] = useState(false);
  const hingeRef = useRef<THREE.Group>(null);
  const angleRef = useRef(0);

  const onDoorClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setOpen((v) => !v);
  }, []);

  useFrame((_, dt) => {
    const target = open ? OPEN_RAD : 0;
    angleRef.current = THREE.MathUtils.damp(angleRef.current, target, 10, dt);
    if (hingeRef.current) {
      hingeRef.current.rotation.y = angleRef.current;
    }
  });

  const ft = g.frameThickness;
  const fd = g.frameDepth;
  const oh = g.openingHeight;
  const midX = (g.x0 + g.x1) / 2;
  /** Frame sits on the sill (raised platform) */
  const frameBaseY = y0 + sillY;

  const doorPointer = {
    onClick: onDoorClick,
    onPointerOver: () => {
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "auto";
    },
  };

  const face = wallZ - BUILDING.wallThickness / 2;

  return (
    <group name="genkan-entry">
      {/* Parking */}
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

      {/* LDK south dimension ticks */}
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

      {/*
        Two steps, each 0.25 m high, going south from the door face:
          outer (south) top = 0.25 · inner (at door) top = 0.50
      */}
      {Array.from({ length: g.stepCount }, (_, i) => {
        // i=0 outer (first from parking), i=1 inner (second / door)
        const level = i + 1; // 1 or 2
        const topY = g.stepHeight * level;
        const centerY = topY - g.stepHeight / 2;
        // outer further south
        const fromDoor = g.stepCount - i; // 2, 1
        const centerZ = face - g.stepDepth * (fromDoor - 0.5);
        return (
          <mesh
            key={i}
            position={[midX, y0 + centerY, centerZ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[g.stepWidth, g.stepHeight, g.stepDepth]} />
            <meshStandardMaterial color={COLORS.step} roughness={0.9} />
          </mesh>
        );
      })}

      {/* Door frame on sill */}
      <mesh
        position={[g.x0 + ft / 2, frameBaseY + oh / 2, wallZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[ft, oh, fd]} />
        <meshStandardMaterial color={COLORS.genkanDoorFrame} roughness={0.75} />
      </mesh>
      <mesh
        position={[g.x1 - ft / 2, frameBaseY + oh / 2, wallZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[ft, oh, fd]} />
        <meshStandardMaterial color={COLORS.genkanDoorFrame} roughness={0.75} />
      </mesh>
      <mesh
        position={[midX, frameBaseY + oh - ft / 2, wallZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[frameInnerW, ft, fd]} />
        <meshStandardMaterial color={COLORS.genkanDoorFrame} roughness={0.75} />
      </mesh>
      {/* Threshold on sill */}
      <mesh
        position={[midX, frameBaseY + 0.015, wallZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[frameInnerW, 0.03, fd * 1.05]} />
        <meshStandardMaterial color={COLORS.genkanDoorFrame} roughness={0.8} />
      </mesh>

      {/* Door leaf — hinge east, handle west (LDK) */}
      <group
        ref={hingeRef}
        position={[hingeX, frameBaseY, leafZ]}
        name="genkan-door-hinge"
      >
        <mesh
          position={[-leafW / 2, leafH * 0.38, 0]}
          castShadow
          receiveShadow
          {...doorPointer}
        >
          <boxGeometry args={[leafW, leafH * 0.72, g.leafThickness]} />
          <meshStandardMaterial color={COLORS.genkanDoor} roughness={0.7} />
        </mesh>
        <mesh
          position={[-leafW / 2, leafH * 0.84, 0]}
          castShadow
          {...doorPointer}
        >
          <boxGeometry
            args={[leafW * 0.92, leafH * 0.24, g.leafThickness * 0.6]}
          />
          <meshStandardMaterial
            color="#c5d8e8"
            transparent
            opacity={0.45}
            roughness={0.12}
            metalness={0.05}
          />
        </mesh>
        <mesh
          position={[
            -leafW * 0.88,
            leafH * 0.45,
            -g.leafThickness / 2 - 0.015,
          ]}
          {...doorPointer}
        >
          <boxGeometry args={[0.025, 0.14, 0.035]} />
          <meshStandardMaterial
            color="#b0b0b0"
            metalness={0.75}
            roughness={0.25}
          />
        </mesh>
        <mesh
          position={[
            -leafW * 0.88,
            leafH * 0.45,
            g.leafThickness / 2 + 0.015,
          ]}
          {...doorPointer}
        >
          <boxGeometry args={[0.025, 0.14, 0.035]} />
          <meshStandardMaterial
            color="#b0b0b0"
            metalness={0.75}
            roughness={0.25}
          />
        </mesh>
      </group>
    </group>
  );
}
