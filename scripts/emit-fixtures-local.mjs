/**
 * Write the gitignored local fixture module from a JSON file passed on the command line.
 * No default path and no embedded design data.
 *
 *   node scripts/emit-fixtures-local.mjs <input.json> <output.ts>
 */

import fs from "node:fs";

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error("usage: node scripts/emit-fixtures-local.mjs <input.json> <output.ts>");
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(input, "utf8"));
const data = {
  version: 1,
  fixtures: raw.fixtures ?? [],
  switches: raw.switches ?? [],
  outlets: raw.outlets ?? [],
  sentinel: "__BUILDER_FIXTURES_LOCAL__",
};

const body = `import type { BuilderFixtures } from "../lib/fixtures/types.ts";

const fixtures: BuilderFixtures = ${JSON.stringify(data, null, 2)};

export default fixtures;
`;

fs.writeFileSync(output, body);
console.log(
  `wrote fixtures=${data.fixtures.length} switches=${data.switches.length} outlets=${data.outlets.length}`,
);
