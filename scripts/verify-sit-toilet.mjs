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
  const wall2 = dim.TOILET_2F.z1 - halfT;
  const want2 = st.sitToiletOriginFromWallFace(
    wall2,
    -1,
    env.depth,
    env.wallGap,
  );
  assert.ok(Math.abs(p2.z - want2) < 1e-9, `2F z ${p2.z} vs ${want2}`);
  // yaw +π/2: world Z = originZ − localX → tank back is north
  const tankBack2 = p2.z - L.tankBackX;
  assert.ok(
    tankBack2 <= wall2 - env.wallGap + 1e-9,
    `2F tank back ${tankBack2} vs wall ${wall2}`,
  );
  const bowlFront2 = p2.z - L.bowlFrontX;
  assert.ok(bowlFront2 > dim.TOILET_2F.z0 + 0.4, "2F sit space south of bowl");
  console.log("  ✓ 1F west / 2F north wall clearance from shared envelope");

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
