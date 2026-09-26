/**
 * 1F senmen Piara-inspired vanity: GLB names, 2F hinoki reuse, CubeCamera glass.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const glbPath = path.join(root, "public", "models", "hero", "senmen-piara.glb");

function parseGlbJson(buf) {
  assert.equal(buf.readUInt32LE(0), 0x46546c67, "glb magic");
  const jsonLen = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
}

function main() {
  console.log("verify-senmen-piara");
  assert.ok(existsSync(glbPath), `missing ${glbPath} — npm run bake:senmen-piara`);
  const json = parseGlbJson(readFileSync(glbPath));
  const names = (json.nodes ?? []).map((n) => n.name).filter(Boolean);
  const joined = names.join("\n");
  for (const id of [
    "Hero_SenmenPiara",
    "Hero_PiaraBowl",
    "Hero_PiaraFaucet_spout",
    "Hero_PiaraMixer",
    "Drawer_L0",
    "Drawer_L1",
    "CabDoor_R",
    "MirrorDoor_L",
    "MirrorDoor_C",
    "MirrorDoor_R",
    "Mirror_LED",
    "CabDoor_R_cup",
  ]) {
    assert.match(joined, new RegExp(id));
  }
  assert.doesNotMatch(joined, /LIXIL|ピアラ/);
  console.log(`  ✓ ${names.length} nodes, no LIXIL / ピアラ names`);

  const dims = readFileSync(path.join(root, "src/data/dimensions.ts"), "utf8");
  assert.match(dims, /senmen-piara\.glb/);
  assert.match(dims, /w: 0\.75/);
  assert.match(dims, /d: 0\.5/);
  assert.match(dims, /bowlH: 0\.80/);
  assert.match(dims, /totalH: 1\.90/);
  assert.match(dims, /mirrorD: 0\.158/);
  // 2F wash still uses the hinoki vessel cabinet numbers.
  assert.match(dims, /w: 0\.56/);
  assert.match(dims, /d: 0\.38/);
  assert.match(dims, /h: 0\.72/);
  console.log("  ✓ piara block; vanity 0.56×0.38×0.72 kept for 2F");

  const ui = readFileSync(
    path.join(root, "src/components/house/SenmenDisplay.tsx"),
    "utf8",
  );
  assert.match(ui, /SenmenPiara/);
  assert.doesNotMatch(ui, /SenmenVanity/);
  assert.doesNotMatch(ui, /useFBO|withOffscreenRender/);
  const hero = readFileSync(
    path.join(root, "src/components/house/SenmenPiara.tsx"),
    "utf8",
  );
  assert.match(hero, /useGLTF/);
  assert.match(hero, /CubeCamera/);
  assert.match(hero, /createInteriorCubeEnv/);
  assert.match(hero, /primitive object=\{cubeCam\}/);
  assert.match(hero, /Drawer_L/);
  assert.match(hero, /MirrorDoor_/);
  assert.match(hero, /do not overwrite with world/);
  const wash = readFileSync(
    path.join(root, "src/components/house/Wash2FDisplay.tsx"),
    "utf8",
  );
  assert.match(wash, /SenmenVanity/);
  assert.doesNotMatch(wash, /SenmenPiara/);
  console.log("  ✓ 1F Piara loader + CubeCamera; 2F still hinoki SenmenVanity");
}

main();
