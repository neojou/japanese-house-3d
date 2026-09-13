
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


