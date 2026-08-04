
import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PLAYER } from "@/data/dimensions";
import { worldToPlanX } from "@/lib/coords";
import { getGroundHeight } from "@/lib/height";
import { getInputAxes, resetInput, setKeyboardMove } from "@/lib/input";
import { useViewerStore } from "@/store/useViewerStore";

const _forward = new THREE.Vector3();
const _move = new THREE.Vector3();

/**
 * First-person walk: W/S (or ↑↓) or virtual D-pad ↑↓ forward/back.
 * A/D turn is handled by FirstPersonCamera (discrete keyboard; continuous virtual).
 * Look: Pointer Lock (desktop) or touch drag (coarse) in FirstPersonCamera.
 */
export function Player() {
  const { camera } = useThree();
  const setPosition = useViewerStore((s) => s.setPosition);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "KeyW" || e.code === "ArrowUp") {
        setKeyboardMove("forward", true);
        if (e.code === "ArrowUp") e.preventDefault();
      } else if (e.code === "KeyS" || e.code === "ArrowDown") {
        setKeyboardMove("back", true);
        if (e.code === "ArrowDown") e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "KeyW" || e.code === "ArrowUp") {
        setKeyboardMove("forward", false);
      } else if (e.code === "KeyS" || e.code === "ArrowDown") {
        setKeyboardMove("back", false);
      }
    };
    const blur = () => resetInput();

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      resetInput();
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

    const axes = getInputAxes();
    _move.set(0, 0, 0);
    if (axes.forward) _move.add(_forward);
    if (axes.back) _move.sub(_forward);

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
