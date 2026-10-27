import {
  getShaderNoiseTexture,
  grainGradientFragmentShader,
} from "@paper-design/shaders";
import type { GrainGradientProps } from "@paper-design/shaders-react";
import * as THREE from "three";

import type { DispersionSettings } from "./dispersion-values";

export type PaperGrainParameters = Readonly<
  Pick<
    GrainGradientProps,
    "intensity" | "noise" | "scale" | "softness" | "speed"
  >
>;

const PAPER_NOISE_START = "vec3 permute(vec3 x)";
const PAPER_NOISE_END = "float hash11(float p)";
const PAPER_SHAPE_START = "float baseNoise = snoise(grain_uv * .5);";
const PAPER_SHAPE_END = "int cntStop = int(u_colorsCount) - 1;";
const REQUIRED_PAPER_NOISE_MARKERS = [
  "float snoise(vec2 v)",
  "float randomR(vec2 p)",
  "float valueNoiseR(vec2 st)",
  "vec4 fbmR(vec2 n0, vec2 n1, vec2 n2, vec2 n3)",
  "texture(u_noiseTexture, fract(uv))",
] as const;

/**
 * Extracts Paper's Grain Gradient noise kernel from the pinned official shader.
 * The field renderer is GLSL 1, so only the texture() spelling is adapted;
 * every noise function and octave constant remains package-authored.
 */
export function extractPaperGrainNoiseKernel(
  source = grainGradientFragmentShader,
): string {
  const start = source.indexOf(PAPER_NOISE_START);
  const end = source.indexOf(PAPER_NOISE_END, start);
  if (start < 0 || end <= start) {
    throw new Error(
      "The pinned Paper Grain Gradient shader no longer exposes the expected noise block.",
    );
  }

  const kernel = source.slice(start, end);
  for (const marker of REQUIRED_PAPER_NOISE_MARKERS) {
    if (!kernel.includes(marker)) {
      throw new Error(
        `Paper Grain Gradient noise marker is missing: ${marker}`,
      );
    }
  }

  return kernel.replace(
    "texture(u_noiseTexture, fract(uv))",
    "texture2D(u_noiseTexture, fract(uv))",
  );
}

export const PAPER_GRAIN_NOISE_GLSL = extractPaperGrainNoiseKernel();

/**
 * Extracts Paper's complete grain-to-shape recipe. This is the part that
 * turns the sparse, positive-only noise into a soft color-ramp coordinate;
 * using the noise functions without it produces ordinary grey TV grain.
 */
export function extractPaperGrainShapeRecipe(
  source = grainGradientFragmentShader,
): string {
  const start = source.indexOf(PAPER_SHAPE_START);
  const end = source.indexOf(PAPER_SHAPE_END, start);
  if (start < 0 || end <= start) {
    throw new Error(
      "The pinned Paper Grain Gradient shader no longer exposes the expected shape recipe.",
    );
  }

  const recipe = source.slice(start, end).trim();
  for (const marker of [
    "float noise = clamp(rawNoise, 0., 1.);",
    "shape += u_intensity * 2. / u_colorsCount * (grainDist + .5);",
    "shape += u_noise * 10. / u_colorsCount * noise;",
    "float aa = fwidth(shape);",
    "float mixer = shape * (u_colorsCount - 1.);",
  ]) {
    if (!recipe.includes(marker)) {
      throw new Error(
        `Paper Grain Gradient shape marker is missing: ${marker}`,
      );
    }
  }
  return recipe;
}

export const PAPER_GRAIN_SHAPE_RECIPE = extractPaperGrainShapeRecipe();

/**
 * The function body is extracted verbatim from Paper. Dispersion supplies a
 * zero base shape because only the grain treatment is being overlaid, then
 * feeds Paper's totalShape/mixer into four stops from the active wave
 * spectrum. The explicit four-stop mix mirrors Paper's loop while remaining
 * GLSL1-compatible in the existing renderer.
 */
export const PAPER_GRAIN_COMPOSITE_GLSL = String.raw`
vec3 paperGrainShape(
  vec2 grain_uv,
  float u_intensity,
  float u_noise,
  float u_softness
) {
  float u_colorsCount = 4.0;
  float shape = 0.0;
  ${PAPER_GRAIN_SHAPE_RECIPE}
  return vec3(totalShape, mixer, aa);
}

vec3 paperSpectrumStop(float angle) {
  vec3 color = 0.5 * (
    uPaletteBase +
    uPaletteAmp * cos(angle + uPalettePhase) +
    uPalette2Amp * cos(2.0 * angle)
  );
  color = clamp(color, 0.0, 1.0);
  float luminance = dot(color, vec3(0.2125, 0.7154, 0.0721));
  return mix(vec3(luminance), color, uChroma);
}

float paperGradientTransition(
  float mixer,
  float stopIndex,
  float softness,
  float aa
) {
  float localT = clamp(mixer - stopIndex, 0.0, 1.0);
  return smoothstep(
    0.5 - 0.5 * softness - aa,
    0.5 + 0.5 * softness + aa,
    localT
  );
}

vec3 paperSpectrumGradient(float mixer, float softness, float aa) {
  const float quarterTurn = 1.5707963267948966;
  // Begin on the spectrum's cool half-cycle, matching Paper's violet/cyan
  // leading stops while still deriving every color from the active spectrum.
  float baseAngle = uPaletteShift + 2.0 * quarterTurn;
  vec3 gradient = paperSpectrumStop(baseAngle);
  gradient = mix(
    gradient,
    paperSpectrumStop(baseAngle + quarterTurn),
    paperGradientTransition(mixer, 0.0, softness, aa)
  );
  gradient = mix(
    gradient,
    paperSpectrumStop(baseAngle + 2.0 * quarterTurn),
    paperGradientTransition(mixer, 1.0, softness, aa)
  );
  gradient = mix(
    gradient,
    paperSpectrumStop(baseAngle + 3.0 * quarterTurn),
    paperGradientTransition(mixer, 2.0, softness, aa)
  );
  return gradient;
}

vec4 paperGrainSample(
  vec2 grainUv,
  float intensity,
  float amount,
  float softness
) {
  vec3 paperShape = paperGrainShape(
    grainUv,
    intensity,
    amount,
    softness
  );
  vec3 grainColor = paperSpectrumGradient(
    paperShape.y,
    softness,
    paperShape.z
  );
  return vec4(grainColor, paperShape.x);
}
`;

/** Paper exposes the complete noise amount as a normalized 0..1 prop. */
export const PAPER_GRAIN_AMOUNT_MAX = 1;

/**
 * Paper's patterned Grain Gradient multiplies its grain domain by 1.6.
 * Keep that value at the middle of our authored coarse-to-fine control.
 */
export const PAPER_GRAIN_REFERENCE_SCALE = 1.6;

export function toPaperGrainParameters(
  settings: DispersionSettings,
): PaperGrainParameters {
  return {
    intensity: settings.grainDistortion / 100,
    noise: (settings.grainAmount / 100) * PAPER_GRAIN_AMOUNT_MAX,
    scale: PAPER_GRAIN_REFERENCE_SCALE * (0.5 + settings.grainScale / 100),
    softness: settings.grainSoftness / 100,
    speed: settings.grainDrift / 100,
  };
}

export type PaperGrainTextureResource = Readonly<{
  ready: Promise<void>;
  texture: THREE.Texture;
}>;

function createFallbackTexture(): THREE.DataTexture {
  const texture = new THREE.DataTexture(
    new Uint8Array([128, 128, 128, 255]),
    1,
    1,
    THREE.RGBAFormat,
  );
  texture.needsUpdate = true;
  return texture;
}

/** Uses Paper's embedded randomizer image and keeps its GPU lifetime explicit. */
export function createPaperGrainTexture(): PaperGrainTextureResource {
  const image = getShaderNoiseTexture();
  const texture = image ? new THREE.Texture(image) : createFallbackTexture();
  texture.colorSpace = THREE.NoColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  if (!image) {
    return { ready: Promise.resolve(), texture };
  }

  const ready = new Promise<void>((resolve) => {
    const finish = () => {
      texture.needsUpdate = true;
      resolve();
    };
    if (image.complete) {
      finish();
      return;
    }
    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", () => resolve(), { once: true });
  });

  return { ready, texture };
}
