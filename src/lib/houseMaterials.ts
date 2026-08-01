/**
 * L1 house materials — warm ivory stucco + yaki-sugi at genkan recess.
 * Procedural maps (see surfaceTextures.ts); no major deps.
 */
import * as THREE from "three";
import {
  createStuccoAlbedoMap,
  createStuccoNormalMap,
  createStuccoRoughnessMap,
  createYakiSugiAlbedoMap,
  createYakiSugiNormalMap,
  createYakiSugiRoughnessMap,
} from "@/lib/surfaceTextures";

export type WallFinish = "interior" | "stucco" | "yakiSugi";

/** 70% main · 25% secondary · 5% accent (design target) */
export const FAÇADE = {
  /** Warm ivory / milky white — main ~70% */
  stucco: "#f3eee4",
  /** Tint multiply on albedo map */
  stuccoTint: "#f7f2e8",
  /** Yaki-sugi base (map carries grain) — secondary pockets ~25% later */
  yakiSugi: "#2a2420",
  /** Interior plaster (slightly cooler than exterior ivory) */
  interior: "#f0ebe3",
  /** Accent dark (door frames, etc.) ~5% */
  accentDark: "#3d342c",
  /** World meters per texture tile */
  stuccoTileM: 1.6,
  yakiTileM: 0.95,
} as const;

/**
 * Genkan parking recess — yaki-sugi only (L1 phase 1).
 * Expand this set as more wood pockets are approved.
 */
export const YAKI_SUGI_WALL_IDS = new Set<string>([
  "1f-jog-ldk-east", // 内縮西壁：駐車凹口側面（大门凹入主看面）
]);

let _ready = false;
let stuccoAlbedo: THREE.Texture;
let stuccoNormal: THREE.Texture;
let stuccoRough: THREE.Texture;
let yakiAlbedo: THREE.Texture;
let yakiNormal: THREE.Texture;
let yakiRough: THREE.Texture;

/** Call once on client before first wall material (safe to call repeatedly). */
export function ensureFaçadeTextures(): void {
  if (_ready || typeof document === "undefined") return;
  stuccoAlbedo = createStuccoAlbedoMap(512);
  stuccoNormal = createStuccoNormalMap(512);
  stuccoRough = createStuccoRoughnessMap(256);
  yakiAlbedo = createYakiSugiAlbedoMap(512);
  yakiNormal = createYakiSugiNormalMap(512);
  yakiRough = createYakiSugiRoughnessMap(256);
  _ready = true;
}

export function isExteriorShellId(id: string): boolean {
  if (id.includes("-int-")) return false;
  if (id.includes("-ext-") || id.includes("parapet") || id.includes("balc")) {
    return true;
  }
  if (/^1f-(south|east|north|west|jog)/.test(id)) return true;
  if (id.startsWith("ph-hall-") || id.startsWith("ph-balc-")) return true;
  if (id === "2f-ne-room-s") return true;
  return false;
}

export function wallFinishForId(id: string): WallFinish {
  if (YAKI_SUGI_WALL_IDS.has(id)) return "yakiSugi";
  if (isExteriorShellId(id)) return "stucco";
  return "interior";
}

function cloneMaps(
  map: THREE.Texture,
  normalMap: THREE.Texture,
  roughnessMap: THREE.Texture,
  repU: number,
  repV: number,
): {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
} {
  const m = map.clone();
  const n = normalMap.clone();
  const r = roughnessMap.clone();
  for (const t of [m, n, r]) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repU, repV);
    t.needsUpdate = true;
  }
  m.colorSpace = map.colorSpace;
  return { map: m, normalMap: n, roughnessMap: r };
}

/**
 * Material for a wall box piece. `along` / `up` in meters drive UV repeat.
 */
export function createWallMaterial(
  finish: WallFinish,
  sizeX: number,
  sizeY: number,
  sizeZ: number,
): THREE.MeshStandardMaterial {
  ensureFaçadeTextures();

  // Dominant face extents for UV (ignore thin thickness axis)
  const along = Math.max(sizeX, sizeZ);
  const up = sizeY;

  if (finish === "yakiSugi" && _ready) {
    const repU = Math.max(along / FAÇADE.yakiTileM, 0.35);
    const repV = Math.max(up / FAÇADE.yakiTileM, 0.35);
    const maps = cloneMaps(yakiAlbedo, yakiNormal, yakiRough, repU, repV);
    return new THREE.MeshStandardMaterial({
      color: FAÇADE.yakiSugi,
      map: maps.map,
      normalMap: maps.normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: maps.roughnessMap,
      roughness: 1,
      metalness: 0.02,
    });
  }

  if (finish === "stucco" && _ready) {
    const repU = Math.max(along / FAÇADE.stuccoTileM, 0.5);
    const repV = Math.max(up / FAÇADE.stuccoTileM, 0.5);
    const maps = cloneMaps(stuccoAlbedo, stuccoNormal, stuccoRough, repU, repV);
    return new THREE.MeshStandardMaterial({
      color: FAÇADE.stuccoTint,
      map: maps.map,
      normalMap: maps.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: maps.roughnessMap,
      roughness: 1,
      metalness: 0.0,
    });
  }

  // Interior or SSR fallback without document
  return new THREE.MeshStandardMaterial({
    color: FAÇADE.interior,
    roughness: 0.92,
    metalness: 0,
  });
}
