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

  const senmen = read("src/components/house/SenmenDisplay.tsx");
  assert.match(senmen, /SenmenMirrorGlass/);
  assert.doesNotMatch(senmen, /useFBO|withOffscreenRender/);
  console.log("  ✓ SenmenDisplay uses SenmenMirrorGlass (no planar FBO helper)");

  const glass = read("src/components/house/SenmenMirrorGlass.tsx");
  assert.match(glass, /CubeCamera/);
  assert.match(glass, /createInteriorCubeEnv/);
  assert.match(glass, /primitive object=\{cubeCam\}/);
  assert.match(glass, /do not overwrite with world/);
  console.log("  ✓ SenmenMirrorGlass CubeCamera parented in plan space");

  const layout = read("src/lib/senmenMirror.ts");
  assert.match(layout, /senmenProbePlanFrom/);
  assert.match(layout, /planToWorldXAt/);
  console.log("  ✓ senmenMirror.ts layout helpers");

  const env = read("src/lib/interiorEnvMap.ts");
  assert.match(env, /createInteriorCubeEnv/);
  console.log("  ✓ interiorEnvMap.ts");

  console.log("verify-mirror-source: ALL PASS");
}

main();
