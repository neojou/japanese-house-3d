/**
 * Phase A: pure mirror math + viewport restore contracts.
 * Run: node scripts/verify-mirror-math.mjs
 */

import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

async function load(rel) {
  const p = path.join(root, rel);
  return import(pathToFileURL(p).href);
}

function testRestoreNeverAppliesZeroViewport() {
  /** @type {number[][]} */
  const applied = [];
  const fakeGl = {
    xr: { enabled: false },
    shadowMap: { autoUpdate: true },
    autoClear: true,
    domElement: { width: 1280, height: 720, clientWidth: 1280, clientHeight: 720 },
    getRenderTarget: () => null,
    getClearColor: (c) => {
      c.r = 0.1;
      c.g = 0.2;
      c.b = 0.3;
    },
    getClearAlpha: () => 1,
    getViewport: (v) => {
      v.x = 0;
      v.y = 0;
      v.z = 0;
      v.w = 0;
    },
    setClearColor: () => {},
    setRenderTarget: () => {},
    setViewport: (x, y, z, w) => {
      applied.push([x, y, z, w]);
    },
    clear: () => {},
  };

  return { fakeGl, applied };
}

async function main() {
  console.log("verify-mirror-math");

  const m = await load("src/lib/mirrorMath.ts");
  const off = await load("src/lib/glOffscreen.ts");

  // --- reflect point ---
  {
    const r = m.reflectPointAcrossPlane([0, 0, 2], [0, 0, 0], [0, 0, 1]);
    assert.ok(m.vecAlmostEqual(r, [0, 0, -2]), `reflect point ${r}`);
    console.log("  ✓ reflectPointAcrossPlane");
  }

  // --- senmen-like plane: normal into room (-Z), cam south ---
  {
    const M = /** @type {const} */ ([9.5, 2.0, 6.2]);
    const n = /** @type {const} */ ([0, 0, -1]);
    const cam = /** @type {const} */ ([9.5, 2.0, 4.0]);
    const faced = m.facingNormal(M, n, cam);
    assert.ok(m.vecAlmostEqual(faced, [0, 0, -1]));
    const vCam = m.reflectCameraPosition(cam, M, n);
    // distance to plane = 2.2 along Z; virtual should be 6.2+2.2=8.4
    assert.ok(m.vecAlmostEqual(vCam, [9.5, 2.0, 8.4]), `vCam ${vCam}`);
    const near = m.nearPlaneForMirror(vCam, M);
    assert.ok(near > 2.0 && near < 2.3, `near ${near}`);
    console.log("  ✓ senmen-like camera reflect + near");
  }

  // --- wrong normal flips ---
  {
    const faced = m.facingNormal([0, 0, 5], [0, 0, 1], [0, 0, 3]);
    assert.ok(m.vecAlmostEqual(faced, [0, 0, -1]));
    console.log("  ✓ facingNormal flip");
  }

  // --- viewport validity ---
  {
    assert.equal(off.isViewportSnapshotValid({ z: 0, w: 0 }), false);
    assert.equal(off.isViewportSnapshotValid({ z: 100, w: 0 }), false);
    assert.equal(off.isViewportSnapshotValid({ z: 800, w: 600 }), true);
    console.log("  ✓ isViewportSnapshotValid");
  }

  // --- restore must not keep 0×0 when snapshot is degenerate ---
  {
    const { fakeGl, applied } = testRestoreNeverAppliesZeroViewport();
    const snap = off.snapshotOffscreenState(fakeGl, { fog: null });
    assert.equal(off.isViewportSnapshotValid(snap.viewport), false);
    // Simulate after FBO: restore
    off.restoreOffscreenState(fakeGl, { fog: null }, snap);
    assert.ok(applied.length >= 1, "setViewport called");
    const last = applied[applied.length - 1];
    assert.ok(last[2] >= 1 && last[3] >= 1, `viewport not zero: ${last}`);
    assert.deepEqual(last, [0, 0, 1280, 720]);
    console.log("  ✓ restore replaces 0×0 with drawing buffer size");
  }

  // --- withOffscreenRender restores RT even on throw ---
  {
    let target = "MAIN";
    const fakeGl = {
      xr: { enabled: false },
      shadowMap: { autoUpdate: true },
      autoClear: true,
      domElement: { width: 100, height: 100, clientWidth: 100, clientHeight: 100 },
      getRenderTarget: () => target,
      getClearColor: (c) => c.setRGB(1, 1, 1),
      getClearAlpha: () => 1,
      getViewport: (v) => v.set(0, 0, 100, 100),
      setClearColor: () => {},
      setRenderTarget: (rt) => {
        target = rt === null || rt === undefined ? "MAIN" : rt;
      },
      setViewport: () => {},
      clear: () => {},
    };
    let threw = false;
    try {
      off.withOffscreenRender(fakeGl, { fog: null }, "FBO", () => {
        throw new Error("boom");
      });
    } catch {
      threw = true;
    }
    assert.equal(threw, true);
    assert.equal(target, "MAIN");
    console.log("  ✓ withOffscreenRender restores RT after throw");
  }

  console.log("verify-mirror-math: ALL PASS");
}

main().catch((e) => {
  console.error("verify-mirror-math: FAIL", e);
  process.exit(1);
});
