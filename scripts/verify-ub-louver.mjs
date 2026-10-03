/**
 * 1F UB 目隠し可動ルーバー: GLB names, opening, skip generic pane, click wiring.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const glbPath = path.join(root, "public", "models", "hero", "ub-louver.glb");

function parseGlbJson(buf) {
  assert.equal(buf.readUInt32LE(0), 0x46546c67, "glb magic");
  const jsonLen = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
}

function main() {
  console.log("verify-ub-louver");
  assert.ok(existsSync(glbPath), `missing ${glbPath} — npm run bake:ub-louver`);
  const json = parseGlbJson(readFileSync(glbPath));
  const names = (json.nodes ?? []).map((n) => n.name).filter(Boolean);
  const joined = names.join("\n");
  assert.match(joined, /Hero_UbLouver/);
  assert.match(joined, /Frame_South/);
  assert.match(joined, /Sash_Mullion/);
  assert.match(joined, /Glass_N/);
  assert.match(joined, /Operator_Slider/);
  for (let i = 0; i < 16; i++) {
    const id = `Blade_${String(i).padStart(2, "0")}`;
    assert.ok(names.includes(id), id);
  }
  const dump = JSON.stringify(json);
  assert.doesNotMatch(dump, /LIXIL|TOSTEM|リクシル/i);
  console.log(`  ✓ ${names.length} nodes, 16 blades`);

  const dims = readFileSync(path.join(root, "src/data/dimensions.ts"), "utf8");
  assert.match(dims, /PROP_1F_UB_LOUVER/);
  assert.match(dims, /bladeCount:\s*16/);
  assert.match(dims, /openingId:\s*"1f-win-ub-e"/);
  assert.match(dims, /models\/hero\/ub-louver\.glb/);

  const doors = readFileSync(
    path.join(root, "src/components/house/Doors.tsx"),
    "utf8",
  );
  assert.match(doors, /1f-win-ub-e/);
  assert.match(doors, /SKIP_OPENING_IDS/);

  const src = readFileSync(
    path.join(root, "src/components/house/UbLouver.tsx"),
    "utf8",
  );
  assert.match(src, /useGLTF/);
  assert.match(src, /interactable:\s*"louver"/);
  assert.doesNotMatch(src, /useFrame\([^,]+,\s*[1-9]/);

  const py = readFileSync(path.join(root, "tools/dcc/build_ub_louver.py"), "utf8");
  assert.match(py, /N_BLADES = 16/);
  assert.match(py, /WIN = 1\.20/);
  assert.match(py, /SHINE/);
  console.log("  ✓ skip generic pane, click at priority 0, no trademarks");
}

main();
