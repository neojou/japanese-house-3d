
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PLAYER } from "@/data/dimensions";
import { planToWorldX, worldToPlanX } from "@/lib/coords";
import { getInputAxes, isCoarsePointer } from "@/lib/input";
import { useViewerStore } from "@/store/useViewerStore";

const PITCH_LIMIT = THREE.MathUtils.degToRad(85);
/** Pixels of movement before a touch counts as drag-look (not a tap) */
const TAP_MOVE_PX = 10;
const _euler = new THREE.Euler(0, 0, 0, "YXZ");
const _ndc = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();

/** Walk parent chain for door meshes marked `userData.interactable === "door"`. */
function isDoorInteractable(obj: THREE.Object3D | null): boolean {
  let o: THREE.Object3D | null = obj;
  while (o) {
    if (o.userData?.interactable === "door") return true;
    o = o.parent;
  }
  return false;
}

function rayHitsDoor(
  clientX: number,
  clientY: number,
  el: HTMLElement,
  camera: THREE.Camera,
  scene: THREE.Scene,
): boolean {
  const rect = el.getBoundingClientRect();
  const w = rect.width || 1;
  const h = rect.height || 1;
  _ndc.x = ((clientX - rect.left) / w) * 2 - 1;
  _ndc.y = -((clientY - rect.top) / h) * 2 + 1;
  _raycaster.setFromCamera(_ndc, camera);
  const hits = _raycaster.intersectObjects(scene.children, true);
  for (const hit of hits) {
    if (isDoorInteractable(hit.object)) return true;
  }
  return false;
}

/**
 * First-person camera:
 * - Desktop: Pointer Lock mouse look; click empty → lock; Esc unlock
 * - Coarse/touch: single-finger drag look; no pointer lock
 * - Keyboard A/D / ←→: discrete yaw steps (PLAYER.turnDegrees)
 * - Virtual D-pad ←→: continuous hold-to-turn (PLAYER.virtualTurnSpeedDeg)
 * - Click/tap door → open only (R3F onClick + no lock on door hit)
 */
export function FirstPersonCamera() {
  const { camera, gl, scene } = useThree();
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

  // Pointer lock (desktop) + touch drag look (coarse)
  useEffect(() => {
    const el = gl.domElement;
    const coarse = isCoarsePointer();

    const applyLookDelta = (dx: number, dy: number, sens: number) => {
      yaw.current -= dx * sens;
      pitch.current -= dy * sens;
      pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current));
    };

    const onClick = (e: MouseEvent) => {
      // Touch devices: no pointer lock; R3F handles door taps
      if (coarse) return;
      if (document.pointerLockElement === el) return;
      if (rayHitsDoor(e.clientX, e.clientY, el, camera, scene)) return;
      el.requestPointerLock();
    };

    const onLockChange = () => {
      locked.current = document.pointerLockElement === el;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return;
      applyLookDelta(e.movementX, e.movementY, PLAYER.lookSensitivity);
    };

    let pointerId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let cumDist = 0;
    let dragging = false;

    const onPointerDown = (e: PointerEvent) => {
      if (!coarse) return;
      if (e.pointerType === "mouse") return;
      if (pointerId !== null) return;

      pointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      cumDist = 0;
      dragging = false;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return;

      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      cumDist += Math.hypot(dx, dy);

      if (cumDist > TAP_MOVE_PX) {
        dragging = true;
        applyLookDelta(dx, dy, PLAYER.touchLookSensitivity);
      }
    };

    const endPointer = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      pointerId = null;
      // Tap (no drag): leave door open/close to R3F click; empty tap does nothing
      void dragging;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    el.addEventListener("click", onClick);
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("mousemove", onMouseMove);

    if (coarse) {
      el.addEventListener("pointerdown", onPointerDown);
      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerup", endPointer);
      el.addEventListener("pointercancel", endPointer);
    }

    return () => {
      el.removeEventListener("click", onClick);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endPointer);
      el.removeEventListener("pointercancel", endPointer);
      if (document.pointerLockElement === el) {
        document.exitPointerLock();
      }
    };
  }, [gl, camera, scene]);

  // Discrete A/D (and arrows) turn — must update yaw here so useFrame does not overwrite
  useEffect(() => {
    const step = THREE.MathUtils.degToRad(PLAYER.turnDegrees);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyA" || e.code === "ArrowLeft") {
        yaw.current += step;
        if (e.code === "ArrowLeft") e.preventDefault();
      } else if (e.code === "KeyD" || e.code === "ArrowRight") {
        yaw.current -= step;
        if (e.code === "ArrowRight") e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useFrame((_, delta) => {
    // Virtual D-pad continuous turn
    const axes = getInputAxes();
    if (axes.turnLeft || axes.turnRight) {
      const rate = THREE.MathUtils.degToRad(PLAYER.virtualTurnSpeedDeg) * delta;
      if (axes.turnLeft) yaw.current += rate;
      if (axes.turnRight) yaw.current -= rate;
    }

    camera.rotation.order = "YXZ";
    _euler.set(pitch.current, yaw.current, 0, "YXZ");
    camera.quaternion.setFromEuler(_euler);
  });

  return null;
}
