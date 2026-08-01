"use client";

import {
  COLORS,
  FLOOR_LEVELS,
  INTERIOR_FLOOR_Y,
  PROP_1F_TOILET,
  PROP_1F_TOILET_CURTAIN,
  PROP_2F_SINK,
} from "@/data/dimensions";
import * as THREE from "three";

/**
 * Sparse Phase-1 placeholders (not full furniture).
 */
export function Props() {
  return (
    <group name="props">
      <Sink2F />
      <Toilet1F />
      <ToiletCurtain1F />
    </group>
  );
}

function Sink2F() {
  const s = PROP_2F_SINK;
  const baseY = FLOOR_LEVELS[s.floor];
  const cabinetH = s.height - s.basinH;
  return (
    <group name={s.label}>
      <mesh
        position={[s.x, baseY + cabinetH / 2, s.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[s.width, cabinetH, s.depth]} />
        <meshStandardMaterial color={COLORS.propCabinet} roughness={0.75} />
      </mesh>
      <mesh
        position={[s.x, baseY + cabinetH + s.basinH / 2, s.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[s.width * 0.92, s.basinH, s.depth * 0.85]} />
        <meshStandardMaterial
          color={COLORS.propBasin}
          roughness={0.25}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
}

/** Sit toilet facing east (+X): tank on west, bowl extending east. */
function Toilet1F() {
  const t = PROP_1F_TOILET;
  const baseY = t.y;
  const tankW = t.width;
  const tankH = t.tankH;
  const tankD = t.tankD;
  const seatH = t.seatH;
  const bowlD = t.depth - tankD;
  // Tank center (west), bowl center (east of tank)
  const tankX = t.x - bowlD * 0.15;
  const bowlX = t.x + tankD * 0.35;

  return (
    <group name={t.label}>
      {/* Tank */}
      <mesh
        position={[tankX, baseY + tankH / 2, t.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[tankD, tankH, tankW]} />
        <meshStandardMaterial color={COLORS.propPorcelain} roughness={0.4} />
      </mesh>
      {/* Bowl / seat */}
      <mesh
        position={[bowlX, baseY + seatH / 2, t.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[bowlD, seatH, tankW * 0.95]} />
        <meshStandardMaterial color={COLORS.propPorcelain} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** Double center-split curtains in toilet south passage. */
function ToiletCurtain1F() {
  const c = PROP_1F_TOILET_CURTAIN;
  const baseY = INTERIOR_FLOOR_Y;
  const panelW = (c.passW - c.panelGap) / 2;
  const midX = c.x;
  const y = baseY + c.height / 2;
  const z = c.z + c.thickness; // slightly inside room (+Z)

  const curtainMat = {
    color: COLORS.propCurtain,
    roughness: 0.9,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  } as const;

  return (
    <group name={c.label}>
      <mesh position={[midX - panelW / 2 - c.panelGap / 2, y, z]}>
        <boxGeometry args={[panelW, c.height, c.thickness]} />
        <meshStandardMaterial {...curtainMat} />
      </mesh>
      <mesh position={[midX + panelW / 2 + c.panelGap / 2, y, z]}>
        <boxGeometry args={[panelW, c.height, c.thickness]} />
        <meshStandardMaterial {...curtainMat} />
      </mesh>
    </group>
  );
}
