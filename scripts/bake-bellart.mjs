#!/usr/bin/env node
/**
 * Bell Art トラバーチン AC-2166 baker.
 * Writes public/textures/bellart-travertine/.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "textures", "bellart-travertine");
const blenderPy = path.join(root, "tools", "dcc", "build_bellart_travertine.py");
const src = path.join(root, "docs", "refs", "images", "outlook-paint-1.jpg");

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
  console.log("bake-bellart");
  const blender = findBlender();
  if (!blender) throw new Error("Blender not found");
  console.log(`  blender: ${blender}`);
  mkdirSync(outDir, { recursive: true });
  const preview = process.env.BELLART_PREVIEW || "";
  const args = [
    "--background",
    "--python",
    blenderPy,
    "--",
    "--src",
    src,
    "--out",
    outDir,
  ];
  if (preview) args.push("--preview", preview);
  const r = spawnSync(blender, args, { encoding: "utf8" });
  const log = `${r.stdout || ""}\n${r.stderr || ""}`;
  if (r.status !== 0 || !log.includes("wrote ")) {
    throw new Error(`blender bellart failed:\n${log}`);
  }
  for (const line of log.split("\n")) {
    if (
      line.includes("wrote ") ||
      line.includes("albedo ") ||
      line.includes("preview ") ||
      line.includes("mean ")
    ) {
      console.log(`  ${line.trim()}`);
    }
  }
}

main();
