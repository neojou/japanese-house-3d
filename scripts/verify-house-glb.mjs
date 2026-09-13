/**
 * house.glb contracts: hierarchy names, door ids, envelope vs dimensions.ts.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const glbPath = path.join(
  root,
  "public",
  "models",
  "archive",
  "house-full-box-bevel.glb",
);

function parseGlbJson(buf) {
  assert.equal(buf.readUInt32LE(0), 0x46546c67, "glb magic");
  const jsonLen = buf.readUInt32LE(12);
  const jsonType = buf.readUInt32LE(16);
  assert.equal(jsonType, 0x4e4f534a, "JSON chunk");
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
}

function collectNames(json) {
  return (json.nodes ?? []).map((n) => n.name).filter(Boolean);
}

async function main() {
  console.log("verify-house-glb");
  assert.ok(
    existsSync(glbPath),
    `missing archived ${glbPath} — run FORCE_HOUSE_BAKE=1 npm run bake:house`,
  );
  const json = parseGlbJson(readFileSync(glbPath));
  const names = collectNames(json);
  const joined = names.join("\n");
  assert.ok(names.includes("House"), "root House");
  assert.ok(names.includes("Floor_1F"));
  assert.ok(names.includes("Floor_2F"));
  assert.ok(names.includes("Floor_PH"));
  assert.ok(names.includes("Walls_1F"));
  assert.ok(names.includes("Stair_1F_to_2F"));
  assert.ok(names.includes("Stair_2F_to_PH"));
  assert.ok(names.includes("Genkan"));
  assert.match(joined, /Door_1F_swing-yoshitsu/);
  assert.match(joined, /Door_2F_swing-2f-toilet/);
  assert.match(joined, /Door_PH_swing-ph-balcony/);
  assert.match(joined, /Door_1F_genkan/);
  assert.match(joined, /DoorFrame_1F_swing-ldk-genkan/);
  const archiveDoors = [
    "Door_1F_swing-yoshitsu",
    "Door_2F_swing-2f-toilet",
    "Door_2F_swing-2f-ne",
    "Door_PH_swing-ph-balcony",
  ];
  for (const n of archiveDoors) {
    assert.ok(names.includes(n), `missing ${n}`);
  }
  const extras = (json.nodes ?? [])
    .map((n) => n.extras)
    .filter((e) => e && e.doorId);
  assert.ok(extras.length >= 8, "door extras");
  assert.ok(
    extras.some((e) => e.kind === "swing"),
    "swing door extras",
  );
  console.log(`  ✓ ${names.length} nodes, ${extras.length} door extras`);

  const src = readFileSync(
    path.join(root, "src/components/house/HouseGltf.tsx"),
    "utf8",
  );
  assert.match(src, /useGLTF/);
  assert.match(src, /toggleDoor/);
  const house = readFileSync(
    path.join(root, "src/components/house/index.tsx"),
    "utf8",
  );
  assert.match(house, /useGltfHouse/);
  assert.match(house, /HouseGltf/);
  const flag = readFileSync(
    path.join(root, "src/lib/houseGltfFlag.ts"),
    "utf8",
  );
  assert.match(flag, /houseGltf/);
  assert.match(flag, /return false/);
  console.log("  ✓ archived full-house GLB; Vite default is R3F");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
