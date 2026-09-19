import { useMemo } from "react";
import * as THREE from "three";
import {
  BUILDING,
  IR,
  STORY,
  SX,
  SZ,
  Z2,
  neRoomRoofY,
} from "@/data/dimensions";

/**
 * Shed roofs: south high, north low (2026-09-13 elevations).
 * PH hall uses the drawn 0.668 m drop; 2F uses the same pitch over each mass.
 */
function Shed({
  x0,
  x1,
  zS,
  zN,
  ySouth,
  color = "#6a6560",
}: {
  x0: number;
  x1: number;
  zS: number;
  zN: number;
  ySouth: number;
  color?: string;
}) {
  const geom = useMemo(() => {
    const yN = ySouth - STORY.roofPitch * (zN - zS);
    const t = 0.08;
    const g = new THREE.BufferGeometry();
    const v = new Float32Array([
      x0, ySouth, zS, x1, ySouth, zS, x1, yN, zN,
      x0, ySouth, zS, x1, yN, zN, x0, yN, zN,
      x0, ySouth + t, zS, x1, yN + t, zN, x1, ySouth + t, zS,
      x0, ySouth + t, zS, x0, yN + t, zN, x1, yN + t, zN,
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(v, 3));
    g.computeVertexNormals();
    return g;
  }, [x0, x1, zS, zN, ySouth]);

  return (
    <mesh geometry={geom} receiveShadow castShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.92}
        metalness={0.02}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function Roofs() {
  const y2 = STORY.floor2f + (STORY.floorPh - STORY.floor2f - BUILDING.slabThickness);
  const yPhHigh = STORY.peak;
  return (
    <group name="roofs">
      {/* 2F south wing */}
      <Shed x0={0} x1={6.37} zS={Z2.south} zN={Z2.clN} ySouth={y2 + 0.55} />
      {/* 2F toilet + north of south wing */}
      <Shed
        x0={2.73}
        x1={4.55}
        zS={Z2.corrN}
        zN={Z2.north}
        ySouth={y2 + 0.45}
      />
      {/* 2F NE + CL — south high, north = 2F wall top */}
      <Shed
        x0={6.37}
        x1={BUILDING.width}
        zS={Z2.clN}
        zN={Z2.north}
        ySouth={neRoomRoofY(Z2.clN)}
      />
      {/* PH hall: south high 9.577, north low */}
      <Shed
        x0={IR.clE}
        x1={SX.xLdkE}
        zS={IR.mid}
        zN={SZ.north}
        ySouth={yPhHigh}
        color="#5c5854"
      />
    </group>
  );
}
