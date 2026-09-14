
import { BUILDING, COLORS } from "@/data/dimensions";
import { planToWorldX } from "@/lib/coords";

/**
 * Ground compass on the parking-side grass (east in plan = spawn-right).
 * Lives in world space (not inside the X-mirrored house group).
 * Red cone points plan/world +Z = north.
 */
export function Compass() {
  const x = planToWorldX(BUILDING.width + 1.2);
  const z = BUILDING.depth / 2;
  const y = 0.02;

  return (
    <group name="compass" position={[x, y, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 32]} />
        <meshStandardMaterial color="#f5f5f0" roughness={0.9} />
      </mesh>
      {/* ConeGeometry +Y; +X rot π/2 → +Z (north) */}
      <mesh position={[0, 0.03, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.12, 0.4, 3]} />
        <meshStandardMaterial color="#c0392b" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.03, -0.16]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.08, 0.22, 3]} />
        <meshStandardMaterial color="#2c3e50" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.05, 0.46]}>
        <boxGeometry args={[0.18, 0.05, 0.08]} />
        <meshStandardMaterial color={COLORS.accent} />
      </mesh>
    </group>
  );
}
