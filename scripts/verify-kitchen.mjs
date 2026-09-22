/**
 * Noct wall-I kitchen: GLB names, fin wall, no west-wall fridge stack.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const glbPath = path.join(root, "public", "models", "hero", "kitchen-noct.glb");

function parseGlbJson(buf) {
  assert.equal(buf.readUInt32LE(0), 0x46546c67, "glb magic");
  const jsonLen = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
}

function main() {
  console.log("verify-kitchen");
  assert.ok(existsSync(glbPath), `missing ${glbPath} — npm run bake:kitchen`);
  const json = parseGlbJson(readFileSync(glbPath));
  const names = (json.nodes ?? []).map((n) => n.name).filter(Boolean);
  const joined = names.join("\n");
  for (const id of [
    "Hero_KitchenNoct",
    "Hero_KitchenSink",
    "Hero_KitchenIH",
    "Hero_KitchenHood",
    "Hero_KitchenFaucet_spout",
    "Hero_KitchenDW",
    "Drawer_Sink_0",
    "Drawer_Sink_1",
  ]) {
    assert.match(joined, new RegExp(id));
  }
  console.log(`  ✓ ${names.length} nodes`);

  const dims = readFileSync(path.join(root, "src/data/dimensions.ts"), "utf8");
  assert.match(dims, /1f-int-ldk-kitchen-fin/);
  assert.match(dims, /kitchen-noct\.glb/);
  assert.match(dims, /height: 0\.85/);
  assert.match(dims, /finLen: 0\.75/);
  assert.doesNotMatch(dims, /tallCab:/);
  const ui = readFileSync(
    path.join(root, "src/components/house/KitchenDisplay.tsx"),
    "utf8",
  );
  assert.match(ui, /useGLTF/);
  assert.match(ui, /Drawer_Sink_/);
  assert.doesNotMatch(ui, /fridge/);
  console.log("  ✓ fin wall + loader, west-wall stack removed");
}

main();
