"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PLAYER } from "@/data/dimensions";
import { planToWorldX, worldToPlanX } from "@/lib/coords";
import { useViewerStore } from "@/store/useViewerStore";

const PITCH_LIMIT = THREE.MathUtils.degToRad(85);
const _euler = new THREE.Euler(0, 0, 0, "YXZ");

/**
 * First-person camera:
 * - Pointer Lock mouse look (yaw + pitch)
 * - A / D / ← / → discrete yaw steps (PLAYER.turnDegrees)
 * - Esc unlocks pointer so doors can be clicked
 */
export function FirstPersonCamera() {
  const { camera, gl } = useThree();
  const setPosition = useViewerStore((s) => s.setPosition);
  const locked = useRef(false);
  const yaw = useRef(0);
  const pitch = useRef(0);

  useEffect(() => {
    const eyeY = PLAYER.spawn.y + PLAYER.eyeHeight;
    const worldX = planToWorldX(PLAYER.spawn.x);
    camera.position.set(worldX, eyeY, PLAYER.spawn.z);
    camera.up.set(0, 1, 0);
    camera.rotation.order = "YXZ";

    // Face north (+Z) toward genkan
    const look = new THREE.Vector3(worldX, eyeY, PLAYER.spawn.z + 1);
    camera.lookAt(look);
    camera.rotation.order = "YXZ";
    yaw.current = camera.rotation.y;
    pitch.current = camera.rotation.x;
    camera.updateProjectionMatrix();

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    setPosition({
      x: worldToPlanX(worldX),
      y: eyeY,
      z: PLAYER.spawn.z,
    });
  }, [camera, setPosition]);

  // Pointer lock + mouse look
  useEffect(() => {
    const el = gl.domElement;

    const onClick = () => {
      if (document.pointerLockElement !== el) {
        el.requestPointerLock();
      }
    };

    const onLockChange = () => {
      locked.current = document.pointerLockElement === el;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return;
      const sens = PLAYER.lookSensitivity;
      yaw.current -= e.movementX * sens;
      pitch.current -= e.movementY * sens;
      pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current));
    };

    el.addEventListener("click", onClick);
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("mousemove", onMouseMove);

    return () => {
      el.removeEventListener("click", onClick);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("mousemove", onMouseMove);
      if (document.pointerLockElement === el) {
        document.exitPointerLock();
      }
    };
  }, [gl]);

  // Discrete A/D (and arrows) turn — must update yaw here so useFrame does not overwrite
  useEffect(() => {
    const step = THREE.MathUtils.degToRad(PLAYER.turnDegrees);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyA" || e.code === "ArrowLeft") {
        // Turn left (same sign as mouse look-left: yaw increases)
        yaw.current += step;
        if (e.code === "ArrowLeft") e.preventDefault();
      } else if (e.code === "KeyD" || e.code === "ArrowRight") {
        // Turn right
        yaw.current -= step;
        if (e.code === "ArrowRight") e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useFrame(() => {
    camera.rotation.order = "YXZ";
    _euler.set(pitch.current, yaw.current, 0, "YXZ");
    camera.quaternion.setFromEuler(_euler);
  });

  return null;
}
