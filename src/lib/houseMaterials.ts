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
  createSlateAlbedoMap,
  createSlateNormalMap,
  createStuccoAlbedoMap,
  createStuccoNormalMap,
  createStuccoRoughnessMap,
  createBathDiatomFloorAlbedoMap,
  createBathHexPatchworkAlbedoMap,
  createBathHexPatchworkNormalMap,
  createBathMarbleFloorAlbedoMap,
  createBathMarbleFloorNormalMap,
  createBathMarbleWallAlbedoMap,
  createBathMarbleWallNormalMap,
  createWoolPileNormalMap,
  createIvoryLacquerAlbedoMap,
  createIvoryLacquerNormalMap,
  createTrenchCoatAlbedoMap,
  createTrenchCoatNormalMap,
  createTrenchCoatRoughnessMap,
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
  | "bathMarble"
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
  "1f-int-scl-n-west",
  "1f-int-scl-w",
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
 * UB bath marble walls (darker seamless smoke veins).
 * Shared SCL|UB and 洗面|UB partitions use bath finish on the whole wall.
 */
export const BATH_MARBLE_WALL_IDS = new Set<string>([
  "1f-int-scl-ub-w",
  "1f-int-senmen-ub",
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
let slateAlbedo: THREE.Texture;
let slateNormal: THREE.Texture;
let trenchAlbedo: THREE.Texture;
let trenchNormal: THREE.Texture;
let trenchRough: THREE.Texture;
let ivoryLacquerAlbedo: THREE.Texture;
let ivoryLacquerNormal: THREE.Texture;
let bathWallAlbedo: THREE.Texture;
let bathWallNormal: THREE.Texture;
let bathFloorAlbedo: THREE.Texture;
let bathFloorNormal: THREE.Texture;
let bathHexAlbedo: THREE.Texture;
let bathHexNormal: THREE.Texture;
let bathDiatomAlbedo: THREE.Texture;
let bathDiatomNormal: THREE.Texture;
let woolPileNormal: THREE.Texture;

export type TextureLoadProgress = {
  /** 0–1 */
  progress: number;
  /** Chinese step label for UI */
  step: string;
};

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** Weighted steps for real progress (yaki 1024 is heaviest). */
function textureBuildSteps(): { weight: number; step: string; run: () => void }[] {
  return [
    {
      weight: 6,
      step: "外牆塗料（albedo）…",
      run: () => {
        stuccoAlbedo = createStuccoAlbedoMap(512);
      },
    },
    {
      weight: 10,
      step: "外牆塗料（法線 grit）…",
      run: () => {
        stuccoNormal = createStuccoNormalMap(512);
      },
    },
    {
      weight: 4,
      step: "外牆塗料（roughness）…",
      run: () => {
        stuccoRough = createStuccoRoughnessMap(256);
      },
    },
    {
      weight: 20,
      step: "燒杉紋理（albedo）…",
      run: () => {
        yakiAlbedo = createYakiSugiAlbedoMap(1024);
      },
    },
    {
      weight: 22,
      step: "燒杉紋理（法線）…",
      run: () => {
        yakiNormal = createYakiSugiNormalMap(1024);
      },
    },
    {
      weight: 8,
      step: "燒杉紋理（roughness）…",
      run: () => {
        yakiRough = createYakiSugiRoughnessMap(512);
      },
    },
    {
      weight: 6,
      step: "室內燕麥塗料…",
      run: () => {
        oatAlbedo = createInteriorOatAlbedoMap(512);
      },
    },
    {
      weight: 6,
      step: "室內珪藻土感法線…",
      run: () => {
        oatNormal = createInteriorPlasterNormalMap(512, 0.36);
      },
    },
    {
      weight: 5,
      step: "室內暖灰牆面…",
      run: () => {
        grayAlbedo = createInteriorWarmGrayAlbedoMap(512);
      },
    },
    {
      weight: 5,
      step: "室內暖灰法線…",
      run: () => {
        grayNormal = createInteriorPlasterNormalMap(512, 0.48);
      },
    },
    {
      weight: 4,
      step: "室內木質…",
      run: () => {
        woodAlbedo = createInteriorWoodAlbedoMap(512);
      },
    },
    {
      weight: 4,
      step: "室內木質法線…",
      run: () => {
        woodNormal = createInteriorWoodNormalMap(512);
      },
    },
    {
      weight: 5,
      step: "落塵區板岩…",
      run: () => {
        slateAlbedo = createSlateAlbedoMap(512, 4);
      },
    },
    {
      weight: 5,
      step: "落塵區板岩法線…",
      run: () => {
        slateNormal = createSlateNormalMap(512, 4);
      },
    },
    {
      weight: 10,
      step: "SCL 風衣（albedo）…",
      run: () => {
        trenchAlbedo = createTrenchCoatAlbedoMap(1024);
      },
    },
    {
      weight: 6,
      step: "SCL 風衣（法線）…",
      run: () => {
        trenchNormal = createTrenchCoatNormalMap(512);
      },
    },
    {
      weight: 4,
      step: "SCL 風衣（roughness）…",
      run: () => {
        trenchRough = createTrenchCoatRoughnessMap(512);
      },
    },
    {
      weight: 5,
      step: "SCL 鞋罐（象牙白漆）…",
      run: () => {
        ivoryLacquerAlbedo = createIvoryLacquerAlbedoMap(512);
      },
    },
    {
      weight: 5,
      step: "SCL 鞋罐（宮廷紋法線）…",
      run: () => {
        ivoryLacquerNormal = createIvoryLacquerNormalMap(512);
      },
    },
    {
      weight: 6,
      step: "UB 浴牆大理石…",
      run: () => {
        bathWallAlbedo = createBathMarbleWallAlbedoMap(512);
      },
    },
    {
      weight: 5,
      step: "UB 浴牆法線…",
      run: () => {
        bathWallNormal = createBathMarbleWallNormalMap(512);
      },
    },
    {
      weight: 4,
      step: "UB 浴地板磚（備用）…",
      run: () => {
        bathFloorAlbedo = createBathMarbleFloorAlbedoMap(512, 2);
      },
    },
    {
      weight: 3,
      step: "UB 浴地板法線（備用）…",
      run: () => {
        bathFloorNormal = createBathMarbleFloorNormalMap(512, 2);
      },
    },
    {
      weight: 6,
      step: "UB 鵝黃色珪藻土地…",
      run: () => {
        bathDiatomAlbedo = createBathDiatomFloorAlbedoMap(512);
      },
    },
    {
      weight: 5,
      step: "UB 珪藻土法線…",
      run: () => {
        bathDiatomNormal = createInteriorPlasterNormalMap(512, 0.42);
      },
    },
    {
      weight: 3,
      step: "羊毛腳踏布法線…",
      run: () => {
        woolPileNormal = createWoolPileNormalMap(256);
      },
    },
    {
      weight: 7,
      step: "UB 東牆六角拼布…",
      run: () => {
        bathHexAlbedo = createBathHexPatchworkAlbedoMap(512, 7, 1.8, 42);
      },
    },
    {
      weight: 5,
      step: "UB 東牆六角法線…",
      run: () => {
        bathHexNormal = createBathHexPatchworkNormalMap(512, 7, 1.8);
      },
    },
  ];
}

/**
 * Async preload with progress — yields between steps so the loading UI can paint.
 * Prefer this on first visit; `ensureFaçadeTextures` remains sync fallback.
 */
export async function preloadFaçadeTextures(
  onProgress?: (p: TextureLoadProgress) => void,
): Promise<void> {
  if (typeof document === "undefined") return;
  if (_ready) {
    onProgress?.({ progress: 1, step: "材質已就緒" });
    return;
  }

  const steps = textureBuildSteps();
  const total = steps.reduce((s, x) => s + x.weight, 0);
  let done = 0;

  for (const s of steps) {
    onProgress?.({ progress: done / total, step: s.step });
    await yieldToMain();
    s.run();
    done += s.weight;
    onProgress?.({ progress: Math.min(done / total, 0.98), step: s.step });
  }

  _ready = true;
  onProgress?.({ progress: 0.98, step: "材質完成，準備場景…" });
}

/** Sync ensure (used by materials if preload was skipped). */
export function ensureFaçadeTextures(): void {
  if (_ready || typeof document === "undefined") return;
  for (const s of textureBuildSteps()) {
    s.run();
  }
  _ready = true;
}

export function areFaçadeTexturesReady(): boolean {
  return _ready;
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
  if (BATH_MARBLE_WALL_IDS.has(id)) return "bathMarble";
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

/**
 * Hero prop: honey-gold trench (procedural maps, alpha cutout).
 * Generic Chelsea-inspired — no brand marks.
 */
export function createTrenchCoatMaterial(): THREE.MeshStandardMaterial {
  ensureFaçadeTextures();
  if (!_ready || !trenchAlbedo) {
    return new THREE.MeshStandardMaterial({
      color: "#c49252",
      roughness: 0.68,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.35,
    });
  }
  return new THREE.MeshStandardMaterial({
    color: "#f0e0c8",
    map: trenchAlbedo,
    normalMap: trenchNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: trenchRough,
    roughness: 1,
    metalness: 0.02,
    envMapIntensity: 0.35,
    side: THREE.DoubleSide,
    transparent: true,
    alphaTest: 0.4,
    depthWrite: true,
  });
}

/**
 * Ivory lacquer getabako — soft sheen + subtle palace relief (tokonoma-card).
 */
export function createIvoryLacquerMaterial(
  alongM: number,
  upM: number,
): THREE.MeshStandardMaterial {
  ensureFaçadeTextures();
  if (!_ready || !ivoryLacquerAlbedo) {
    return new THREE.MeshStandardMaterial({
      color: "#f4efe6",
      roughness: 0.42,
      metalness: 0.04,
    });
  }
  const repU = Math.max(alongM / 0.55, 0.6);
  const repV = Math.max(upM / 0.55, 0.6);
  const maps = cloneMaps(
    ivoryLacquerAlbedo,
    ivoryLacquerNormal,
    null,
    repU,
    repV,
  );
  return new THREE.MeshStandardMaterial({
    color: "#f7f2ea",
    map: maps.map,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughness: 0.38,
    metalness: 0.06,
    envMapIntensity: 0.4,
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
 * Genkan/SCL 落塵区 slate — tile grid + fire-face grit.
 * Tint near mid-gray so map stays one step brighter than pure yaki black.
 */
export function createGenkanSlateMaterial(
  sizeX: number,
  sizeZ: number,
  tileM = 0.38,
): THREE.MeshStandardMaterial {
  ensureFaçadeTextures();
  if (!_ready) {
    return new THREE.MeshStandardMaterial({
      color: "#4a4642",
      roughness: 0.92,
    });
  }
  const repU = Math.max(sizeX / tileM, 1);
  const repV = Math.max(sizeZ / tileM, 1);
  const maps = cloneMaps(slateAlbedo, slateNormal, null, repU, repV);
  return new THREE.MeshStandardMaterial({
    color: "#c4c0ba",
    map: maps.map,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughness: 0.9,
    metalness: 0.03,
    envMapIntensity: 0.2,
  });
}

/**
 * UB floor: seamless goose-yellow diatomaceous earth (no tile joints).
 * tileM = large UV scale for subtle grit variation.
 */
export function createBathFloorMaterial(
  sizeX: number,
  sizeZ: number,
  tileM = 1.4,
): THREE.MeshStandardMaterial {
  ensureFaçadeTextures();
  if (!_ready || !bathDiatomAlbedo) {
    return new THREE.MeshStandardMaterial({
      color: "#ead9b0",
      roughness: 0.94,
    });
  }
  const repU = Math.max(sizeX / tileM, 0.6);
  const repV = Math.max(sizeZ / tileM, 0.6);
  const maps = cloneMaps(bathDiatomAlbedo, bathDiatomNormal, null, repU, repV);
  return new THREE.MeshStandardMaterial({
    color: "#f5ecd4",
    map: maps.map,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(0.4, 0.4),
    roughness: 0.94,
    metalness: 0,
    envMapIntensity: 0.12,
  });
}

/** White wool bath mat — high roughness + pile normal. */
export function createWoolMatMaterial(
  sizeX: number,
  sizeZ: number,
  pileM = 0.12,
): THREE.MeshStandardMaterial {
  ensureFaçadeTextures();
  if (!_ready || !woolPileNormal) {
    return new THREE.MeshStandardMaterial({
      color: "#f5f2ec",
      roughness: 0.98,
    });
  }
  const repU = Math.max(sizeX / pileM, 1);
  const repV = Math.max(sizeZ / pileM, 1);
  const n = woolPileNormal.clone();
  n.wrapS = THREE.RepeatWrapping;
  n.wrapT = THREE.RepeatWrapping;
  n.repeat.set(repU, repV);
  n.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    color: "#f7f4ee",
    normalMap: n,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughness: 0.97,
    metalness: 0,
    envMapIntensity: 0.08,
  });
}

/** UB wall: darker seamless smoke marble (no grout). */
export function createBathWallMaterial(
  alongM: number,
  upM: number,
  tileM = 1.2,
): THREE.MeshStandardMaterial {
  ensureFaçadeTextures();
  if (!_ready || !bathWallAlbedo) {
    return new THREE.MeshStandardMaterial({
      color: "#5a5e62",
      roughness: 0.88,
    });
  }
  const repU = Math.max(alongM / tileM, 0.5);
  const repV = Math.max(upM / tileM, 0.5);
  const maps = cloneMaps(bathWallAlbedo, bathWallNormal, null, repU, repV);
  return new THREE.MeshStandardMaterial({
    color: "#c8cdd2",
    map: maps.map,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.84,
    metalness: 0.04,
    envMapIntensity: 0.28,
    side: THREE.DoubleSide,
  });
}

/**
 * UB east feature wall: elongated hex cyan patchwork (tokonoma-card wet).
 * tileM ≈ vertical span of ~few hex rows in meters.
 */
export function createBathHexEastMaterial(
  alongM: number,
  upM: number,
  tileM = 0.55,
): THREE.MeshStandardMaterial {
  ensureFaçadeTextures();
  if (!_ready || !bathHexAlbedo) {
    return new THREE.MeshStandardMaterial({
      color: "#4a7a82",
      roughness: 0.86,
    });
  }
  const repU = Math.max(alongM / (tileM * 1.8), 0.4);
  const repV = Math.max(upM / tileM, 0.4);
  const maps = cloneMaps(bathHexAlbedo, bathHexNormal, null, repU, repV);
  return new THREE.MeshStandardMaterial({
    color: "#e8f0f2",
    map: maps.map,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughness: 0.82,
    metalness: 0.05,
    envMapIntensity: 0.3,
    // Clad planes are thin; double-side so room-facing face always reads
    side: THREE.DoubleSide,
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

  if (f === "bathMarble") {
    return createBathWallMaterial(along, up);
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
