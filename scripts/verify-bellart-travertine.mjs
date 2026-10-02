/**
 * Bell Art トラバーチン AC-2166 maps and the runtime wiring around them.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "public", "textures", "bellart-travertine");

function jpegSize(buf) {
  let i = 2;
  while (i + 8 < buf.length) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc2) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  throw new Error("JPEG has no SOF");
}

function pngSize(buf) {
  assert.equal(buf.toString("ascii", 1, 4), "PNG");
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function read(rel) {
  return readFileSync(path.join(root, rel), "utf8");
}

function main() {
  console.log("verify-bellart-travertine");
  const meta = JSON.parse(readFileSync(path.join(dir, "meta.json"), "utf8"));
  assert.equal(meta.pattern, "トラバーチン");
  assert.equal(meta.color, "AC-2166");
  assert.equal(meta.srgbHex, "#8e7363");
  assert.equal(meta.albedoMeanHex, "#8e7363");
  assert.equal(meta.width, 1064);
  assert.equal(meta.height, 1511);
  assert.equal(meta.tileUM, 0.5);
  assert.equal(meta.tileVM, 0.7101);
  assert.equal(meta.metalness, 0);

  const albedo = readFileSync(path.join(dir, "albedo.jpg"));
  const normal = readFileSync(path.join(dir, "normal.png"));
  const rough = readFileSync(path.join(dir, "roughness.jpg"));
  assert.ok(albedo.length > 200_000, "albedo");
  assert.ok(normal.length > 500_000, "normal");
  assert.ok(rough.length > 50_000, "roughness");
  assert.deepEqual(jpegSize(albedo), { w: 1064, h: 1511 });
  assert.deepEqual(pngSize(normal), { w: 1064, h: 1511 });
  assert.deepEqual(jpegSize(rough), { w: 1064, h: 1511 });

  const mat = read("src/lib/houseMaterials.ts");
  assert.match(mat, /stuccoTint:\s*"#ffffff"/);
  assert.match(mat, /stuccoTileU:\s*0\.5/);
  assert.match(mat, /stuccoTileV:\s*0\.7101/);
  assert.match(mat, /metalness: 0,/);
  assert.match(mat, /envMapIntensity: 0\.1,/);
  assert.match(mat, /"1f-jog-ldk-east"/);
  assert.match(mat, /"1f-south-genkan-door"/);
  const yaki = mat.slice(
    mat.indexOf("YAKI_SUGI_WALL_IDS"),
    mat.indexOf("INTERIOR_SECONDARY_WALL_IDS"),
  );
  const ids = [...yaki.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ["1f-jog-ldk-east", "1f-south-genkan-door"]);
  assert.doesNotMatch(mat, /useFrame/);

  const dims = read("src/data/dimensions.ts");
  assert.match(dims, /wallExterior:\s*"#8e7363"/);
  assert.match(dims, /balconySoffit:\s*"#8e7363"/);
  assert.match(dims, /wall:\s*"#f7f2e8"/);

  const roofs = read("src/components/house/Roofs.tsx");
  assert.match(roofs, /#6a6560/);
  assert.match(roofs, /#5c5854/);

  const balc = read("src/components/house/BalconyExterior.tsx");
  assert.match(balc, /createStuccoMaterial/);
  assert.doesNotMatch(balc, /soffitMat|edgeMat/);
  assert.doesNotMatch(balc, /useFrame/);

  const scene = read("src/components/Scene.tsx");
  assert.match(scene, /toneMappingExposure:\s*1\.12/);

  console.log("  ✓ AC-2166 maps, white multiply, yaki hang-points, roofs");
}

main();
