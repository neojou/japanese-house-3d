#!/usr/bin/env node
/**
 * House GLB baker — Blender if present, else Node DCC from dimensions.ts.
 *
 * Usage: node --experimental-strip-types scripts/bake-house.mjs
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeGlb } from "./lib/writeGlb.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** Archived full-house bake — not the default Vite scene. */
const outGlb = path.join(
  root,
  "public",
  "models",
  "archive",
  "house-full-box-bevel.glb",
);
const geomJson = path.join(root, "tools", "dcc", "house_geom.json");
const blenderPy = path.join(root, "tools", "dcc", "build_house.py");
const kmpDesktop = path.join(
  root,
  "composeApp",
  "src",
  "desktopMain",
  "resources",
  "models",
  "house.glb",
);
const kmpWasm = path.join(
  root,
  "composeApp",
  "src",
  "wasmJsMain",
  "resources",
  "models",
  "house.glb",
);

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

function copyToKmp(src) {
  for (const dest of [kmpDesktop, kmpWasm]) {
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
}

async function bakeNode() {
  const modUrl = pathToFileURL(path.join(root, "src", "lib", "houseBake.ts")).href;
  const hb = await import(modUrl);
  const bake = hb.buildHouseBake();
  mkdirSync(path.dirname(geomJson), { recursive: true });
  writeFileSync(geomJson, JSON.stringify(hb.houseBakeJson(bake), null, 2));
  mkdirSync(path.dirname(outGlb), { recursive: true });
  const bytes = writeGlb(
    {
      sceneName: "House",
      materials: bake.materials,
      meshes: bake.meshes,
      root: bake.root,
    },
    {
      path: "house",
      author: "node-dcc",
      meshCount: bake.meshes.length,
      specCount: bake.specs.length,
    },
  );
  writeFileSync(outGlb, bytes);
  copyToKmp(outGlb);
  return {
    engine: "node-dcc",
    bytes: bytes.byteLength,
    meshes: bake.meshes.length,
    specs: bake.specs.length,
  };
}

function bakeBlender(bin) {
  mkdirSync(path.dirname(outGlb), { recursive: true });
  const r = spawnSync(
    bin,
    [
      "--background",
      "--python",
      blenderPy,
      "--",
      "--geom",
      geomJson,
      "--out",
      outGlb,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    throw new Error(`blender bake failed:\n${r.stderr || r.stdout}`);
  }
  if (!existsSync(outGlb)) throw new Error("blender did not write house.glb");
  copyToKmp(outGlb);
  return { engine: "blender", bytes: readFileSync(outGlb).byteLength };
}

async function main() {
  console.log("bake-house (archive only; default scene is R3F)");
  if (existsSync(outGlb) && process.env.FORCE_HOUSE_BAKE !== "1") {
    console.log(`  kept ${outGlb} (set FORCE_HOUSE_BAKE=1 to rebuild)`);
    return;
  }
  const nodeResult = await bakeNode();
  console.log(
    `  node-dcc: ${nodeResult.meshes} meshes, ${nodeResult.specs} specs, ${nodeResult.bytes} bytes`,
  );
  const blender = findBlender();
  if (blender) {
    console.log(`  blender: ${blender}`);
    try {
      const b = bakeBlender(blender);
      console.log(`  blender wrote ${b.bytes} bytes`);
    } catch (err) {
      console.warn("  blender failed; keeping node-dcc glb:", err.message);
    }
  } else {
    console.log("  blender: not found — keeping node-dcc glb");
    console.log(
      "  export: blender --background --python tools/dcc/build_house.py -- --geom tools/dcc/house_geom.json --out public/models/archive/house-full-box-bevel.glb",
    );
  }
  console.log(`  wrote ${outGlb}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
