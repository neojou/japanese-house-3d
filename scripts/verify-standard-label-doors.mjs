/**
 * Standard Label interior doors: GLB leaves, assignment, bifold track math.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const glbPath = path.join(root, "public", "models", "hero", "standard-label-doors.glb");

function parseGlbJson(buf) {
  assert.equal(buf.readUInt32LE(0), 0x46546c67, "glb magic");
  const jsonLen = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
}

async function main() {
  console.log("verify-standard-label-doors");
  assert.ok(existsSync(glbPath), `missing ${glbPath} — npm run bake:standard-label-doors`);
  const json = parseGlbJson(readFileSync(glbPath));
  const names = (json.nodes ?? []).map((n) => n.name).filter(Boolean);
  const joined = names.join("\n");
  for (const id of ["Leaf_LD", "Leaf_PA", "Leaf_DC", "Leaf_TA", "Leaf_PH"]) {
    assert.match(joined, new RegExp(id));
  }
  assert.match(joined, /Glass_Leaf_LD/);
  assert.match(joined, /Glass_Leaf_DC/);
  assert.match(joined, /Glass_Leaf_TA/);
  assert.doesNotMatch(joined, /Glass_Leaf_PA/);
  assert.doesNotMatch(joined, /Glass_Leaf_PH/);
  assert.doesNotMatch(joined, /Lever_Leaf_PH/);
  assert.match(joined, /Slab_Leaf_PA/);
  assert.match(joined, /Lever_F/);
  assert.doesNotMatch(joined, /Panasonic|パナソニック|ベリティス/);
  const mats = json.materials ?? [];
  const matNames = mats.map((m) => m.name).join("\n");
  assert.match(matNames, /Mat_Oak/);
  assert.match(matNames, /Mat_Frost/);
  assert.match(matNames, /Mat_Chrome/);
  const oak = mats.find((m) => m.name === "Mat_Oak");
  const chrome = mats.find((m) => m.name === "Mat_Chrome");
  const frost = mats.find((m) => m.name === "Mat_Frost");
  assert.ok(oak.pbrMetallicRoughness.metallicFactor <= 0.05, "oak is dielectric");
  const chromeMetal = chrome.pbrMetallicRoughness.metallicFactor;
  assert.ok(chromeMetal === undefined || chromeMetal >= 0.9, "lever is metal");
  const alb = (json.images ?? []).find((img) => (img.name || "").includes("Albedo"));
  assert.ok(alb, "albedo image");
  const albBytes = json.bufferViews[alb.bufferView].byteLength;
  assert.ok(albBytes > 80000, `albedo is empty (${albBytes} bytes)`);
  assert.equal(json.extensionsUsed?.includes("KHR_lights_punctual") ?? false, false);
  const frostExt = frost.extensions?.KHR_materials_transmission;
  assert.ok(frostExt, "frost uses transmission");
  assert.ok(frostExt.transmissionFactor > 0.5);
  console.log(`  ✓ ${names.length} nodes, greige oak + chrome + frosted transmission`);

  const dim = await import(pathToFileURL(path.join(root, "src/data/dimensions.ts")).href);
  const math = await import(
    pathToFileURL(path.join(root, "src/lib/standardLabelDoor.ts")).href
  );

  const byId = (list, id) => {
    const hit = list.find((d) => d.id === id);
    assert.ok(hit, id);
    return hit;
  };

  assert.equal(byId(dim.SWING_DOORS, "swing-ldk-genkan").leaf, "ld");
  assert.equal(byId(dim.SWING_DOORS, "swing-2f-ne").leaf, "pa");
  assert.equal(byId(dim.SWING_DOORS, "swing-2f-sw").leaf, "pa");
  assert.equal(byId(dim.SWING_DOORS, "swing-2f-sc").leaf, "pa");
  assert.equal(byId(dim.SWING_DOORS, "swing-ta-1f").leaf, "ta");
  assert.equal(byId(dim.SWING_DOORS, "swing-ta-2f").leaf, "ta");
  assert.equal(byId(dim.SWING_DOORS, "swing-1f-senmen-east").leaf, undefined);
  assert.equal(byId(dim.SWING_DOORS, "swing-ph-balcony").leaf, undefined);
  assert.equal(dim.SWING_DOORS.some((d) => d.id === "swing-yoshitsu"), false);
  assert.equal(dim.SWING_DOORS.some((d) => d.id === "swing-senmen"), false);

  const pa = byId(dim.SLIDE_DOORS, "slide-1f-yoshitsu-pa");
  assert.equal(pa.leaf, "pa");
  assert.equal(pa.panels, 1);
  assert.equal(pa.openingId, "1f-door-yoshitsu");
  assert.equal(pa.face, 1);
  assert.equal(pa.openToward, "min");
  const dc = byId(dim.SLIDE_DOORS, "slide-1f-senmen-dc");
  assert.equal(dc.leaf, "dc");
  assert.equal(dc.panels, 1);
  assert.equal(dc.openToward, "max");
  for (const id of [
    "slide-1f-ldk-east",
    "slide-1f-ldk-north",
    "slide-1f-yoshitsu-w",
    "slide-2f-ne-balcony",
    "slide-ub-shower",
  ]) {
    assert.equal(byId(dim.SLIDE_DOORS, id).leaf, undefined, id);
  }

  const ta1 = byId(dim.SWING_DOORS, "swing-ta-1f");
  assert.equal(ta1.openingId, "1f-pass-toilet-s");
  assert.equal(ta1.wallZ, dim.TOILET_1F.z0);
  assert.equal(ta1.alongMin, dim.TOILET_1F.x0 + dim.TOILET_1F.solidW);
  assert.equal(ta1.alongMax, dim.TOILET_1F.x1);
  assert.ok(ta1.alongMin > dim.PROP_1F_TOILET.x + dim.SIT_TOILET.depth / 2);
  const ta2 = byId(dim.SWING_DOORS, "swing-ta-2f");
  assert.equal(ta2.openingId, "2f-pass-toilet-s");
  assert.equal(ta2.wallZ, dim.TOILET_2F.z0);
  assert.equal(ta2.alongMin, dim.TOILET_2F.x0 + dim.TOILET_2F.solidW);
  assert.equal(ta2.alongMax, dim.TOILET_2F.x1);

  const expectDir = {
    "fold-1f-scl": 1,
    "fold-1f-ldk-mono": -1,
    "fold-1f-stair-mono": 1,
    "fold-2f-mono": -1,
    "fold-2f-cl-s": -1,
    "fold-2f-cl-n": 1,
    "fold-2f-ne-cl": 1,
  };
  assert.equal(dim.FOLD_DOORS.length, 7);
  for (const def of dim.FOLD_DOORS) {
    if (def.id === "fold-2f-ne-cl") assert.equal(def.hingeAt, "max");
    else assert.equal(def.hingeAt, "min", def.id);
    assert.ok(def.alongMax > def.alongMin, def.id);
    assert.ok(def.openAngleDeg < 90 && def.openAngleDeg > 45, def.id);
    const dir = math.foldTravelDir(def.axis, def.openSign, def.hingeAt);
    const want = expectDir[def.id];
    const into = def.axis === "ns" ? dir.x : dir.z;
    assert.ok(want, def.id);
    assert.ok(into * want > 0.15, `${def.id} folds the wrong way (${into})`);
  }
  const ldk = byId(dim.SWING_DOORS, "swing-ldk-genkan");
  assert.equal(ldk.hingeAt, "max");
  assert.equal(ldk.openSign, 1);
  assert.equal(ldk.openAngleDeg, 85);
  const ldkShut = math.swingLeafDir("ns", "max", 1, 0);
  const ldkOpen = math.swingLeafDir("ns", "max", 1, (85 * Math.PI) / 180);
  assert.ok(ldkShut.z < -0.9, "LDK handle is on the south");
  assert.ok(ldkOpen.x < -0.9, "LDK opens west");
  const stair = byId(dim.FOLD_DOORS, "fold-1f-stair-mono");
  assert.equal(stair.wallZ, 5.46);
  assert.equal(stair.alongMin, 5.46 + 0.075);
  assert.equal(stair.alongMax, 6.37 - 0.075);
  assert.ok(ldk.alongMax + 0.02 < stair.wallZ - 0.018, "open LDK leaf stays south of the closet door");
  const neDoor = byId(dim.SWING_DOORS, "swing-2f-ne");
  assert.equal(neDoor.hingeAt, "min");
  assert.equal(neDoor.openSign, 1);
  assert.equal(neDoor.openAngleDeg, 85);
  const neShut = math.swingLeafDir("ns", "min", 1, 0);
  const neOpen = math.swingLeafDir("ns", "min", 1, (85 * Math.PI) / 180);
  assert.ok(neShut.z > 0.9, "NE room handle is on the north");
  assert.ok(neOpen.x > 0.9, "NE room door opens east");
  const scl = byId(dim.FOLD_DOORS, "fold-1f-scl");
  assert.equal(scl.openingId, "1f-pass-scl-w");
  assert.equal(scl.alongMin, dim.IR.recess + dim.SCL_1F.passFrom);
  const mono = byId(dim.FOLD_DOORS, "fold-2f-mono");
  assert.equal(mono.wallX, dim.MONO_2F.x1);
  const ne = byId(dim.FOLD_DOORS, "fold-2f-ne-cl");
  assert.ok(Math.abs(ne.wallX - (dim.IR.genkanW + dim.IR.module)) < 1e-9);

  const halfT = 0.075;
  const cls = byId(dim.FOLD_DOORS, "fold-2f-cl-s");
  const cln = byId(dim.FOLD_DOORS, "fold-2f-cl-n");
  assert.equal(dim.Z2.clSplit, 1.365);
  assert.equal(dim.Z2.clNorth, 2.73);
  assert.equal(cls.wallX, 3.64);
  assert.equal(cls.alongMin, halfT);
  assert.equal(cls.alongMax, dim.Z2.clSplit - halfT);
  assert.equal(cln.wallX, 2.73);
  assert.equal(cln.alongMin, dim.Z2.clSplit + halfT);
  assert.equal(cln.alongMax, dim.Z2.clNorth - halfT);
  assert.ok(cln.alongMax < dim.Z2.clN, "north CL door stays south of the corridor");
  const walls = dim.WALLS_2F;
  const wall = (id) => {
    const hit = walls.find((w) => w.id === id);
    assert.ok(hit, id);
    return hit;
  };
  const west = wall("2f-int-sw-cl");
  assert.ok(Math.abs(west.x - 2.73) < 1e-9);
  assert.ok(Math.abs(west.z - west.lengthZ / 2) < 1e-9, "south CL west wall starts at z=0");
  assert.ok(Math.abs(west.z + west.lengthZ / 2 - dim.Z2.clSplit) < 1e-9);
  assert.equal(west.openings, undefined);
  const east = wall("2f-int-cl-sc");
  assert.ok(Math.abs(east.x - 3.64) < 1e-9);
  assert.ok(Math.abs(east.z - east.lengthZ / 2 - dim.Z2.clSplit) < 1e-9);
  assert.ok(Math.abs(east.z + east.lengthZ / 2 - dim.Z2.clN) < 1e-9);
  assert.equal(east.openings, undefined);
  const split = wall("2f-int-cl-split");
  assert.ok(Math.abs(split.z - dim.Z2.clSplit) < 1e-9);
  const north = wall("2f-int-cl-n-n");
  assert.ok(Math.abs(north.z - dim.Z2.clNorth) < 1e-9);
  assert.equal(
    walls.some((w) => (w.openings ?? []).some((o) => o.id === "2f-pass-scl-east")),
    false,
  );

  for (const alpha of [0, 0.4, 1.1, 1.36]) {
    const pin = math.foldPin(alpha, 0.45);
    assert.ok(Math.abs(pin.out) < 1e-9, `pin left the wall at ${alpha}: ${pin.out}`);
  }
  assert.equal(math.bifoldBRel(0.3), -0.6);
  assert.ok(Math.abs(math.foldPin(0, 0.4).along - 0.8) < 1e-9);
  console.log("  ✓ assignment + bifold pin stays on the track");

  const doors = readFileSync(path.join(root, "src/components/house/Doors.tsx"), "utf8");
  const leaf = readFileSync(
    path.join(root, "src/components/house/StandardLabelLeaf.tsx"),
    "utf8",
  );
  assert.match(doors, /StandardLabelLeaf/);
  assert.match(doors, /FOLD_DOORS/);
  assert.match(doors, /bifoldBRel/);
  assert.match(leaf, /useGLTF/);
  assert.match(leaf, /transmission/);
  assert.doesNotMatch(leaf, /useFrame\(/);
  assert.doesNotMatch(doors, /useFrame\([^)]+,\s*[1-9]/);
  assert.doesNotMatch(leaf, /Panasonic|パナソニック/);
  console.log("  ✓ runtime loader; fold uses the track formula; no priority-1 frame");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
