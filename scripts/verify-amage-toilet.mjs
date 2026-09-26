/**
 * Amage-inspired sit toilet: GLB names, 1F/2F shared loader, clickable lid.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const glbPath = path.join(root, "public", "models", "hero", "amage-toilet.glb");

function parseGlbJson(buf) {
  assert.equal(buf.readUInt32LE(0), 0x46546c67, "glb magic");
  const jsonLen = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
}

function main() {
  console.log("verify-amage-toilet");
  assert.ok(existsSync(glbPath), `missing ${glbPath} — npm run bake:amage-toilet`);
  const json = parseGlbJson(readFileSync(glbPath));
  const names = (json.nodes ?? []).map((n) => n.name).filter(Boolean);
  const joined = names.join("\n");
  for (const id of [
    "Hero_AmageToilet",
    "Hero_AmageBowl",
    "Hero_AmageTank",
    "Hero_AmageFaucet_spout",
    "Lid",
    "Seat",
  ]) {
    assert.match(joined, new RegExp(`^${id}$`, "m"));
  }
  assert.doesNotMatch(joined, /LIXIL|INAX|アメージュ/);
  console.log(`  ✓ ${names.length} nodes, no LIXIL / INAX / アメージュ names`);

  const dims = readFileSync(path.join(root, "src/data/dimensions.ts"), "utf8");
  assert.match(dims, /amage-toilet\.glb/);
  assert.match(dims, /depth: 0\.76/);
  assert.match(dims, /width: 0\.416/);
  assert.match(dims, /topY: 0\.80/);
  console.log("  ✓ envelope 760×416, tank rim 0.80, Path B gltf");

  const ui = readFileSync(
    path.join(root, "src/components/house/ToiletDisplay.tsx"),
    "utf8",
  );
  assert.match(ui, /AmageToilet/);
  assert.match(ui, /Toilet2FDisplay/);
  assert.doesNotMatch(ui, /makeBowlLathe/);
  const hero = readFileSync(
    path.join(root, "src/components/house/AmageToilet.tsx"),
    "utf8",
  );
  assert.match(hero, /useGLTF/);
  assert.match(hero, /getObjectByName\("Lid"\)/);
  assert.match(hero, /lidOpenRad/);
  console.log("  ✓ 1F/2F loader + clickable Lid/Seat");
}

main();
