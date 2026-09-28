#!/usr/bin/env node
/**
 * 2F wall handwash baker. Blender only — vessel cavity is a boolean.
 * Writes public/models/hero/dokodemo-wash.glb
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outGlb = path.join(root, "public", "models", "hero", "dokodemo-wash.glb");
const blenderPy = path.join(root, "tools", "dcc", "build_dokodemo_wash.py");

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
  console.log("bake-dokodemo-wash");
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
    throw new Error(`blender dokodemo-wash failed:\n${log}`);
  }
  const tip = log.match(/stream_tip\s+([-0-9.]+)\s+([-0-9.]+)\s+([-0-9.]+)/);
  if (tip) console.log(`  stream tip ${tip[1]} ${tip[2]} ${tip[3]}`);
  console.log(`  wrote ${outGlb}`);
}

main();
