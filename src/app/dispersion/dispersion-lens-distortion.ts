import {
  lensDistortionFragmentShader,
  lensDistortionMeta,
} from "@paper-design/shaders";
import type { LensDistortionProps } from "@paper-design/shaders-react";
import * as THREE from "three";

import type { LensDistortionSettings } from "./dispersion-lens-distortion-values";
import { DISPERSION_REMOVE_BACKDROP_GLSL } from "./dispersion-backdrop";

const PAPER_FRAGMENT_VERSION = /^#version 300 es\s*/u;

export const PAPER_LENS_DISTORTION_FRAGMENT_SHADER = (() => {
  if (!PAPER_FRAGMENT_VERSION.test(lensDistortionFragmentShader)) {
    throw new Error(
      "The pinned Paper Lens Distortion shader no longer exposes its GLSL 300 source.",
    );
  }
  const source = lensDistortionFragmentShader.replace(PAPER_FRAGMENT_VERSION, "");
  if (!source.includes("void main() {")) {
    throw new Error("The pinned Paper Lens Distortion shader entry point changed.");
  }
  const viewportMarkers = [
    "uniform sampler2D u_image;",
    "texture(u_image, uv)",
    "img.a * getUvFrame(uv)",
  ];
  if (viewportMarkers.some((marker) => !source.includes(marker))) {
    throw new Error("The pinned Paper Lens Distortion image sampling changed.");
  }
  // Keep Paper's optical recipe intact. Infinity removes the selected backdrop
  // only after lens sampling, which requires the same opaque input as finite mode.
  const viewportSource = source
    .replace("uniform sampler2D u_image;", `uniform sampler2D u_image;
uniform highp vec4 uViewWindow;
uniform float uInfinite;`)
    .replace("texture(u_image, uv)", "texture(u_image, (uv - uViewWindow.xy) / uViewWindow.zw)")
    .replace("img.a * getUvFrame(uv)", "img.a * (uInfinite > 0.5 ? 1.0 : getUvFrame(uv))");
  return `${viewportSource.replace("void main() {", "void paperLensMain() {")}
uniform float uRemoveBackdrop;
uniform vec3 uBg;
${DISPERSION_REMOVE_BACKDROP_GLSL}
void main() {
  paperLensMain();
  if (uRemoveBackdrop > 0.5) {
    fragColor = dispersionRemoveBackdrop(fragColor, uBg);
  }
}
`;
})();

const PAPER_LENS_VERTEX_SHADER = `
varying vec2 v_imageUV;
uniform highp vec4 uViewWindow;

void main() {
  v_imageUV = uv * uViewWindow.zw + uViewWindow.xy;
  gl_Position = vec4(position, 1.0);
}
`;

type PaperLensParameters = Required<
  Pick<
    LensDistortionProps,
    | "angle"
    | "bias"
    | "count"
    | "dispersion"
    | "dispersionColor"
    | "dispersionShift"
    | "focusCenter"
    | "focusEdges"
    | "grainMixer"
    | "grainOverlay"
    | "imageX"
    | "imageY"
    | "lensBulge"
    | "lensCircle"
    | "noise"
    | "noiseFrequency"
    | "noiseOffset"
    | "perspective"
    | "spread"
    | "swirl"
  >
>;

const PAPER_LENS_PARAMETER_KEYS = [
  "angle",
  "bias",
  "count",
  "dispersion",
  "dispersionColor",
  "dispersionShift",
  "focusCenter",
  "focusEdges",
  "grainMixer",
  "grainOverlay",
  "imageX",
  "imageY",
  "lensBulge",
  "lensCircle",
  "noise",
  "noiseFrequency",
  "noiseOffset",
  "perspective",
  "spread",
  "swirl",
] as const satisfies readonly (keyof PaperLensParameters)[];

export function toPaperLensParameters(
  settings: LensDistortionSettings,
): PaperLensParameters {
  return {
    angle: settings.angle,
    bias: settings.bias,
    count: Math.min(lensDistortionMeta.maxSamples, settings.count),
    dispersion: settings.dispersion,
    dispersionColor: settings.dispersionColor,
    dispersionShift: settings.dispersionShift,
    focusCenter: settings.focusCenter,
    focusEdges: settings.focusEdges,
    grainMixer: settings.grainMixer,
    grainOverlay: settings.grainOverlay,
    imageX: settings.imageX,
    imageY: settings.imageY,
    lensBulge: settings.lensBulge,
    lensCircle: settings.lensCircle,
    noise: settings.noise,
    noiseFrequency: settings.noiseFrequency,
    noiseOffset: settings.noiseOffset,
    perspective: settings.perspective,
    spread: settings.spread,
    swirl: settings.swirl,
  };
}

type LensUniforms = Readonly<{
  uViewWindow: THREE.Uniform<THREE.Vector4>;
  uInfinite: THREE.Uniform<number>;
  uRemoveBackdrop: THREE.Uniform<number>;
  uBg: THREE.Uniform<THREE.Vector3>;
  u_angle: THREE.Uniform<number>;
  u_bias: THREE.Uniform<number>;
  u_count: THREE.Uniform<number>;
  u_dispersion: THREE.Uniform<number>;
  u_dispersionColor: THREE.Uniform<number>;
  u_dispersionShift: THREE.Uniform<number>;
  u_focusCenter: THREE.Uniform<number>;
  u_focusEdges: THREE.Uniform<number>;
  u_grainMixer: THREE.Uniform<number>;
  u_grainOverlay: THREE.Uniform<number>;
  u_image: THREE.Uniform<THREE.Texture | null>;
  u_imageAspectRatio: THREE.Uniform<number>;
  u_imageX: THREE.Uniform<number>;
  u_imageY: THREE.Uniform<number>;
  u_lensBulge: THREE.Uniform<number>;
  u_lensCircle: THREE.Uniform<number>;
  u_noise: THREE.Uniform<number>;
  u_noiseFrequency: THREE.Uniform<number>;
  u_noiseOffset: THREE.Uniform<number>;
  u_perspective: THREE.Uniform<number>;
  u_spread: THREE.Uniform<number>;
  u_swirl: THREE.Uniform<number>;
}>;

function createUniforms(): LensUniforms {
  return {
    uViewWindow: new THREE.Uniform(new THREE.Vector4(0, 0, 1, 1)),
    uInfinite: new THREE.Uniform(0),
    uRemoveBackdrop: new THREE.Uniform(0),
    uBg: new THREE.Uniform(new THREE.Vector3()),
    u_angle: new THREE.Uniform(0),
    u_bias: new THREE.Uniform(1),
    u_count: new THREE.Uniform(35),
    u_dispersion: new THREE.Uniform(1),
    u_dispersionColor: new THREE.Uniform(0.6),
    u_dispersionShift: new THREE.Uniform(0),
    u_focusCenter: new THREE.Uniform(0.8),
    u_focusEdges: new THREE.Uniform(1),
    u_grainMixer: new THREE.Uniform(0),
    u_grainOverlay: new THREE.Uniform(0),
    u_image: new THREE.Uniform<THREE.Texture | null>(null),
    u_imageAspectRatio: new THREE.Uniform(1),
    u_imageX: new THREE.Uniform(0),
    u_imageY: new THREE.Uniform(0),
    u_lensBulge: new THREE.Uniform(0),
    u_lensCircle: new THREE.Uniform(0),
    u_noise: new THREE.Uniform(0),
    u_noiseFrequency: new THREE.Uniform(0.25),
    u_noiseOffset: new THREE.Uniform(0),
    u_perspective: new THREE.Uniform(0.1),
    u_spread: new THREE.Uniform(0.6),
    u_swirl: new THREE.Uniform(0.35),
  };
}

export class PaperLensDistortionPass {
  private readonly material: THREE.ShaderMaterial;
  private readonly scene = new THREE.Scene();
  private readonly uniforms = createUniforms();
  private preparation: Promise<void> | null = null;
  private previousAspect = Number.NaN;
  private previousSource: THREE.Texture | null = null;

  constructor(geometry: THREE.BufferGeometry) {
    this.material = new THREE.ShaderMaterial({
      blending: THREE.NoBlending,
      depthTest: false,
      depthWrite: false,
      fragmentShader: PAPER_LENS_DISTORTION_FRAGMENT_SHADER,
      glslVersion: THREE.GLSL3,
      toneMapped: false,
      transparent: true,
      uniforms: this.uniforms,
      vertexShader: PAPER_LENS_VERTEX_SHADER,
    });
    this.scene.add(new THREE.Mesh(geometry, this.material));
  }

  /**
   * Compile Paper's optional program before the first user-triggered render.
   * WebGLRenderer otherwise defers compilation until Lens is enabled, putting
   * the complete shader-link cost on the interaction that turned it on.
   */
  prepare(
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera,
  ): Promise<void> {
    if (!this.preparation) {
      this.preparation = renderer
        .compileAsync(this.scene, camera)
        .then(() => undefined)
        .catch((error: unknown) => {
          this.preparation = null;
          throw error;
        });
    }
    return this.preparation;
  }

  render(
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera,
    source: THREE.Texture,
    destination: THREE.WebGLRenderTarget | null,
    settings: LensDistortionSettings,
    width: number,
    height: number,
    previewBackground?: THREE.Vector3,
    viewWindow?: readonly [number, number, number, number],
  ): void {
    const uniforms = this.uniforms;
    uniforms.uInfinite.value = viewWindow ? 1 : 0;
    uniforms.uViewWindow.value.set(...(viewWindow ?? [0, 0, 1, 1] as const));
    uniforms.uRemoveBackdrop.value = previewBackground ? 1 : 0;
    if (previewBackground) uniforms.uBg.value.copy(previewBackground);
    if (source !== this.previousSource) {
      uniforms.u_image.value = source;
      this.previousSource = source;
    }
    const aspect = (width / uniforms.uViewWindow.value.z) /
      Math.max(1, height / uniforms.uViewWindow.value.w);
    if (aspect !== this.previousAspect) {
      uniforms.u_imageAspectRatio.value = aspect;
      this.previousAspect = aspect;
    }
    for (const key of PAPER_LENS_PARAMETER_KEYS) {
      const value = key === "count"
        ? Math.min(lensDistortionMeta.maxSamples, settings.count)
        : settings[key];
      const uniform = uniforms[`u_${key}` as keyof LensUniforms];
      if (uniform.value !== value) {
        uniform.value = value;
      }
    }
    renderer.setRenderTarget(destination);
    renderer.clear(true, false, false);
    renderer.render(this.scene, camera);
  }

  dispose(): void {
    this.material.dispose();
    this.uniforms.u_image.value = null;
    this.previousSource = null;
  }
}
