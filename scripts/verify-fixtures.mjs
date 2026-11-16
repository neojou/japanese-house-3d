/**
 * Builder fixture logic. Uses the example lattice only.
 * Run: node --experimental-strip-types scripts/verify-fixtures.mjs
 */

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const EPS = 1e-9;

async function load(rel) {
  return import(pathToFileURL(path.join(root, rel)).href);
}

function near(actual, expected, label) {
  assert.ok(
    Math.abs(actual - expected) < EPS,
    `${label}: ${actual} vs ${expected}`,
  );
}

const { default: example } = await load("src/data/fixtures.example.ts");
const dims = await load("src/data/dimensions.ts");
const logic = await load("src/lib/fixtures/logic.ts");

const {
  BUILDER_FIXTURE_DEFAULTS,
  BUILDING,
  CEILING_1F,
  CEILING_2F,
  CEILING_PH,
  FLOOR_LEVELS,
  INTERIOR_FLOOR_Y,
  PLAYER,
  STORY,
} = dims;

const {
  assignLightPool,
  ceilingSoffitY,
  circuitIds,
  deviceWorldY,
  faceYaw,
  fixtureWorldY,
  floorFromEyeY,
  gangOffsetY,
  initialCircuitOn,
  initialLighting,
  lightingQuery,
  porchSoffitY,
  repeatOffset,
  resolveFixtureSource,
  shouldLoadLocalFixtures,
  switchPlatesOnCircuit,
  toggleCircuit,
  validateFixtures,
} = logic;

const KINDS = ["W", "E", "専", "AC100", "AC200", "VP", "LAN", "TV", "IP", "床", "給"];

function integerLattice(data) {
  for (const row of [...data.fixtures, ...data.switches, ...data.outlets]) {
    assert.equal(row.x, Math.round(row.x), row.id);
    assert.equal(row.z, Math.round(row.z), row.id);
  }
}

function testExampleIsValidLattice() {
  assert.deepEqual(validateFixtures(example), []);
  integerLattice(example);
  const kinds = new Set(example.outlets.map((o) => o.kind));
  for (const kind of KINDS) assert.ok(kinds.has(kind), kind);
  const multi = example.switches.find((s) => s.gangs.length > 1);
  assert.ok(multi, "multi-gang plate");
  assert.equal(switchPlatesOnCircuit(example.switches, "c-3way"), 2);
  const three = example.switches.flatMap((s) => s.gangs).filter((g) => g.threeWay);
  assert.equal(three.length, 2);
  assert.ok(three.every((g) => g.circuit === "c-3way"));
}

function testRejectsBadSamples() {
  const dup = structuredClone(example);
  dup.fixtures[1].id = dup.fixtures[0].id;
  assert.ok(validateFixtures(dup).includes("duplicate id"));

  const orphan = structuredClone(example);
  orphan.fixtures[0].circuit = "c-missing";
  assert.ok(validateFixtures(orphan).includes("fixture circuit has no switch"));

  const oneWay = structuredClone(example);
  oneWay.switches = oneWay.switches.filter((s) => s.id !== "s-3b");
  assert.ok(validateFixtures(oneWay).includes("three-way circuit needs two switches"));

  const badFloor = structuredClone(example);
  badFloor.fixtures[0].floor = "roof";
  assert.ok(validateFixtures(badFloor).includes("floor"));

  const nan = structuredClone(example);
  nan.outlets[0].x = Number.NaN;
  assert.ok(validateFixtures(nan).includes("position"));

  const noFixture = structuredClone(example);
  noFixture.switches[0].gangs[0].circuit = "c-ghost";
  assert.ok(validateFixtures(noFixture).includes("switch circuit has no fixture"));
}

function testThreeWayToggle() {
  let on = initialCircuitOn(["c-3way"], false);
  assert.equal(on["c-3way"], false);
  on = toggleCircuit(on, "c-3way");
  assert.equal(on["c-3way"], true);
  on = toggleCircuit(on, "c-3way");
  assert.equal(on["c-3way"], false);
  on = toggleCircuit(on, "c-3way");
  assert.equal(on["c-3way"], true);
}

function testHeights() {
  const ceil = example.fixtures.find((f) => f.id === "f-ceil");
  near(fixtureWorldY(ceil), CEILING_1F.soffitY - BUILDER_FIXTURE_DEFAULTS.ceilingGap, "1f ceiling");

  const down = example.fixtures.find((f) => f.id === "f-d");
  near(
    fixtureWorldY(down),
    FLOOR_LEVELS["2f"] - BUILDING.slabThickness - BUILDER_FIXTURE_DEFAULTS.ceilingGap,
    "porch D",
  );
  near(porchSoffitY(), fixtureWorldY(down), "porch helper");

  const outdoor = example.fixtures.find((f) => f.id === "f-out");
  near(fixtureWorldY(outdoor), 2, "grade outdoor");

  const second = example.fixtures.find((f) => f.id === "f-2f");
  near(fixtureWorldY(second), CEILING_2F.soffitY - BUILDER_FIXTURE_DEFAULTS.ceilingGap, "2f ceiling");

  const ph = example.fixtures.find((f) => f.id === "f-ph");
  near(fixtureWorldY(ph), CEILING_PH.soffitY - BUILDER_FIXTURE_DEFAULTS.ceilingGap, "ph ceiling");

  const indoorOutlet = example.outlets.find((o) => o.id === "o-w");
  near(deviceWorldY(indoorOutlet.floor, indoorOutlet.heightAboveFloor, false), INTERIOR_FLOOR_Y + 0.25, "indoor outlet");

  const gradeOutlet = example.outlets.find((o) => o.id === "o-outdoor");
  near(deviceWorldY(gradeOutlet.floor, gradeOutlet.heightAboveFloor, true), 0.25, "grade outlet");

  const tooHigh = {
    ...example.fixtures.find((f) => f.id === "f-wall"),
    heightAboveFloor: 100,
  };
  near(
    fixtureWorldY(tooHigh),
    ceilingSoffitY("1f") - BUILDER_FIXTURE_DEFAULTS.belowCeiling,
    "wall clamp",
  );

  const ceilingStays = fixtureWorldY(ceil);
  assert.ok(
    ceilingStays > ceilingSoffitY("1f") - BUILDER_FIXTURE_DEFAULTS.belowCeiling,
    "ceiling mount is not pulled down to the wall clamp",
  );
}

function testFloorFromEye() {
  assert.equal(floorFromEyeY(INTERIOR_FLOOR_Y + PLAYER.eyeHeight), "1f");
  assert.equal(floorFromEyeY(STORY.floor2f + PLAYER.eyeHeight), "2f");
  assert.equal(floorFromEyeY(STORY.floorPh + PLAYER.eyeHeight), "ph");
  const still1f =
    STORY.floor2f - BUILDER_FIXTURE_DEFAULTS.floorMargin - 0.01 + PLAYER.eyeHeight;
  assert.equal(floorFromEyeY(still1f), "1f");
  const now2f =
    STORY.floor2f - BUILDER_FIXTURE_DEFAULTS.floorMargin + 0.01 + PLAYER.eyeHeight;
  assert.equal(floorFromEyeY(now2f), "2f");
}

function testLoadRules() {
  assert.equal(shouldLoadLocalFixtures({ exists: true, command: "serve", envFlag: false }), true);
  assert.equal(shouldLoadLocalFixtures({ exists: true, command: "build", envFlag: false }), false);
  assert.equal(shouldLoadLocalFixtures({ exists: true, command: "build", envFlag: true }), true);
  assert.equal(shouldLoadLocalFixtures({ exists: false, command: "serve", envFlag: true }), false);

  const q = lightingQuery("?lighting=builder&outlets=1&circuits=all&fixtures=example");
  assert.deepEqual(q, {
    wantBuilder: true,
    showOutlets: true,
    allOn: true,
    useExample: true,
  });

  const none = resolveFixtureSource({ local: null, example, search: "" });
  assert.equal(none.data, null);
  assert.deepEqual(none.issues, []);

  const fromExample = resolveFixtureSource({
    local: null,
    example,
    search: "?fixtures=example",
  });
  assert.equal(fromExample.data, example);

  const local = structuredClone(example);
  const preferLocal = resolveFixtureSource({ local, example, search: "" });
  assert.equal(preferLocal.data, local);

  const broken = structuredClone(example);
  broken.fixtures[0].x = Number.NaN;
  const rejected = resolveFixtureSource({ local: broken, example, search: "?fixtures=example" });
  assert.equal(rejected.data, null);
  assert.ok(rejected.issues.includes("position"));

  const art = initialLighting({ local: null, example, search: "?lighting=builder" });
  assert.equal(art.mode, "art");
  assert.equal(art.data, null);

  const builder = initialLighting({
    local: null,
    example,
    search: "?lighting=builder&fixtures=example&circuits=all&outlets=1",
  });
  assert.equal(builder.mode, "builder");
  assert.equal(builder.showOutlets, true);
  assert.equal(builder.showSwitches, true);
  assert.ok(circuitIds(example).every((id) => builder.circuitOn[id] === true));

  const closed = initialLighting({
    local: example,
    example,
    search: "?lighting=builder",
  });
  assert.ok(circuitIds(example).every((id) => closed.circuitOn[id] === false));
}

function testLightPool() {
  const fixtures = [];
  for (let i = 1; i <= 10; i++) {
    fixtures.push({
      id: `n-${i}`,
      floor: "1f",
      room: "demo",
      type: "C",
      x: i,
      z: 0,
      mount: "ceiling",
      face: null,
      heightAboveFloor: null,
      circuit: `c-${i}`,
      sensor: false,
    });
  }
  fixtures.push({
    id: "fan-near",
    floor: "1f",
    room: "demo",
    type: "換",
    x: 0,
    z: 0,
    mount: "ceiling",
    face: null,
    heightAboveFloor: null,
    circuit: "c-fan",
    sensor: false,
  });
  fixtures.push({
    id: "off-near",
    floor: "1f",
    room: "demo",
    type: "C",
    x: 0,
    z: 1,
    mount: "ceiling",
    face: null,
    heightAboveFloor: null,
    circuit: "c-off",
    sensor: false,
  });
  fixtures.push({
    id: "other-floor",
    floor: "2f",
    room: "demo",
    type: "C",
    x: 0,
    z: 0,
    mount: "ceiling",
    face: null,
    heightAboveFloor: null,
    circuit: "c-2",
    sensor: false,
    color: "daylight",
  });

  const circuitOn = { "c-fan": true, "c-off": false, "c-2": true };
  for (let i = 1; i <= 10; i++) circuitOn[`c-${i}`] = true;

  const slots = assignLightPool({
    poolSize: 8,
    floor: "1f",
    fixtures,
    circuitOn,
    playerX: 0,
    playerZ: 0,
  });
  assert.equal(slots.length, 8);
  assert.deepEqual(
    slots.map((s) => s.id),
    ["n-1", "n-2", "n-3", "n-4", "n-5", "n-6", "n-7", "n-8"],
  );

  const upstairs = assignLightPool({
    poolSize: 8,
    floor: "2f",
    fixtures,
    circuitOn,
    playerX: 0,
    playerZ: 0,
  });
  assert.equal(upstairs[0].id, "other-floor");
  assert.equal(upstairs[0].color, BUILDER_FIXTURE_DEFAULTS.daylight);
  assert.equal(upstairs[1], null);
}

function testFacingAndLayout() {
  near(faceYaw("N"), 0, "N");
  near(faceYaw(null), 0, "null");
  near(faceYaw("S"), Math.PI, "S");
  near(faceYaw("E"), Math.PI / 2, "E");
  near(faceYaw("W"), -Math.PI / 2, "W");
  near(gangOffsetY(0, 1, 0.12), 0, "single gang");
  near(gangOffsetY(0, 2, 0.12), 0.042, "gang top");
  near(gangOffsetY(1, 2, 0.12), -0.042, "gang bottom");
  near(repeatOffset(0, 2, 0.07, 0.01), -0.04, "pair left");
  near(repeatOffset(1, 2, 0.07, 0.01), 0.04, "pair right");
}

testExampleIsValidLattice();
testRejectsBadSamples();
testThreeWayToggle();
testHeights();
testFloorFromEye();
testLoadRules();
testLightPool();
testFacingAndLayout();

console.log("verify-fixtures: ok");
