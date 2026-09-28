/**
 * PH balcony footprint and the roofs that must stay off the deck.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function covers(slab, x, z) {
  const { rect } = slab;
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    z >= rect.z &&
    z <= rect.z + rect.depth
  );
}

async function main() {
  console.log("verify-ph-balcony");
  const dim = await import(pathToFileURL(path.join(root, "src/data/dimensions.ts")).href);
  const b = dim.PH_BALCONY;
  assert.equal(b.x0, 0);
  assert.equal(b.x1, 6.37);
  assert.equal(b.z0, 0);
  assert.equal(b.z1, 3.64);
  assert.equal(b.nw.x0, 2.73);
  assert.ok(Math.abs(b.nw.x1 - 4.55) < 1e-9);
  assert.equal(b.nw.z0, 3.64);
  assert.equal(b.nw.z1, 6.37);

  const ph = dim.FLOORS_PH.filter((s) => s.floor === "ph");
  assert.ok(ph.some((s) => covers(s, 1, 2)), "south deck");
  assert.ok(ph.some((s) => covers(s, 3.2, 5)), "north leg");
  assert.equal(
    ph.some((s) => covers(s, 1, 5)),
    false,
    "x 0–2.73, z 3.64–6.37 is not a PH floor",
  );
  assert.equal(
    ph.some((s) => covers(s, 2.2, 5)),
    false,
    "1F northwest roof is not a PH floor",
  );

  const walls = dim.WALLS_PH;
  const wall = (id) => {
    const hit = walls.find((w) => w.id === id);
    assert.ok(hit, id);
    return hit;
  };
  const west = wall("ph-balc-w");
  assert.ok(Math.abs(west.z + west.lengthZ / 2 - 3.64) < 1e-9, "west rail stops at z=3.64");
  const notch = wall("ph-balc-notch");
  assert.ok(Math.abs(notch.z - 3.64) < 1e-9);
  assert.ok(Math.abs(notch.lengthX - 2.73) < 0.2);
  const nwW = wall("ph-balc-nw-w");
  assert.ok(Math.abs(nwW.x - (2.73 + 0.075)) < 1e-6);
  const north = wall("ph-balc-n");
  assert.ok(north.x > 2.7 && north.x < 4.6);

  const roofs = readFileSync(
    path.join(root, "src/components/house/Roofs.tsx"),
    "utf8",
  );
  assert.match(roofs, /roof-1f-nw/);
  assert.match(roofs, /neRoomRoofY/);
  assert.match(roofs, /ySouth=\{yPhHigh\}/);
  assert.doesNotMatch(roofs, /x0=\{0\}/);
  assert.doesNotMatch(roofs, /x0=\{2\.73\}/);
  console.log("  ✓ deck L, no PH floor on the 1F roof, balcony sheds removed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
