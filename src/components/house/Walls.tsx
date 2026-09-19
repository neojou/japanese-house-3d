
import { Fragment, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import {
  BUILDING,
  FLOOR_LEVELS,
  PH_HALL,
  WALLS,
  Z2,
  neRoomRoofY,
  phHallRoofY,
  storyWallHeight,
  type Opening,
  type WallSegment,
} from "@/data/dimensions";
import {
  createWallMaterial,
  ensureFaçadeTextures,
  wallFinishForId,
  type WallFinish,
} from "@/lib/houseMaterials";

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
  const wallHeight = wall.height ?? storyWallHeight(wall.floor);
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
  finish,
}: {
  piece: SolidPiece;
  finish: WallFinish;
}) {
  const material = useMemo(
    () =>
      createWallMaterial(finish, piece.sizeX, piece.sizeY, piece.sizeZ),
    [finish, piece.sizeX, piece.sizeY, piece.sizeZ],
  );

  useLayoutEffect(() => {
    return () => {
      material.map?.dispose();
      material.normalMap?.dispose();
      material.roughnessMap?.dispose();
      material.dispose();
    };
  }, [material]);

  return (
    <mesh
      position={[piece.x, piece.y, piece.z]}
      castShadow
      receiveShadow
      material={material}
    >
      <boxGeometry args={[piece.sizeX, piece.sizeY, piece.sizeZ]} />
    </mesh>
  );
}

function slopedNsWallGeometry(
  x: number,
  zS: number,
  zN: number,
  y0: number,
  yS: number,
  yN: number,
  t: number,
): THREE.BufferGeometry {
  const x0 = x - t / 2;
  const x1 = x + t / 2;
  const quads: [number, number, number][][] = [
    [
      [x0, y0, zS],
      [x0, y0, zN],
      [x0, yN, zN],
      [x0, yS, zS],
    ],
    [
      [x1, y0, zN],
      [x1, y0, zS],
      [x1, yS, zS],
      [x1, yN, zN],
    ],
    [
      [x0, y0, zS],
      [x0, yS, zS],
      [x1, yS, zS],
      [x1, y0, zS],
    ],
    [
      [x1, y0, zN],
      [x1, yN, zN],
      [x0, yN, zN],
      [x0, y0, zN],
    ],
    [
      [x0, y0, zN],
      [x0, y0, zS],
      [x1, y0, zS],
      [x1, y0, zN],
    ],
    [
      [x0, yS, zS],
      [x0, yN, zN],
      [x1, yN, zN],
      [x1, yS, zS],
    ],
  ];
  const pos = new Float32Array(quads.length * 6 * 3);
  let i = 0;
  for (const q of quads) {
    const tris = [q[0], q[1], q[2], q[0], q[2], q[3]];
    for (const p of tris) {
      pos[i++] = p[0];
      pos[i++] = p[1];
      pos[i++] = p[2];
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function PhHallSlopeWall({
  wall,
  finish,
}: {
  wall: WallSegment;
  finish: WallFinish;
}) {
  const t = BUILDING.wallThickness;
  const y0 = FLOOR_LEVELS.ph;
  const yS = phHallRoofY(PH_HALL.z0);
  const yN = phHallRoofY(PH_HALL.z1);
  const geom = useMemo(
    () =>
      slopedNsWallGeometry(
        wall.x,
        PH_HALL.z0,
        PH_HALL.z1,
        y0,
        yS,
        yN,
        t,
      ),
    [wall.x, y0, yS, yN, t],
  );
  const spanY = yS - y0;
  const material = useMemo(
    () => createWallMaterial(finish, t, spanY, PH_HALL.depth),
    [finish, t, spanY],
  );
  useLayoutEffect(() => {
    return () => {
      geom.dispose();
      material.map?.dispose();
      material.normalMap?.dispose();
      material.roughnessMap?.dispose();
      material.dispose();
    };
  }, [geom, material]);
  return (
    <mesh geometry={geom} material={material} castShadow receiveShadow />
  );
}

function NeRoomEastSlopeCap({
  wall,
  finish,
}: {
  wall: WallSegment;
  finish: WallFinish;
}) {
  const t = BUILDING.wallThickness;
  const y0 = FLOOR_LEVELS["2f"] + storyWallHeight("2f");
  const yS = neRoomRoofY(Z2.clN);
  const yN = neRoomRoofY(Z2.north);
  const geom = useMemo(
    () =>
      slopedNsWallGeometry(wall.x, Z2.clN, Z2.north, y0, yS, yN, t),
    [wall.x, y0, yS, yN, t],
  );
  const material = useMemo(
    () => createWallMaterial(finish, t, yS - y0, Z2.north - Z2.clN),
    [finish, t, yS, y0],
  );
  useLayoutEffect(() => {
    return () => {
      geom.dispose();
      material.map?.dispose();
      material.normalMap?.dispose();
      material.roughnessMap?.dispose();
      material.dispose();
    };
  }, [geom, material]);
  return (
    <mesh geometry={geom} material={material} castShadow receiveShadow />
  );
}

const PH_SLOPE_WALL_IDS = new Set(["ph-hall-w", "ph-hall-e"]);

export function Walls() {
  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  return (
    <group name="walls">
      {WALLS.map((wall) => {
        const finish = wallFinishForId(wall.id);
        if (PH_SLOPE_WALL_IDS.has(wall.id)) {
          return (
            <PhHallSlopeWall key={wall.id} wall={wall} finish={finish} />
          );
        }
        const pieces = solidPiecesForWall(wall);
        return (
          <Fragment key={wall.id}>
            {pieces.map((piece) => (
              <WallMesh key={piece.key} piece={piece} finish={finish} />
            ))}
            {wall.id === "2f-ext-east" && (
              <NeRoomEastSlopeCap wall={wall} finish={finish} />
            )}
          </Fragment>
        );
      })}
    </group>
  );
}
