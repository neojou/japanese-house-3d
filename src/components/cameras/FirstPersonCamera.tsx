"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { PLAYER } from "@/data/dimensions";
import { planToWorldX } from "@/lib/coords";
import { useViewerStore } from "@/store/useViewerStore";

/**
 * Spawn in parking (world space), facing north at the genkan door.
 * House is X-mirrored so: left = LDK, right = genkan.
 */
export function FirstPersonCamera() {
  const mode = useViewerStore((s) => s.mode);
  const controlsRef = useRef<PointerLockControlsImpl | null>(null);
  const { camera } = useThree();
  const active = mode === "first-person";

  useEffect(() => {
    if (!active) {
      controlsRef.current?.unlock();
      return;
    }

    const eyeY = PLAYER.spawn.y + PLAYER.eyeHeight;
    const worldX = planToWorldX(PLAYER.spawn.x);
    camera.position.set(worldX, eyeY, PLAYER.spawn.z);
    camera.up.set(0, 1, 0);

    // Face north (+Z) toward genkan door
    const look = new THREE.Vector3(worldX, eyeY, PLAYER.spawn.z + 1);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
  }, [active, camera]);

  if (!active) return null;

  return <PointerLockControls ref={controlsRef} selector="canvas" />;
}
