
import { useMemo, useRef } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import * as THREE from "three";
import {
  isMainFramebufferReady,
  withOffscreenRender,
} from "@/lib/glOffscreen";
import {
  facingNormal,
  nearPlaneForMirror,
  reflectCameraPosition,
  type Vec3,
} from "@/lib/mirrorMath";

/**
 * Live planar interior mirror (opt-in).
 *
 * Default product glass remains MeshStandardMaterial in SenmenDisplay.
 * Enable with `?mirrorLive=1` (optional `?mirrorDebug=1`).
 *
 * Safety (see Architecture.md):
 * - useFBO + withOffscreenRender (viewport never restored as 0×0)
 * - createPortal to scene root at world pose (escape plan-mirror scale −1)
 * - skip until main framebuffer is sized
 * - virtualCam.near clips wall between reflected cam and room
 */

export type MirrorDebugState = {
  mode: "live" | "skipped";
  reason?: string;
  fboSize: number;
  lastDist: number;
  lastNear: number;
  frames: number;
  live: boolean;
};

declare global {
  interface Window {
    __MIRROR_DEBUG__?: MirrorDebugState;
  }
}

export function isMirrorLiveEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search);
    // Explicit off wins
    if (q.get("mirrorLive") === "0") return false;
    return q.has("mirrorLive") || q.get("mirrorLive") === "1";
  } catch {
    return false;
  }
}

function isMirrorDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).has("mirrorDebug");
  } catch {
    return false;
  }
}

type InteriorMirrorProps = {
  /** World-space centre */
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  resolution?: number;
};

export function InteriorMirror({
  position,
  rotation = [0, Math.PI, 0],
  width,
  height,
  resolution = 512,
}: InteriorMirrorProps) {
  const { gl, scene, camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const live = useMemo(() => isMirrorLiveEnabled(), []);
  const debug = useMemo(() => isMirrorDebugEnabled(), []);
  const framesRef = useRef(0);

  const fbo = useFBO(resolution, resolution, {
    depthBuffer: true,
    samples: 0,
  });

  const { virtualCam, material } = useMemo(() => {
    const virtualCam = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    const material = new THREE.MeshBasicMaterial({
      map: null,
      color: 0xffffff,
      toneMapped: false,
      fog: false,
      side: THREE.DoubleSide,
    });
    return { virtualCam, material };
  }, []);

  useFrame(() => {
    if (!live) return;
    const mesh = meshRef.current;
    if (!mesh) return;

    framesRef.current += 1;

    if (!isMainFramebufferReady(gl)) {
      if (debug) {
        window.__MIRROR_DEBUG__ = {
          mode: "skipped",
          reason: "framebuffer-not-ready",
          fboSize: resolution,
          lastDist: 0,
          lastNear: 0,
          frames: framesRef.current,
          live: true,
        };
      }
      return;
    }

    mesh.updateWorldMatrix(true, false);
    const e = mesh.matrixWorld.elements;
    const planePoint: Vec3 = [e[12], e[13], e[14]];

    const nWorld = new THREE.Vector3(0, 0, 1)
      .transformDirection(mesh.matrixWorld)
      .normalize();
    let nUnit: Vec3 = [nWorld.x, nWorld.y, nWorld.z];

    const camPos: Vec3 = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ];
    nUnit = facingNormal(planePoint, nUnit, camPos);

    const vPos = reflectCameraPosition(camPos, planePoint, nUnit);
    const near = nearPlaneForMirror(vPos, planePoint, 0.97, 0.08);
    const dist = Math.hypot(
      camPos[0] - planePoint[0],
      camPos[1] - planePoint[1],
      camPos[2] - planePoint[2],
    );

    const main = camera as THREE.PerspectiveCamera;
    virtualCam.position.set(vPos[0], vPos[1], vPos[2]);
    virtualCam.fov = main.fov ?? 70;
    virtualCam.aspect = main.aspect || 1;
    virtualCam.near = near;
    virtualCam.far = Math.max(near + 2, Math.min(80, main.far || 80));
    virtualCam.up.set(0, 1, 0);
    // Look through the mirror into the room (along facing normal from plane)
    virtualCam.lookAt(
      planePoint[0] + nUnit[0],
      planePoint[1] + nUnit[1],
      planePoint[2] + nUnit[2],
    );
    virtualCam.updateProjectionMatrix();
    virtualCam.updateMatrixWorld(true);

    mesh.visible = false;
    try {
      withOffscreenRender(
        gl,
        scene,
        fbo,
        () => {
          gl.render(scene, virtualCam);
        },
        {
          clearColor: 0xc5d0dc,
          clearAlpha: 1,
          disableFog: true,
        },
      );
    } finally {
      mesh.visible = true;
    }

    if (material.map !== fbo.texture) {
      material.map = fbo.texture;
      material.needsUpdate = true;
    }

    if (debug) {
      window.__MIRROR_DEBUG__ = {
        mode: "live",
        fboSize: resolution,
        lastDist: dist,
        lastNear: near,
        frames: framesRef.current,
        live: true,
      };
    }
  }, 1);

  if (!live) return null;

  return createPortal(
    <mesh
      ref={meshRef}
      name="interior-mirror-live"
      position={position}
      rotation={rotation}
      material={material}
      renderOrder={2}
      userData={{ mirrorLive: true }}
    >
      <planeGeometry args={[width, height]} />
    </mesh>,
    scene,
  );
}
