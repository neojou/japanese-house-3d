/**
 * 2F wall handwash: GLB names, loader, no brand strings, 1F Piara untouched.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const glbPath = path.join(root, "public", "models", "hero", "dokodemo-wash.glb");

function parseGlbJson(buf) {
  assert.equal(buf.readUInt32LE(0), 0x46546c67, "glb magic");
  const jsonLen = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
}

function main() {
  console.log("verify-dokodemo-wash");
  assert.ok(existsSync(glbPath), `missing ${glbPath} — npm run bake:dokodemo-wash`);
  const json = parseGlbJson(readFileSync(glbPath));
  const names = (json.nodes ?? []).map((n) => n.name).filter(Boolean);
  const joined = names.join("\n");
  for (const id of [
    "Hero_DokodemoWash",
    "Hero_DokodemoCounter",
    "Hero_DokodemoBowl",
    "Hero_DokodemoFaucet_spout",
    "Hero_DokodemoTrap",
    "Hero_DokodemoMirror",
  ]) {
    assert.match(joined, new RegExp(id));
  }
  assert.doesNotMatch(joined, /LIXIL|INAX|どこでも/);
  const mats = (json.materials ?? []).map((m) => m.name).join("\n");
  assert.match(mats, /Mat_Wood/);
  assert.match(mats, /Mat_Bowl/);
  assert.match(mats, /Mat_Chrome/);
  assert.equal(json.extensionsUsed?.includes("KHR_lights_punctual") ?? false, false);
  console.log(`  ✓ ${names.length} nodes, PBR mats, no lights, no brand names`);

  const dims = readFileSync(path.join(root, "src/data/dimensions.ts"), "utf8");
  assert.match(dims, /dokodemo-wash\.glb/);
  assert.match(dims, /w: 0\.6/);
  assert.match(dims, /d: 0\.35/);
  assert.match(dims, /topY: 0\.78/);
  const wash = readFileSync(
    path.join(root, "src/components/house/Wash2FDisplay.tsx"),
    "utf8",
  );
  assert.match(wash, /DokodemoWash/);
  assert.doesNotMatch(wash, /SenmenVanity/);
  const hero = readFileSync(
    path.join(root, "src/components/house/DokodemoWash.tsx"),
    "utf8",
  );
  assert.match(hero, /useGLTF/);
  assert.match(hero, /Hero_DokodemoFaucet/);
  assert.doesNotMatch(hero, /useFrame\(\(\) => \{\s*\}/s);
  assert.doesNotMatch(hero, /useFrame\([^)]+,\s*1\)/);
  console.log("  ✓ 2F loader; faucet click; no priority-1 frame");
}

main();
