import { dispersionTargets as target } from "./dispersion-values";

export const dispersionEffectAcceptanceDescriptors = [
  {
    componentType: "select",
    expectedObservable:
      "Sparkle preserves the surface-bound specks while Grain renders Paper's official sparse-noise, shape, antialiasing, and color-mixer recipe on the same moving wave.",
    interactionId: "wave-effect-properties",
    optionCoverage: ["sparkle", "grain"],
    target: target.effectMode,
  },
  {
    componentType: "select",
    expectedObservable:
      "Whole wave, Core, Glow, Color bands, and Veil produce distinct effect masks across the light sheet.",
    optionCoverage: ["all", "core", "glow", "bands", "veil"],
    target: target.effectArea,
  },
  {
    componentType: "select",
    expectedObservable:
      "Screen spreads undistorted Paper Grain uniformly across the chosen Area, while Surface gates luminous grain with continuous projected raymarch-hit confidence without deforming or darkening the wave.",
    optionCoverage: ["screen", "surface"],
    target: target.grainDistribution,
    userAction:
      "Choose Screen and Surface in Grain, then compare uniform placement with the continuous projected-surface distribution across the light sheet.",
  },
  {
    componentType: "slider",
    expectedObservable:
      "Sparkle Amount changes wave-bound speck contrast and zero leaves the wave unchanged.",
    target: target.sparkle,
  },
  {
    componentType: "slider",
    expectedObservable: "Sparkle Size changes surface-speck scale.",
    target: target.sparkleSize,
  },
  {
    componentType: "slider",
    expectedObservable:
      "Twinkle periodically relights Sparkle while preserving the loop seam.",
    target: target.sparkleTwinkle,
  },
  {
    componentType: "slider",
    expectedObservable:
      "Grain Amount leaves output unchanged at zero, preserves the primary Paper field around 50, and at 100 adds two decorrelated Paper fields for substantially greater particle coverage without changing grain size.",
    target: target.grainAmount,
  },
  {
    componentType: "slider",
    expectedObservable:
      "Grain Scale changes the undistorted official noise field around Paper's reference frequency without depending on render resolution.",
    target: target.grainScale,
  },
  {
    componentType: "slider",
    expectedObservable:
      "Grain Softness changes Paper's antialiased color-stop transition without blurring wave geometry.",
    target: target.grainSoftness,
  },
  {
    componentType: "slider",
    expectedObservable:
      "Grain Distortion moves Paper's spectral color-ramp coordinate with its official FBM field without stretching grain geometry.",
    target: target.grainDistortion,
  },
  {
    componentType: "slider",
    expectedObservable:
      "Grain Drift moves Paper noise along a seamless periodic path.",
    target: target.grainDrift,
  },
] as const;
