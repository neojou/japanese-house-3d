/**
 * Senmen mirror layout + plan/world contracts (no WebGL).
 */
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function load(rel) {
  return import(pathToFileURL(path.join(root, rel)).href);
}

async function main() {
  console.log("verify-senmen-mirror");
  const sm = await load("src/lib/senmenMirror.ts");
  const mm = await load("src/lib/mirrorMath.ts");
  const env = await load("src/lib/interiorEnvMap.ts");

  // Locked plan numbers (must match dimensions.ts)
  const WIDTH = 10.92;
  const SENMEN = { x0: 8.19, x1: 10.92, z0: 4.55, z1: 6.37 };
  const vanityX = (SENMEN.x0 + SENMEN.x1) / 2;

  const viewer = { x: 10.09, z: 5.65 };
  assert.ok(
    sm.isInsideAabb2(viewer.x, viewer.z, SENMEN.x0, SENMEN.x1, SENMEN.z0, SENMEN.z1),
    "owner pose must be inside 洗面",
  );
  console.log("  ✓ owner pose (10.09, 5.65) inside 洗面");

  const probe = sm.senmenProbePlanFrom(vanityX, 0.5, SENMEN.z0, SENMEN.z1);
  assert.ok(
    sm.isInsideAabb2(probe.x, probe.z, SENMEN.x0, SENMEN.x1, SENMEN.z0, SENMEN.z1),
  );
  assert.ok(probe.z < SENMEN.z1 - 0.2);
  console.log("  ✓ probe plan pose inside 洗面");

  const worldX = sm.planToWorldXAt(probe.x, WIDTH);
  assert.ok(mm.almostEqual(worldX, WIDTH - probe.x));
  assert.ok(
    !mm.almostEqual(worldX, probe.x),
    "plan X must not equal world X under plan-mirror",
  );
  assert.ok(
    Math.abs(probe.x - worldX) > 1,
    `detached CubeCamera at plan X=${probe.x} as world would miss senmen (world X=${worldX})`,
  );
  console.log("  ✓ plan≠world X; plan-as-world would miss 洗面");

  const R = sm.expectedMirrorBounceSouth();
  assert.ok(mm.vecAlmostEqual(R, [0, 0, -1]));
  console.log("  ✓ look north at north glass bounces −Z (toward UB)");

  assert.ok(viewer.z < SENMEN.z1);
  console.log("  ✓ viewer south of north wall");

  const faces = Object.values(env.INTERIOR_ENV_FACE_COLORS).flat();
  assert.ok(faces.every((c) => !sm.hexEq(c, "#7a8a6a")));
  assert.ok(sm.hexEq("#7a8a6a", "#7A8A6A"));
  console.log("  ✓ painted env is not landscape green #7a8a6a");

  console.log("verify-senmen-mirror: ALL PASS");
}

main().catch((e) => {
  console.error("verify-senmen-mirror: FAIL", e);
  process.exit(1);
});
