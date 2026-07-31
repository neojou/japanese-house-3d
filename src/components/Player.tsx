"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PLAYER } from "@/data/dimensions";
import { worldToPlanX } from "@/lib/coords";
import { getGroundHeight } from "@/lib/height";
import { useViewerStore } from "@/store/useViewerStore";

const _forward = new THREE.Vector3();
const _move = new THREE.Vector3();

const TURN_RAD = THREE.MathUtils.degToRad(PLAYER.turnDegrees);

/**
 * First-person controls + ground height follow (steps / raised genkan).
 *   W/S move · A/D turn 10°
 * Eye Y = groundHeight + eyeHeight (1.5 outside → 1.75 / 2.00 on steps)
 */
export function Player() {
  const { camera } = useThree();
  const setPosition = useViewerStore((s) => s.setPosition);
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "KeyA" || e.code === "ArrowLeft") {
        e.preventDefault();
        camera.rotation.order = "YXZ";
        camera.rotation.y += TURN_RAD;
        return;
      }
      if (e.code === "KeyD" || e.code === "ArrowRight") {
        e.preventDefault();
        camera.rotation.order = "YXZ";
        camera.rotation.y -= TURN_RAD;
        return;
      }
      keys.current[e.code] = true;
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keys.current = {};
    };
  }, [camera]);

  useFrame((_, delta) => {
    camera.getWorldDirection(_forward);
    _forward.y = 0;
    if (_forward.lengthSq() > 1e-6) {
      _forward.normalize();
      _move.set(0, 0, 0);
      if (keys.current["KeyW"] || keys.current["ArrowUp"]) _move.add(_forward);
      if (keys.current["KeyS"] || keys.current["ArrowDown"]) _move.sub(_forward);

      if (_move.lengthSq() > 0) {
        _move.normalize().multiplyScalar(PLAYER.moveSpeed * delta);
        camera.position.add(_move);
      }
    }

    // Stand on ground / steps / raised genkan (no clipping into solids)
    const planX = worldToPlanX(camera.position.x);
    const groundY = getGroundHeight(planX, camera.position.z);
    camera.position.y = groundY + PLAYER.eyeHeight;

    setPosition({
      x: planX,
      y: camera.position.y,
      z: camera.position.z,
    });
  });

  return null;
}
