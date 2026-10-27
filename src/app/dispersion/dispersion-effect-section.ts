import type { ToolcraftControlSectionSchema } from "@/toolcraft/runtime";

import {
  DISPERSION_DEFAULTS,
  dispersionTargets,
} from "./dispersion-values";

const responsive = (reason: string) => ({
  performanceReason: reason,
  performanceRole: "responsiveness" as const,
});

function effectSlider(
  target: string,
  label: string,
  defaultValue: number,
  description: string,
  effectMode: string,
  semanticGroup: string,
) {
  return {
    applicability: {
      all: [{ equals: effectMode, target: dispersionTargets.effectMode }],
      mode: "conditional" as const,
    },
    defaultValue,
    description,
    label,
    max: 100,
    min: 0,
    orderRole: "detail" as const,
    semanticGroup,
    sliderValueKind: "continuous" as const,
    step: 1,
    target,
    type: "slider" as const,
    unit: "%",
    ...responsive(
      "Updates bounded sheet shader uniforms without changing the fixed raymarch cardinality.",
    ),
  };
}

export const dispersionWaveEffectSection: ToolcraftControlSectionSchema = {
  controls: {
    effectMode: {
      applicability: { mode: "always" },
      defaultValue: DISPERSION_DEFAULTS.effectMode,
      description:
        "Chooses one bounded treatment for the authored wave; None preserves the reference ray.",
      label: "Effect",
      options: [
        { label: "None", value: "none" },
        { label: "Surface Sparkle", value: "sparkle" },
        { label: "Noise Split", value: "noise-split" },
        { label: "Halation", value: "halation" },
        { label: "Spectral Echo", value: "spectral-echo" },
      ],
      orderRole: "mode",
      performanceReason:
        "Selects one constant-cardinality shader branch without adding passes or resources.",
      performanceRole: "responsiveness",
      semanticGroup: "effect-mode",
      target: dispersionTargets.effectMode,
      type: "select",
    },
    sparkle: effectSlider(
      dispersionTargets.sparkle,
      "Amount",
      DISPERSION_DEFAULTS.sparkle,
      "Controls the depth of the existing grain attached to the moving caustic line.",
      "sparkle",
      "surface-sparkle",
    ),
    sparkleSize: effectSlider(
      dispersionTargets.sparkleSize,
      "Grain size",
      DISPERSION_DEFAULTS.sparkleSize,
      "Moves from fine glitter to broader crystalline flecks without detaching them from the wave.",
      "sparkle",
      "surface-sparkle",
    ),
    noiseSplit: effectSlider(
      dispersionTargets.noiseSplit,
      "Amount",
      DISPERSION_DEFAULTS.noiseSplit,
      "Fractures the caustic into irregular neighboring sub-rays while zero collapses to the source wave.",
      "noise-split",
      "noise-split",
    ),
    noiseScale: effectSlider(
      dispersionTargets.noiseScale,
      "Detail",
      DISPERSION_DEFAULTS.noiseScale,
      "Changes the spatial frequency of the seamless pseudo-noise that drives each split fragment.",
      "noise-split",
      "noise-split",
    ),
    halationStrength: effectSlider(
      dispersionTargets.halationStrength,
      "Strength",
      DISPERSION_DEFAULTS.halationStrength,
      "Controls the warm photographic diffusion emitted by the brightest parts of the wave.",
      "halation",
      "halation",
    ),
    halationRadius: effectSlider(
      dispersionTargets.halationRadius,
      "Radius",
      DISPERSION_DEFAULTS.halationRadius,
      "Expands or tightens the colored halo around the caustic without changing the base wave geometry.",
      "halation",
      "halation",
    ),
    halationTint: {
      applicability: {
        all: [{ equals: "halation", target: dispersionTargets.effectMode }],
        mode: "conditional",
      },
      defaultValue: DISPERSION_DEFAULTS.halationTint,
      description:
        "Sets the highlight-diffusion color; warm red-orange reproduces photographic halation.",
      label: "Tint",
      orderRole: "color",
      performanceReason: "Updates one color uniform in the existing field pass.",
      performanceRole: "responsiveness",
      semanticGroup: "halation",
      target: dispersionTargets.halationTint,
      type: "color",
    },
    echoStrength: effectSlider(
      dispersionTargets.echoStrength,
      "Strength",
      DISPERSION_DEFAULTS.echoStrength,
      "Controls two faint palette-shifted satellite caustics around the primary wave.",
      "spectral-echo",
      "spectral-echo",
    ),
    echoSpacing: effectSlider(
      dispersionTargets.echoSpacing,
      "Spacing",
      DISPERSION_DEFAULTS.echoSpacing,
      "Moves the spectral afterimages toward or away from the source wave.",
      "spectral-echo",
      "spectral-echo",
    ),
  },
  id: "wave-effect",
  title: "Wave Effect",
};
