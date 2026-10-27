import type {
  ToolcraftControlSectionInventoryEntry,
  ToolcraftInteractionOwnershipEntry,
} from "../acceptance/types";
import { lensDistortionTargets as target } from "./dispersion-lens-distortion-values";

export const lensDistortionInteractionOwnership = {
  alternative: {
    reason:
      "Canvas handles would obscure the filtered result and cannot precisely expose Paper's complete normalized parameter set without duplicating the panel.",
    surface: "canvas",
  },
  capability: "property-edit",
  evidence: {
    detail:
      "The user explicitly requested the Lens Distortion effect with the same settings as the inspected Paper implementation and asked that it remain additive.",
    source: "user-request",
  },
  id: "lens-distortion-properties",
  reason:
    "Panel controls preserve exact Paper values, conditional visibility, reset, persistence, settings transfer, and preview/export parity.",
  surface: "panel",
  target: target.lensEnabled,
} as const satisfies ToolcraftInteractionOwnershipEntry;

const samplingTargets = [
  target.lensEnabled,
  target.lensSpread,
  target.lensBias,
  target.lensAngle,
  target.lensPerspective,
  target.lensCount,
  target.lensDispersion,
] as const;
const warpTargets = [
  target.lensDispersionShift,
  target.lensDispersionColor,
  target.lensFocusCenter,
  target.lensFocusEdges,
  target.lensSwirl,
  target.lensBulge,
  target.lensCircle,
] as const;
const textureTargets = [
  target.lensNoise,
  target.lensNoiseFrequency,
  target.lensNoiseOffset,
  target.lensGrainMixer,
  target.lensGrainOverlay,
  target.lensImageX,
  target.lensImageY,
] as const;

export const lensDistortionSectionInventory = [
  {
    entity: "Paper Lens Distortion post-effect",
    entityId: "paper-lens-distortion",
    groupingReason:
      "The toggle and spectral fan controls establish whether and how Paper samples the completed dispersion frame.",
    id: "lens-distortion-sampling",
    splitReason:
      "The 21-control Paper effect is split into three balanced workflow stages: sampling, warp, and texture/source treatment.",
    targets: samplingTargets,
    title: "Lens Distortion — Sampling",
    workflowStage: "sampling",
  },
  {
    entity: "Paper Lens Distortion post-effect",
    entityId: "paper-lens-distortion",
    groupingReason:
      "Center/edge focus, hue balance, swirl, bulge, and circle mapping jointly shape the lens geometry.",
    id: "lens-distortion-warp",
    splitReason:
      "Warp controls follow the sampling stage without mixing in noise or source placement.",
    targets: warpTargets,
    title: "Lens Distortion — Warp",
    workflowStage: "warp",
  },
  {
    entity: "Paper Lens Distortion post-effect",
    entityId: "paper-lens-distortion",
    groupingReason:
      "Noise, both grain treatments, and source pan define the final texture treatment of the same lens.",
    id: "lens-distortion-texture",
    splitReason:
      "Texture and source placement form the final stage after spectral sampling and geometric warp.",
    targets: textureTargets,
    title: "Lens Distortion — Texture",
    workflowStage: "texture",
  },
] as const satisfies readonly ToolcraftControlSectionInventoryEntry[];

export const lensDistortionAcceptanceDescriptors = [
  [target.lensEnabled, "switch", "Effect off preserves the existing wave output; on adds Paper's official Lens Distortion filter over that completed frame."],
  [target.lensSpread, "slider", "Spread changes how far the sampled chromatic layers fan apart."],
  [target.lensBias, "slider", "Bias curves layer spacing toward either end of the sampled fan."],
  [target.lensAngle, "slider", "Angle rotates the uniform component of the spread direction."],
  [target.lensPerspective, "slider", "Perspective moves the fan from parallel displacement to a radial burst."],
  [target.lensCount, "slider", "Count changes the number and smoothness of Paper's bounded spectral samples."],
  [target.lensDispersion, "slider", "Dispersion blends sampled source colors into Paper's generated spectrum."],
  [target.lensDispersionShift, "slider", "Dispersion shift moves chromatic strength between the center and edges."],
  [target.lensDispersionColor, "slider", "Dispersion color rotates the generated spectral hue sequence."],
  [target.lensFocusCenter, "slider", "Focus center restores the unspread source inside a soft central zone."],
  [target.lensFocusEdges, "slider", "Focus edges restores the unspread source toward the canvas boundary."],
  [target.lensSwirl, "slider", "Swirl counter-rotates the sampled fan around the center."],
  [target.lensBulge, "slider", "Lens bulge moves geometry between pincushion and barrel/fisheye distortion."],
  [target.lensCircle, "slider", "Lens circle squeezes the outer box toward an inscribed circular lens."],
  [target.lensNoise, "slider", "Noise scatters the spread direction with Paper's deterministic field."],
  [target.lensNoiseFrequency, "slider", "Noise frequency changes the scale of directional scattering."],
  [target.lensNoiseOffset, "slider", "Noise offset selects another deterministic spatial noise seed."],
  [target.lensGrainMixer, "slider", "Grain mixer jitters the sampling axis and breaks chromatic layer edges."],
  [target.lensGrainOverlay, "slider", "Grain overlay adds Paper's final black-and-white covered-pixel texture."],
  [target.lensImageX, "slider", "Image X pans the rendered dispersion source horizontally behind the lens."],
  [target.lensImageY, "slider", "Image Y pans the rendered dispersion source vertically behind the lens."],
] as const;
