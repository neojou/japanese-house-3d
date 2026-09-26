#!/usr/bin/env node
/**
 * Amage-inspired sit toilet baker. Blender only — skirted bowl is a boolean.
 * Writes public/models/hero/amage-toilet.glb
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outGlb = path.join(root, "public", "models", "hero", "amage-toilet.glb");
const blenderPy = path.join(root, "tools", "dcc", "build_amage_toilet.py");

function findBlender() {
  const env = process.env.BLENDER;
  if (env && existsSync(env)) return env;
  const candidates = [
    "blender",
    "/Applications/Blender.app/Contents/MacOS/Blender",
    "/opt/homebrew/bin/blender",
  ];
  for (const c of candidates) {
    if (c === "blender") {
      const which = spawnSync("which", ["blender"], { encoding: "utf8" });
      if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();
    } else if (existsSync(c)) return c;
  }
  return null;
}

function main() {
  console.log("bake-amage-toilet");
  const blender = findBlender();
  if (!blender) throw new Error("Blender not found");
  console.log(`  blender: ${blender}`);
  mkdirSync(path.dirname(outGlb), { recursive: true });
  const r = spawnSync(
    blender,
    ["--background", "--python", blenderPy, "--", "--out", outGlb],
    { encoding: "utf8" },
  );
  const log = `${r.stdout || ""}\n${r.stderr || ""}`;
  if (r.status !== 0 || !log.includes("wrote ")) {
    throw new Error(`blender amage-toilet failed:\n${log}`);
  }
  console.log(`  wrote ${outGlb}`);
}

main();
