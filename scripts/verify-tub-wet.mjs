/**
 * UB tub water / plug contracts (no WebGL).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  console.log("verify-tub-wet");
  const tw = await import(pathToFileURL(path.join(root, "src/lib/tubWater.ts")).href);
  const dims = readFileSync(path.join(root, "src/data/dimensions.ts"), "utf8");
  const src = readFileSync(path.join(root, "src/components/house/TubDisplay.tsx"), "utf8");

  const fillRate = Number(dims.match(/fillRate:\s*([0-9.]+)/)?.[1]);
  const drainRate = Number(dims.match(/drainRate:\s*([0-9.]+)/)?.[1]);
  const spreadRate = Number(dims.match(/spreadRate:\s*([0-9.]+)/)?.[1]);
  const dryRate = Number(dims.match(/dryRate:\s*([0-9.]+)/)?.[1]);
  assert.equal(fillRate, tw.TUB_WATER.fillRate);
  assert.equal(drainRate, tw.TUB_WATER.drainRate);
  assert.equal(spreadRate, tw.TUB_WATER.spreadRate);
  assert.equal(dryRate, tw.TUB_WATER.dryRate);
  console.log("  ✓ dimensions water rates match TUB_WATER");

  let fill = 0;
  fill = tw.stepTubFill(fill, 1, true, false);
  assert.equal(fill, 0, "plugged + faucet off holds empty");
  fill = tw.stepTubFill(0, 2, true, true);
  assert.ok(fill > 0.2 && fill < 0.3, `fill 2s ≈ 0.24, got ${fill}`);
  fill = tw.stepTubFill(1, 1, false, true);
  assert.ok(fill < 0.75, "unplugged drains even if faucet is on");
  fill = tw.stepTubFill(0.1, 2, false, false);
  assert.equal(fill, 0, "drain clamps at 0");
  fill = tw.stepTubFill(0.95, 2, true, true);
  assert.equal(fill, 1, "fill clamps at 1");
  console.log("  ✓ fill: hold / rise / drain-through / clamps");

  assert.ok(Math.abs(tw.waterSurfaceY(0, 1, 2) - 1) < 1e-9);
  assert.ok(Math.abs(tw.waterSurfaceY(1, 1, 2) - 2) < 1e-9);
  console.log("  ✓ surface Y interpolates floor → brim");

  assert.match(src, /interactable:\s*"faucet"/);
  assert.match(src, /interactable:\s*"plug"/);
  assert.match(src, /stepTubFill/);
  assert.match(src, /tub-plug/);
  assert.match(src, /tub-runoff/);
  assert.match(src, /runoffVisible/);
  assert.match(src, /stepFloorWet/);
  assert.match(src, /tub-spill/);
  assert.match(src, /cylinderGeometry/);
  console.log("  ✓ TubDisplay: click faucet + lift-out plug");

  assert.equal(tw.isTubSpilling(1, true, true), true);
  assert.equal(tw.isTubSpilling(0.5, true, true), false);
  let wet = { front: 0, moisture: 0 };
  wet = tw.stepFloorWet(wet, 2, 1, true, true);
  assert.ok(wet.front > 0.1 && wet.moisture > 0.1, "spill grows front + moisture");
  const frontAtStop = wet.front;
  wet = tw.stepFloorWet(wet, 2, 1, true, false);
  assert.ok(wet.moisture < 1, "faucet off: moisture fades");
  assert.equal(wet.front, frontAtStop, "drying does not shrink the wet front");
  wet = tw.stepFloorWet({ front: 0.8, moisture: 0.00001 }, 1, 0, false, false);
  assert.equal(wet.front, 0, "fully dry resets front");
  wet = tw.stepFloorWet({ front: 0.4, moisture: 0.4 }, 1, 0.5, true, true);
  assert.equal(wet.front, 0.4, "filling but not full: no new spill");
  const near = tw.ellipseOutside(10.41 - 0.4, 3.64, 10.41, 3.64, 0.365, 0.75);
  const far = tw.ellipseOutside(10.41 - 1.2, 3.64, 10.41, 3.64, 0.365, 0.75);
  assert.ok(near < far, "near the tub is less 'outside' than far");
  assert.ok(tw.wetnessAt(near, 0.5) >= tw.wetnessAt(far, 0.5));
  console.log("  ✓ overflow: near-first wet; uniform dry (front holds)");

  assert.equal(tw.runoffVisible(true, false, 0), true, "tap on, plug out → rivulet");
  assert.equal(tw.runoffVisible(false, false, 0), false, "tap off → no rivulet");
  assert.equal(tw.runoffVisible(true, true, 0.5), false, "filling pool hides floor rivulet");
  assert.equal(tw.runoffVisible(true, true, 0.02), true, "just starting to fill still shows film");
  const [x0] = tw.lerp3(0, 0, 0, 10, 0, 0, 0.4);
  assert.ok(Math.abs(x0 - 4) < 1e-9);
  const strip = tw.buildRunoffStrip(0, 1, 0, 0, 1, 2, 0.04, 0.01, 8, 0);
  assert.ok(strip.positions.length >= 18);
  assert.ok(strip.indices.length === 8 * 6);
  console.log("  ✓ runoff: visible when tap hits a draining floor; strip mesh");

  console.log("verify-tub-wet: ALL PASS");
}

main().catch((e) => {
  console.error("verify-tub-wet: FAIL", e);
  process.exit(1);
});
