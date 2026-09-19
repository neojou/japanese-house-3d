/**
 * Sit-toilet envelope + wall clearance (no WebGL).
 * Typical JP close-coupled 組み合わせ — not tankless, not a 1 m separate tank.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  console.log("verify-sit-toilet");
  const dim = await import(
    pathToFileURL(path.join(root, "src/data/dimensions.ts")).href
  );
  const st = await import(
    pathToFileURL(path.join(root, "src/lib/sitToilet.ts")).href
  );
  const src = readFileSync(
    path.join(root, "src/components/house/ToiletDisplay.tsx"),
    "utf8",
  );

  const env = dim.SIT_TOILET;
  const band = st.SIT_TOILET_ENVELOPE;
  assert.ok(env.depth >= band.depthMin && env.depth <= band.depthMax, env.depth);
  assert.ok(env.width >= band.widthMin && env.width <= band.widthMax, env.width);
  assert.ok(
    env.bowl.seatH >= band.seatMin && env.bowl.seatH <= band.seatMax,
    env.bowl.seatH,
  );
  assert.ok(
    env.tank.topY >= band.tankTopMin && env.tank.topY <= band.tankTopMax,
    env.tank.topY,
  );
  const bowlW = env.bowl.rimR * 2;
  assert.ok(bowlW >= 0.34 && bowlW <= 0.42, bowlW);
  console.log(
    `  ✓ envelope ${env.depth * 1000}×${env.width * 1000} mm, seat ${env.bowl.seatH * 1000} mm, tank ${env.tank.topY * 1000} mm`,
  );

  const L = st.sitToiletLayout(dim.PROP_2F_TOILET);
  assert.equal(L.overallLength, env.depth);
  assert.equal(L.overallWidth, env.width);
  assert.ok(Math.abs(L.tankBackX + env.depth / 2) < 1e-9);
  assert.ok(Math.abs(L.bowlFrontX - env.depth / 2) < 1e-9);
  assert.ok(L.deckLen > 0.12, `rear deck ${L.deckLen}`);
  assert.ok(L.bowlScaleX > 1.2 && L.bowlScaleX < 1.8, L.bowlScaleX);
  const L1 = st.sitToiletLayout(dim.PROP_1F_TOILET);
  assert.equal(L1.overallLength, env.depth);
  console.log("  ✓ packing fills declared depth (oval bowl + rear deck)");

  const halfT = dim.BUILDING.wallThickness / 2;
  const p1 = dim.PROP_1F_TOILET;
  const wall1 = dim.TOILET_1F.x0 + halfT;
  const want1 = st.sitToiletOriginFromWallFace(
    wall1,
    1,
    env.depth,
    env.wallGap,
  );
  assert.ok(Math.abs(p1.x - want1) < 1e-9, `1F x ${p1.x} vs ${want1}`);
  const tankBack1 = p1.x + L1.tankBackX;
  assert.ok(tankBack1 >= wall1 + env.wallGap - 1e-9, "1F tank clears west wall");
  assert.ok(
    p1.x + L1.bowlFrontX < dim.TOILET_1F.x0 + dim.TOILET_1F.solidW,
    "1F bowl stays in west half",
  );

  const p2 = dim.PROP_2F_TOILET;
  const wall2 = dim.TOILET_2F.x0 + halfT;
  const want2 = st.sitToiletOriginFromWallFace(
    wall2,
    1,
    env.depth,
    env.wallGap,
  );
  assert.ok(Math.abs(p2.x - want2) < 1e-9, `2F x ${p2.x} vs ${want2}`);
  const tankBack2 = p2.x + L.tankBackX;
  assert.ok(tankBack2 >= wall2 + env.wallGap - 1e-9, "2F tank clears west wall");
  assert.ok(
    p2.x + L.bowlFrontX < dim.TOILET_2F.x0 + dim.TOILET_2F.solidW,
    "2F bowl stays in west half",
  );
  console.log("  ✓ 1F / 2F west wall clearance from shared envelope");

  const near = (a, b, msg) =>
    assert.ok(Math.abs(a - b) < 1e-9, msg ?? `${a} ≉ ${b}`);
  assert.equal(dim.TOILET_2F.width, dim.TOILET_1F.width);
  assert.equal(dim.TOILET_2F.depth, dim.TOILET_1F.depth);
  assert.equal(dim.TOILET_2F.passW, dim.TOILET_1F.passW);
  near(dim.TOILET_2F.z0, 5.46, "TOILET_2F.z0");
  near(dim.TOILET_2F.z1, 6.37, "TOILET_2F.z1");
  near(dim.TOILET_2F.x0, 2.73, "TOILET_2F.x0");
  near(dim.TOILET_2F.x1, 4.55, "TOILET_2F.x1");
  near(dim.MONO_2F.x0, 2.73, "MONO_2F.x0");
  near(dim.MONO_2F.x1, 3.23, "MONO_2F.x1");
  near(dim.MONO_2F.z0, 4.55, "MONO_2F.z0");
  near(dim.MONO_2F.z1, 5.46, "MONO_2F.z1");
  near(dim.WASH_2F.x0, 3.23, "WASH_2F.x0");
  near(dim.WASH_2F.x1, 4.55, "WASH_2F.x1");
  const dimSrc = readFileSync(
    path.join(root, "src/data/dimensions.ts"),
    "utf8",
  );
  assert.doesNotMatch(dimSrc, /swing-2f-toilet/);
  assert.doesNotMatch(dimSrc, /2f-door-toilet/);
  assert.match(dimSrc, /2f-pass-toilet-s/);
  assert.match(dimSrc, /2f-int-mono-s/);
  const washSrc = readFileSync(
    path.join(root, "src/components/house/Wash2FDisplay.tsx"),
    "utf8",
  );
  const monoSrc = readFileSync(
    path.join(root, "src/components/house/Mono2FDisplay.tsx"),
    "utf8",
  );
  assert.match(washSrc, /SenmenVanity/);
  assert.match(monoSrc, /PROP_2F_MONO/);
  assert.match(
    readFileSync(path.join(root, "src/components/house/Props.tsx"), "utf8"),
    /Wash2FDisplay/,
  );
  console.log("  ✓ 2F トイレ z 5.46–6.37 like 1F; 物入 open east; no south door");

  assert.match(src, /sitToiletLayout/);
  assert.match(src, /bowlScaleX/);
  assert.doesNotMatch(src, /depth \* 0\.28/);
  assert.doesNotMatch(
    readFileSync(path.join(root, "src/data/dimensions.ts"), "utf8"),
    /0\.272/,
  );
  console.log("  ✓ ToiletDisplay uses envelope layout (no packed ~550 mm hack)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
