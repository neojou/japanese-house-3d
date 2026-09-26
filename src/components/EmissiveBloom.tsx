import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { LIGHTING } from "@/data/dimensions";

/**
 * Optional emissive bloom. Default off (`LIGHTING.bloom.enabled`).
 * `?bloom=1` turns it on; `?bloom=0` forces it off.
 *
 * The pass is a child so its `useFrame(..., 1)` exists only while bloom is on.
 * R3F skips `gl.render` whenever any positive-priority callback is mounted
 * (`internal.priority > 0`). A disabled pass that still subscribed at
 * priority 1 left the canvas on the initial black clear.
 */
export function bloomOn(): boolean {
  if (typeof window === "undefined") return LIGHTING.bloom.enabled;
  const q = new URLSearchParams(window.location.search).get("bloom");
  if (q === "0") return false;
  if (q === "1") return true;
  return LIGHTING.bloom.enabled;
}

export function EmissiveBloom() {
  if (!bloomOn()) return null;
  return <EmissiveBloomPass />;
}

function EmissiveBloomPass() {
  const { gl, scene, camera, size } = useThree();
  const failed = useRef(false);
  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    c.addPass(new RenderPass(scene, camera));
    c.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(size.width, size.height),
        LIGHTING.bloom.strength,
        LIGHTING.bloom.radius,
        LIGHTING.bloom.threshold,
      ),
    );
    c.addPass(new OutputPass());
    return c;
  }, [gl, scene, camera, size.width, size.height]);

  useEffect(() => {
    composer?.setSize(size.width, size.height);
  }, [composer, size.width, size.height]);

  useFrame(() => {
    if (!composer || failed.current) return;
    try {
      composer.render();
    } catch {
      failed.current = true;
    }
  }, 1);

  return null;
}
