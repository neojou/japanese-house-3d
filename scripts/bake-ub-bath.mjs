#!/usr/bin/env node
/**
 * Hero UB Type-M baker — Blender if present, else Node boxes.
 * Writes public/models/hero/ub-bath.glb (never house.glb / archive).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeGlb } from "./lib/writeGlb.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outGlb = path.join(root, "public", "models", "hero", "ub-bath.glb");
const blenderPy = path.join(root, "tools", "dcc", "build_ub_bath.py");

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
  const modUrl = pathToFileURL(path.join(root, "src", "lib", "ubBathHero.ts")).href;
  const spec = await import(modUrl);
  const built = spec.buildUbBathMeshes();
  mkdirSync(path.dirname(outGlb), { recursive: true });
  const bytes = writeGlb(
    {
      sceneName: "Hero_UbBath",
      materials: built.materials,
      meshes: built.meshes,
      root: built.root,
    },
    { hero: "ub-bath", author: "node-dcc", style: "lidea-type-m-inspired" },
  );
  writeFileSync(outGlb, bytes);
  return { engine: "node-dcc", bytes: bytes.byteLength };
}

function bakeBlender(bin) {
  mkdirSync(path.dirname(outGlb), { recursive: true });
  const r = spawnSync(
    bin,
    ["--background", "--python", blenderPy, "--", "--out", outGlb],
    { encoding: "utf8" },
  );
  const log = `${r.stdout || ""}\n${r.stderr || ""}`;
  if (r.status !== 0 || !log.includes("wrote ")) {
    throw new Error(`blender ub bath failed:\n${log}`);
  }
  if (!existsSync(outGlb)) throw new Error("blender did not write ub-bath.glb");
  return { engine: "blender" };
}

async function main() {
  console.log("bake-ub-bath");
  const blender = findBlender();
  if (blender) {
    console.log(`  blender: ${blender}`);
    try {
      bakeBlender(blender);
      console.log(`  wrote ${outGlb}`);
      return;
    } catch (err) {
      console.warn("  blender failed; Node DCC:", err.message);
    }
  } else {
    console.log("  blender: not found — Node DCC");
  }
  const n = await bakeNode();
  console.log(`  node-dcc ${n.bytes} bytes → ${outGlb}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
