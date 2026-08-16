#!/usr/bin/env node
/**
 * Path B baker — AI-unattended.
 * Prefers Blender if on PATH / Blender.app; otherwise scripted DCC in this repo.
 *
 * Usage: node --experimental-strip-types scripts/bake-senmen-basin.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeGlb } from "./lib/writeGlb.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "props", "senmen-basin");
const outGlb = path.join(outDir, "basin.glb");
const blenderPy = path.join(root, "tools", "dcc", "senmen_basin.py");

function findBlender() {
  const env = process.env.BLENDER;
  if (env && existsSync(env)) return env;
  const candidates = [
    "blender",
    "/Applications/Blender.app/Contents/MacOS/Blender",
    "/opt/homebrew/bin/blender",
    "/usr/bin/blender",
  ];
  for (const c of candidates) {
    if (c === "blender") {
      const which = spawnSync("which", ["blender"], { encoding: "utf8" });
      if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();
    } else if (existsSync(c)) {
      return c;
    }
  }
  return null;
}

async function bakeNode() {
  const modUrl = pathToFileURL(path.join(root, "src", "lib", "vesselBasin.ts")).href;
  const vb = await import(modUrl);
  const built = vb.buildVesselBasin(vb.SENMEN_VESSEL_SPEC);
  const measure = vb.measureBasin(built);
  if (measure.depth < 0.04) {
    throw new Error(`bowl depth ${measure.depth} < 0.04 (not a basin)`);
  }
  if (measure.rimSpread > 0.003) {
    throw new Error(`rim not level: spread ${measure.rimSpread}`);
  }
  const bytes = writeGlb(built.meshes, {
    path: "B",
    author: "node-dcc",
    spec: vb.SENMEN_VESSEL_SPEC,
    measure,
  });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outGlb, bytes);
  return { engine: "node-dcc", measure, bytes: bytes.byteLength };
}

function bakeBlender(bin) {
  mkdirSync(outDir, { recursive: true });
  const r = spawnSync(
    bin,
    ["--background", "--python", blenderPy, "--", "--out", outGlb],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    throw new Error(`blender bake failed:\n${r.stderr || r.stdout}`);
  }
  if (!existsSync(outGlb)) throw new Error("blender did not write basin.glb");
  return { engine: "blender", bytes: readFileSync(outGlb).byteLength };
}

async function main() {
  console.log("bake-senmen-basin");
  const blender = findBlender();
  let result;
  if (blender) {
    console.log(`  blender: ${blender}`);
    try {
      result = bakeBlender(blender);
    } catch (e) {
      console.warn("  blender failed, falling back to node-dcc:", e.message);
      result = await bakeNode();
    }
  } else {
    console.log("  blender: not found — using node-dcc (scripted Path B)");
    result = await bakeNode();
  }
  console.log(`  wrote ${outGlb} (${result.bytes} bytes, ${result.engine})`);
  if (result.measure) {
    console.log(
      `  depth=${result.measure.depth.toFixed(4)} rimSpread=${result.measure.rimSpread.toFixed(5)}`,
    );
  }
  console.log("bake-senmen-basin: OK");
}

main().catch((e) => {
  console.error("bake-senmen-basin: FAIL", e);
  process.exit(1);
});
