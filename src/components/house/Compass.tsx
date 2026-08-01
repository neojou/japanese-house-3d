
import { BUILDING, COLORS } from "@/data/dimensions";

/**
 * Simple ground compass near the SE parking side so plan orientation is obvious:
 * N = toward 洋室 / 洗面, S = parking / genkan door face.
 */
export function Compass() {
  // Plan space: east of building (parent group mirrors X for display)
  const x = BUILDING.width + 1.2;
  const z = BUILDING.depth / 2;
  const y = 0.02;

  return (
    <group name="compass" position={[x, y, z]}>
      {/* Counter-scale so disc/labels are not mirrored by parent */}
      <group scale={[-1, 1, 1]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.55, 32]} />
          <meshStandardMaterial color="#f5f5f0" roughness={0.9} />
        </mesh>
        {/* North needle (+Z) */}
        <mesh position={[0, 0.03, 0.22]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.12, 0.4, 3]} />
          <meshStandardMaterial color="#c0392b" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.03, -0.18]} rotation={[-Math.PI / 2, Math.PI, 0]}>
          <coneGeometry args={[0.08, 0.22, 3]} />
          <meshStandardMaterial color="#2c3e50" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.04, 0.48]}>
          <boxGeometry args={[0.2, 0.04, 0.08]} />
          <meshStandardMaterial color={COLORS.accent} />
        </mesh>
      </group>
    </group>
  );
}
