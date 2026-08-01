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

