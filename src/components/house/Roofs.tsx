import { useMemo } from "react";
import * as THREE from "three";
import {
  BUILDING,
  FLOOR_LEVELS,
  IR,
  STORY,
  SX,
  SZ,
  X2,
  Z2,
  neRoomRoofY,
} from "@/data/dimensions";

/**
 * Shed roofs: south high, north low.
 * The PH balcony (x 0–6.37, z 0–3.64 and x 2.73–4.55, z 3.64–6.37) is open
 * deck. Those bays do not get a second sloping roof — the deck is the lid
 * of the floor below. The PH stair hall and the 2F northeast room keep sheds.
 * x 1.82–2.73, z 3.64–6.37 is the 1F northwest-room roof, flat at 2F level.
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
  const yPhHigh = STORY.peak;
  const roofT = 0.08;
  const nwRoofTop = FLOOR_LEVELS["2f"];
  return (
    <group name="roofs">
      {/* 1F northwest room roof, seen at 2F. Not a PH floor. */}
      <mesh
        name="roof-1f-nw"
        position={[
          (SZ.yoshitsuW + X2.w1) / 2,
          nwRoofTop - roofT / 2,
          (Z2.clN + Z2.north) / 2,
        ]}
        receiveShadow
        castShadow
      >
        <boxGeometry
          args={[X2.w1 - SZ.yoshitsuW, roofT, Z2.north - Z2.clN]}
        />
        <meshStandardMaterial color="#6a6560" roughness={0.92} metalness={0.02} />
      </mesh>
      {/* 2F NE + CL — south high, north = 2F wall top */}
      <Shed
        x0={6.37}
        x1={BUILDING.width}
        zS={Z2.clN}
        zN={Z2.north}
        ySouth={neRoomRoofY(Z2.clN)}
      />
      {/* PH hall: south high 9.577, north low. Stops at the hall, not the deck. */}
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
