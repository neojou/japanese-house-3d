/**
 * Distance-field wet stain for UB floor + bath mat.
 * Plan-space XZ; not affected by plan-mirror (uses local + origin).
 */
import * as THREE from "three";

export type TubWetUniforms = {
  uWetR: { value: number };
  uMoisture: { value: number };
  uPuddle: { value: number };
  uTub: { value: THREE.Vector2 };
  uHalf: { value: THREE.Vector2 };
  uOrigin: { value: THREE.Vector2 };
  uDry: { value: THREE.Color };
  uWet: { value: THREE.Color };
  uSheen: { value: THREE.Color };
};

export function createTubWetUniforms(
  tubX: number,
  tubZ: number,
  halfW: number,
  halfL: number,
  originX: number,
  originZ: number,
  dry: string,
  wet: string,
): TubWetUniforms {
  return {
    uWetR: { value: 0 },
    uMoisture: { value: 0 },
    uPuddle: { value: 0 },
    uTub: { value: new THREE.Vector2(tubX, tubZ) },
    uHalf: { value: new THREE.Vector2(halfW, halfL) },
    uOrigin: { value: new THREE.Vector2(originX, originZ) },
    uDry: { value: new THREE.Color(dry) },
    uWet: { value: new THREE.Color(wet) },
    uSheen: { value: new THREE.Color("#7fa8bb") },
  };
}

const VERT = /* glsl */ `
varying vec2 vPlan;
uniform vec2 uOrigin;
void main() {
  vPlan = position.xz + uOrigin;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
varying vec2 vPlan;
uniform float uWetR;
uniform float uMoisture;
uniform float uPuddle;
uniform vec2 uTub;
uniform vec2 uHalf;
uniform vec3 uDry;
uniform vec3 uWet;
uniform vec3 uSheen;
void main() {
  vec2 n = (vPlan - uTub) / uHalf;
  float e = length(n);
  if (e < 0.93) discard;
  float outside = max(0.0, e - 1.0);
  float reached = 1.0 - smoothstep(uWetR, uWetR + 0.18, outside);
  if (reached * uMoisture < 0.01) discard;
  float nearAmt = 1.0 - smoothstep(0.0, max(uWetR, 0.08), outside);
  float local = mix(0.45, 1.0, nearAmt);
  float wet = reached * local * uMoisture;
  vec3 col = mix(uDry, uWet, wet);
  float puddle = (1.0 - smoothstep(0.0, 0.18, outside)) * uPuddle;
  col = mix(col, uSheen, puddle * 0.28);
  gl_FragColor = vec4(col, clamp(0.35 + wet * 0.5, 0.0, 0.88));
}
`;

export function createTubFloorWetMaterial(
  uniforms: TubWetUniforms,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: uniforms as unknown as { [k: string]: THREE.IUniform },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Darken MeshStandard wool in-place with the same wet field. */
export function attachTowelWetField(
  mat: THREE.MeshStandardMaterial,
  uniforms: TubWetUniforms,
): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWetR = uniforms.uWetR;
    shader.uniforms.uMoisture = uniforms.uMoisture;
    shader.uniforms.uTub = uniforms.uTub;
    shader.uniforms.uHalf = uniforms.uHalf;
    shader.uniforms.uOrigin = uniforms.uOrigin;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec2 vPlan;
uniform vec2 uOrigin;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vPlan = transformed.xz + uOrigin;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec2 vPlan;
uniform float uWetR;
uniform float uMoisture;
uniform vec2 uTub;
uniform vec2 uHalf;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
{
  vec2 n = (vPlan - uTub) / uHalf;
  float e = length(n);
  float outside = max(0.0, e - 1.0);
  float reached = 1.0 - smoothstep(uWetR, uWetR + 0.18, outside);
  float nearAmt = 1.0 - smoothstep(0.0, max(uWetR, 0.08), outside);
  float wet = reached * mix(0.45, 1.0, nearAmt) * uMoisture;
  vec3 soaked = vec3(0.78, 0.68, 0.50);
  diffuseColor.rgb = mix(diffuseColor.rgb, soaked, clamp(wet, 0.0, 1.0));
}
`,
      );
  };
  mat.customProgramCacheKey = () => "tub-wet-towel-v2";
  mat.needsUpdate = true;
}
