/**
 * Procedural surface maps for L1 façade quality (no external assets).
 * Stucco grit + yaki-sugi (charred cedar) grain / normal.
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
 * Yaki-sugi (charred cedar): dark vertical grain albedo.
 * Tile size intended ~0.9–1.2 m along grain when repeat is set in meters.
 */
export function createYakiSugiAlbedoMap(size = 512): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(2024);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      // Vertical planks
      const plank = Math.floor(u * 6);
      const plankU = u * 6 - plank;
      const seam = Math.min(plankU, 1 - plankU) < 0.04 ? 0.35 : 1;
      // Strong vertical grain
      const grain =
        fbm(plank * 3 + u * 2, v * 40, 5, cache, rand) * 0.65 +
        fbm(u * 8, v * 120, 3, cache, rand) * 0.35;
      // Char blotches
      const char = fbm(u * 6, v * 10, 3, cache, rand);
      const tone = 0.08 + grain * 0.12 + char * 0.06;
      const warm = 1 + (char - 0.5) * 0.15;
      const i = (y * size + x) * 4;
      const r = Math.min(255, (tone * 255 * 1.1 * warm + 8) * seam);
      const g = Math.min(255, (tone * 255 * 0.95 * warm + 6) * seam);
      const b = Math.min(255, (tone * 255 * 0.85 + 5) * seam);
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasToTexture(canvas, { colorSpace: THREE.SRGBColorSpace });
}

/** Vertical ridge normal for charred boards. */
export function createYakiSugiNormalMap(size = 512): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(88);
  const strength = 1.1;

  const heightAt = (u: number, v: number) => {
    const plank = Math.floor(u * 6);
    const plankU = u * 6 - plank;
    const seam = Math.min(plankU, 1 - plankU) < 0.045 ? 0.15 : 0;
    const grain = fbm(plank * 2 + u * 1.5, v * 50, 4, cache, rand);
    return grain * 0.7 + seam + fbm(u * 10, v * 80, 2, cache, rand) * 0.2;
  };

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

export function createYakiSugiRoughnessMap(size = 256): THREE.CanvasTexture {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const cache = new Map<string, number>();
  const rand = mulberry32(11);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbm(u * 8, v * 30, 3, cache, rand);
      // Charred wood: mostly matte, slight variation
      const r = 0.78 + n * 0.18;
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
