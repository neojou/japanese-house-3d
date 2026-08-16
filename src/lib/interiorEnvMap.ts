/**
 * Static indoor cube env for vanity glass.
 *
 * Product constraint (Architecture.md / docs/mirror-improve.md):
 * per-frame `gl.render` into an FBO blacks the main canvas.
 * This map is painted on 2D canvases only — no WebGL offscreen pass.
 *
 * Faces are warm plaster / wood floor (senmen-ish), not city HDR.
 */
import * as THREE from "three";

function face(
  size: number,
  top: string,
  bottom: string,
  accent?: string,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  if (accent) {
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(size * 0.15, size * 0.2, size * 0.7, size * 0.55);
    ctx.globalAlpha = 1;
  }
  return c;
}

let cached: THREE.CubeTexture | null = null;

/** Six faces: +X −X +Y −Y +Z −Z */
export const INTERIOR_ENV_FACE_COLORS = {
  px: ["#e8e2d8", "#dcd4c8"],
  nx: ["#e4ddd2", "#d8d0c4"],
  py: ["#f6f2ec", "#eee8e0"],
  ny: ["#c8b090", "#a89070"],
  pz: ["#ebe6dc", "#dfd8ce"],
  nz: ["#e6e0d6", "#dad4ca"],
} as const;

export function createInteriorCubeEnv(size = 128): THREE.CubeTexture {
  if (cached) return cached;
  const f = INTERIOR_ENV_FACE_COLORS;
  const images = [
    face(size, f.px[0], f.px[1], "#c4a882"),
    face(size, f.nx[0], f.nx[1], "#c4a882"),
    face(size, f.py[0], f.py[1]),
    face(size, f.ny[0], f.ny[1]),
    face(size, f.pz[0], f.pz[1], "#b8a090"),
    face(size, f.nz[0], f.nz[1], "#b8a090"),
  ];
  const tex = new THREE.CubeTexture(images);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  cached = tex;
  return tex;
}
