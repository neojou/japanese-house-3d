/**
 * Close-coupled sit-toilet layout (JP 組み合わせ).
 * Local space: floor at y=0 in the mesh (world floor is p.y), tank −X, sit +X.
 * Envelope is real: tank back at −depth/2, bowl front at +depth/2.
 */

export type SitToiletGeom = {
  y: number;
  width: number;
  depth: number;
  tank: { w: number; d: number; h: number; topY: number };
  bowl: { seatH: number; rimR: number; length: number };
};

export type SitToiletLayout = {
  tankLocalX: number;
  tankBackX: number;
  tankFrontX: number;
  tankCenterY: number;
  tankTopY: number;
  bowlLocalX: number;
  bowlScaleX: number;
  bowlBackX: number;
  bowlFrontX: number;
  bowlHalf: number;
  deckCenterX: number;
  deckLen: number;
  seatY: number;
  hingeX: number;
  overallLength: number;
  overallWidth: number;
};

/** Typical JP close-coupled 組み合わせ (not tankless, not a 1 m separate tank). */
export const SIT_TOILET_ENVELOPE = {
  depthMin: 0.68,
  depthMax: 0.8,
  widthMin: 0.36,
  widthMax: 0.45,
  seatMin: 0.38,
  seatMax: 0.44,
  tankTopMin: 0.74,
  tankTopMax: 0.85,
} as const;

export function sitToiletLayout(p: SitToiletGeom): SitToiletLayout {
  const lidHalf = (p.tank.d * 1.02) / 2;
  const tankBackX = -p.depth / 2;
  const tankLocalX = tankBackX + lidHalf;
  const tankFrontX = tankLocalX + lidHalf;
  const bowlHalf = p.bowl.length / 2;
  const bowlScaleX = p.bowl.length / (2 * p.bowl.rimR);
  const bowlFrontX = p.depth / 2;
  const bowlLocalX = bowlFrontX - bowlHalf;
  const bowlBackX = bowlLocalX - bowlHalf;
  const deckFrom = tankBackX + 0.045;
  const deckTo = bowlLocalX - bowlHalf * 0.22;
  const seatY = p.y + p.bowl.seatH;
  return {
    tankLocalX,
    tankBackX,
    tankFrontX,
    tankCenterY: p.y + p.tank.topY - p.tank.h / 2,
    tankTopY: p.y + p.tank.topY,
    bowlLocalX,
    bowlScaleX,
    bowlBackX,
    bowlFrontX,
    bowlHalf,
    deckCenterX: (deckFrom + deckTo) / 2,
    deckLen: deckTo - deckFrom,
    seatY,
    hingeX: bowlLocalX - p.bowl.length * 0.4,
    overallLength: p.depth,
    overallWidth: p.width,
  };
}

/**
 * Fixture origin along the sit axis so the tank back sits `wallGap` off a wall face.
 * `sitSign` is +1 when local +X matches the plan axis, −1 when it is opposite
 * (2F yaw +π/2 maps local +X → world −Z).
 */
export function sitToiletOriginFromWallFace(
  wallFace: number,
  sitSign: 1 | -1,
  depth: number,
  wallGap: number,
): number {
  return wallFace + sitSign * (wallGap + depth / 2);
}
