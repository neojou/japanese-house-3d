/**
 * Phase B contract: source must use safe offscreen helpers / finally restore.
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
  console.log("verify-mirror-source: Phase B contracts");

  const math = read("src/lib/mirrorMath.ts");
  assert.match(math, /reflectCameraPosition/, "mirrorMath exports reflectCameraPosition");
  assert.match(math, /nearPlaneForMirror/, "mirrorMath exports nearPlaneForMirror");
  console.log("  ✓ mirrorMath.ts API");

  const off = read("src/lib/glOffscreen.ts");
  assert.match(off, /withOffscreenRender/, "glOffscreen has withOffscreenRender");
  assert.match(off, /finally/, "glOffscreen uses finally");
  assert.match(off, /setRenderTarget/, "restores render target");
  assert.match(off, /setViewport/, "restores viewport");
  console.log("  ✓ glOffscreen.ts restore contract");

  // Runtime glass is classic MeshStandardMaterial (FBO path rolled back — black canvas).
  // Keep lib contracts for a future Phase B re-entry.
  const senmen = read("src/components/house/SenmenDisplay.tsx");
  assert.match(senmen, /matMirror|envMapIntensity/, "SenmenDisplay has classic mirror material");
  assert.doesNotMatch(
    senmen,
    /useFBO|withOffscreenRender/,
    "SenmenDisplay must not run offscreen FBO (full-canvas black regression)",
  );
  console.log("  ✓ SenmenDisplay classic mirror (no FBO)");

  console.log("verify-mirror-source: ALL PASS");
}

main();
