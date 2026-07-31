"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PLAYER } from "@/data/dimensions";
import { planToWorldX, worldToPlanX } from "@/lib/coords";
import { useViewerStore } from "@/store/useViewerStore";

/**
 * First-person camera without PointerLock.
 * Look: A/D turn only. Move: W/S. Interact: click genkan door.
 */
export function FirstPersonCamera() {
  const { camera } = useThree();
  const setPosition = useViewerStore((s) => s.setPosition);

  useEffect(() => {
    const eyeY = PLAYER.spawn.y + PLAYER.eyeHeight;
    const worldX = planToWorldX(PLAYER.spawn.x);
    camera.position.set(worldX, eyeY, PLAYER.spawn.z);
    camera.up.set(0, 1, 0);
    camera.rotation.order = "YXZ";

    // Face north (+Z) toward genkan door
    const look = new THREE.Vector3(worldX, eyeY, PLAYER.spawn.z + 1);
    camera.lookAt(look);
    camera.rotation.order = "YXZ";
    camera.updateProjectionMatrix();

    // If pointer was locked from a previous session, release it
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    setPosition({
      x: worldToPlanX(worldX),
      y: eyeY,
      z: PLAYER.spawn.z,
    });
  }, [camera, setPosition]);

  return null;
}
