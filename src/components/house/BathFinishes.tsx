"use client";

import { useLayoutEffect, useMemo } from "react";
import {
  BUILDING,
  FLOOR_LEVELS,
  INTERIOR_FLOOR_Y,
  IR,
  SX,
  SZ,
  UB_BATH,
} from "@/data/dimensions";
import {
  createBathHexEastMaterial,
  createBathWallMaterial,
  ensureFaçadeTextures,
} from "@/lib/houseMaterials";

/**
 * UB interior clad on exterior shell walls so outer stucco stays ivory.
 * South: seamless dark marble. East: elongated hex cyan patchwork.
 * Partition walls use BATH_MARBLE_WALL_IDS via Walls.tsx.
 */
export function BathFinishes() {
  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const halfT = BUILDING.wallThickness / 2;
  const cladT = UB_BATH.clad.thickness;
  const wallH = BUILDING.wallHeight - INTERIOR_FLOOR_Y - 0.02;
  const y0 = FLOOR_LEVELS["1f"] + INTERIOR_FLOOR_Y;
  const midY = y0 + wallH / 2;

  const ubW = SX.xEast - SX.xSclE;
  const ubD = IR.wetS - SZ.ubSouth;
  const ubZ0 = SZ.ubSouth;
  const ubZ1 = IR.wetS;
  const ubZMid = (ubZ0 + ubZ1) / 2;
  const ubXMid = (SX.xSclE + SX.xEast) / 2;

  const matSouth = useMemo(
    () => createBathWallMaterial(ubW, wallH, UB_BATH.wallTileM),
    [ubW, wallH],
  );
  const matEast = useMemo(
    () =>
      createBathHexEastMaterial(ubD, wallH, UB_BATH.eastHex.tileM),
    [ubD, wallH],
  );

  useLayoutEffect(() => {
    return () => {
      for (const m of [matSouth, matEast]) {
        m.map?.dispose();
        m.normalMap?.dispose();
        m.dispose();
      }
    };
  }, [matSouth, matEast]);

  /**
   * Exterior walls are single-sided materials on one box:
   *   wallEW(z=ubSouth): thickness along Z → interior face at z = ubSouth + halfT
   *   wallNS(x=east-halfT): spans x in [east−T, east] → interior face at x = east − T
   * Clad must sit *inside the room*, fully west/north of that face — not buried in shell.
   */
  const southInteriorFaceZ = SZ.ubSouth + halfT;
  const southCladZ = southInteriorFaceZ + cladT / 2 + 0.004;

  const eastInteriorFaceX = SX.xEast - BUILDING.wallThickness;
  const eastCladX = eastInteriorFaceX - cladT / 2 - 0.004;

  return (
    <group name="bath-finishes">
      {UB_BATH.clad.south && (
        <mesh
          position={[ubXMid, midY, southCladZ]}
          material={matSouth}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[ubW - 0.04, wallH, cladT]} />
        </mesh>
      )}
      {UB_BATH.clad.east && (
        <mesh
          position={[eastCladX, midY, ubZMid]}
          material={matEast}
          receiveShadow
          castShadow
        >
          {/* Wide face is YZ — hex map along NS (ubD) × height */}
          <boxGeometry args={[cladT, wallH, ubD - 0.04]} />
        </mesh>
      )}
    </group>
  );
}
