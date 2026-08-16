/**
 * Live planar FBO mirror is **not mounted**.
 * Per-frame `gl.render` blacked the full canvas (docs/mirror-improve.md).
 * Senmen glass uses `createInteriorCubeEnv()` instead.
 */

export function isMirrorLiveEnabled(): boolean {
  return false;
}
