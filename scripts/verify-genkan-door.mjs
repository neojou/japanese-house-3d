/**
 * Hero genkan-door.glb: names, hinge extras, does not replace house.glb.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const glbPath = path.join(root, "public", "models", "hero", "genkan-door.glb");

function parseGlbJson(buf) {
  assert.equal(buf.readUInt32LE(0), 0x46546c67, "glb magic");
  const jsonLen = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
}

async function main() {
  console.log("verify-genkan-door");
  assert.ok(existsSync(glbPath), `missing ${glbPath} — npm run bake:genkan-door`);
  const json = parseGlbJson(readFileSync(glbPath));
  const names = (json.nodes ?? []).map((n) => n.name).filter(Boolean);
  const joined = names.join("\n");
  assert.match(joined, /Hero_GenkanDoor/);
  assert.match(joined, /Hero_GenkanFrame/);
  assert.ok(!names.includes("House"), "hero glb must not be the full house");
  const src = readFileSync(
    path.join(root, "src/components/house/GenkanEntry.tsx"),
    "utf8",
  );
  assert.match(src, /GenkanDoorHero/);
  assert.match(src, /toggleDoor\("genkan"\)/);
  const overlay = readFileSync(
    path.join(root, "src/components/house/GenkanDoorHero.tsx"),
    "utf8",
  );
  assert.match(overlay, /MeshPhysicalMaterial|enhanceMaterials/);
  assert.match(overlay, /models\/hero\/genkan-door\.glb/);
  const entry = readFileSync(
    path.join(root, "src/components/house/GenkanEntry.tsx"),
    "utf8",
  );
  assert.match(entry, /hingeX = g\.x0/);
  assert.doesNotMatch(entry, /createYakiSugiMaterial/);
  assert.match(joined, /Hero_GenkanHandle|Handle/);
  console.log(`  ✓ ${names.length} nodes, overlay + store door`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
