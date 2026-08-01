"use client";

import { Fragment } from "react";
import {
  BUILDING,
  COLORS,
  FLOOR_LEVELS,
  WALLS,
  type Opening,
  type WallSegment,
} from "@/data/dimensions";

type SolidPiece = {
  key: string;
  x: number;
  y: number;
  z: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
};

/**
 * Split one wall segment into solid boxes, cutting openings
 * (optional sill + clear opening + lintel above).
 */
function solidPiecesForWall(wall: WallSegment): SolidPiece[] {
  const wallHeight = wall.height ?? BUILDING.wallHeight;
  const baseY = FLOOR_LEVELS[wall.floor];
  const openings = wall.openings ?? [];
  const alongX = wall.lengthX >= wall.lengthZ;

  if (openings.length === 0) {
    return [
      {
        key: wall.id,
        x: wall.x,
        y: baseY + wallHeight / 2,
        z: wall.z,
        sizeX: wall.lengthX,
        sizeY: wallHeight,
        sizeZ: wall.lengthZ,
      },
    ];
  }

  const sorted = [...openings].sort((a, b) => a.fromStart - b.fromStart);
  const length = alongX ? wall.lengthX : wall.lengthZ;
  const thickness = alongX ? wall.lengthZ : wall.lengthX;
  const startCoord = alongX
    ? wall.x - wall.lengthX / 2
    : wall.z - wall.lengthZ / 2;

  const pieces: SolidPiece[] = [];
  let cursor = 0;

  const pushFullHeight = (from: number, to: number, key: string) => {
    const segLen = to - from;
    if (segLen < 0.01) return;
    const mid = startCoord + (from + to) / 2;
    pieces.push({
      key,
      x: alongX ? mid : wall.x,
      y: baseY + wallHeight / 2,
      z: alongX ? wall.z : mid,
      sizeX: alongX ? segLen : thickness,
      sizeY: wallHeight,
      sizeZ: alongX ? thickness : segLen,
    });
  };

  const pushBand = (
    opening: Opening,
    y0: number,
    y1: number,
    key: string,
  ) => {
    const h = y1 - y0;
    if (h < 0.01) return;
    const mid = startCoord + opening.fromStart + opening.width / 2;
    pieces.push({
      key,
      x: alongX ? mid : wall.x,
      y: baseY + (y0 + y1) / 2,
      z: alongX ? wall.z : mid,
      sizeX: alongX ? opening.width : thickness,
      sizeY: h,
      sizeZ: alongX ? thickness : opening.width,
    });
  };

  sorted.forEach((opening, i) => {
    const openStart = opening.fromStart;
    const openEnd = opening.fromStart + opening.width;
    const a = Math.max(0, Math.min(length, openStart));
    const b = Math.max(0, Math.min(length, openEnd));
    pushFullHeight(cursor, a, `${wall.id}-solid-${i}`);

    const sill = opening.sill ?? 0;
    const openTop = sill + opening.height;
    pushBand(opening, 0, sill, `${wall.id}-sill-${i}`);
    pushBand(opening, openTop, wallHeight, `${wall.id}-lintel-${i}`);

    cursor = Math.max(cursor, b);
  });
  pushFullHeight(cursor, length, `${wall.id}-solid-end`);

  return pieces;
}

function WallMesh({
  piece,
  exterior,
}: {
  piece: SolidPiece;
  exterior: boolean;
}) {
  return (
    <mesh position={[piece.x, piece.y, piece.z]} castShadow receiveShadow>
      <boxGeometry args={[piece.sizeX, piece.sizeY, piece.sizeZ]} />
      <meshStandardMaterial
        color={exterior ? COLORS.wallExterior : COLORS.wall}
        roughness={0.85}
        metalness={0.02}
      />
    </mesh>
  );
}

export function Walls() {
  return (
    <group name="walls">
      {WALLS.map((wall) => {
        const exterior =
          wall.id.includes("ext") ||
          wall.id.includes("parapet") ||
          wall.id.includes("balc") ||
          wall.id.includes("south") ||
          wall.id.includes("east") ||
          wall.id.includes("west") ||
          wall.id.includes("north") ||
          wall.id.includes("jog") ||
          wall.id.startsWith("2f-") ||
          wall.id.startsWith("ph-");
        const pieces = solidPiecesForWall(wall);
        return (
          <Fragment key={wall.id}>
            {pieces.map((piece) => (
              <WallMesh key={piece.key} piece={piece} exterior={exterior} />
            ))}
          </Fragment>
        );
      })}
    </group>
  );
}
