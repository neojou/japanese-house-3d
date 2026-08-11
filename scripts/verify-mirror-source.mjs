/**
 * Source contracts for mirror reflection.
 * Run: node scripts/verify-mirror-source.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function main() {
  console.log("verify-mirror-source");

  assert.ok(fs.existsSync(path.join(root, "Architecture.md")), "Architecture.md exists");
  const arch = read("Architecture.md");
  assert.match(arch, /plan-mirror/);
  assert.match(arch, /0×0|zero|viewport/i);
  assert.match(arch, /mirrorLive/);
  console.log("  ✓ Architecture.md present with failure analysis");

  const math = read("src/lib/mirrorMath.ts");
  assert.match(math, /reflectCameraPosition/);
  assert.match(math, /nearPlaneForMirror/);
  console.log("  ✓ mirrorMath.ts");

  const off = read("src/lib/glOffscreen.ts");
  assert.match(off, /isViewportSnapshotValid/);
  assert.match(off, /withOffscreenRender/);
  assert.match(off, /drawingBuffer|domElement\.width/);
  assert.match(off, /finally/);
  console.log("  ✓ glOffscreen hardened viewport restore");

  const mirror = read("src/components/house/InteriorMirror.tsx");
  assert.match(mirror, /useFBO/);
  assert.match(mirror, /withOffscreenRender/);
  assert.match(mirror, /createPortal/);
  assert.match(mirror, /isMainFramebufferReady/);
  assert.match(mirror, /mirrorLive/);
  console.log("  ✓ InteriorMirror opt-in live path");

  const senmen = read("src/components/house/SenmenDisplay.tsx");
  assert.match(senmen, /matMirror|envMapIntensity/);
  assert.match(senmen, /isMirrorLiveEnabled/);
  assert.match(senmen, /InteriorMirror/);
  assert.match(senmen, /planToWorldX/);
  console.log("  ✓ SenmenDisplay classic + live switch");

  console.log("verify-mirror-source: ALL PASS");
}

main();
