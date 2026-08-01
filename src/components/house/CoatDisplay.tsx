
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { INTERIOR_FLOOR_Y, PROP_1F_SCL_COAT } from "@/data/dimensions";
import {
  createInteriorWoodMaterial,
  createTrenchCoatMaterial,
  ensureFaçadeTextures,
} from "@/lib/houseMaterials";

/**
 * Build a slim Chelsea-inspired curved coat card:
 * - Parabola bow into the room (side views still read volume)
 * - Slight waist pinch + shoulder taper in vertex X
 * Front faces local +Z; parent rotates so +Z → room (−X on east wall).
 */
function buildCoatGeometry(
  width: number,
  height: number,
  sagitta: number,
  waistScale: number,
): THREE.BufferGeometry {
  const segsW = 28;
  const segsH = 36;
  const geo = new THREE.PlaneGeometry(width, height, segsW, segsH);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const halfW = width / 2;
  const halfH = height / 2;
  // Waist band in local Y (0 = mid; texture belt ~ mid-lower)
  const waistY = -height * 0.04;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    const u = x / halfW; // −1..1
    const v = y / halfH; // −1..1

    // Shoulder narrower at top; hem slightly fuller
    const topTaper = 1 - 0.1 * Math.max(0, v);
    // Soft waist pinch (Gaussian)
    const waist =
      1 -
      (1 - waistScale) *
        Math.exp(-((y - waistY) * (y - waistY)) / (height * 0.12) ** 2);
    x *= topTaper * waist;

    // Depth: center bows into room (+Z local)
    const z = sagitta * (1 - u * u);
    // Soft vertical drape (shoulders slightly flatter against board)
    const zScale = 0.75 + 0.25 * (1 - Math.max(0, v));
    pos.setXYZ(i, x, y, z * zScale);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * SCL east-wall hero prop in **tokonoma-card** style (DESIGN.md §2.7 / 床の間卡):
 * 高貴典雅 + 細節優先 — wood endscape + standoff + curved card trench + weak key.
 * Plan walls unchanged. Wall-hung reference for future hero props.
 */
export function CoatDisplay() {
  const p = PROP_1F_SCL_COAT;

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const matCoat = useMemo(() => createTrenchCoatMaterial(), []);
  const matWood = useMemo(
    () => createInteriorWoodMaterial(p.board.width, p.board.height),
    [p.board.width, p.board.height],
  );
  const matMetal = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.hanger.metal,
        roughness: 0.55,
        metalness: 0.65,
      }),
    [p.hanger.metal],
  );
  const matHangerWood = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.hanger.wood,
        roughness: 0.72,
        metalness: 0.05,
      }),
    [p.hanger.wood],
  );
  const matLining = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#5c4030",
        roughness: 0.9,
        metalness: 0,
        side: THREE.BackSide,
      }),
    [],
  );

  const coatGeo = useMemo(
    () => buildCoatGeometry(p.coatW, p.coatH, p.sagitta, p.waistScale),
    [p.coatW, p.coatH, p.sagitta, p.waistScale],
  );

  useLayoutEffect(() => {
    return () => {
      coatGeo.dispose();
      // Trench maps are shared cache — dispose material only
      matCoat.dispose();
      // Wood uses cloned maps
      matWood.map?.dispose();
      matWood.normalMap?.dispose();
      matWood.dispose();
      matMetal.dispose();
      matHangerWood.dispose();
      matLining.dispose();
    };
  }, [coatGeo, matCoat, matWood, matMetal, matHangerWood, matLining]);

  // East wall interior face; board & coat west of it
  const wallFaceX = p.wallFaceX;
  const boardX =
    wallFaceX - p.board.standoff - p.board.thickness / 2;
  const coatX = wallFaceX - p.standoff;
  const floorY = INTERIOR_FLOOR_Y;
  const shoulderAbsY = floorY + p.shoulderY;
  // Coat mesh center = mid of card; shoulder near top of texture (~0.12 from top)
  const coatCenterY = shoulderAbsY - p.coatH * 0.38;
  const boardCenterY = floorY + p.shoulderY - p.board.height * 0.28;
  const z = p.z;

  // Light world position (plan)
  const lightPos: [number, number, number] = [
    coatX + p.light.dx,
    coatCenterY + p.light.dy,
    z + p.light.dz,
  ];

  return (
    <group name={p.label}>
      {/* Wood endscape / shallow niche backboard */}
      <mesh
        position={[boardX, boardCenterY, z]}
        castShadow
        receiveShadow
        material={matWood}
      >
        <boxGeometry
          args={[p.board.thickness, p.board.height, p.board.width]}
        />
      </mesh>
      {/* Thin charcoal reveal edge around board */}
      <mesh position={[boardX - p.board.thickness * 0.55, boardCenterY, z]}>
        <boxGeometry
          args={[0.006, p.board.height + 0.03, p.board.width + 0.03]}
        />
        <meshStandardMaterial color="#1e1c1a" roughness={0.92} />
      </mesh>

      {/* Hook rod from board into room */}
      <mesh
        position={[
          boardX - p.board.thickness / 2 - 0.02,
          shoulderAbsY + 0.04,
          z,
        ]}
        material={matMetal}
        castShadow
      >
        <cylinderGeometry args={[0.006, 0.006, 0.05, 8]} />
      </mesh>
      {/* Hook crook */}
      <mesh
        position={[coatX + 0.01, shoulderAbsY + 0.04, z]}
        rotation={[0, 0, Math.PI / 2]}
        material={matMetal}
      >
        <torusGeometry args={[0.016, 0.0045, 8, 16, Math.PI * 1.2]} />
      </mesh>

      {/* Wooden hanger bar */}
      <mesh
        position={[coatX + 0.005, shoulderAbsY + 0.01, z]}
        rotation={[0, 0, 0]}
        material={matHangerWood}
        castShadow
      >
        <boxGeometry args={[0.014, 0.014, p.hanger.barW]} />
      </mesh>
      {/* Hanger shoulders (angled stubs) */}
      <mesh
        position={[coatX + 0.005, shoulderAbsY - 0.01, z - p.hanger.barW * 0.28]}
        rotation={[0.35, 0, 0]}
        material={matHangerWood}
      >
        <boxGeometry args={[0.012, 0.01, p.hanger.barW * 0.32]} />
      </mesh>
      <mesh
        position={[coatX + 0.005, shoulderAbsY - 0.01, z + p.hanger.barW * 0.28]}
        rotation={[-0.35, 0, 0]}
        material={matHangerWood}
      >
        <boxGeometry args={[0.012, 0.01, p.hanger.barW * 0.32]} />
      </mesh>

      {/* Curved coat card — local +Z into room → rotate −90° about Y */}
      <group
        position={[coatX, coatCenterY, z]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <mesh
          geometry={coatGeo}
          material={matCoat}
          castShadow
          receiveShadow
        />
        {/* Soft lining on reverse for thickness when glancing past */}
        <mesh
          geometry={coatGeo}
          material={matLining}
          scale={[1, 1, 0.92]}
          position={[0, 0, -0.008]}
        />
      </group>

      {/* Weak residential key — short range, warm, not competing with genkan yaki */}
      <pointLight
        position={lightPos}
        intensity={p.light.intensity}
        distance={p.light.distance}
        decay={2}
        color={p.light.color}
        castShadow={false}
      />
    </group>
  );
}
