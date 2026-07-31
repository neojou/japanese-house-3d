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
 * (full-height gap + lintel above the door).
 */
function solidPiecesForWall(wall: WallSegment): SolidPiece[] {
  const wallHeight = BUILDING.wallHeight;
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

  // Sort openings along the wall
  const sorted = [...openings].sort((a, b) => a.fromStart - b.fromStart);
  const length = alongX ? wall.lengthX : wall.lengthZ;
  const thickness = alongX ? wall.lengthZ : wall.lengthX;
  const startCoord = alongX
    ? wall.x - wall.lengthX / 2
    : wall.z - wall.lengthZ / 2;

  const pieces: SolidPiece[] = [];
  let cursor = 0;

  const pushFull = (from: number, to: number, key: string) => {
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

  const pushLintel = (opening: Opening, key: string) => {
    const lintelH = wallHeight - opening.height;
    if (lintelH < 0.01) return;
    const mid = startCoord + opening.fromStart + opening.width / 2;
    const y = baseY + opening.height + lintelH / 2;
    pieces.push({
      key,
      x: alongX ? mid : wall.x,
      y,
      z: alongX ? wall.z : mid,
      sizeX: alongX ? opening.width : thickness,
      sizeY: lintelH,
      sizeZ: alongX ? thickness : opening.width,
    });
  };

  sorted.forEach((opening, i) => {
    const openStart = opening.fromStart;
    const openEnd = opening.fromStart + opening.width;
    // Clamp to wall
    const a = Math.max(0, Math.min(length, openStart));
    const b = Math.max(0, Math.min(length, openEnd));
    pushFull(cursor, a, `${wall.id}-solid-${i}`);
    pushLintel(opening, `${wall.id}-lintel-${i}`);
    cursor = Math.max(cursor, b);
  });
  pushFull(cursor, length, `${wall.id}-solid-end`);

  return pieces;
}

function WallMesh({ piece, exterior }: { piece: SolidPiece; exterior: boolean }) {
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
        const exterior = wall.id.includes("ext") || wall.id.includes("parapet");
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
