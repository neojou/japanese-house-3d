"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PLAYER } from "@/data/dimensions";
import { useViewerStore } from "@/store/useViewerStore";

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * WASD locomotion for first-person mode.
 * Reads camera facing from the active PerspectiveCamera (PointerLockControls).
 * Phase 1: no collision; player can walk through walls.
 */
export function Player() {
  const mode = useViewerStore((s) => s.mode);
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const active = mode === "first-person";

  useEffect(() => {
    if (!active) return;

    const down = (e: KeyboardEvent) => {
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
  }, [active]);

  useFrame((_, delta) => {
    if (!active) return;

    // Horizontal facing only
    camera.getWorldDirection(_forward);
    _forward.y = 0;
    if (_forward.lengthSq() < 1e-6) return;
    _forward.normalize();
    _right.crossVectors(_forward, _up).normalize();

    _move.set(0, 0, 0);
    if (keys.current["KeyW"] || keys.current["ArrowUp"]) _move.add(_forward);
    if (keys.current["KeyS"] || keys.current["ArrowDown"]) _move.sub(_forward);
    if (keys.current["KeyD"] || keys.current["ArrowRight"]) _move.add(_right);
    if (keys.current["KeyA"] || keys.current["ArrowLeft"]) _move.sub(_right);

    if (_move.lengthSq() > 0) {
      _move.normalize().multiplyScalar(PLAYER.moveSpeed * delta);
      camera.position.add(_move);
    }

    // Keep eye height (Phase 1: stay on current Y plane of spawn floor)
    camera.position.y = PLAYER.spawn.y + PLAYER.eyeHeight;
  });

  // Invisible marker at feet (debug / future collision anchor)
  if (!active) return null;

  return (
    <mesh
      position={[
        camera.position.x,
        PLAYER.spawn.y + 0.05,
        camera.position.z,
      ]}
      visible={false}
    >
      <cylinderGeometry args={[0.2, 0.2, 0.1, 12]} />
      <meshBasicMaterial color="hotpink" />
    </mesh>
  );
}
