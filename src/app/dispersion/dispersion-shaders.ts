import { DISPERSION_REMOVE_BACKDROP_GLSL } from "./dispersion-backdrop";
import {
  PAPER_GRAIN_COMPOSITE_GLSL,
  PAPER_GRAIN_NOISE_GLSL,
} from "./dispersion-paper-grain";
import {
  DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL,
  DISPERSION_LIGHT_SHEET_CORE_GLSL,
} from "./dispersion-light-sheet-core";
import {
  DISPERSION_MASK_COVERAGE_GLSL,
  DISPERSION_MASK_UNIFORMS_GLSL,
} from "./dispersion-masks-glsl";

export const DISPERSION_SCREEN_VERTEX_SHADER = String.raw`
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

export const DISPERSION_COPY_VERTEX_SHADER = String.raw`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

export const DISPERSION_COPY_FRAGMENT_SHADER = String.raw`
precision highp float;

varying vec2 vUv;
uniform sampler2D uTexture;

void main() {
  gl_FragColor = texture2D(uTexture, vUv);
}
`;


/**
 * Raymarched spectral light-sheet, ported from the reference implementation
 * on octolane.com (the "Waves" WebGL2 hero).
 *
 * A camera ray marches toward a horizontal surface displaced by three sine
 * waves. Each step accumulates glow that falls off with the distance to the
 * surface, tinted by a cosine palette driven by the total distance travelled
 * — which is what fans the white-hot sheet into spectral bands. Trigonometric
 * interference patterns modulate the volume into the smoky veil, and depth
 * fog fades far geometry into the atmosphere.
 *
 * The core loop, constants, wave model, palette, dithering, and premultiplied
 * alpha compositing reproduce the reference verbatim. The marked additions
 * only map Dispersion Studio's controls: view shift/tilt, palette phase,
 * per-channel palette gain, and chroma presets, a vertical chromatic sheet
 * split, selectable surface-bound Sparkle or screen-space Paper Grain noise,
 * region masks, post saturation, an
 * optional edge fade, and a backdrop blend that keeps the reference key
 * over black while lit backdrops receive the sheet's accumulated energy as
 * added light instead of a darkening layer.
 */
export const DISPERSION_FIELD_FRAGMENT_SHADER = String.raw`
precision highp float;

uniform vec3 iResolution;
uniform vec2 uViewOffset;
uniform float uZoom;
uniform float iTime;

uniform float uTimeScale;
uniform float uWaveSpeed;
uniform float uWaveHeight;

uniform float uWave1Freq;
uniform float uWave1Amp;
uniform float uWave2Freq;
uniform float uWave2Amp;
uniform float uWave3FreqX;
uniform float uWave3FreqZ;
uniform float uWave3Amp;

uniform float uNoiseAmount;
uniform float uFoldingOffset;
uniform float uStepBase;
uniform float uGlowIntensity;
uniform float uGlowSpread;
uniform float uOpaque;
uniform float uRemoveBackdrop;
uniform vec3 uBg;

${DISPERSION_REMOVE_BACKDROP_GLSL}

// --- Dispersion Studio control extensions ---
uniform float uYShift;
uniform float uTiltX;
uniform float uCurveForm;
uniform float uCurveAmp;
uniform float uShading;
uniform vec3 uPalettePhase;
uniform vec3 uPaletteBase;
uniform vec3 uPaletteAmp;
uniform vec3 uPalette2Amp;
uniform float uPaletteFreq;
uniform float uPaletteShift;
uniform float uChroma;
uniform float uSaturationX;
uniform vec2 uColorBalance;
uniform float uEdgeFade;
uniform float uPatternSoft;
uniform float uChannelSplit;
uniform float uEffectMode;
uniform float uEffectArea;
uniform float uSparkleSize;
uniform float uSparkleTwinkle;
uniform float uGrainAmount;
uniform float uGrainDistribution;
uniform float uGrainScale;
uniform float uGrainSoftness;
uniform float uGrainDistortion;
uniform float uGrainDrift;
uniform sampler2D u_noiseTexture;
${DISPERSION_MASK_UNIFORMS_GLSL}

// Extracted at build time from the pinned official Paper Grain Gradient shader.
${PAPER_GRAIN_NOISE_GLSL}
${PAPER_GRAIN_COMPOSITE_GLSL}
${DISPERSION_MASK_COVERAGE_GLSL}

// Control extension: static macro-curve of the sheet in world space (used
// inside the march) — the surface itself sags, arches, S-swoops, drapes, or
// cradles in 3D while the reference emission and waves stay untouched. The
// profile is time-free, so the loop seam and march cardinality are
// unaffected; uCurveForm 0, or depth 0, reproduces the reference surface
// exactly.
float dispersionCurveProfile(float u) {
  if (uCurveForm < 0.5) return 0.0;
  if (uCurveForm < 1.5) return u * u;
  if (uCurveForm < 2.5) return -(u * u);
  if (uCurveForm < 3.5) return u * (u * u - 1.1);
  if (uCurveForm < 4.5) return sin(u * 1.7);
  float c = exp(1.15 * u);
  return 0.5 * (c + 1.0 / c) - 1.0;
}

float dispersionCurveSlope(float u) {
  if (uCurveForm < 0.5) return 0.0;
  if (uCurveForm < 1.5) return 2.0 * u;
  if (uCurveForm < 2.5) return -2.0 * u;
  if (uCurveForm < 3.5) return 3.0 * u * u - 1.1;
  if (uCurveForm < 4.5) return 1.7 * cos(u * 1.7);
  float c = exp(1.15 * u);
  return 0.575 * (c - 1.0 / c);
}

// Dispersion Studio uses one canonical Cartesian light-sheet domain.
vec3 dispersionDomainPosition(vec3 localPos, float baseRoute) {
  return localPos;
}

${DISPERSION_LIGHT_SHEET_CORE_GLSL}
${DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL}

void main() {
  vec2 fragCoord = gl_FragCoord.xy + uViewOffset;
  vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y * uZoom;
  uv.y += uYShift;
  uv.y += uTiltX * uv.x;
  DispersionSheetResult sheet = marchDispersionSheet(
    uv,
    iTime * uTimeScale,
    0.0
  );
  gl_FragColor = composeDispersionSheet(
    sheet,
    fragCoord,
    iTime,
    uGrainDistribution,
    uEdgeFade
  );
}
`;
