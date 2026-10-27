import type { ToolcraftState } from "@/toolcraft/runtime";

export const lensDistortionTargets = {
  lensAngle: "lens.angle",
  lensBias: "lens.bias",
  lensBulge: "lens.lensBulge",
  lensCircle: "lens.lensCircle",
  lensCount: "lens.count",
  lensDispersion: "lens.dispersion",
  lensDispersionColor: "lens.dispersionColor",
  lensDispersionShift: "lens.dispersionShift",
  lensEnabled: "lens.enabled",
  lensFocusCenter: "lens.focusCenter",
  lensFocusEdges: "lens.focusEdges",
  lensGrainMixer: "lens.grainMixer",
  lensGrainOverlay: "lens.grainOverlay",
  lensImageX: "lens.imageX",
  lensImageY: "lens.imageY",
  lensNoise: "lens.noise",
  lensNoiseFrequency: "lens.noiseFrequency",
  lensNoiseOffset: "lens.noiseOffset",
  lensPerspective: "lens.perspective",
  lensSpread: "lens.spread",
  lensSwirl: "lens.swirl",
} as const;

export type LensDistortionSettings = Readonly<{
  angle: number;
  bias: number;
  count: number;
  dispersion: number;
  dispersionColor: number;
  dispersionShift: number;
  enabled: boolean;
  focusCenter: number;
  focusEdges: number;
  grainMixer: number;
  grainOverlay: number;
  imageX: number;
  imageY: number;
  lensBulge: number;
  lensCircle: number;
  noise: number;
  noiseFrequency: number;
  noiseOffset: number;
  perspective: number;
  spread: number;
  swirl: number;
}>;

export const LENS_DISTORTION_DEFAULTS = {
  angle: 2,
  bias: 1,
  count: 35,
  dispersion: 0,
  dispersionColor: 0.6,
  dispersionShift: 0.11,
  enabled: false,
  focusCenter: 0.8,
  focusEdges: 1,
  grainMixer: 0,
  grainOverlay: 0,
  imageX: 0,
  imageY: 0,
  lensBulge: 0,
  lensCircle: 0,
  noise: 0,
  noiseFrequency: 0.25,
  noiseOffset: 0,
  perspective: 0.1,
  spread: 0.97,
  swirl: -0.14,
} as const satisfies LensDistortionSettings;

function readNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric)
    ? Math.min(max, Math.max(min, numeric))
    : fallback;
}

export function readLensDistortionSettings(
  values: ToolcraftState["values"],
): LensDistortionSettings {
  const target = lensDistortionTargets;
  const defaults = LENS_DISTORTION_DEFAULTS;
  return {
    angle: readNumber(values[target.lensAngle], defaults.angle, 0, 360),
    bias: readNumber(values[target.lensBias], defaults.bias, -1, 1),
    count: Math.round(
      readNumber(values[target.lensCount], defaults.count, 2, 50),
    ),
    dispersion: readNumber(
      values[target.lensDispersion], defaults.dispersion, 0, 1,
    ),
    dispersionColor: readNumber(
      values[target.lensDispersionColor], defaults.dispersionColor, 0, 1,
    ),
    dispersionShift: readNumber(
      values[target.lensDispersionShift], defaults.dispersionShift, -1, 1,
    ),
    enabled:
      typeof values[target.lensEnabled] === "boolean"
        ? Boolean(values[target.lensEnabled])
        : defaults.enabled,
    focusCenter: readNumber(
      values[target.lensFocusCenter], defaults.focusCenter, 0, 1,
    ),
    focusEdges: readNumber(
      values[target.lensFocusEdges], defaults.focusEdges, 0, 1,
    ),
    grainMixer: readNumber(
      values[target.lensGrainMixer], defaults.grainMixer, 0, 1,
    ),
    grainOverlay: readNumber(
      values[target.lensGrainOverlay], defaults.grainOverlay, 0, 1,
    ),
    imageX: readNumber(values[target.lensImageX], defaults.imageX, -1, 1),
    imageY: readNumber(values[target.lensImageY], defaults.imageY, -1, 1),
    lensBulge: readNumber(
      values[target.lensBulge], defaults.lensBulge, -1, 1,
    ),
    lensCircle: readNumber(
      values[target.lensCircle], defaults.lensCircle, 0, 1,
    ),
    noise: readNumber(values[target.lensNoise], defaults.noise, 0, 1),
    noiseFrequency: readNumber(
      values[target.lensNoiseFrequency], defaults.noiseFrequency, 0, 1,
    ),
    noiseOffset: readNumber(
      values[target.lensNoiseOffset], defaults.noiseOffset, 0, 1,
    ),
    perspective: readNumber(
      values[target.lensPerspective], defaults.perspective, 0, 1,
    ),
    spread: readNumber(values[target.lensSpread], defaults.spread, 0, 1),
    swirl: readNumber(values[target.lensSwirl], defaults.swirl, -1, 1),
  };
}
