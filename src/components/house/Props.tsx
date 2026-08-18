
import { COLORS, FLOOR_LEVELS, PROP_2F_SINK } from "@/data/dimensions";
import { CoatDisplay } from "./CoatDisplay";
import { GetabakoDisplay } from "./GetabakoDisplay";
import { KitchenDisplay } from "./KitchenDisplay";
import { SenmenDisplay } from "./SenmenDisplay";
import { Toilet2FDisplay, ToiletDisplay } from "./ToiletDisplay";
import { ToiletCurtainDisplay } from "./ToiletCurtainDisplay";
import { TubDisplay } from "./TubDisplay";

/**
 * Sparse props + M8 hero displays (not full furniture set).
 * Hero: **tokonoma-card** (床の間卡) — 高貴典雅 · 細節優先 — DESIGN.md §2.7.
 */
export function Props() {
  return (
    <group name="props">
      <Sink2F />
      <ToiletDisplay />
      <Toilet2FDisplay />
      <ToiletCurtainDisplay />
      <CoatDisplay />
      <GetabakoDisplay />
      <TubDisplay />
      <KitchenDisplay />
      <SenmenDisplay />
    </group>
  );
}

function Sink2F() {
  const s = PROP_2F_SINK;
  const baseY = FLOOR_LEVELS[s.floor];
  const cabinetH = s.height - s.basinH;
  return (
    <group name={s.label}>
      <mesh
        position={[s.x, baseY + cabinetH / 2, s.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[s.width, cabinetH, s.depth]} />
        <meshStandardMaterial color={COLORS.propCabinet} roughness={0.75} />
      </mesh>
      <mesh
        position={[s.x, baseY + cabinetH + s.basinH / 2, s.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[s.width * 0.92, s.basinH, s.depth * 0.85]} />
        <meshStandardMaterial
          color={COLORS.propBasin}
          roughness={0.25}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
}
