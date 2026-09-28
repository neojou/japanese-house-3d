#!/usr/bin/env node
/**
 * Standard Label interior-door baker.
 * Writes public/models/hero/standard-label-doors.glb
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outGlb = path.join(root, "public", "models", "hero", "standard-label-doors.glb");
const blenderPy = path.join(root, "tools", "dcc", "build_standard_label_doors.py");

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
  console.log("bake-standard-label-doors");
  const blender = findBlender();
  if (!blender) throw new Error("Blender not found");
  console.log(`  blender: ${blender}`);
  mkdirSync(path.dirname(outGlb), { recursive: true });
  const preview = process.env.DOOR_PREVIEW || "";
  const args = ["--background", "--python", blenderPy, "--", "--out", outGlb];
  if (preview) args.push("--preview", preview);
  const r = spawnSync(blender, args, { encoding: "utf8" });
  const log = `${r.stdout || ""}\n${r.stderr || ""}`;
  if (r.status !== 0 || !log.includes("wrote ")) {
    throw new Error(`blender standard-label doors failed:\n${log}`);
  }
  for (const line of log.split("\n")) {
    if (line.includes("bbox ") || line.includes("wrote ") || line.includes("preview ")) {
      console.log(`  ${line.trim()}`);
    }
  }
}

main();
