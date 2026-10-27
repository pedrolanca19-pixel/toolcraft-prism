import type { ToolcraftControlSectionSchema } from "@/toolcraft/runtime";

import {
  LENS_DISTORTION_DEFAULTS,
  lensDistortionTargets,
} from "./dispersion-lens-distortion-values";

const conditional = {
  all: [{ equals: true, target: lensDistortionTargets.lensEnabled }],
  mode: "conditional" as const,
};
const conditionalSamplingTargets = new Set<string>([
  lensDistortionTargets.lensSpread,
  lensDistortionTargets.lensBias,
  lensDistortionTargets.lensAngle,
  lensDistortionTargets.lensPerspective,
  lensDistortionTargets.lensCount,
  lensDistortionTargets.lensDispersion,
]);

function lensSlider(
  target: string,
  label: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  description: string,
  options: { unit?: string; workload?: boolean } = {},
) {
  return {
    applicability: conditionalSamplingTargets.has(target)
      ? conditional
      : { mode: "always" as const },
    defaultValue,
    description,
    label,
    max,
    min,
    orderRole: "detail" as const,
    performanceReason: options.workload
      ? "Controls Paper's early exit in a bounded 50-tap spectral sampling loop."
      : "Updates one uniform in the retained official Paper post-process pass.",
    performanceRole: options.workload
      ? ("workload" as const)
      : ("responsiveness" as const),
    sliderValueKind: "continuous" as const,
    step,
    target,
    type: "slider" as const,
    ...(options.unit ? { unit: options.unit } : {}),
  };
}

const defaults = LENS_DISTORTION_DEFAULTS;
const target = lensDistortionTargets;

export const lensDistortionControlSections = [
  {
    controls: {
      enabled: {
        applicability: { mode: "always" },
        defaultValue: defaults.enabled,
        description:
          "Adds Paper's official image-filter shader after the current wave instead of replacing it.",
        label: "Effect",
        orderRole: "mode",
        performanceReason:
          "Conditionally adds one retained fullscreen GPU post-process without rebuilding the base renderer.",
        performanceRole: "responsiveness",
        target: target.lensEnabled,
        type: "switch",
      },
      spread: lensSlider(target.lensSpread, "Spread", defaults.spread, 0, 1, 0.01,
        "Sets how far Paper's sampled color layers fan apart."),
      bias: lensSlider(target.lensBias, "Bias", defaults.bias, -1, 1, 0.01,
        "Curves the sample distribution toward either end of the chromatic fan."),
      angle: lensSlider(target.lensAngle, "Angle", defaults.angle, 0, 360, 1,
        "Rotates the uniform component of the spread direction.", { unit: "°" }),
      perspective: lensSlider(target.lensPerspective, "Perspective", defaults.perspective, 0, 1, 0.01,
        "Blends the spread from a parallel direction into a radial burst from the center."),
      count: lensSlider(target.lensCount, "Count", defaults.count, 2, 50, 1,
        "Sets Paper's spectral sample count; higher values produce a smoother but costlier fan.", { workload: true }),
      dispersion: lensSlider(target.lensDispersion, "Dispersion", defaults.dispersion, 0, 1, 0.01,
        "Blends the sampled layers from their original color into the full generated spectrum."),
    },
    id: "lens-distortion-sampling",
    title: "Lens Distortion — Sampling",
  },
  {
    controls: {
      dispersionShift: lensSlider(target.lensDispersionShift, "Dispersion shift", defaults.dispersionShift, -1, 1, 0.01,
        "Moves the chromatic dispersion balance between the center and outer image."),
      dispersionColor: lensSlider(target.lensDispersionColor, "Dispersion color", defaults.dispersionColor, 0, 1, 0.01,
        "Rotates Paper's generated spectrum around the hue wheel."),
      focusCenter: lensSlider(target.lensFocusCenter, "Focus center", defaults.focusCenter, 0, 1, 0.01,
        "Reduces the spread inside a soft circular zone at the canvas center."),
      focusEdges: lensSlider(target.lensFocusEdges, "Focus edges", defaults.focusEdges, 0, 1, 0.01,
        "Restores the unspread source progressively toward the canvas edges."),
      swirl: lensSlider(target.lensSwirl, "Swirl", defaults.swirl, -1, 1, 0.01,
        "Rotates opposite ends of the sampled fan around the center."),
      lensBulge: lensSlider(target.lensBulge, "Lens bulge", defaults.lensBulge, -1, 1, 0.01,
        "Warps geometry from pincushion at negative values to barrel or fisheye at positive values."),
      lensCircle: lensSlider(target.lensCircle, "Lens circle", defaults.lensCircle, 0, 1, 0.01,
        "Squeezes pixels outside the inscribed circle inward and makes the spread radial near the rim."),
    },
    id: "lens-distortion-warp",
    title: "Lens Distortion — Warp",
  },
  {
    controls: {
      noise: lensSlider(target.lensNoise, "Noise", defaults.noise, 0, 1, 0.01,
        "Scatters the spread direction with Paper's deterministic value noise."),
      noiseFrequency: lensSlider(target.lensNoiseFrequency, "Noise frequency", defaults.noiseFrequency, 0, 1, 0.01,
        "Moves Paper's noise from broad distortion toward finer detail."),
      noiseOffset: lensSlider(target.lensNoiseOffset, "Noise offset", defaults.noiseOffset, 0, 1, 0.01,
        "Offsets the deterministic noise field to a different spatial seed."),
      grainMixer: lensSlider(target.lensGrainMixer, "Grain mixer", defaults.grainMixer, 0, 1, 0.01,
        "Jitters the chromatic sample axis so layer edges break into grain."),
      grainOverlay: lensSlider(target.lensGrainOverlay, "Grain overlay", defaults.grainOverlay, 0, 1, 0.01,
        "Adds Paper's final black-and-white grain treatment over covered pixels."),
      imageX: lensSlider(target.lensImageX, "Image X", defaults.imageX, -1, 1, 0.01,
        "Pans the rendered dispersion source horizontally behind the lens."),
      imageY: lensSlider(target.lensImageY, "Image Y", defaults.imageY, -1, 1, 0.01,
        "Pans the rendered dispersion source vertically behind the lens."),
    },
    id: "lens-distortion-texture",
    title: "Lens Distortion — Texture",
  },
] as const satisfies readonly ToolcraftControlSectionSchema[];
