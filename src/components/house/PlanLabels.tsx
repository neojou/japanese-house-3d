
import { Text } from "@react-three/drei";
import { PLAN_LABELS } from "@/data/dimensions";

/**
 * Plan labels on the ground.
 * Parent house group is mirrored in X — counter-scale so glyphs are not backwards.
 * Rotation makes text read upright when top-down is north-up (bottom of screen = south).
 */
export function PlanLabels() {
  return (
    <group name="plan-labels">
      {PLAN_LABELS.map((l) => (
        <Text
          key={l.id}
          position={[l.x, 0.06, l.z]}
          // Flat on XZ; +Math.PI so "up" on the page points north on screen
          rotation={[-Math.PI / 2, 0, Math.PI]}
          // Undo parent scale={[-1,1,1]} so characters are not mirrored
          scale={[-1, 1, 1]}
          fontSize={0.42}
          color={l.color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#0a0a0a"
        >
          {l.text}
        </Text>
      ))}
    </group>
  );
}
