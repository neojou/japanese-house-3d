import type { WebGLRenderer, WebGLRenderTarget, Scene, Fog, FogExp2 } from "three";
import * as THREE from "three";

export type OffscreenSnapshot = {
  prevRt: THREE.WebGLRenderTarget | null;
  prevXr: boolean;
  prevShadowAuto: boolean;
  prevAutoClear: boolean;
  prevFog: Scene["fog"];
  clearColor: THREE.Color;
  clearAlpha: number;
  viewport: THREE.Vector4;
};

const _clear = new THREE.Color();
const _viewport = new THREE.Vector4();

/**
 * True if a captured viewport can safely be re-applied.
 * Zero-size viewports were a prime suspect for "full canvas black from boot"
 * when restore ran after an early-frame offscreen pass.
 */
export function isViewportSnapshotValid(v: {
  z: number;
  w: number;
}): boolean {
  return (
    Number.isFinite(v.z) &&
    Number.isFinite(v.w) &&
    v.z >= 1 &&
    v.w >= 1
  );
}

/**
 * Capture WebGL / scene bits that secondary FBO passes must restore.
 */
export function snapshotOffscreenState(
  gl: WebGLRenderer,
  scene: Scene,
): OffscreenSnapshot {
  gl.getClearColor(_clear);
  gl.getViewport(_viewport);
  return {
    prevRt: gl.getRenderTarget() as WebGLRenderTarget | null,
    prevXr: gl.xr.enabled,
    prevShadowAuto: gl.shadowMap.autoUpdate,
    prevAutoClear: gl.autoClear,
    prevFog: scene.fog,
    clearColor: _clear.clone(),
    clearAlpha: gl.getClearAlpha(),
    viewport: _viewport.clone(),
  };
}

/**
 * Restore after an offscreen pass. Always call from `finally`.
 *
 * Viewport policy (critical):
 * - Never apply a 0×0 snapshot (would black the main canvas permanently).
 * - When returning to the default framebuffer (prevRt === null), prefer
 *   drawing-buffer size if the snapshot is invalid.
 * - When prevRt was non-null, only re-apply snapshot viewport if valid.
 */
export function restoreOffscreenState(
  gl: WebGLRenderer,
  scene: Scene,
  snap: OffscreenSnapshot,
): void {
  scene.fog = snap.prevFog as Fog | FogExp2 | null;
  gl.xr.enabled = snap.prevXr;
  gl.shadowMap.autoUpdate = snap.prevShadowAuto;
  gl.autoClear = snap.prevAutoClear;
  gl.setClearColor(snap.clearColor, snap.clearAlpha);
  gl.setRenderTarget(snap.prevRt);

  if (isViewportSnapshotValid(snap.viewport)) {
    gl.setViewport(
      snap.viewport.x,
      snap.viewport.y,
      snap.viewport.z,
      snap.viewport.w,
    );
  } else if (snap.prevRt === null) {
    // Fallback: full drawing buffer (never 0×0)
    const w = Math.max(1, gl.domElement.width || gl.domElement.clientWidth || 1);
    const h = Math.max(1, gl.domElement.height || gl.domElement.clientHeight || 1);
    gl.setViewport(0, 0, w, h);
  }
  // else: leave RT's own viewport as set by setRenderTarget(prevRt)
}

export type OffscreenRenderOptions = {
  clearColor?: number;
  clearAlpha?: number;
  disableFog?: boolean;
};

/**
 * Canvas is large enough that an offscreen pass is unlikely to snapshot a
 * degenerate main viewport.
 */
export function isMainFramebufferReady(gl: WebGLRenderer): boolean {
  const w = gl.domElement.width || gl.domElement.clientWidth;
  const h = gl.domElement.height || gl.domElement.clientHeight;
  return w >= 2 && h >= 2;
}

/**
 * Run `draw` while bound to `fbo`, then always restore main framebuffer state.
 */
export function withOffscreenRender(
  gl: WebGLRenderer,
  scene: Scene,
  fbo: WebGLRenderTarget,
  draw: () => void,
  options: OffscreenRenderOptions = {},
): void {
  const {
    clearColor = 0x000000,
    clearAlpha = 1,
    disableFog = true,
  } = options;

  const snap = snapshotOffscreenState(gl, scene);
  try {
    if (disableFog) scene.fog = null;
    gl.xr.enabled = false;
    gl.shadowMap.autoUpdate = false;
    gl.autoClear = true;
    gl.setRenderTarget(fbo);
    gl.setClearColor(clearColor, clearAlpha);
    gl.clear(true, true, true);
    draw();
  } finally {
    restoreOffscreenState(gl, scene, snap);
  }
}
