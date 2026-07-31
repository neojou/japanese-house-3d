"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import type { OrthographicCamera as OrthographicCameraImpl } from "three";
import { CAMERA } from "@/data/dimensions";
import { useViewerStore } from "@/store/useViewerStore";

/**
 * Plan-aligned orthographic top-down (north up).
 *
 * The house is mirrored in X in Scene (see lib/coords.ts), so with a normal
 * lookAt + up=(0,0,1) view:
 *   screen top    = North
 *   screen bottom = South (parking)
 *   screen left   = LDK
 *   screen right  = genkan / UB
 */
export function TopDownCamera() {
  const mode = useViewerStore((s) => s.mode);
  const camRef = useRef<OrthographicCameraImpl>(null);
  const { gl, set, size } = useThree();
  const active = mode === "top-down";

  const target = useRef({
    x: CAMERA.topDown.target.x,
    y: CAMERA.topDown.target.y,
    z: CAMERA.topDown.target.z,
  });
  const zoom = useRef<number>(CAMERA.topDown.zoom);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const cam = camRef.current;
    if (!cam || !active) return;
    set({ camera: cam });
  }, [active, set]);

  useEffect(() => {
    if (!active) return;
    const el = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };

      const scale = CAMERA.topDown.panSpeed * (80 / zoom.current);
      // Grab-the-world: drag right → content right → target −X (natural ortho)
      target.current.x -= dx * scale;
      // drag down → content south → target −Z
      target.current.z -= dy * scale;
    };

    const onPointerUp = (e: PointerEvent) => {
      dragging.current = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Smaller zoom = more zoomed out
      const next =
        zoom.current - e.deltaY * CAMERA.topDown.zoomSpeed * zoom.current;
      zoom.current = Math.min(
        CAMERA.topDown.maxZoom,
        Math.max(CAMERA.topDown.minZoom, next),
      );
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [active, gl]);

  useFrame(() => {
    if (!active || !camRef.current) return;
    const cam = camRef.current;

    cam.position.set(
      target.current.x,
      CAMERA.topDown.height,
      target.current.z,
    );
    cam.up.set(0, 0, 1);
    cam.lookAt(target.current.x, 0, target.current.z);
    cam.zoom = zoom.current;

    // Larger frustum so minZoom can show the whole site
    const aspect = size.width / Math.max(size.height, 1);
    const frustum = CAMERA.topDown.frustum;
    const halfW = (frustum * aspect) / 2;
    const halfH = frustum / 2;
    cam.left = -halfW;
    cam.right = halfW;
    cam.top = halfH;
    cam.bottom = -halfH;
    cam.updateProjectionMatrix();
  });

  return (
    <OrthographicCamera
      ref={camRef}
      makeDefault={active}
      near={0.1}
      far={200}
      zoom={CAMERA.topDown.zoom}
      position={[
        CAMERA.topDown.target.x,
        CAMERA.topDown.height,
        CAMERA.topDown.target.z,
      ]}
    />
  );
}
