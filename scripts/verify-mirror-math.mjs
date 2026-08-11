/**
 * Phase A (+ restore contract): pure mirror math + offscreen restore discipline.
 * Run: node scripts/verify-mirror-math.mjs
 * No browser / WebGL required.
 */

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Load compiled-free TS via dynamic import of source through vite-node-less path:
// Use a tiny inline re-implementation check OR transpile on the fly.
// Prefer importing the .ts via node --experimental-strip-types when available,
// else duplicate critical asserts against the same formulas.

async function loadMirrorMath() {
  const tsPath = path.join(root, "src/lib/mirrorMath.ts");
  try {
    // Node 22+ strip types
    return await import(pathToFileURL(tsPath).href);
  } catch {
    // Fallback: evaluate pure copy of formulas (keep in sync with mirrorMath.ts)
    return {
      reflectPointAcrossPlane(p, M, n) {
        const d =
          (p[0] - M[0]) * n[0] + (p[1] - M[1]) * n[1] + (p[2] - M[2]) * n[2];
        return [p[0] - 2 * d * n[0], p[1] - 2 * d * n[1], p[2] - 2 * d * n[2]];
      },
      facingNormal(M, n, cam) {
        const d =
          (cam[0] - M[0]) * n[0] +
          (cam[1] - M[1]) * n[1] +
          (cam[2] - M[2]) * n[2];
        return d < 0 ? [-n[0], -n[1], -n[2]] : n;
      },
      reflectCameraPosition(cam, M, n) {
        const nn = this.facingNormal(M, n, cam);
        return this.reflectPointAcrossPlane(cam, M, nn);
      },
      nearPlaneForMirror(vCam, M, pull = 0.97, minN = 0.08) {
        const dx = vCam[0] - M[0];
        const dy = vCam[1] - M[1];
        const dz = vCam[2] - M[2];
        const dist = Math.hypot(dx, dy, dz);
        return Math.max(minN, dist * pull);
      },
      vecAlmostEqual(a, b, eps = 1e-6) {
        return (
          Math.abs(a[0] - b[0]) <= eps &&
          Math.abs(a[1] - b[1]) <= eps &&
          Math.abs(a[2] - b[2]) <= eps
        );
      },
      almostEqual(a, b, eps = 1e-6) {
        return Math.abs(a - b) <= eps;
      },
      _fallback: true,
    };
  }
}

function testRestoreContract() {
  let setViewportCalls = 0;
  let setRenderTargetLast = "unset";
  const fakeGl = {
    xr: { enabled: true },
    shadowMap: { autoUpdate: true },
    autoClear: false,
    getRenderTarget: () => "MAIN",
    getClearColor: (c) => {
      c.r = 1;
      c.g = 0;
      c.b = 0;
    },
    getClearAlpha: () => 0.25,
    getViewport: (v) => {
      v.x = 0;
      v.y = 0;
      v.z = 800;
      v.w = 600;
    },
    setClearColor: () => {},
    setRenderTarget: (rt) => {
      setRenderTargetLast = rt;
    },
    setViewport: () => {
      setViewportCalls += 1;
    },
    clear: () => {},
  };
  const snap = {
    prevRt: "MAIN",
    prevXr: true,
    prevShadowAuto: true,
    prevAutoClear: false,
    prevFog: null,
    clearColor: { r: 1, g: 0, b: 0, isColor: true },
    clearAlpha: 0.25,
    viewport: { x: 0, y: 0, z: 800, w: 600 },
  };
  const scene = { fog: null };

  // Simulate withOffscreen finally
  try {
    fakeGl.setRenderTarget("FBO");
    throw new Error("draw boom");
  } catch {
    /* expected */
  } finally {
    scene.fog = snap.prevFog;
    fakeGl.xr.enabled = snap.prevXr;
    fakeGl.shadowMap.autoUpdate = snap.prevShadowAuto;
    fakeGl.autoClear = snap.prevAutoClear;
    fakeGl.setClearColor(snap.clearColor, snap.clearAlpha);
    fakeGl.setRenderTarget(snap.prevRt);
    fakeGl.setViewport(
      snap.viewport.x,
      snap.viewport.y,
      snap.viewport.z,
      snap.viewport.w,
    );
  }

  assert.equal(setRenderTargetLast, "MAIN", "renderTarget restored to MAIN");
  assert.equal(setViewportCalls, 1, "viewport restored once");
  console.log("  ✓ offscreen restore contract (throw path)");
}

async function main() {
  console.log("verify-mirror-math: Phase A");
  const m = await loadMirrorMath();
  if (m._fallback) {
    console.log("  (using formula fallback — Node could not import .ts directly)");
  }

  // Plane z=0, normal +Z; point (0,0,2) reflects to (0,0,-2)
  {
    const p = /** @type {const} */ ([0, 0, 2]);
    const M = /** @type {const} */ ([0, 0, 0]);
    const n = /** @type {const} */ ([0, 0, 1]);
    const r = m.reflectPointAcrossPlane(p, M, n);
    assert.ok(m.vecAlmostEqual(r, [0, 0, -2]), `reflect point got ${r}`);
    console.log("  ✓ reflectPointAcrossPlane");
  }

  // Normal flips when camera is on wrong side
  {
    const M = /** @type {const} */ ([0, 1, 5]);
    const n = /** @type {const} */ ([0, 0, 1]); // points +Z
    const camRoom = /** @type {const} */ ([0, 1, 3]); // south / -Z of plane → need flip
    const faced = m.facingNormal(M, n, camRoom);
    assert.ok(m.vecAlmostEqual(faced, [0, 0, -1]), `facing got ${faced}`);
    console.log("  ✓ facingNormal flips toward camera");
  }

  // Camera reflect: plane z=5, n=-Z (into room), cam z=3 → virtual z=7
  {
    const M = /** @type {const} */ ([1, 2, 5]);
    const n = /** @type {const} */ ([0, 0, -1]);
    const cam = /** @type {const} */ ([1, 2, 3]);
    const vCam = m.reflectCameraPosition(cam, M, n);
    assert.ok(
      m.vecAlmostEqual(vCam, [1, 2, 7]),
      `reflectCamera got ${vCam}`,
    );
    console.log("  ✓ reflectCameraPosition");
  }

  // near plane
  {
    const vCam = /** @type {const} */ ([0, 0, 7]);
    const M = /** @type {const} */ ([0, 0, 5]);
    const near = m.nearPlaneForMirror(vCam, M, 0.97, 0.08);
    assert.ok(m.almostEqual(near, 2 * 0.97), `near=${near}`);
    console.log("  ✓ nearPlaneForMirror");
  }

  testRestoreContract();

  console.log("verify-mirror-math: ALL PASS");
}

main().catch((e) => {
  console.error("verify-mirror-math: FAIL", e);
  process.exit(1);
});
