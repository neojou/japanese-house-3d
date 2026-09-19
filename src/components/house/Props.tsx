
import { CoatDisplay } from "./CoatDisplay";
import { GetabakoDisplay } from "./GetabakoDisplay";
import { KitchenDisplay } from "./KitchenDisplay";
import { Mono2FDisplay } from "./Mono2FDisplay";
import { SenmenDisplay } from "./SenmenDisplay";
import { Toilet2FDisplay, ToiletDisplay } from "./ToiletDisplay";
import { ToiletCurtainDisplay } from "./ToiletCurtainDisplay";
import { TubDisplay } from "./TubDisplay";
import { Wash2FDisplay } from "./Wash2FDisplay";

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
      <Wash2FDisplay />
      <Mono2FDisplay />
      <CoatDisplay />
      <GetabakoDisplay />
      <TubDisplay />
      <KitchenDisplay />
      <SenmenDisplay />
    </group>
  );
}


