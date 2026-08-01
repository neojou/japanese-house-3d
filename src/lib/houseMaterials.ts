/**
 * House materials — exterior L1 + interior 70/25/5 (DESIGN.md).
 * Procedural maps; no major deps.
 */
import * as THREE from "three";
import {
  createInteriorOatAlbedoMap,
  createInteriorPlasterNormalMap,
  createInteriorWarmGrayAlbedoMap,
  createInteriorWoodAlbedoMap,
  createInteriorWoodNormalMap,
  createStuccoAlbedoMap,
  createStuccoNormalMap,
  createStuccoRoughnessMap,
  createYakiSugiAlbedoMap,
  createYakiSugiNormalMap,
  createYakiSugiRoughnessMap,
} from "@/lib/surfaceTextures";

export type WallFinish =
  | "stucco"
  | "yakiSugi"
  | "interiorMain"
  | "interiorSecondary"
  | "interiorAccent"
  | "interiorWood"
  /** @deprecated alias of interiorMain */
  | "interior";

/** Exterior + shared accent tokens */
export const FAÇADE = {
  stucco: "#f3eee4",
  stuccoTint: "#f7f2e8",
  yakiSugi: "#c8c0b4",
  /** @deprecated use INTERIOR.main */
  interior: "#f7f2e8",
  accentDark: "#2c2824",
  stuccoTileM: 1.6,
  yakiTileM: 0.72,
} as const;

/** Interior palette — 70 / 25 / 5 */
export const INTERIOR = {
  /** ~70% main walls + ceilings: milk / oat */
  main: "#f7f2e8",
  mainTint: "#faf6ef",
  /** ~25% secondary: warm gray / earth */
  secondary: "#c9c3b8",
  secondaryTint: "#d4cec4",
  /** ~5% accent: charcoal (frames, endscape, reveals) */
  accent: "#2c2824",
  /** Light wood accents (beams, endscape panels) */
  wood: "#d4b896",
  woodTint: "#e8d4b8",
  tileM: 1.8,
  woodTileM: 0.85,
  /** Shadow-gap / 分模線 */
  reveal: "#1e1c1a",
} as const;

/** Exterior yaki-sugi hang-points */
export const YAKI_SUGI_WALL_IDS = new Set<string>([
  "1f-jog-ldk-east",
  "1f-south-genkan-door",
]);

/**
 * Interior secondary (~25%): wet rooms, CL, SCL/UB utility.
 * Warmer gray micro-cement / earth tone.
 */
export const INTERIOR_SECONDARY_WALL_IDS = new Set<string>([
  "1f-int-toilet-w",
  "1f-int-toilet-e",
  "1f-int-toilet-s",
  "1f-int-senmen-w",
  "1f-int-senmen-ub",
  "1f-int-scl-n-west",
  "1f-int-scl-w",
  "1f-int-scl-ub-w",
  "1f-int-cl-s",
  "1f-int-cl-e",
  "1f-int-yoshitsu-e", // CL channel side
  "2f-int-cl-split",
  "2f-int-sw-cl",
  "2f-int-cl-sc",
  "2f-int-toilet-s",
  "2f-int-toilet-e",
  "2f-int-nw-jog-toilet",
  "ph-hall-n",
  "ph-hall-w",
  "ph-hall-e",
  "ph-hall-s",
]);

/**
 * Interior accent (~5%): charcoal character walls only.
 * Door frames use INTERIOR.accent in Doors.tsx; genkan-n is oat main + side wood.
 */
export const INTERIOR_ACCENT_WALL_IDS = new Set<string>([
  // none for now — charcoal reserved for frames / 分模線 / optional future endscape
]);

/**
 * Interior light wood cladding on full wall segment (optional).
 * Prefer thin decorative panels in InteriorFinishes for beams.
 */
export const INTERIOR_WOOD_WALL_IDS = new Set<string>([
  // none as full wall — wood is additive panels
]);

let _ready = false;
let stuccoAlbedo: THREE.Texture;
let stuccoNormal: THREE.Texture;
let stuccoRough: THREE.Texture;
let yakiAlbedo: THREE.Texture;
let yakiNormal: THREE.Texture;
let yakiRough: THREE.Texture;
let oatAlbedo: THREE.Texture;
let oatNormal: THREE.Texture;
let grayAlbedo: THREE.Texture;
let grayNormal: THREE.Texture;
let woodAlbedo: THREE.Texture;
let woodNormal: THREE.Texture;

export function ensureFaçadeTextures(): void {
  if (_ready || typeof document === "undefined") return;
  stuccoAlbedo = createStuccoAlbedoMap(512);
  stuccoNormal = createStuccoNormalMap(512);
  stuccoRough = createStuccoRoughnessMap(256);
  yakiAlbedo = createYakiSugiAlbedoMap(1024);
  yakiNormal = createYakiSugiNormalMap(1024);
  yakiRough = createYakiSugiRoughnessMap(512);
  oatAlbedo = createInteriorOatAlbedoMap(512);
  oatNormal = createInteriorPlasterNormalMap(512, 0.36);
  grayAlbedo = createInteriorWarmGrayAlbedoMap(512);
  grayNormal = createInteriorPlasterNormalMap(512, 0.48);
  woodAlbedo = createInteriorWoodAlbedoMap(512);
  woodNormal = createInteriorWoodNormalMap(512);
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
  if (INTERIOR_WOOD_WALL_IDS.has(id)) return "interiorWood";
  if (INTERIOR_ACCENT_WALL_IDS.has(id)) return "interiorAccent";
  if (INTERIOR_SECONDARY_WALL_IDS.has(id)) return "interiorSecondary";
  // Pattern fallbacks for 2F CL / wet not fully listed
  if (id.includes("-cl") || id.includes("toilet") || id.includes("senmen")) {
    return "interiorSecondary";
  }
  if (id.includes("-int-") || id.startsWith("2f-int") || id.startsWith("ph-")) {
    return "interiorMain";
  }
  return "interiorMain";
}

function cloneMaps(
  map: THREE.Texture,
  normalMap: THREE.Texture,
  roughnessMap: THREE.Texture | null,
  repU: number,
  repV: number,
): {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture | null;
} {
  const m = map.clone();
  const n = normalMap.clone();
  const r = roughnessMap ? roughnessMap.clone() : null;
  for (const t of [m, n, r]) {
    if (!t) continue;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repU, repV);
    t.needsUpdate = true;
  }
  m.colorSpace = map.colorSpace;
  return { map: m, normalMap: n, roughnessMap: r };
}

export function createYakiSugiMaterial(
  alongM: number,
  upM: number,
): THREE.MeshStandardMaterial {
  ensureFaçadeTextures();
  if (!_ready) {
    return new THREE.MeshStandardMaterial({
      color: FAÇADE.yakiSugi,
      roughness: 0.88,
      metalness: 0.02,
    });
  }
  const repU = Math.max(alongM / FAÇADE.yakiTileM, 0.5);
  const repV = Math.max(upM / FAÇADE.yakiTileM, 0.5);
  const maps = cloneMaps(yakiAlbedo, yakiNormal, yakiRough, repU, repV);
  return new THREE.MeshStandardMaterial({
    color: FAÇADE.yakiSugi,
    map: maps.map,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(1.35, 1.35),
    roughnessMap: maps.roughnessMap ?? undefined,
    roughness: 0.82,
    metalness: 0.04,
    envMapIntensity: 0.45,
  });
}

export function createMatteBlackHandleMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: "#1a1a1a",
    roughness: 0.72,
    metalness: 0.35,
  });
}

export function createInteriorWoodMaterial(
  alongM: number,
  upM: number,
): THREE.MeshStandardMaterial {
  ensureFaçadeTextures();
  if (!_ready) {
    return new THREE.MeshStandardMaterial({
      color: INTERIOR.wood,
      roughness: 0.75,
    });
  }
  const repU = Math.max(alongM / INTERIOR.woodTileM, 0.4);
  const repV = Math.max(upM / INTERIOR.woodTileM, 0.4);
  const maps = cloneMaps(woodAlbedo, woodNormal, null, repU, repV);
  return new THREE.MeshStandardMaterial({
    color: INTERIOR.woodTint,
    map: maps.map,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughness: 0.78,
    metalness: 0.02,
    envMapIntensity: 0.25,
  });
}

export function createCeilingMaterial(): THREE.MeshStandardMaterial {
  ensureFaçadeTextures();
  if (!_ready) {
    return new THREE.MeshStandardMaterial({
      color: INTERIOR.main,
      roughness: 0.96,
      side: THREE.DoubleSide,
    });
  }
  // Soft oat, large tile, weak normal
  const maps = cloneMaps(oatAlbedo, oatNormal, null, 2.2, 2.2);
  return new THREE.MeshStandardMaterial({
    color: INTERIOR.mainTint,
    map: maps.map,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(0.22, 0.22),
    roughness: 0.96,
    metalness: 0,
    side: THREE.DoubleSide,
  });
}

export function createRevealMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: INTERIOR.reveal,
    roughness: 0.95,
    metalness: 0,
  });
}

export function createDoorFrameMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: INTERIOR.accent,
    roughness: 0.78,
    metalness: 0.05,
  });
}

/**
 * Material for a wall box piece.
 */
export function createWallMaterial(
  finish: WallFinish,
  sizeX: number,
  sizeY: number,
  sizeZ: number,
): THREE.MeshStandardMaterial {
  ensureFaçadeTextures();

  const along = Math.max(sizeX, sizeZ);
  const up = sizeY;
  const f = finish === "interior" ? "interiorMain" : finish;

  if (f === "yakiSugi") {
    return createYakiSugiMaterial(along, up);
  }

  if (f === "stucco" && _ready) {
    const repU = Math.max(along / FAÇADE.stuccoTileM, 0.5);
    const repV = Math.max(up / FAÇADE.stuccoTileM, 0.5);
    const maps = cloneMaps(stuccoAlbedo, stuccoNormal, stuccoRough, repU, repV);
    return new THREE.MeshStandardMaterial({
      color: FAÇADE.stuccoTint,
      map: maps.map,
      normalMap: maps.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: maps.roughnessMap ?? undefined,
      roughness: 1,
      metalness: 0.0,
    });
  }

  if (f === "interiorWood") {
    return createInteriorWoodMaterial(along, up);
  }

  if (f === "interiorAccent") {
    return new THREE.MeshStandardMaterial({
      color: INTERIOR.accent,
      roughness: 0.88,
      metalness: 0.04,
      envMapIntensity: 0.15,
    });
  }

  if (f === "interiorSecondary" && _ready) {
    const repU = Math.max(along / INTERIOR.tileM, 0.5);
    const repV = Math.max(up / INTERIOR.tileM, 0.5);
    const maps = cloneMaps(grayAlbedo, grayNormal, null, repU, repV);
    return new THREE.MeshStandardMaterial({
      color: INTERIOR.secondaryTint,
      map: maps.map,
      normalMap: maps.normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.9,
      metalness: 0,
    });
  }

  // interiorMain (default indoors)
  if (_ready) {
    const repU = Math.max(along / INTERIOR.tileM, 0.5);
    const repV = Math.max(up / INTERIOR.tileM, 0.5);
    const maps = cloneMaps(oatAlbedo, oatNormal, null, repU, repV);
    return new THREE.MeshStandardMaterial({
      color: INTERIOR.mainTint,
      map: maps.map,
      normalMap: maps.normalMap,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughness: 0.93,
      metalness: 0,
    });
  }

  return new THREE.MeshStandardMaterial({
    color: INTERIOR.main,
    roughness: 0.92,
    metalness: 0,
  });
}
