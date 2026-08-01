
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PLAYER } from "@/data/dimensions";
import { worldToPlanX } from "@/lib/coords";
import { getGroundHeight } from "@/lib/height";
import { useViewerStore } from "@/store/useViewerStore";

const _forward = new THREE.Vector3();
const _move = new THREE.Vector3();

/**
 * First-person walk: W/S (or ↑↓) forward/back only.
 * A/D turn is handled by FirstPersonCamera (discrete yaw steps).
 * Look: Pointer Lock in FirstPersonCamera.
 */
export function Player() {
  const { camera } = useThree();
  const setPosition = useViewerStore((s) => s.setPosition);
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === "ArrowUp" || e.code === "ArrowDown") {
        e.preventDefault();
      }
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
  }, []);

  useFrame((_, delta) => {
    camera.getWorldDirection(_forward);
    _forward.y = 0;
    if (_forward.lengthSq() < 1e-6) {
      const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
      _forward.set(-Math.sin(e.y), 0, -Math.cos(e.y));
    } else {
      _forward.normalize();
    }

    _move.set(0, 0, 0);
    if (keys.current["KeyW"] || keys.current["ArrowUp"]) _move.add(_forward);
    if (keys.current["KeyS"] || keys.current["ArrowDown"]) _move.sub(_forward);

    if (_move.lengthSq() > 0) {
      _move.normalize().multiplyScalar(PLAYER.moveSpeed * delta);
      camera.position.add(_move);
    }

    const planX = worldToPlanX(camera.position.x);
    const feetY = camera.position.y - PLAYER.eyeHeight;
    const groundY = getGroundHeight(planX, camera.position.z, feetY);
    camera.position.y = groundY + PLAYER.eyeHeight;

    setPosition({
      x: planX,
      y: camera.position.y,
      z: camera.position.z,
    });
  });

  return null;
}
