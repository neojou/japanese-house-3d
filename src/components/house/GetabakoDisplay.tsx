
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { INTERIOR_FLOOR_Y, PROP_1F_SCL_GETABAKO } from "@/data/dimensions";
import {
  createInteriorWoodMaterial,
  createIvoryLacquerMaterial,
  ensureFaçadeTextures,
} from "@/lib/houseMaterials";

// ─────────────────────────────────────────────────────────────
// Geometry helpers (procedural furniture — no extra deps)
// ─────────────────────────────────────────────────────────────

/** Rounded rectangle in XY (z=0), for Extrude → top slab after rotation. */
function roundedRectShape(w: number, d: number, r: number): THREE.Shape {
  const hw = w / 2;
  const hd = d / 2;
  const rr = Math.min(r, hw * 0.45, hd * 0.45);
  const s = new THREE.Shape();
  s.moveTo(-hw + rr, -hd);
  s.lineTo(hw - rr, -hd);
  s.quadraticCurveTo(hw, -hd, hw, -hd + rr);
  s.lineTo(hw, hd - rr);
  s.quadraticCurveTo(hw, hd, hw - rr, hd);
  s.lineTo(-hw + rr, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - rr);
  s.lineTo(-hw, -hd + rr);
  s.quadraticCurveTo(-hw, -hd, -hw + rr, -hd);
  return s;
}

/** Soft cabriole profile: bulge mid, taper foot (lathe around Y). */
function makeCabrioleLegGeo(height: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n; // 0 top → 1 foot
    const y = height * (1 - t);
    // radius: thin under apron, swell, slim ankle, slight foot pad
    let rad: number;
    if (t < 0.12) rad = 0.014;
    else if (t < 0.45) rad = 0.014 + (t - 0.12) * 0.045;
    else if (t < 0.75) rad = 0.029 - (t - 0.45) * 0.04;
    else if (t < 0.92) rad = 0.017 - (t - 0.75) * 0.02;
    else rad = 0.013 + (t - 0.92) * 0.08;
    pts.push(new THREE.Vector2(Math.max(rad, 0.008), y));
  }
  return new THREE.LatheGeometry(pts, 12);
}

/** Fan / leaf corner ornament for top surface. */
function makeCornerOrnamentGeo(size: number, thickness: number): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(size * 0.55, size * 0.08, size * 0.85, size * 0.35);
  s.quadraticCurveTo(size * 0.95, size * 0.55, size * 0.7, size * 0.75);
  s.quadraticCurveTo(size * 0.45, size * 0.95, size * 0.12, size * 0.9);
  s.quadraticCurveTo(size * 0.05, size * 0.45, 0, 0);
  return new THREE.ExtrudeGeometry(s, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.001,
    bevelSize: 0.001,
    bevelSegments: 1,
  });
}

/** Pointed-toe shoe sole (local +Z = toe). */
function makeSoleShape(length: number, width: number): THREE.Shape {
  const s = new THREE.Shape();
  const half = width / 2;
  // Heel seat (rear −Z)
  s.moveTo(-half * 0.55, -length * 0.48);
  s.lineTo(half * 0.55, -length * 0.48);
  // Outer waist → toe
  s.quadraticCurveTo(half * 0.95, -length * 0.15, half * 0.72, length * 0.15);
  s.quadraticCurveTo(half * 0.35, length * 0.42, 0, length * 0.5);
  // Inner toe → waist
  s.quadraticCurveTo(-half * 0.35, length * 0.42, -half * 0.72, length * 0.15);
  s.quadraticCurveTo(-half * 0.95, -length * 0.15, -half * 0.55, -length * 0.48);
  return s;
}

function makeStilettoHeelGeo(heelH: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const t = i / n; // 0 top (sole) → 1 tip
    const y = heelH * (1 - t);
    const rad = 0.012 * (1 - t * 0.82) + 0.0025;
    pts.push(new THREE.Vector2(rad, y));
  }
  return new THREE.LatheGeometry(pts, 10);
}

// ─────────────────────────────────────────────────────────────
// Heels
// ─────────────────────────────────────────────────────────────

function StilettoHeel({
  side,
  color,
  sole,
  length,
  width,
  heelH,
  yaw,
}: {
  side: "L" | "R";
  color: string;
  sole: string;
  length: number;
  width: number;
  heelH: number;
  yaw: number;
}) {
  const matUp = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.38,
        metalness: 0.12,
        envMapIntensity: 0.45,
      }),
    [color],
  );
  const matSole = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: sole,
        roughness: 0.65,
        metalness: 0.04,
      }),
    [sole],
  );

  const soleGeo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(makeSoleShape(length, width), {
      depth: 0.01,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 2,
    });
    // Shape in XY → rotate to XZ (Y up): sole horizontal
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0.005, 0);
    return g;
  }, [length, width]);

  const heelGeo = useMemo(() => makeStilettoHeelGeo(heelH), [heelH]);

  useLayoutEffect(() => {
    return () => {
      soleGeo.dispose();
      heelGeo.dispose();
      matUp.dispose();
      matSole.dispose();
    };
  }, [soleGeo, heelGeo, matUp, matSole]);

  const sideYaw = side === "L" ? yaw : -yaw;
  // Sole sits elevated at heel; toe closer to shelf
  const soleLift = heelH * 0.08;

  return (
    <group rotation={[0, sideYaw, 0]}>
      {/* Sole — pointed toe +Z */}
      <mesh
        geometry={soleGeo}
        position={[0, soleLift, 0]}
        rotation={[0.12, 0, 0]}
        material={matSole}
        castShadow
      />
      {/* Stiletto under heel seat */}
      <mesh
        geometry={heelGeo}
        position={[0, 0, -length * 0.38]}
        material={matSole}
        castShadow
      />
      {/* Vamp (toe box) — tapered */}
      <mesh
        position={[0, soleLift + 0.028, length * 0.12]}
        rotation={[0.18, 0, 0]}
        castShadow
        material={matUp}
      >
        <boxGeometry args={[width * 0.62, 0.038, length * 0.42]} />
      </mesh>
      {/* Mid upper */}
      <mesh
        position={[0, soleLift + 0.032, -length * 0.02]}
        castShadow
        material={matUp}
      >
        <boxGeometry args={[width * 0.7, 0.042, length * 0.28]} />
      </mesh>
      {/* Heel counter */}
      <mesh
        position={[0, soleLift + 0.04, -length * 0.32]}
        castShadow
        material={matUp}
      >
        <boxGeometry args={[width * 0.58, 0.055, length * 0.16]} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// Frame-and-panel door leaf
// ─────────────────────────────────────────────────────────────

function FramePanelDoor({
  width,
  height,
  depth,
  matFrame,
  matPanel,
  matHandle,
  handleOnRight,
}: {
  width: number;
  height: number;
  depth: number;
  matFrame: THREE.Material;
  matPanel: THREE.Material;
  matHandle: THREE.Material;
  handleOnRight: boolean;
}) {
  const fw = Math.min(0.028, width * 0.14);
  const panelW = width - fw * 2;
  const panelH = height - fw * 2;
  const hx = handleOnRight ? width * 0.32 : -width * 0.32;

  return (
    <group>
      {/* Outer face plate (slight) */}
      <mesh position={[0, 0, 0]} material={matFrame} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth * 0.55]} />
      </mesh>
      {/* Raised panel (inset face, proud of back) */}
      <mesh
        position={[0, 0, -depth * 0.15]}
        material={matPanel}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[panelW * 0.92, panelH * 0.92, depth * 0.45]} />
      </mesh>
      {/* Frame stiles / rails as thin beads */}
      <mesh position={[-width / 2 + fw / 2, 0, -depth * 0.05]} material={matFrame}>
        <boxGeometry args={[fw, height, depth * 0.7]} />
      </mesh>
      <mesh position={[width / 2 - fw / 2, 0, -depth * 0.05]} material={matFrame}>
        <boxGeometry args={[fw, height, depth * 0.7]} />
      </mesh>
      <mesh position={[0, height / 2 - fw / 2, -depth * 0.05]} material={matFrame}>
        <boxGeometry args={[width, fw, depth * 0.7]} />
      </mesh>
      <mesh position={[0, -height / 2 + fw / 2, -depth * 0.05]} material={matFrame}>
        <boxGeometry args={[width, fw, depth * 0.7]} />
      </mesh>
      {/* Knob */}
      <mesh position={[hx, 0, -depth * 0.55]} material={matHandle} castShadow>
        <sphereGeometry args={[0.008, 10, 8]} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// Main display
// ─────────────────────────────────────────────────────────────

/**
 * SCL north getabako — tokonoma-card floor furniture (DESIGN.md §2.7):
 * 高貴典雅 + 細節優先 — cabriole legs, rounded top + gold corners,
 * dual frame-panel doors, classic stiletto pair (tight). Procedural mesh (no new deps).
 */
export function GetabakoDisplay() {
  const p = PROP_1F_SCL_GETABAKO;

  useLayoutEffect(() => {
    ensureFaçadeTextures();
  }, []);

  const matIvory = useMemo(
    () => createIvoryLacquerMaterial(p.width, p.bodyH),
    [p.width, p.bodyH],
  );
  const matIvoryFine = useMemo(
    () => createIvoryLacquerMaterial(p.width * 0.45, p.bodyH * 0.45),
    [p.width, p.bodyH],
  );
  const matWood = useMemo(
    () => createInteriorWoodMaterial(p.board.width, p.board.height),
    [p.board.width, p.board.height],
  );
  const matInterior = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e8e0d4",
        roughness: 0.78,
        metalness: 0,
      }),
    [],
  );
  const matGold = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.cornerOrnament.color,
        roughness: 0.35,
        metalness: 0.72,
        envMapIntensity: 0.55,
      }),
    [p.cornerOrnament.color],
  );
  const matHandle = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: p.handle.color,
        roughness: 0.38,
        metalness: p.handle.metalness,
      }),
    [p.handle.color, p.handle.metalness],
  );

  const legGeo = useMemo(() => makeCabrioleLegGeo(p.leg.height), [p.leg.height]);
  const topGeo = useMemo(() => {
    const tw = p.width + p.top.overhang * 2;
    const td = p.depth + p.top.overhang * 2;
    const g = new THREE.ExtrudeGeometry(
      roundedRectShape(tw, td, p.top.cornerR),
      {
        depth: p.top.thickness,
        bevelEnabled: true,
        bevelThickness: 0.003,
        bevelSize: 0.003,
        bevelSegments: 2,
      },
    );
    // Extrude along +Z → rotate to Y-up slab
    g.rotateX(-Math.PI / 2);
    g.translate(0, p.top.thickness / 2, 0);
    return g;
  }, [p.width, p.depth, p.top.overhang, p.top.thickness, p.top.cornerR]);

  const ornGeo = useMemo(
    () =>
      makeCornerOrnamentGeo(
        p.cornerOrnament.size,
        p.cornerOrnament.thickness,
      ),
    [p.cornerOrnament.size, p.cornerOrnament.thickness],
  );

  useLayoutEffect(() => {
    return () => {
      legGeo.dispose();
      topGeo.dispose();
      ornGeo.dispose();
      matIvory.map?.dispose();
      matIvory.normalMap?.dispose();
      matIvory.dispose();
      matIvoryFine.map?.dispose();
      matIvoryFine.normalMap?.dispose();
      matIvoryFine.dispose();
      matWood.map?.dispose();
      matWood.normalMap?.dispose();
      matWood.dispose();
      matInterior.dispose();
      matGold.dispose();
      matHandle.dispose();
    };
  }, [
    legGeo,
    topGeo,
    ornGeo,
    matIvory,
    matIvoryFine,
    matWood,
    matInterior,
    matGold,
    matHandle,
  ]);

  const floorY = INTERIOR_FLOOR_Y;
  const shell = p.shell;
  const legH = p.leg.height;
  const bodyH = p.bodyH;
  const openH = bodyH * p.openBayFrac;
  const lowerH = bodyH - openH;
  const cabW = p.width;
  const cabD = p.depth;

  const wallFaceZ = p.wallFaceZ;
  const cabZ = wallFaceZ - p.standoff - cabD / 2;
  const cabX = p.x;

  // Body sits on legs
  const bodyBaseY = floorY + legH;
  const bodyTopY = bodyBaseY + bodyH;
  const bodyCenterY = bodyBaseY + bodyH / 2;
  const shelfY = bodyBaseY + lowerH;
  const topY = bodyTopY;

  const boardZ = wallFaceZ - p.board.standoff - p.board.thickness / 2;
  const boardY = floorY + p.board.height / 2 - 0.02;

  const innerW = cabW - shell * 2;
  const innerD = cabD - shell * 1.15;

  // Legs under body corners with soft outward splay
  const legInset = p.leg.cornerInset;
  const splay = p.leg.splay;
  const legCorners: [number, number, number, number][] = [
    // [localX, localZ, splayX, splayZ] — +Z north
    [-cabW / 2 + legInset, -cabD / 2 + legInset, -splay, -splay],
    [cabW / 2 - legInset, -cabD / 2 + legInset, splay, -splay],
    [-cabW / 2 + legInset, cabD / 2 - legInset, -splay, splay],
    [cabW / 2 - legInset, cabD / 2 - legInset, splay, splay],
  ];

  // Dual doors on lower front (−Z)
  const doorGap = 0.006;
  const doorH = lowerH - shell * 1.5;
  const doorW = (innerW - doorGap) / 2;
  const doorY = bodyBaseY + lowerH / 2;
  const doorZ = -cabD / 2 + p.doorInset;

  // Heels tight in open bay
  const heelY = shelfY + 0.012;
  const heelZ = cabZ - cabD * 0.02;
  const heelSpan = p.heels.span;

  // Top corner ornaments (on top surface, 4 corners)
  const topW = cabW + p.top.overhang * 2;
  const topD = cabD + p.top.overhang * 2;
  const ornInset = p.top.cornerR * 0.55;
  const ornY = topY + p.top.thickness + 0.001;
  const ornaments: { x: number; z: number; rot: number }[] = [
    { x: -topW / 2 + ornInset, z: -topD / 2 + ornInset, rot: 0 },
    { x: topW / 2 - ornInset, z: -topD / 2 + ornInset, rot: -Math.PI / 2 },
    { x: topW / 2 - ornInset, z: topD / 2 - ornInset, rot: Math.PI },
    { x: -topW / 2 + ornInset, z: topD / 2 - ornInset, rot: Math.PI / 2 },
  ];

  const lightPos: [number, number, number] = [
    cabX + p.light.dx,
    bodyCenterY + p.light.dy,
    cabZ - cabD / 2 + p.light.dz,
  ];

  return (
    <group name={p.label}>
      {/* Wood endscape */}
      <mesh
        position={[cabX, boardY, boardZ]}
        castShadow
        receiveShadow
        material={matWood}
      >
        <boxGeometry
          args={[p.board.width, p.board.height, p.board.thickness]}
        />
      </mesh>
      <mesh position={[cabX, boardY, boardZ - p.board.thickness * 0.55]}>
        <boxGeometry
          args={[p.board.width + 0.03, p.board.height + 0.03, 0.006]}
        />
        <meshStandardMaterial color="#1e1c1a" roughness={0.92} />
      </mesh>

      <group position={[cabX, 0, cabZ]}>
        {/* ── Cabriole legs ── */}
        {legCorners.map(([lx, lz, sx, sz], i) => (
          <mesh
            key={`leg-${i}`}
            geometry={legGeo}
            position={[lx + sx, floorY, lz + sz]}
            material={matIvory}
            castShadow
            receiveShadow
          />
        ))}

        {/* Apron under body (ties legs) */}
        <mesh
          position={[0, bodyBaseY + 0.012, 0]}
          material={matIvory}
          castShadow
        >
          <boxGeometry args={[cabW * 0.96, 0.02, cabD * 0.96]} />
        </mesh>

        {/* ── Carcass ── */}
        <mesh
          position={[0, bodyCenterY, cabD / 2 - shell / 2]}
          material={matIvory}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[cabW, bodyH, shell]} />
        </mesh>
        <mesh
          position={[-cabW / 2 + shell / 2, bodyCenterY, 0]}
          material={matIvory}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[shell, bodyH, cabD]} />
        </mesh>
        <mesh
          position={[cabW / 2 - shell / 2, bodyCenterY, 0]}
          material={matIvory}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[shell, bodyH, cabD]} />
        </mesh>
        <mesh
          position={[0, bodyBaseY + shell / 2, 0]}
          material={matIvory}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[cabW - shell * 0.5, shell, cabD - shell * 0.5]} />
        </mesh>
        {/* Mid shelf */}
        <mesh
          position={[0, shelfY, 0]}
          material={matIvory}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[innerW + shell * 0.3, shell * 0.75, innerD]} />
        </mesh>
        {/* Open bay interior back + side liners */}
        <mesh
          position={[
            0,
            shelfY + openH / 2 - shell * 0.2,
            cabD / 2 - shell - 0.004,
          ]}
          material={matInterior}
        >
          <boxGeometry args={[innerW, openH - shell, 0.006]} />
        </mesh>
        {/* Open bay front edge bead (gold thin) */}
        <mesh
          position={[0, shelfY + 0.006, -cabD / 2 + 0.008]}
          material={matGold}
        >
          <boxGeometry args={[innerW * 0.96, 0.004, 0.006]} />
        </mesh>
        {/* Upper front rail (under top, over open bay) */}
        <mesh
          position={[0, bodyTopY - shell * 0.6, -cabD / 2 + shell * 0.45]}
          material={matIvory}
          castShadow
        >
          <boxGeometry args={[cabW - shell, shell * 0.9, shell * 0.9]} />
        </mesh>

        {/* ── Dual frame-panel doors ── */}
        <group position={[-doorW / 2 - doorGap / 2, doorY, doorZ]}>
          <FramePanelDoor
            width={doorW}
            height={doorH}
            depth={shell * 0.85}
            matFrame={matIvory}
            matPanel={matIvoryFine}
            matHandle={matHandle}
            handleOnRight
          />
        </group>
        <group position={[doorW / 2 + doorGap / 2, doorY, doorZ]}>
          <FramePanelDoor
            width={doorW}
            height={doorH}
            depth={shell * 0.85}
            matFrame={matIvory}
            matPanel={matIvoryFine}
            matHandle={matHandle}
            handleOnRight={false}
          />
        </group>

        {/* ── Rounded molded top ── */}
        <mesh
          geometry={topGeo}
          position={[0, topY, 0]}
          material={matIvory}
          castShadow
          receiveShadow
        />
        {/* Top edge gold hairline (subtle luxury) */}
        <mesh position={[0, topY + p.top.thickness * 0.35, -topD / 2 + 0.002]}>
          <boxGeometry args={[topW * 0.92, 0.002, 0.003]} />
          <meshStandardMaterial
            color={p.cornerOrnament.color}
            roughness={0.4}
            metalness={0.65}
          />
        </mesh>

        {/* Corner ornaments */}
        {ornaments.map((o, i) => (
          <mesh
            key={`orn-${i}`}
            geometry={ornGeo}
            position={[o.x, ornY, o.z]}
            rotation={[-Math.PI / 2, 0, o.rot]}
            material={matGold}
            castShadow
          />
        ))}
      </group>

      {/* Red stilettos — tight pair, toes into room (−Z) */}
      <group
        position={[cabX - heelSpan / 2, heelY, heelZ]}
        rotation={[0, Math.PI, 0]}
      >
        <StilettoHeel
          side="L"
          color={p.heels.color}
          sole={p.heels.sole}
          length={p.heels.length}
          width={p.heels.width}
          heelH={p.heels.heelH}
          yaw={p.heels.yaw}
        />
      </group>
      <group
        position={[cabX + heelSpan / 2, heelY, heelZ]}
        rotation={[0, Math.PI, 0]}
      >
        <StilettoHeel
          side="R"
          color={p.heels.color}
          sole={p.heels.sole}
          length={p.heels.length}
          width={p.heels.width}
          heelH={p.heels.heelH}
          yaw={p.heels.yaw}
        />
      </group>

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
