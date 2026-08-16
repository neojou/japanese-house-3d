
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createInteriorCubeEnv } from "@/lib/interiorEnvMap";

/**
 * Vanity glass. CubeCamera MUST be a child of this group (plan space)
 * so it inherits plan-mirror scale[-1,1,1]. Setting plan X on a detached
 * CubeCamera treats it as world X → probe jumps to the other side of the
 * lot and the envMap shows outdoor grass (see senmenMirror.ts tests).
 */

type SenmenMirrorGlassProps = {
  /** Glass centre (plan space) */
  position: [number, number, number];
  /** Probe (plan space), inside senmen, south of the glass */
  probePosition: [number, number, number];
  width: number;
  height: number;
  thickness: number;
};

export function SenmenMirrorGlass({
  position,
  probePosition,
  width,
  height,
  thickness,
}: SenmenMirrorGlassProps) {
  const { gl, scene } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const frames = useRef(0);
  const shots = useRef(0);

  const fallback = useMemo(() => createInteriorCubeEnv(), []);

  const rt = useMemo(() => {
    return new THREE.WebGLCubeRenderTarget(256, {
      type: THREE.HalfFloatType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
  }, []);

  const cubeCam = useMemo(
    () => new THREE.CubeCamera(0.18, 12, rt),
    [rt],
  );

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e4eaf0",
        roughness: 0.045,
        metalness: 0.96,
        envMap: fallback,
        envMapIntensity: 1.25,
      }),
    [fallback],
  );

  useLayoutEffect(() => {
    return () => {
      rt.dispose();
      material.dispose();
    };
  }, [rt, material]);

  useFrame(() => {
    frames.current += 1;
    if (frames.current < 75) return;
    if (shots.current >= 3) return;
    if ((frames.current - 75) % 45 !== 0) return;

    const mesh = meshRef.current;
    try {
      if (mesh) mesh.visible = false;
      // cubeCam is parented in plan space — do not overwrite with world coords
      cubeCam.updateMatrixWorld();
      cubeCam.update(gl, scene);
      material.envMap = rt.texture;
      material.needsUpdate = true;
      shots.current += 1;
    } catch {
      /* keep fallback */
    } finally {
      if (mesh) mesh.visible = true;
    }
  });

  return (
    <group name="senmen-mirror">
      {/* Inherits plan-mirror; local = plan meters */}
      <primitive object={cubeCam} position={probePosition} />
      <mesh
        ref={meshRef}
        name="senmen-mirror-glass"
        position={position}
        material={material}
        castShadow
      >
        <boxGeometry args={[width, height, thickness]} />
      </mesh>
    </group>
  );
}
