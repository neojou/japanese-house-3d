/**
 * Hero ub-bath.glb: Type-M liner names, overlay, window 1.20, push drain.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const glbPath = path.join(root, "public", "models", "hero", "ub-bath.glb");

function parseGlbJson(buf) {
  assert.equal(buf.readUInt32LE(0), 0x46546c67, "glb magic");
  const jsonLen = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
}

async function main() {
  console.log("verify-ub-bath");
  assert.ok(existsSync(glbPath), `missing ${glbPath} — npm run bake:ub-bath`);
  const json = parseGlbJson(readFileSync(glbPath));
  const names = (json.nodes ?? []).map((n) => n.name).filter(Boolean);
  const joined = names.join("\n");
  assert.match(joined, /Hero_UbBath|Hero_UbTub/);
  assert.match(joined, /Hero_UbDrainButton/);
  assert.match(joined, /Hero_UbDrainPlug/);
  assert.match(joined, /Hero_UbFaucet/);
  assert.match(joined, /Hero_UbFloor/);
  assert.match(joined, /Hero_UbGrab/);
  assert.ok(!names.includes("House"), "hero glb must not be the full house");
  console.log(`  ✓ ${names.length} nodes`);

  const dims = readFileSync(path.join(root, "src/data/dimensions.ts"), "utf8");
  assert.match(dims, /width:\s*1\.2/);
  assert.match(dims, /UB_EAST_WINDOW/);
  assert.match(dims, /kind:\s*"push-button"/);
  assert.match(dims, /innerInset:\s*0\.04/);
  assert.match(dims, /deckInset:/);
  assert.match(dims, /kind:\s*"column-shower"/);
  assert.match(dims, /models\/hero\/ub-bath\.glb/);
  assert.doesNotMatch(dims, /eastHex/);
  console.log("  ✓ dimensions: 1.20 window, push-button, Type-M gltf");

  const py = readFileSync(path.join(root, "tools/dcc/build_ub_bath.py"), "utf8");
  assert.match(py, /TUB_L = 1\.20/);
  assert.match(py, /INSET = 0\.04/);
  assert.match(py, /WIN_W = 1\.20/);
  assert.match(py, /WIN_H = 1\.20/);
  assert.match(py, /Hero_UbDrainButton/);
  assert.match(py, /Hero_UbDrainPlug/);
  console.log("  ✓ blender script locked to W1200 tub / thin rim / NW button");

  const src = readFileSync(
    path.join(root, "src/components/house/TubDisplay.tsx"),
    "utf8",
  );
  assert.match(src, /useGLTF/);
  assert.match(src, /PROP_1F_UB_TUB\.gltf|ub-bath/);
  assert.match(src, /interactable:\s*"faucet"/);
  assert.match(src, /interactable:\s*"plug"/);
  assert.doesNotMatch(src, /plugAside|west rim/);
  assert.doesNotMatch(src, /makeTubOuterLathe/);
  console.log("  ✓ TubDisplay: GLB + click faucet/button, no lift-out plug");

  const overlay = readFileSync(
    path.join(root, "src/lib/ubBathHero.ts"),
    "utf8",
  );
  assert.match(overlay, /buildUbBathMeshes/);
  assert.match(overlay, /drainButtonPlan/);
  assert.match(overlay, /drainHolePlan/);
  assert.match(overlay, /northwest/);
  console.log("verify-ub-bath: ALL PASS");
}

main().catch((err) => {
  console.error("verify-ub-bath: FAIL", err);
  process.exit(1);
});
