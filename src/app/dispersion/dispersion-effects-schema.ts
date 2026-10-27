import type { ToolcraftControlSectionSchema } from "@/toolcraft/runtime";

import { DISPERSION_DEFAULTS, dispersionTargets } from "./dispersion-values";

const responsive = (reason: string) => ({
  performanceReason: reason,
  performanceRole: "responsiveness" as const,
});

function effectSlider(
  target: string,
  label: string,
  defaultValue: number,
  description: string,
  effectMode: "grain" | "sparkle",
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
    semanticGroup: `${effectMode}-style`,
    sliderValueKind: "continuous" as const,
    step: 1,
    target,
    type: "slider" as const,
    unit: "%",
    ...responsive(
      "Updates fixed-cost effect uniforms inside the retained field shader pass.",
    ),
  };
}

export const dispersionEffectSections = [
  {
    controls: {
      effectMode: {
        applicability: { mode: "always" },
        defaultValue: DISPERSION_DEFAULTS.effectMode,
        description:
          "Chooses surface-bound Sparkle or Paper Grain with either uniform screen placement or projected light-sheet placement.",
        label: "Effect",
        options: [
          { label: "Sparkle", value: "sparkle" },
          { label: "Grain Gradient", value: "grain" },
        ],
        orderRole: "mode",
        semanticGroup: "effect-selection",
        target: dispersionTargets.effectMode,
        type: "select",
        ...responsive(
          "Switches between two fixed-cost branches of the retained field shader.",
        ),
      },
      effectArea: {
        applicability: { mode: "always" },
        defaultValue: DISPERSION_DEFAULTS.effectArea,
        description:
          "Restricts the selected effect to a luminance or chroma region of the rendered wave.",
        label: "Area",
        options: [
          { label: "Whole wave", value: "all" },
          { label: "Core", value: "core" },
          { label: "Glow", value: "glow" },
          { label: "Color bands", value: "bands" },
          { label: "Veil", value: "veil" },
        ],
        orderRole: "mode",
        semanticGroup: "effect-selection",
        target: dispersionTargets.effectArea,
        type: "select",
        ...responsive(
          "Changes one region-mask uniform computed from existing field output.",
        ),
      },
      grainDistribution: {
        applicability: {
          all: [{ equals: "grain", target: dispersionTargets.effectMode }],
          mode: "conditional",
        },
        defaultValue: DISPERSION_DEFAULTS.grainDistribution,
        description:
          "Screen spreads stable Grain uniformly inside the selected Area. Surface uses continuous projected raymarch-hit confidence to place luminous grain over the visible 3D sheet while every particle stays flat and undistorted.",
        label: "Distribution",
        options: [
          { label: "Screen", value: "screen" },
          { label: "Surface", value: "surface" },
        ],
        orderRole: "mode",
        target: dispersionTargets.grainDistribution,
        type: "select",
        ...responsive(
          "Changes one fixed-cost distribution branch and reuses the existing raymarch surface accumulator.",
        ),
      },
    },
    id: "effect-placement",
    title: "Effect Placement",
  },
  {
    controls: {
      sparkle: effectSlider(
        dispersionTargets.sparkle,
        "Sparkle amount",
        DISPERSION_DEFAULTS.sparkle,
        "Controls the strength of the existing diamond-dust texture; zero leaves the wave unchanged.",
        "sparkle",
      ),
      sparkleSize: effectSlider(
        dispersionTargets.sparkleSize,
        "Size",
        DISPERSION_DEFAULTS.sparkleSize,
        "Changes the scale of the specks while they remain attached to the moving wave surface.",
        "sparkle",
      ),
      sparkleTwinkle: effectSlider(
        dispersionTargets.sparkleTwinkle,
        "Twinkle",
        DISPERSION_DEFAULTS.sparkleTwinkle,
        "Animates the sparkle brightness in a forward seamless loop.",
        "sparkle",
      ),
      grainAmount: effectSlider(
        dispersionTargets.grainAmount,
        "Grain amount",
        DISPERSION_DEFAULTS.grainAmount,
        "Uses Paper's primary grain field through the middle of the range, then progressively adds two translated fields so 100 increases particle count and coverage without enlarging the grain.",
        "grain",
      ),
      grainScale: effectSlider(
        dispersionTargets.grainScale,
        "Scale",
        DISPERSION_DEFAULTS.grainScale,
        "Sets a resolution-independent grain frequency around Paper's 1.6 patterned-grain reference multiplier.",
        "grain",
      ),
      grainSoftness: effectSlider(
        dispersionTargets.grainSoftness,
        "Softness",
        DISPERSION_DEFAULTS.grainSoftness,
        "Controls Paper's antialiased transition between the spectral grain colors without blurring the wave geometry.",
        "grain",
      ),
      grainDistortion: effectSlider(
        dispersionTargets.grainDistortion,
        "Distortion",
        DISPERSION_DEFAULTS.grainDistortion,
        "Changes Paper's spectral color-ramp variation without stretching the individual grains.",
        "grain",
      ),
      grainDrift: effectSlider(
        dispersionTargets.grainDrift,
        "Drift",
        DISPERSION_DEFAULTS.grainDrift,
        "Moves the grain field along a seamless circular path while playback runs.",
        "grain",
      ),
    },
    id: "effect-style",
    title: "Effect Style",
  },
] as const satisfies readonly ToolcraftControlSectionSchema[];
