import type { ToolcraftControlSectionInventoryEntry } from "../acceptance/types";

import { dispersionTargets } from "./dispersion-values";

export const appControlSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] = [
  {
    entity: "Output frame mask",
    entityId: "dispersion-frame",
    groupingReason:
      "Shape and conditional corner radius jointly clip the complete product output rather than creating a separate shape object.",
    id: "frame",
    targets: [dispersionTargets.shape, dispersionTargets.cornerRadius],
    title: "Frame",
  },
  {
    entity: "Chromatic dispersion field",
    entityId: "dispersion-field-distribution",
    groupingReason:
      "Mode, placement, scale, interference-cell scale, tilt, and edge fade define the field's complete global spatial distribution, together with the static screen curve and its depth.",
    id: "field-distribution",
    targets: [
      dispersionTargets.mode,
      dispersionTargets.position,
      dispersionTargets.fieldScale,
      dispersionTargets.patternScale,
      dispersionTargets.bend,
      dispersionTargets.curve,
      dispersionTargets.curveDepth,
      dispersionTargets.shading,
      dispersionTargets.inset,
    ],
    title: "Field Distribution",
  },
  {
    entity: "Wave focal convergence",
    entityId: "dispersion-focal-convergence",
    groupingReason:
      "Enablement, pull strength, and the stable two-axis destination jointly define one point-attractor behavior for the wave and its branches.",
    id: "focal-convergence",
    targets: [
      dispersionTargets.focusEnabled,
      dispersionTargets.convergence,
      dispersionTargets.focalPoint,
    ],
    title: "Focal Convergence",
  },
  {
    entity: "Dispersion optics",
    entityId: "dispersion-optics",
    groupingReason:
      "Branch count and spacing, refraction, interference softness, and channel separation define how the primary ray splits, bends, and disperses light.",
    id: "dispersion-optics",
    targets: [
      dispersionTargets.branchCount,
      dispersionTargets.branchSpread,
      dispersionTargets.refraction,
      dispersionTargets.softness,
      dispersionTargets.chromaSplit,
    ],
    title: "Dispersion",
  },
  {
    entity: "Wave effect",
    entityId: "dispersion-wave-effect",
    groupingReason:
      "The effect selector and its conditional Sparkle, Noise Split, Halation, and Spectral Echo parameters define one mutually exclusive wave treatment.",
    id: "wave-effect",
    targets: [
      dispersionTargets.effectMode,
      dispersionTargets.sparkle,
      dispersionTargets.sparkleSize,
      dispersionTargets.noiseSplit,
      dispersionTargets.noiseScale,
      dispersionTargets.halationStrength,
      dispersionTargets.halationRadius,
      dispersionTargets.halationTint,
      dispersionTargets.echoStrength,
      dispersionTargets.echoSpacing,
    ],
    title: "Wave Effect",
  },
  {
    entity: "Dispersion spectral treatment",
    entityId: "dispersion-color",
    groupingReason:
      "Spectrum, conditional palette anchors, saturation, band density, and hue phase define the repeating color cycle.",
    id: "color",
    targets: [
      dispersionTargets.spectrum,
      dispersionTargets.customColorA,
      dispersionTargets.customColorB,
      dispersionTargets.customColorC,
      dispersionTargets.customColorD,
      dispersionTargets.intensity,
      dispersionTargets.spread,
      dispersionTargets.shimmer,
    ],
    title: "Spectrum",
  },
  {
    entity: "Dispersion color balance",
    entityId: "dispersion-color-balance",
    groupingReason:
      "The compound two-axis grading pad is the complete editable surface for stable cyan/red and blue/yellow balance.",
    id: "color-balance",
    targets: [dispersionTargets.colorBalance],
    title: "Color Balance",
  },
  {
    entity: "Dispersion glow",
    entityId: "dispersion-glow",
    groupingReason:
      "Strength, volume, and focus independently tune emission energy and the veil-to-caustic balance.",
    id: "glow",
    targets: [
      dispersionTargets.glow,
      dispersionTargets.height,
      dispersionTargets.glowFocus,
    ],
    title: "Glow",
  },
  {
    entity: "Seamless dispersion motion",
    entityId: "dispersion-motion",
    groupingReason:
      "Speed, wave amplitudes, interference evolution, pulse, palette drift, and phase define seamless timeline-driven animation.",
    id: "motion",
    targets: [
      dispersionTargets.flow,
      dispersionTargets.undulation,
      dispersionTargets.detail,
      dispersionTargets.evolution,
      dispersionTargets.pulse,
      dispersionTargets.colorDrift,
      dispersionTargets.seed,
    ],
    title: "Motion",
  },
  {
    entity: "Dispersion output background",
    entityId: "dispersion-background",
    groupingReason:
      "Runtime Setup owns whether background is included and the exact color used by preview, Infinity, and export.",
    id: "runtime.setup",
    targets: [
      dispersionTargets.includeBackground,
      dispersionTargets.background,
    ],
    title: "Setup",
  },
  {
    entity: "Still-image delivery",
    entityId: "dispersion-image-export",
    groupingReason:
      "Format and resolution jointly define runtime image encoding for the selected timeline frame.",
    id: "image-export",
    targets: [
      dispersionTargets.imageFormat,
      dispersionTargets.imageResolution,
    ],
    title: "Image Export",
  },
];
