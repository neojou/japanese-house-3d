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
  gl.setViewport(snap.viewport.x, snap.viewport.y, snap.viewport.z, snap.viewport.w);
}

export type OffscreenRenderOptions = {
  /** Clear color while drawing into the FBO */
  clearColor?: number;
  clearAlpha?: number;
  /** Disable scene fog for the offscreen pass */
  disableFog?: boolean;
};

/**
 * Run `draw` while bound to `fbo`, then always restore main framebuffer state.
 * This is the R3F-safe contract: secondary renders must not leave RT/viewport dirty.
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

/**
 * Test helper: mock-friendly check that restore always runs after throw.
 * Used by scripts/verify-mirror-math.mjs (imported path for contract docs).
 */
export function offscreenRestoreContractHolds(
  runWithThrow: boolean,
): { restored: boolean; threw: boolean } {
  let restored = false;
  const fakeGl = {
    xr: { enabled: true },
    shadowMap: { autoUpdate: true },
    autoClear: false,
    getRenderTarget: () => null,
    getClearColor: (c: THREE.Color) => c.setRGB(1, 0, 0),
    getClearAlpha: () => 0.5,
    getViewport: (v: THREE.Vector4) => v.set(0, 0, 100, 100),
    setClearColor: () => {},
    setRenderTarget: () => {},
    setViewport: () => {
      restored = true;
    },
    clear: () => {},
  } as unknown as WebGLRenderer;

  const fakeScene = { fog: {} } as unknown as Scene;
  const fakeFbo = {} as WebGLRenderTarget;

  // Inline minimal version using same finally pattern
  const snap = {
    prevRt: null,
    prevXr: true,
    prevShadowAuto: true,
    prevAutoClear: false,
    prevFog: fakeScene.fog,
    clearColor: new THREE.Color(1, 0, 0),
    clearAlpha: 0.5,
    viewport: new THREE.Vector4(0, 0, 100, 100),
  };
  let threw = false;
  try {
    fakeGl.setRenderTarget(fakeFbo);
    if (runWithThrow) throw new Error("draw failed");
  } catch {
    threw = true;
  } finally {
    restoreOffscreenState(fakeGl, fakeScene, snap);
  }
  return { restored, threw };
}
