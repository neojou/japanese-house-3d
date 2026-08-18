/**
 * Path B basin contracts (no WebGL).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadTs(rel) {
  return import(pathToFileURL(path.join(root, rel)).href);
}

function extractVesselBlock(src) {
  const m = src.match(/vessel:\s*\{([\s\S]*?)\n    \},/);
  assert.ok(m, "dimensions.ts vanity.vessel block");
  return m[1];
}

function num(block, key) {
  const m = block.match(new RegExp(`${key}:\\s*([0-9.]+)`));
  assert.ok(m, `vessel.${key} in dimensions.ts`);
  return Number(m[1]);
}

async function main() {
  console.log("verify-senmen-basin");
  const vb = await loadTs("src/lib/vesselBasin.ts");
  const spec = vb.SENMEN_VESSEL_SPEC;
  const dims = readFileSync(path.join(root, "src/data/dimensions.ts"), "utf8");
  const block = extractVesselBlock(dims);

  for (const key of ["w", "d", "h", "innerDepth", "wall", "rim", "outerR", "innerR", "floorR"]) {
    assert.equal(num(block, key), spec[key], `dimensions vessel.${key} must match SENMEN_VESSEL_SPEC`);
  }
  assert.match(block, /gltf:\s*"props\/senmen-basin\/basin\.glb"/);
  console.log("  ✓ dimensions.ts vessel matches SENMEN_VESSEL_SPEC");

  const vanityBlock = dims.match(/vanity:\s*\{([\s\S]*?)\n    vessel:/);
  assert.ok(vanityBlock, "vanity block");
  const vw = vanityBlock[1].match(/\bw:\s*([0-9.]+)/);
  const vd = vanityBlock[1].match(/\bd:\s*([0-9.]+)/);
  assert.ok(vw && vd);
  assert.equal(Number(vw[1]), spec.w, "cabinet W must equal vessel W");
  assert.equal(Number(vd[1]), spec.d, "cabinet D must equal vessel D");
  console.log("  ✓ cabinet W×D flush with vessel");

  assert.ok(vb.profileMonotonic(), "drop profile must be monotonic");
  assert.ok(vb.profileDrop(1) * spec.innerDepth >= 0.04, "profile depth ≥ 4 cm");
  assert.ok(vb.profileDrop(0) < 0.02, "rim drop near 0");
  const mid = vb.profileDrop(0.35);
  assert.ok(mid > vb.profileDrop(0.08) && mid < vb.profileDrop(0.9), "shoulder between rim and floor");
  console.log("  ✓ inner profile: level rim, monotonic drop, deep floor");

  const built = vb.buildVesselBasin(spec);
  const measure = vb.measureBasin(built);
  assert.ok(measure.depth >= 0.04, `mesh depth ${measure.depth}`);
  assert.ok(measure.rimSpread < 0.003, `rim spread ${measure.rimSpread}`);
  assert.ok(measure.floorY < measure.rimY - 0.04);
  const names = built.meshes.map((m) => m.name).sort();
  assert.deepEqual(names, [
    "basin-inner",
    "basin-liner",
    "basin-outer",
    "basin-rim",
    "basin-well",
  ]);
  for (const m of built.meshes) {
    assert.ok(m.positions.length >= 9, m.name);
    assert.equal(m.positions.length, m.normals.length);
    assert.ok(m.indices.length >= 3);
  }
  console.log(
    `  ✓ mesh bowl depth=${measure.depth.toFixed(4)} m, rimSpread=${measure.rimSpread.toFixed(5)}`,
  );

  const glb = path.join(root, "public/props/senmen-basin/basin.glb");
  assert.ok(existsSync(glb), "public/props/senmen-basin/basin.glb must exist — run npm run bake:senmen-basin");
  const buf = readFileSync(glb);
  assert.ok(buf.byteLength > 800, "glb too small");
  assert.equal(buf.toString("ascii", 0, 4), "glTF");
  const version = buf.readUInt32LE(4);
  assert.equal(version, 2);
  console.log(`  ✓ basin.glb glTF2 (${buf.byteLength} bytes)`);

  const vanity = readFileSync(path.join(root, "src/components/house/SenmenVanity.tsx"), "utf8");
  assert.match(vanity, /useGLTF/);
  assert.match(vanity, /vessel\.gltf|senmen-basin|basin\.glb/);
  assert.doesNotMatch(vanity, /geoInner/);
  assert.match(vanity, /interactable:\s*"door"/);
  assert.match(vanity, /interactable:\s*"faucet"/);
  assert.match(vanity, /senmen-waste/);
  assert.match(vanity, /DoubleSide/);
  assert.match(vanity, /setOn/);
  // West leafDir=+1 then openSign=+1; east leafDir=-1 then openSign=-1 (swing to −Z).
  assert.match(
    vanity,
    /leafDir=\{1\}[\s\S]*?openSign=\{1\}[\s\S]*?leafDir=\{-1\}[\s\S]*?openSign=\{-1\}/,
  );
  console.log("  ✓ SenmenVanity loads glTF; opaque ceramic; click doors; waste stack");

  const pl = await loadTs("src/lib/senmenPlumbing.ts");
  const segs = pl.senmenWasteSegments(pl.SENMEN_PLUMBING);
  assert.ok(pl.wasteReachesWall(segs, spec.d / 2), "trap arm must reach cabinet back / wall");
  assert.ok(
    pl.wasteStaysInCabinet(segs, 0.72, spec.d / 2),
    "waste must fit under the basin inside the cabinet",
  );
  const dimsPlumb = dims.match(/plumbing:\s*\{([\s\S]*?)\n    \}/);
  assert.ok(dimsPlumb);
  assert.equal(num(dimsPlumb[1], "pipeR"), pl.SENMEN_PLUMBING.pipeR);
  assert.equal(num(dimsPlumb[1], "tailH"), pl.SENMEN_PLUMBING.tailH);
  console.log("  ✓ P-trap path reaches the wall and stays in the cabinet");

  console.log("verify-senmen-basin: ALL PASS");
}

main().catch((e) => {
  console.error("verify-senmen-basin: FAIL", e);
  process.exit(1);
});
