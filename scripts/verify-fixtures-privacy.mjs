/**
 * Confirms the tracked tree and a normal dist/ do not carry local fixture data.
 * Run after `npm run build`. Does not read private drawings.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SENTINEL = "__BUILDER_FIXTURES_LOCAL__";

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" });
}

const tracked = git(["ls-files"]).split("\n").filter(Boolean);
const leaked = tracked.filter(
  (file) => file.startsWith("docs/refs/") || file.includes("fixtures.local"),
);
assert.deepEqual(leaked, [], "tracked private fixture paths");

const ignore = git(["check-ignore", "-v", "src/data/fixtures.local.ts"]);
assert.ok(ignore.includes("src/data/fixtures.local.ts"), ignore);

const dist = path.join(root, "dist");
assert.ok(fs.existsSync(dist), "dist/ missing; run npm run build first");

const hits = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full);
      continue;
    }
    const buf = fs.readFileSync(full);
    if (buf.includes(SENTINEL)) hits.push(path.relative(root, full));
  }
}
walk(dist);
assert.deepEqual(hits, [], "sentinel in dist");

console.log("verify-fixtures-privacy: ok");
