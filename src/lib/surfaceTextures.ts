/**
 * Procedural surface maps (no external assets).
 * Exterior: stucco grit + yaki-sugi.
 * Interior: oat plaster, warm-gray secondary, light wood accents.
 */
import * as THREE from "three";

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function valueNoise2D(
  x: number,
  y: number,
  rand: () => number,
  cache: Map<string, number>,
): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const key = (ix: number, iy: number) => `${ix},${iy}`;
  const g = (ix: number, iy: number) => {
    const k = key(ix, iy);
    let v = cache.get(k);
    if (v === undefined) {
      // deterministic-ish via position hash + stream
      const h = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
      v = h - Math.floor(h);
      cache.set(k, v);
    }
    return v;
  };
  const n00 = g(x0, y0);
  const n10 = g(x0 + 1, y0);
  const n01 = g(x0, y0 + 1);
  const n11 = g(x0 + 1, y0 + 1);
  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;
  return nx0 * (1 - sy) + nx1 * sy;
}

function fbm(
  x: number,
  y: number,
  octaves: number,
  cache: Map<string, number>,
  rand: () => number,
): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2D(x * freq, y * freq, rand, cache);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function makeCanvas(size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return c;
}

function canvasToTexture(
  canvas: HTMLCanvasElement,
  opts?: { colorSpace?: THREE.ColorSpace },
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = opts?.colorSpace ?? THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Fine grit normal for elastic stucco / sand-texture paint. */
export function createStuccoNormalMap(size = 512): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(42);
  const strength = 0.55;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      // Height field: fine grit + soft waves
      const h =
        fbm(u * 28, v * 28, 5, cache, rand) * 0.75 +
        fbm(u * 80, v * 80, 3, cache, rand) * 0.25;
      // Finite difference → normal
      const hx =
        fbm((u + 1 / size) * 28, v * 28, 5, cache, rand) * 0.75 +
        fbm((u + 1 / size) * 80, v * 80, 3, cache, rand) * 0.25;
      const hy =
        fbm(u * 28, (v + 1 / size) * 28, 5, cache, rand) * 0.75 +
        fbm(u * 80, (v + 1 / size) * 80, 3, cache, rand) * 0.25;
      const dx = (hx - h) * strength * 4;
      const dy = (hy - h) * strength * 4;
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

/** Subtle albedo variation for warm ivory stucco (not flat hospital white). */
export function createStuccoAlbedoMap(size = 512): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(7);
  // Base ivory RGB
  const br = 245,
    bg = 240,
    bb = 230;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbm(u * 12, v * 12, 4, cache, rand);
      const g = fbm(u * 48, v * 48, 2, cache, rand);
      const t = (n - 0.5) * 14 + (g - 0.5) * 6;
      const i = (y * size + x) * 4;
      img.data[i] = Math.min(255, Math.max(0, br + t));
      img.data[i + 1] = Math.min(255, Math.max(0, bg + t * 0.92));
      img.data[i + 2] = Math.min(255, Math.max(0, bb + t * 0.75));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas, { colorSpace: THREE.SRGBColorSpace });
}

/** Soft roughness variation (matte paint with grit). */
export function createStuccoRoughnessMap(size = 256): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(99);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm((x / size) * 20, (y / size) * 20, 3, cache, rand);
      const r = 0.82 + n * 0.14;
      const v = Math.round(Math.min(255, Math.max(0, r * 255)));
      const i = (y * size + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

/**
 * Yaki-sugi (charred cedar) albedo — mid-dark with readable grain.
 * IMPORTANT: stay in ~0.12–0.45 luminance so MeshStandard (color×map)
 * does not crush to pure black under soft ambient.
 */
export function createYakiSugiAlbedoMap(size = 1024): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(2024);
  const planks = 5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const plank = Math.floor(u * planks);
      const plankU = u * planks - plank;
      const edge = Math.min(plankU, 1 - plankU);
      // Dark board seams (still above pure black)
      const seam = edge < 0.035 ? 0.55 : edge < 0.055 ? 0.78 : 1;
      // Multi-scale vertical grain (high contrast)
      const grain =
        fbm(plank * 4 + u * 3, v * 22, 5, cache, rand) * 0.45 +
        fbm(u * 14, v * 90, 4, cache, rand) * 0.35 +
        fbm(u * 40, v * 200, 2, cache, rand) * 0.2;
      const char = fbm(u * 5 + plank, v * 8, 4, cache, rand);
      // Lifted base so detail survives ACES + ambient
      const tone = 0.16 + grain * 0.28 + (char - 0.5) * 0.1;
      const warm = 1 + (char - 0.5) * 0.22;
      // Occasional ash-grey highlight along grain
      const ash = Math.max(0, grain - 0.55) * 0.35;
      const i = (y * size + x) * 4;
      const r = Math.min(255, Math.max(0, (tone * 255 * 1.15 * warm + ash * 40) * seam));
      const g = Math.min(255, Math.max(0, (tone * 255 * 0.98 * warm + ash * 36) * seam));
      const b = Math.min(255, Math.max(0, (tone * 255 * 0.88 + ash * 32) * seam));
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = canvasToTexture(canvas, { colorSpace: THREE.SRGBColorSpace });
  tex.anisotropy = 16;
  return tex;
}

/** Vertical ridge normal for charred boards — stronger relief for raking light. */
export function createYakiSugiNormalMap(size = 1024): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(88);
  const strength = 1.85;
  const planks = 5;

  const heightAt = (u: number, v: number) => {
    const plank = Math.floor(u * planks);
    const plankU = u * planks - plank;
    const edge = Math.min(plankU, 1 - plankU);
    const seam = edge < 0.04 ? 0.55 : edge < 0.06 ? 0.2 : 0;
    const grain =
      fbm(plank * 3 + u * 2, v * 28, 5, cache, rand) * 0.55 +
      fbm(u * 12, v * 110, 3, cache, rand) * 0.35 +
      fbm(u * 30, v * 220, 2, cache, rand) * 0.1;
    return grain + seam;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const h = heightAt(u, v);
      const hx = heightAt(u + 1 / size, v);
      const hy = heightAt(u, v + 1 / size);
      const dx = (hx - h) * strength * 6;
      const dy = (hy - h) * strength * 6;
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = canvasToTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}

export function createYakiSugiRoughnessMap(size = 512): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(11);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbm(u * 10, v * 40, 4, cache, rand);
      const grain = fbm(u * 6, v * 100, 2, cache, rand);
      // Charred: mostly matte; slightly glossier on raised grain (darker in roughness map)
      const r = 0.62 + n * 0.28 - grain * 0.12;
      const val = Math.round(Math.min(255, Math.max(0, r * 255)));
      const i = (y * size + x) * 4;
      img.data[i] = val;
      img.data[i + 1] = val;
      img.data[i + 2] = val;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

/**
 * Goose-yellow diatomaceous earth floor (seamless, no grout).
 * Warm cream-yellow grit — UB bath floor (tokonoma-card wet calm base).
 */
export function createBathDiatomFloorAlbedoMap(size = 512): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(0xd1a0);
  // Cream goose-yellow base
  const br = 234,
    bg = 217,
    bb = 176;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbm(u * 12, v * 12, 5, cache, rand);
      const g = fbm(u * 40, v * 40, 3, cache, rand);
      const cloud = fbm(u * 4 + 0.2, v * 5, 3, cache, rand);
      const t = (n - 0.5) * 14 + (g - 0.5) * 8 + (cloud - 0.5) * 6;
      const i = (y * size + x) * 4;
      img.data[i] = Math.min(255, Math.max(0, br + t));
      img.data[i + 1] = Math.min(255, Math.max(0, bg + t * 0.85));
      img.data[i + 2] = Math.min(255, Math.max(0, bb + t * 0.55));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas, { colorSpace: THREE.SRGBColorSpace });
}

/** Soft wool / pile normal for bath mat (medium fluff). */
export function createWoolPileNormalMap(size = 256): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(0xf001);
  const strength = 1.1;

  const heightAt = (u: number, v: number) => {
    const n = fbm(u * 48, v * 48, 4, cache, rand);
    const fibers = Math.abs(Math.sin(u * 90 + n * 4) * Math.cos(v * 70 + n * 3));
    return n * 0.55 + fibers * 0.45;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const h0 = heightAt(u, v);
      const hx = heightAt(u + 1 / size, v);
      const hy = heightAt(u, v + 1 / size);
      const dx = (hx - h0) * strength * 3.5;
      const dy = (hy - h0) * strength * 3.5;
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

/** Soft diatomaceous / milk-oat plaster albedo (interior main ~70%). */
export function createInteriorOatAlbedoMap(size = 512): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(301);
  const br = 248,
    bg = 243,
    bb = 232;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbm(u * 10, v * 10, 4, cache, rand);
      const g = fbm(u * 36, v * 36, 3, cache, rand);
      const t = (n - 0.5) * 10 + (g - 0.5) * 5;
      const i = (y * size + x) * 4;
      img.data[i] = Math.min(255, Math.max(0, br + t));
      img.data[i + 1] = Math.min(255, Math.max(0, bg + t * 0.9));
      img.data[i + 2] = Math.min(255, Math.max(0, bb + t * 0.7));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas, { colorSpace: THREE.SRGBColorSpace });
}

/** Hand-troweled micro grit normal for interior plaster / 珪藻土感. */
export function createInteriorPlasterNormalMap(
  size = 512,
  strength = 0.38,
): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(77);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const h =
        fbm(u * 22, v * 22, 4, cache, rand) * 0.7 +
        fbm(u * 70, v * 70, 2, cache, rand) * 0.3;
      const hx =
        fbm((u + 1 / size) * 22, v * 22, 4, cache, rand) * 0.7 +
        fbm((u + 1 / size) * 70, v * 70, 2, cache, rand) * 0.3;
      const hy =
        fbm(u * 22, (v + 1 / size) * 22, 4, cache, rand) * 0.7 +
        fbm(u * 70, (v + 1 / size) * 70, 2, cache, rand) * 0.3;
      const dx = (hx - h) * strength * 4;
      const dy = (hy - h) * strength * 4;
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

/** Warm-gray secondary wall albedo (~25%). */
export function createInteriorWarmGrayAlbedoMap(size = 512): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(404);
  const br = 198,
    bg = 192,
    bb = 184;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbm(u * 14, v * 14, 4, cache, rand);
      const t = (n - 0.5) * 12;
      const i = (y * size + x) * 4;
      img.data[i] = Math.min(255, Math.max(0, br + t));
      img.data[i + 1] = Math.min(255, Math.max(0, bg + t * 0.95));
      img.data[i + 2] = Math.min(255, Math.max(0, bb + t * 0.9));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas, { colorSpace: THREE.SRGBColorSpace });
}

/** Light interior wood (beam / endscape) — not yaki. */
export function createInteriorWoodAlbedoMap(size = 512): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(505);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const grain =
        fbm(u * 3, v * 50, 5, cache, rand) * 0.55 +
        fbm(u * 10, v * 120, 3, cache, rand) * 0.45;
      const tone = 0.55 + grain * 0.22;
      const i = (y * size + x) * 4;
      img.data[i] = Math.min(255, tone * 255 * 1.05 + 20);
      img.data[i + 1] = Math.min(255, tone * 255 * 0.88 + 12);
      img.data[i + 2] = Math.min(255, tone * 255 * 0.62 + 6);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas, { colorSpace: THREE.SRGBColorSpace });
}

export function createInteriorWoodNormalMap(size = 512): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(606);
  const strength = 0.9;

  const heightAt = (u: number, v: number) => fbm(u * 4, v * 60, 4, cache, rand);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const h = heightAt(u, v);
      const hx = heightAt(u + 1 / size, v);
      const hy = heightAt(u, v + 1 / size);
      const dx = (hx - h) * strength * 5;
      const dy = (hy - h) * strength * 5;
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

/**
 * Dark slate / 板岩 tile albedo — grid joints + fire-face grit.
 * Mid-dark (not pure black) so genkan dust zone stays readable.
 */
export function createSlateAlbedoMap(size = 512, tiles = 4): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(707);
  const joint = 0.04; // fraction of tile as joint

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const tx = (u * tiles) % 1;
      const ty = (v * tiles) % 1;
      const onJoint = tx < joint || ty < joint || tx > 1 - joint * 0.5 || ty > 1 - joint * 0.5;
      const n = fbm(u * 18, v * 18, 4, cache, rand);
      const g = fbm(u * 55, v * 55, 2, cache, rand);
      // Body ~0.22–0.32 luminance; joint darker
      const body = 0.2 + n * 0.1 + (g - 0.5) * 0.04;
      const tone = onJoint ? 0.08 + n * 0.03 : body;
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(tone * 255 * 1.05);
      img.data[i + 1] = Math.round(tone * 255 * 1.0);
      img.data[i + 2] = Math.round(tone * 255 * 0.95);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas, { colorSpace: THREE.SRGBColorSpace });
}

export function createSlateNormalMap(size = 512, tiles = 4): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(808);
  const strength = 0.85;
  const joint = 0.04;

  const heightAt = (u: number, v: number) => {
    const tx = (u * tiles) % 1;
    const ty = (v * tiles) % 1;
    const onJoint =
      tx < joint || ty < joint || tx > 1 - joint * 0.5 || ty > 1 - joint * 0.5;
    const n = fbm(u * 20, v * 20, 3, cache, rand);
    return (onJoint ? 0.15 : 0.55) + n * 0.35;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const h = heightAt(u, v);
      const hx = heightAt(u + 1 / size, v);
      const hy = heightAt(u, v + 1 / size);
      const dx = (hx - h) * strength * 4;
      const dy = (hy - h) * strength * 4;
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

// ─────────────────────────────────────────────────────────────
// Hero prop: generic honey-gold trench coat (no brand marks)
// ─────────────────────────────────────────────────────────────

function trenchSilhouettePath(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const cx = w * 0.5;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.22, h * 0.1);
  ctx.lineTo(cx - w * 0.42, h * 0.18);
  ctx.lineTo(cx - w * 0.46, h * 0.42);
  ctx.lineTo(cx - w * 0.34, h * 0.44);
  ctx.lineTo(cx - w * 0.2, h * 0.48);
  ctx.lineTo(cx - w * 0.17, h * 0.55);
  ctx.lineTo(cx - w * 0.2, h * 0.92);
  ctx.quadraticCurveTo(cx, h * 0.96, cx + w * 0.2, h * 0.92);
  ctx.lineTo(cx + w * 0.17, h * 0.55);
  ctx.lineTo(cx + w * 0.2, h * 0.48);
  ctx.lineTo(cx + w * 0.34, h * 0.44);
  ctx.lineTo(cx + w * 0.46, h * 0.42);
  ctx.lineTo(cx + w * 0.42, h * 0.18);
  ctx.lineTo(cx + w * 0.22, h * 0.1);
  ctx.lineTo(cx + w * 0.08, h * 0.14);
  ctx.lineTo(cx, h * 0.22);
  ctx.lineTo(cx - w * 0.08, h * 0.14);
  ctx.closePath();
}

/**
 * Procedural honey-gold trench albedo with alpha silhouette.
 * Generic Chelsea-inspired cut — no logos / brand marks.
 */
export function createTrenchCoatAlbedoMap(size = 1024): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  const w = size;
  const h = size;
  const cx = w * 0.5;
  const cache = new Map<string, number>();
  const rand = mulberry32(0x7e11);

  ctx.save();
  trenchSilhouettePath(ctx, w, h);
  ctx.fillStyle = "rgba(20,16,12,0.18)";
  ctx.filter = `blur(${Math.round(size * 0.012)}px)`;
  ctx.fill();
  ctx.restore();
  ctx.filter = "none";

  trenchSilhouettePath(ctx, w, h);
  const bodyGrad = ctx.createLinearGradient(
    cx - w * 0.2,
    h * 0.1,
    cx + w * 0.25,
    h * 0.95,
  );
  bodyGrad.addColorStop(0, "#e8c48a");
  bodyGrad.addColorStop(0.35, "#d4a86a");
  bodyGrad.addColorStop(0.65, "#c49252");
  bodyGrad.addColorStop(1, "#b07e42");
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  ctx.save();
  trenchSilhouettePath(ctx, w, h);
  ctx.clip();

  const img = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (img.data[i + 3] < 8) continue;
      const u = x / size;
      const v = y / size;
      const twill = Math.sin((u * 90 + v * 90) * Math.PI * 2) * 0.5 + 0.5;
      const n = fbm(u * 18, v * 28, 4, cache, rand);
      const fold =
        Math.exp(-((u - 0.5) ** 2) / 0.08) * Math.sin(v * Math.PI * 3.2) * 0.08;
      const shade = (twill * 0.08 + n * 0.12 + fold) * 255;
      img.data[i] = Math.min(255, Math.max(0, img.data[i] + shade * 0.35));
      img.data[i + 1] = Math.min(
        255,
        Math.max(0, img.data[i + 1] + shade * 0.28),
      );
      img.data[i + 2] = Math.min(
        255,
        Math.max(0, img.data[i + 2] + shade * 0.18),
      );
    }
  }
  ctx.putImageData(img, 0, 0);

  ctx.fillStyle = "rgba(120, 82, 40, 0.28)";
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.07, h * 0.14);
  ctx.lineTo(cx, h * 0.22);
  ctx.lineTo(cx - w * 0.02, h * 0.48);
  ctx.lineTo(cx - w * 0.14, h * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.07, h * 0.14);
  ctx.lineTo(cx, h * 0.22);
  ctx.lineTo(cx + w * 0.02, h * 0.48);
  ctx.lineTo(cx + w * 0.14, h * 0.42);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(90, 62, 30, 0.45)";
  ctx.lineWidth = size * 0.008;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.12, h * 0.12);
  ctx.quadraticCurveTo(cx, h * 0.08, cx + w * 0.12, h * 0.12);
  ctx.stroke();

  const beltY = h * 0.54;
  const beltH = h * 0.045;
  ctx.fillStyle = "rgba(100, 70, 34, 0.55)";
  ctx.fillRect(cx - w * 0.18, beltY - beltH / 2, w * 0.36, beltH);
  ctx.fillStyle = "rgba(60, 48, 32, 0.75)";
  ctx.fillRect(cx - w * 0.03, beltY - beltH * 0.55, w * 0.06, beltH * 1.1);
  ctx.strokeStyle = "rgba(200, 170, 110, 0.5)";
  ctx.lineWidth = size * 0.003;
  ctx.strokeRect(cx - w * 0.028, beltY - beltH * 0.5, w * 0.056, beltH);

  ctx.fillStyle = "rgba(55, 42, 28, 0.85)";
  for (const by of [0.28, 0.36, 0.44, 0.62, 0.72]) {
    ctx.beginPath();
    ctx.arc(cx, h * by, size * 0.008, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(70, 50, 28, 0.35)";
  ctx.lineWidth = size * 0.004;
  ctx.strokeRect(cx - w * 0.16, h * 0.64, w * 0.1, h * 0.08);
  ctx.strokeRect(cx + w * 0.06, h * 0.64, w * 0.1, h * 0.08);

  ctx.beginPath();
  ctx.moveTo(cx, h * 0.24);
  ctx.lineTo(cx, h * 0.92);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - w * 0.2, h * 0.12);
  ctx.lineTo(cx - w * 0.12, h * 0.16);
  ctx.moveTo(cx + w * 0.2, h * 0.12);
  ctx.lineTo(cx + w * 0.12, h * 0.16);
  ctx.stroke();

  ctx.restore();

  const tex = canvasToTexture(canvas, { colorSpace: THREE.SRGBColorSpace });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/** Fabric twill + soft fold normals for trench card. */
export function createTrenchCoatNormalMap(size = 512): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(0xc0a7);
  const strength = 0.9;

  const heightAt = (u: number, v: number) => {
    const twill = Math.sin((u + v) * Math.PI * 48) * 0.35;
    const n = fbm(u * 22, v * 30, 4, cache, rand);
    const fold =
      Math.exp(-((u - 0.5) ** 2) / 0.07) * Math.sin(v * Math.PI * 3) * 0.45;
    const waist = Math.exp(-((v - 0.54) ** 2) / 0.004) * 0.25;
    return twill * 0.25 + n * 0.45 + fold + waist;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const h0 = heightAt(u, v);
      const hx = heightAt(u + 1 / size, v);
      const hy = heightAt(u, v + 1 / size);
      const dx = (hx - h0) * strength * 3.5;
      const dy = (hy - h0) * strength * 3.5;
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = canvasToTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/** Gabardine: mid roughness with smoother belt band. */
export function createTrenchCoatRoughnessMap(size = 512): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(0x5a17);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbm(u * 16, v * 20, 3, cache, rand);
      const belt = Math.exp(-((v - 0.54) ** 2) / 0.003) * 0.2;
      const r = 0.62 + n * 0.18 - belt;
      const i = (y * size + x) * 4;
      const g = Math.round(Math.min(1, Math.max(0.25, r)) * 255);
      img.data[i] = g;
      img.data[i + 1] = g;
      img.data[i + 2] = g;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = canvasToTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// ─────────────────────────────────────────────────────────────
// Hero prop: ivory lacquer getabako (subtle palace karakusa)
// ─────────────────────────────────────────────────────────────

/** Soft ivory lacquer with near-invisible cream karakusa tint. */
export function createIvoryLacquerAlbedoMap(size = 512): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(0x1ac);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbm(u * 6, v * 8, 4, cache, rand);
      // Very subtle vine rhythm (karakusa-ish), low contrast
      const vine =
        Math.sin(u * Math.PI * 6 + Math.sin(v * Math.PI * 4) * 1.2) *
        Math.cos(v * Math.PI * 5 + Math.sin(u * Math.PI * 3) * 0.8);
      const tone = 0.9 + n * 0.06 + vine * 0.018;
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(Math.min(1, tone) * 255);
      img.data[i + 1] = Math.round(Math.min(1, tone * 0.98) * 250);
      img.data[i + 2] = Math.round(Math.min(1, tone * 0.94) * 240);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas, { colorSpace: THREE.SRGBColorSpace });
}

/** Low-relief karakusa / palace scroll normal — readable only under raking light. */
export function createIvoryLacquerNormalMap(size = 512): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(0x1ad);
  const strength = 0.55;

  const heightAt = (u: number, v: number) => {
    const n = fbm(u * 8, v * 10, 3, cache, rand) * 0.35;
    const vine =
      Math.sin(u * Math.PI * 7 + Math.sin(v * 12) * 0.9) *
      Math.cos(v * Math.PI * 6 + Math.cos(u * 10) * 0.7);
    const vine2 =
      Math.sin((u + v) * Math.PI * 9) * Math.cos((u - v) * Math.PI * 5) * 0.5;
    // Thin scroll lines
    const line = Math.pow(
      Math.abs(Math.sin(u * Math.PI * 14 + v * 3)),
      12,
    );
    return n + vine * 0.4 + vine2 * 0.25 + line * 0.35;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const h0 = heightAt(u, v);
      const hx = heightAt(u + 1 / size, v);
      const hy = heightAt(u, v + 1 / size);
      const dx = (hx - h0) * strength * 3;
      const dy = (hy - h0) * strength * 3;
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

// ─────────────────────────────────────────────────────────────
// UB bath marble / slate (smoke veins; wall seamless, floor tiled)
// ─────────────────────────────────────────────────────────────

/** Soft marble vein field: cyan + warm yellow smoke in gray body. */
function bathVein(
  u: number,
  v: number,
  cache: Map<string, number>,
  seed: number,
) {
  const n1 = fbm(u * 3.2 + 0.1, v * 4.5, 5, cache, mulberry32(seed));
  const n2 = fbm(u * 7.5, v * 2.8 + 0.3, 4, cache, mulberry32(seed + 1));
  const flow =
    Math.sin((u * 2.2 + n1 * 1.4) * Math.PI * 2) *
    Math.cos((v * 1.6 + n2) * Math.PI * 2);
  const smoke = fbm(u * 5 + n2, v * 6 - n1, 4, cache, mulberry32(seed + 2));
  return { n1, n2, flow, smoke };
}

/**
 * Darker wall marble — seamless, no grout; gray + pale cyan/yellow wash.
 */
export function createBathMarbleWallAlbedoMap(size = 512): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const { n1, flow, smoke } = bathVein(u, v, cache, 0xb01);
      const base = 0.38 + n1 * 0.08;
      const cyan = Math.max(0, flow) * 0.06 + smoke * 0.04;
      const warm = Math.max(0, -flow) * 0.05 + (1 - smoke) * 0.03;
      const r = base + warm * 0.9 - cyan * 0.15;
      const g = base + warm * 0.55 + cyan * 0.25;
      const b = base - warm * 0.1 + cyan * 0.55;
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(Math.min(1, Math.max(0, r)) * 255);
      img.data[i + 1] = Math.round(Math.min(1, Math.max(0, g)) * 255);
      img.data[i + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas, { colorSpace: THREE.SRGBColorSpace });
}

export function createBathMarbleWallNormalMap(size = 512): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const strength = 0.65;

  const heightAt = (u: number, v: number) => {
    const { n1, flow, smoke } = bathVein(u, v, cache, 0xb02);
    return n1 * 0.5 + Math.abs(flow) * 0.35 + smoke * 0.25;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const h0 = heightAt(u, v);
      const hx = heightAt(u + 1 / size, v);
      const hy = heightAt(u, v + 1 / size);
      const dx = (hx - h0) * strength * 3.2;
      const dy = (hy - h0) * strength * 3.2;
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

/**
 * Lighter floor marble + clear tile grid.
 * tiles = cells across the map (UV repeat sets real size).
 */
export function createBathMarbleFloorAlbedoMap(
  size = 512,
  tiles = 4,
): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const joint = 0.045;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const { n1, flow, smoke } = bathVein(u * 1.1, v * 1.1, cache, 0xb03);
      const tx = (u * tiles) % 1;
      const ty = (v * tiles) % 1;
      const onJoint =
        tx < joint ||
        ty < joint ||
        tx > 1 - joint * 0.45 ||
        ty > 1 - joint * 0.45;
      const base = 0.62 + n1 * 0.1;
      const cyan = Math.max(0, flow) * 0.05 + smoke * 0.03;
      const warm = Math.max(0, -flow) * 0.045;
      let r = base + warm * 0.85 - cyan * 0.1;
      let g = base + warm * 0.5 + cyan * 0.2;
      let b = base - warm * 0.08 + cyan * 0.4;
      if (onJoint) {
        r *= 0.42;
        g *= 0.44;
        b *= 0.46;
      }
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(Math.min(1, Math.max(0, r)) * 255);
      img.data[i + 1] = Math.round(Math.min(1, Math.max(0, g)) * 255);
      img.data[i + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas, { colorSpace: THREE.SRGBColorSpace });
}

export function createBathMarbleFloorNormalMap(
  size = 512,
  tiles = 4,
): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const joint = 0.045;
  const strength = 0.8;

  const heightAt = (u: number, v: number) => {
    const { n1, flow, smoke } = bathVein(u, v, cache, 0xb04);
    const tx = (u * tiles) % 1;
    const ty = (v * tiles) % 1;
    const onJoint =
      tx < joint ||
      ty < joint ||
      tx > 1 - joint * 0.45 ||
      ty > 1 - joint * 0.45;
    return (
      (onJoint ? 0.12 : 0.55) +
      n1 * 0.3 +
      Math.abs(flow) * 0.2 +
      smoke * 0.15
    );
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const h0 = heightAt(u, v);
      const hx = heightAt(u + 1 / size, v);
      const hy = heightAt(u, v + 1 / size);
      const dx = (hx - h0) * strength * 3.5;
      const dy = (hy - h0) * strength * 3.5;
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

// ─────────────────────────────────────────────────────────────
// UB east wall: elongated hex cyan patchwork
// ─────────────────────────────────────────────────────────────

/** Flat-top elongated hex metric: 0 inside, >1 outside. aspect = width/height. */
function elongHexMetric(dx: number, dy: number, halfW: number, halfH: number) {
  const x = Math.abs(dx) / halfW;
  const y = Math.abs(dy) / halfH;
  // Hex: max(|x|, |x|/2 + |y|·√3/2, …) with stretched axes
  return Math.max(x, 0.5 * x + 0.866025 * y);
}

function hash2(ix: number, iy: number, seed: number) {
  const s = Math.sin(ix * 127.1 + iy * 311.7 + seed * 0.013) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Elongated hex tiles (aspect ~1.8), each cell random deep→pale cyan patchwork.
 * UV space; joints darker slate-cyan.
 */
export function createBathHexPatchworkAlbedoMap(
  size = 512,
  /** Hex rows across map (vertical density) */
  rows = 7,
  aspect = 1.8,
  seed = 42,
): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();

  const cellH = 1 / rows;
  const cellW = cellH * aspect * 0.75; // horizontal pitch for hex packing
  const halfH = cellH * 0.5;
  const halfW = halfH * aspect;
  const joint = 0.92; // metric threshold inside tile

  // Deep cyan → pale cyan
  const deep = { r: 0.16, g: 0.29, b: 0.32 };
  const pale = { r: 0.56, g: 0.72, b: 0.74 };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;

      // Candidate hex centers (staggered rows)
      let best = 1e9;
      let bestIx = 0;
      let bestIy = 0;
      const iy0 = Math.floor(v / (cellH * 0.75)) - 1;
      const ix0 = Math.floor(u / cellW) - 1;
      for (let iy = iy0; iy <= iy0 + 3; iy++) {
        for (let ix = ix0; ix <= ix0 + 3; ix++) {
          const cx = (ix + (iy & 1) * 0.5) * cellW;
          const cy = iy * cellH * 0.75;
          const m = elongHexMetric(u - cx, v - cy, halfW, halfH);
          if (m < best) {
            best = m;
            bestIx = ix;
            bestIy = iy;
          }
        }
      }

      const i = (y * size + x) * 4;
      if (best > joint) {
        // Joint / grout
        img.data[i] = 42;
        img.data[i + 1] = 52;
        img.data[i + 2] = 56;
        img.data[i + 3] = 255;
        continue;
      }

      const t = hash2(bestIx, bestIy, seed);
      const { smoke } = bathVein(u * 2, v * 2, cache, 0xc01 + bestIx);
      const r = deep.r + (pale.r - deep.r) * t + smoke * 0.04;
      const g = deep.g + (pale.g - deep.g) * t + smoke * 0.03;
      const b = deep.b + (pale.b - deep.b) * t + smoke * 0.05;
      // Soft edge darken near joint
      const edge = Math.min(1, (joint - best) / 0.08);
      const e = 0.75 + 0.25 * edge;
      img.data[i] = Math.round(Math.min(1, r * e) * 255);
      img.data[i + 1] = Math.round(Math.min(1, g * e) * 255);
      img.data[i + 2] = Math.round(Math.min(1, b * e) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas, { colorSpace: THREE.SRGBColorSpace });
}

export function createBathHexPatchworkNormalMap(
  size = 512,
  rows = 7,
  aspect = 1.8,
): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cellH = 1 / rows;
  const cellW = cellH * aspect * 0.75;
  const halfH = cellH * 0.5;
  const halfW = halfH * aspect;
  const joint = 0.92;
  const strength = 0.9;

  const heightAt = (u: number, v: number) => {
    let best = 1e9;
    const iy0 = Math.floor(v / (cellH * 0.75)) - 1;
    const ix0 = Math.floor(u / cellW) - 1;
    for (let iy = iy0; iy <= iy0 + 3; iy++) {
      for (let ix = ix0; ix <= ix0 + 3; ix++) {
        const cx = (ix + (iy & 1) * 0.5) * cellW;
        const cy = iy * cellH * 0.75;
        best = Math.min(best, elongHexMetric(u - cx, v - cy, halfW, halfH));
      }
    }
    if (best > joint) return 0.15;
    return 0.55 + (joint - best) * 0.4;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const h0 = heightAt(u, v);
      const hx = heightAt(u + 1 / size, v);
      const hy = heightAt(u, v + 1 / size);
      const dx = (hx - h0) * strength * 4;
      const dy = (hy - h0) * strength * 4;
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas);
}

