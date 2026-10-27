import type { ToolcraftState } from "@/toolcraft/runtime";

import {
  LENS_DISTORTION_DEFAULTS,
  lensDistortionTargets,
  readLensDistortionSettings,
  type LensDistortionSettings,
} from "./dispersion-lens-distortion-values";
import {
  DISPERSION_MASK_DEFAULTS,
  dispersionMaskTargets,
  readDispersionMaskSettings,
  type DispersionMaskSettings,
} from "./dispersion-masks-values";

const activeDispersionTargets = {
  background: "appearance.background",
  bend: "dispersion.bend",
  chromaSplit: "dispersion.chromaSplit",
  colorBalance: "dispersion.colorBalance",
  curve: "dispersion.curve",
  curveDepth: "dispersion.curveDepth",
  cornerRadius: "frame.cornerRadius",
  customColorA: "dispersion.customColorA",
  customColorB: "dispersion.customColorB",
  customColorC: "dispersion.customColorC",
  customColorD: "dispersion.customColorD",
  detail: "motion.detail",
  effectArea: "effect.area",
  effectMode: "effect.mode",
  flow: "motion.flow",
  glow: "dispersion.glow",
  grainAmount: "effect.grain.amount",
  grainDistribution: "effect.grain.distribution",
  grainDistortion: "effect.grain.distortion",
  grainDrift: "effect.grain.drift",
  grainScale: "effect.grain.scale",
  grainSoftness: "effect.grain.softness",
  height: "dispersion.height",
  imageFormat: "export.image.format",
  imageResolution: "export.image.resolution",
  includeBackground: "export.includeBackground",
  inset: "dispersion.inset",
  intensity: "dispersion.intensity",
  mode: "dispersion.mode",
  position: "dispersion.position",
  refraction: "dispersion.refraction",
  seed: "motion.seed",
  shading: "dispersion.shading",
  shape: "frame.shape",
  shimmer: "motion.shimmer",
  softness: "dispersion.softness",
  sparkle: "dispersion.sparkle",
  sparkleSize: "effect.sparkle.size",
  sparkleTwinkle: "effect.sparkle.twinkle",
  spectrum: "dispersion.spectrum",
  spread: "dispersion.spread",
  undulation: "motion.undulation",
  ...dispersionMaskTargets,
  ...lensDistortionTargets,
} as const;

type LegacyDraftTargets = Readonly<Record<
  | "branchCount"
  | "branchSpread"
  | "colorDrift"
  | "convergence"
  | "echoSpacing"
  | "echoStrength"
  | "evolution"
  | "fieldScale"
  | "focalPoint"
  | "focusEnabled"
  | "glowFocus"
  | "halationRadius"
  | "halationStrength"
  | "halationTint"
  | "noiseScale"
  | "noiseSplit"
  | "patternScale"
  | "pulse",
  string
>>;

// These type-only aliases keep archived, unreferenced draft modules readable
// to TypeScript without adding their abandoned controls to the runtime schema.
export const dispersionTargets = activeDispersionTargets as
  typeof activeDispersionTargets & LegacyDraftTargets;

export type DispersionEffectArea = "all" | "bands" | "core" | "glow" | "veil";

export type DispersionEffectMode = "grain" | "sparkle";

export type DispersionGrainDistribution = "screen" | "surface";

export type DispersionColorBalance = Readonly<{
  x: number;
  y: number;
}>;

export type DispersionMode =
  | "central"
  | "edge"
  | "halo"
  | "diagonal"
  | "ripple";

/** Static macro-curve of the sheet's screen trajectory. */
export type DispersionCurve =
  | "line"
  | "valley"
  | "arch"
  | "scurve"
  | "drape"
  | "cradle";

export type DispersionFrameShape = "rect" | "rounded" | "circle";

export type DispersionSpectrum =
  | "prism"
  | "aurora"
  | "sunset"
  | "ice"
  | "porcelain"
  | "dusk"
  | "mono"
  | "custom";

/** Spectrum values backed by the fixed preset table (everything but custom). */
export type DispersionSpectrumPresetName = Exclude<
  DispersionSpectrum,
  "custom"
>;

export type DispersionSettings = Readonly<{
  background: string;
  bend: number;
  chromaSplit: number;
  colorBalance: DispersionColorBalance;
  curve: DispersionCurve;
  curveDepth: number;
  cornerRadius: number;
  customColorA: string;
  customColorB: string;
  customColorC: string;
  customColorD: string;
  detail: number;
  effectArea: DispersionEffectArea;
  effectMode: DispersionEffectMode;
  flow: number;
  glow: number;
  grainAmount: number;
  grainDistribution: DispersionGrainDistribution;
  grainDistortion: number;
  grainDrift: number;
  grainScale: number;
  grainSoftness: number;
  height: number;
  includeBackground: boolean;
  inset: number;
  intensity: number;
  lens: LensDistortionSettings;
  masks: DispersionMaskSettings;
  mode: DispersionMode;
  position: number;
  refraction: number;
  seed: number;
  shading: number;
  shape: DispersionFrameShape;
  shimmer: number;
  softness: number;
  sparkle: number;
  sparkleSize: number;
  sparkleTwinkle: number;
  spectrum: DispersionSpectrum;
  spread: number;
  undulation: number;
}>;

export type DispersionPhase = Readonly<{
  cosine: number;
  secondaryCosine: number;
  secondarySine: number;
  sine: number;
}>;

export type DispersionSpectrumPreset = Readonly<{
  /**
   * Per-channel cosine amplitude; the reference palette uses 1. Equal to
   * base it acts as a plain per-channel gain over the reference shape; keep
   * it at or below base so the palette never subtracts light.
   */
  amp: readonly [number, number, number];
  /**
   * Signed second-harmonic (Nyquist) amplitude used by four-anchor custom
   * fits; omitted by every built-in preset, which keeps the palette in the
   * reference's single-cosine form.
   */
  amp2?: readonly [number, number, number];
  /** Per-channel palette midpoint; the reference palette uses 1. */
  base: readonly [number, number, number];
  /** Palette chroma amount; 0 renders an achromatic sheet. */
  chroma: number;
  /** RGB phase offsets of the distance-driven cosine palette. */
  phase: readonly [number, number, number];
}>;

const activeDispersionDefaults: DispersionSettings = {
  background: "#E6E6E6",
  bend: 48,
  chromaSplit: 14,
  colorBalance: { x: 0, y: 0 },
  curve: "line",
  curveDepth: 0,
  cornerRadius: 12,
  customColorA: "#C2C2CC",
  customColorB: "#3E4A8C",
  customColorC: "#C2C2CC",
  customColorD: "#BCB69E",
  detail: 38,
  effectArea: "all",
  effectMode: "sparkle",
  flow: 60,
  glow: 43,
  grainAmount: 50,
  grainDistribution: "screen",
  grainDistortion: 50,
  grainDrift: 35,
  grainScale: 50,
  grainSoftness: 50,
  height: 40,
  includeBackground: true,
  inset: 13,
  intensity: 86,
  lens: LENS_DISTORTION_DEFAULTS,
  masks: DISPERSION_MASK_DEFAULTS,
  mode: "central",
  position: 48,
  refraction: 36,
  seed: 31,
  shading: 0,
  shape: "rect",
  shimmer: 80,
  softness: 70,
  sparkle: 0,
  sparkleSize: 50,
  sparkleTwinkle: 0,
  spectrum: "prism",
  spread: 62,
  undulation: 42,
};

type LegacyDraftDefaults = Readonly<{
  echoSpacing: number;
  echoStrength: number;
  halationRadius: number;
  halationStrength: number;
  halationTint: string;
  noiseScale: number;
  noiseSplit: number;
}>;

export const DISPERSION_DEFAULTS = activeDispersionDefaults as
  DispersionSettings & LegacyDraftDefaults;

/**
 * Every spectrum preset is a gentle modification of the ported reference
 * palette: the cosine shape is kept and amp equals base, acting as a plain
 * per-channel gain (base = amp = 1 reproduces the reference exactly). Only
 * Ice and Porcelain narrow their amplitudes below base for paler sheets.
 */
export const DISPERSION_SPECTRUM_PRESETS: Readonly<
  Record<DispersionSpectrumPresetName, DispersionSpectrumPreset>
> = {
  /** Reference bands in mirrored channel order under a cool gain. */
  aurora: {
    amp: [0.78, 1.02, 1.08],
    base: [0.78, 1.02, 1.08],
    chroma: 1,
    phase: [2.1, 1.05, 0],
  },
  /** Muted earth tones: olive-khaki highs, warm umber, slate-blue lows. */
  dusk: {
    amp: [0.58, 0.34, 0.44],
    base: [0.72, 0.56, 0.56],
    chroma: 0.95,
    phase: [0, 1, 2.7],
  },
  /** Pale glacial blues with silvery shadows; slightly desaturated. */
  ice: {
    amp: [0.35, 0.55, 0.75],
    base: [0.78, 0.95, 1.1],
    chroma: 0.9,
    phase: [2.4, 2, 1.5],
  },
  /** Achromatic sheet. */
  mono: { amp: [1, 1, 1], base: [1, 1, 1], chroma: 0, phase: [0, 1, 2] },
  /** High-key two-tone from the supplied ribbed-ceiling photo: ivory highs, periwinkle lows, neutral between. */
  porcelain: {
    amp: [0.31, 0.24, 0.05],
    base: [0.93, 0.98, 1.05],
    chroma: 1,
    phase: [Math.PI / 2, Math.PI / 2, Math.PI * 1.5],
  },
  /** The reference palette, exact. */
  prism: { amp: [1, 1, 1], base: [1, 1, 1], chroma: 1, phase: [0, 1, 2] },
  /** Reference order under a warm golden gain, blue phase pulled closer. */
  sunset: {
    amp: [1.08, 0.96, 0.82],
    base: [1.08, 0.96, 0.82],
    chroma: 1,
    phase: [0, 1.05, 2.35],
  },
};

const MODE_VALUES: readonly DispersionMode[] = [
  "central",
  "edge",
  "halo",
  "diagonal",
  "ripple",
];
const CURVE_VALUES: readonly DispersionCurve[] = [
  "line",
  "valley",
  "arch",
  "scurve",
  "drape",
  "cradle",
];
const EFFECT_AREA_VALUES: readonly DispersionEffectArea[] = [
  "all",
  "core",
  "glow",
  "bands",
  "veil",
];
const EFFECT_MODE_VALUES: readonly DispersionEffectMode[] = ["sparkle", "grain"];
const GRAIN_DISTRIBUTION_VALUES: readonly DispersionGrainDistribution[] = [
  "screen",
  "surface",
];
const SHAPE_VALUES: readonly DispersionFrameShape[] = [
  "rect",
  "rounded",
  "circle",
];
const SPECTRUM_VALUES: readonly DispersionSpectrum[] = [
  "prism",
  "aurora",
  "sunset",
  "ice",
  "porcelain",
  "dusk",
  "mono",
  "custom",
];

function readHexChannel(hex: string, index: number): number {
  return Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
}

/**
 * Control extension: fits the four user anchor colors with the palette's
 * cosine form. A per-channel four-point Fourier fit (mean, first harmonic,
 * and a signed second-harmonic Nyquist term) reproduces each anchor
 * exactly at its cycle quarter, so Custom reuses the preset palette
 * uniforms plus one Nyquist amplitude that built-in presets keep at zero.
 * Colors are mapped so mid gray is the reference-neutral multiplier of 1.
 */
export function buildCustomSpectrumPreset(
  colorA: string,
  colorB: string,
  colorC: string,
  colorD: string,
): DispersionSpectrumPreset {
  const anchors = [colorA, colorB, colorC, colorD];
  const amp: [number, number, number] = [0, 0, 0];
  const amp2: [number, number, number] = [0, 0, 0];
  const base: [number, number, number] = [0, 0, 0];
  const phase: [number, number, number] = [0, 0, 0];
  for (let channel = 0; channel < 3; channel += 1) {
    const [v0, v1, v2, v3] = anchors.map(
      (hex) => readHexChannel(hex, channel) * 2,
    );
    const cosCoef = (v0 - v2) / 2;
    const sinCoef = (v1 - v3) / 2;
    amp[channel] = Math.hypot(cosCoef, sinCoef);
    amp2[channel] = (v0 - v1 + v2 - v3) / 4;
    base[channel] = (v0 + v1 + v2 + v3) / 4;
    phase[channel] = Math.atan2(-sinCoef, cosCoef);
  }
  return { amp, amp2, base, chroma: 1, phase };
}

function isChoice<T extends string>(
  value: unknown,
  choices: readonly T[],
): value is T {
  return typeof value === "string" && choices.includes(value as T);
}

function readChoice<T extends string>(
  value: unknown,
  choices: readonly T[],
  fallback: T,
): T {
  return isChoice(value, choices) ? value : fallback;
}

function readNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function readColor(value: unknown, fallback: string): string {
  const candidate =
    typeof value === "string"
      ? value
      : value !== null &&
          typeof value === "object" &&
          "hex" in value &&
          typeof value.hex === "string"
        ? value.hex
        : fallback;
  return /^#[0-9a-f]{6}$/i.test(candidate)
    ? candidate.toUpperCase()
    : fallback;
}

function readColorBalance(
  value: unknown,
  fallback: DispersionColorBalance,
): DispersionColorBalance {
  if (value === null || typeof value !== "object") return fallback;
  const candidate = value as Readonly<Record<string, unknown>>;
  return {
    x: readNumber(candidate.x, fallback.x, -1, 1),
    y: readNumber(candidate.y, fallback.y, -1, 1),
  };
}

export function readDispersionSettings(
  state: Pick<ToolcraftState, "values">,
): DispersionSettings {
  const { values } = state;
  return {
    background: readColor(
      values[dispersionTargets.background],
      DISPERSION_DEFAULTS.background,
    ),
    bend: readNumber(
      values[dispersionTargets.bend],
      DISPERSION_DEFAULTS.bend,
      0,
      100,
    ),
    curve: readChoice(
      values[dispersionTargets.curve],
      CURVE_VALUES,
      DISPERSION_DEFAULTS.curve,
    ),
    curveDepth: readNumber(
      values[dispersionTargets.curveDepth],
      DISPERSION_DEFAULTS.curveDepth,
      0,
      100,
    ),
    chromaSplit: readNumber(
      values[dispersionTargets.chromaSplit],
      DISPERSION_DEFAULTS.chromaSplit,
      0,
      100,
    ),
    colorBalance: readColorBalance(
      values[dispersionTargets.colorBalance],
      DISPERSION_DEFAULTS.colorBalance,
    ),
    cornerRadius: readNumber(
      values[dispersionTargets.cornerRadius],
      DISPERSION_DEFAULTS.cornerRadius,
      0,
      50,
    ),
    customColorA: readColor(
      values[dispersionTargets.customColorA],
      DISPERSION_DEFAULTS.customColorA,
    ),
    customColorB: readColor(
      values[dispersionTargets.customColorB],
      DISPERSION_DEFAULTS.customColorB,
    ),
    customColorC: readColor(
      values[dispersionTargets.customColorC],
      DISPERSION_DEFAULTS.customColorC,
    ),
    customColorD: readColor(
      values[dispersionTargets.customColorD],
      DISPERSION_DEFAULTS.customColorD,
    ),
    detail: readNumber(
      values[dispersionTargets.detail],
      DISPERSION_DEFAULTS.detail,
      0,
      100,
    ),
    effectArea: readChoice(
      values[dispersionTargets.effectArea],
      EFFECT_AREA_VALUES,
      DISPERSION_DEFAULTS.effectArea,
    ),
    effectMode: readChoice(
      values[dispersionTargets.effectMode],
      EFFECT_MODE_VALUES,
      DISPERSION_DEFAULTS.effectMode,
    ),
    flow: readNumber(
      values[dispersionTargets.flow],
      DISPERSION_DEFAULTS.flow,
      0,
      100,
    ),
    glow: readNumber(
      values[dispersionTargets.glow],
      DISPERSION_DEFAULTS.glow,
      0,
      100,
    ),
    grainAmount: readNumber(
      values[dispersionTargets.grainAmount],
      DISPERSION_DEFAULTS.grainAmount,
      0,
      100,
    ),
    grainDistribution: readChoice(
      values[dispersionTargets.grainDistribution],
      GRAIN_DISTRIBUTION_VALUES,
      DISPERSION_DEFAULTS.grainDistribution,
    ),
    grainDistortion: readNumber(
      values[dispersionTargets.grainDistortion],
      DISPERSION_DEFAULTS.grainDistortion,
      0,
      100,
    ),
    grainDrift: readNumber(
      values[dispersionTargets.grainDrift],
      DISPERSION_DEFAULTS.grainDrift,
      0,
      100,
    ),
    grainScale: readNumber(
      values[dispersionTargets.grainScale],
      DISPERSION_DEFAULTS.grainScale,
      0,
      100,
    ),
    grainSoftness: readNumber(
      values[dispersionTargets.grainSoftness],
      DISPERSION_DEFAULTS.grainSoftness,
      0,
      100,
    ),
    height: readNumber(
      values[dispersionTargets.height],
      DISPERSION_DEFAULTS.height,
      4,
      72,
    ),
    includeBackground:
      typeof values[dispersionTargets.includeBackground] === "boolean"
        ? Boolean(values[dispersionTargets.includeBackground])
        : DISPERSION_DEFAULTS.includeBackground,
    inset: readNumber(
      values[dispersionTargets.inset],
      DISPERSION_DEFAULTS.inset,
      0,
      40,
    ),
    intensity: readNumber(
      values[dispersionTargets.intensity],
      DISPERSION_DEFAULTS.intensity,
      0,
      100,
    ),
    lens: readLensDistortionSettings(values),
    masks: readDispersionMaskSettings(values),
    mode: readChoice(
      values[dispersionTargets.mode],
      MODE_VALUES,
      DISPERSION_DEFAULTS.mode,
    ),
    position: readNumber(
      values[dispersionTargets.position],
      DISPERSION_DEFAULTS.position,
      0,
      100,
    ),
    refraction: readNumber(
      values[dispersionTargets.refraction],
      DISPERSION_DEFAULTS.refraction,
      0,
      80,
    ),
    seed: readNumber(
      values[dispersionTargets.seed],
      DISPERSION_DEFAULTS.seed,
      0,
      100,
    ),
    shading: readNumber(
      values[dispersionTargets.shading],
      DISPERSION_DEFAULTS.shading,
      0,
      100,
    ),
    shape: readChoice(
      values[dispersionTargets.shape],
      SHAPE_VALUES,
      DISPERSION_DEFAULTS.shape,
    ),
    shimmer: readNumber(
      values[dispersionTargets.shimmer],
      DISPERSION_DEFAULTS.shimmer,
      0,
      100,
    ),
    softness: readNumber(
      values[dispersionTargets.softness],
      DISPERSION_DEFAULTS.softness,
      0,
      100,
    ),
    sparkle: readNumber(
      values[dispersionTargets.sparkle],
      DISPERSION_DEFAULTS.sparkle,
      0,
      100,
    ),
    sparkleSize: readNumber(
      values[dispersionTargets.sparkleSize],
      DISPERSION_DEFAULTS.sparkleSize,
      0,
      100,
    ),
    sparkleTwinkle: readNumber(
      values[dispersionTargets.sparkleTwinkle],
      DISPERSION_DEFAULTS.sparkleTwinkle,
      0,
      100,
    ),
    spectrum: readChoice(
      values[dispersionTargets.spectrum],
      SPECTRUM_VALUES,
      DISPERSION_DEFAULTS.spectrum,
    ),
    spread: readNumber(
      values[dispersionTargets.spread],
      DISPERSION_DEFAULTS.spread,
      4,
      100,
    ),
    undulation: readNumber(
      values[dispersionTargets.undulation],
      DISPERSION_DEFAULTS.undulation,
      0,
      100,
    ),
  };
}

function cleanPeriodic(value: number): number {
  return Math.abs(value) < 1e-12 ? 0 : Math.abs(value - 1) < 1e-12 ? 1 : value;
}

export function getDispersionPhase(progress: number): DispersionPhase {
  const safeProgress = Number.isFinite(progress) ? progress : 0;
  const normalized = ((safeProgress % 1) + 1) % 1;
  const angle = normalized * Math.PI * 2;
  return {
    cosine: cleanPeriodic(Math.cos(angle)),
    secondaryCosine: cleanPeriodic(Math.cos(angle * 2)),
    secondarySine: cleanPeriodic(Math.sin(angle * 2)),
    sine: cleanPeriodic(Math.sin(angle)),
  };
}
