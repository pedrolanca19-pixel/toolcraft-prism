import {
  registerToolcraftRendererPipeline,
  type ToolcraftRendererPipelinePassContract,
} from "@/toolcraft/runtime";

import { dispersionTargets } from "./dispersion-values";
import type { DispersionGlResource } from "./dispersion-webgl";

export const dispersionPassIds = {
  imageExport: "dispersion.image-export",
  previewFrame: "dispersion.preview-frame",
  shaderResource: "dispersion.shader-resource",
} as const;

type DispersionPipelineContracts = {
  [dispersionPassIds.imageExport]: ToolcraftRendererPipelinePassContract<void>;
  [dispersionPassIds.previewFrame]: ToolcraftRendererPipelinePassContract<void>;
  [dispersionPassIds.shaderResource]: ToolcraftRendererPipelinePassContract<
    DispersionGlResource,
    DispersionGlResource,
    readonly [HTMLCanvasElement]
  >;
};

const fieldSliderTargets = [
  dispersionTargets.cornerRadius,
  dispersionTargets.position,
  dispersionTargets.inset,
  dispersionTargets.height,
  dispersionTargets.refraction,
  dispersionTargets.spread,
  dispersionTargets.softness,
  dispersionTargets.chromaSplit,
  dispersionTargets.sparkle,
  dispersionTargets.sparkleSize,
  dispersionTargets.sparkleTwinkle,
  dispersionTargets.grainAmount,
  dispersionTargets.grainScale,
  dispersionTargets.grainSoftness,
  dispersionTargets.grainDistortion,
  dispersionTargets.grainDrift,
  dispersionTargets.bend,
  dispersionTargets.curveDepth,
  dispersionTargets.shading,
  dispersionTargets.intensity,
  dispersionTargets.glow,
  dispersionTargets.flow,
  dispersionTargets.undulation,
  dispersionTargets.detail,
  dispersionTargets.shimmer,
  dispersionTargets.seed,
  dispersionTargets.lensAngle,
  dispersionTargets.lensBias,
  dispersionTargets.lensBulge,
  dispersionTargets.lensCircle,
  dispersionTargets.lensCount,
  dispersionTargets.lensDispersion,
  dispersionTargets.lensDispersionColor,
  dispersionTargets.lensDispersionShift,
  dispersionTargets.lensFocusCenter,
  dispersionTargets.lensFocusEdges,
  dispersionTargets.lensGrainMixer,
  dispersionTargets.lensGrainOverlay,
  dispersionTargets.lensImageX,
  dispersionTargets.lensImageY,
  dispersionTargets.lensNoise,
  dispersionTargets.lensNoiseFrequency,
  dispersionTargets.lensNoiseOffset,
  dispersionTargets.lensPerspective,
  dispersionTargets.lensSpread,
  dispersionTargets.lensSwirl,
  dispersionTargets.maskItems,
] as const;

const fieldChangeTargets = [
  dispersionTargets.colorBalance,
  dispersionTargets.curve,
  dispersionTargets.shape,
  dispersionTargets.effectMode,
  dispersionTargets.effectArea,
  dispersionTargets.grainDistribution,
  dispersionTargets.mode,
  dispersionTargets.spectrum,
  dispersionTargets.customColorA,
  dispersionTargets.customColorB,
  dispersionTargets.customColorC,
  dispersionTargets.customColorD,
  dispersionTargets.includeBackground,
  dispersionTargets.background,
  dispersionTargets.lensEnabled,
  dispersionTargets.maskEnabled,
  dispersionTargets.maskPreview,
] as const;

export const dispersionRendererPipelineRegistration =
  registerToolcraftRendererPipeline<DispersionPipelineContracts>()({
    interactionInvalidation: [
      {
        interaction: "initial-render",
        invalidates: [
          dispersionPassIds.shaderResource,
          dispersionPassIds.previewFrame,
        ],
        mustNotInvalidate: [dispersionPassIds.imageExport],
        targets: ["runtime.initial-render"],
      },
      {
        interaction: "control-drag",
        invalidates: [dispersionPassIds.previewFrame],
        mustNotInvalidate: [
          dispersionPassIds.shaderResource,
          dispersionPassIds.imageExport,
        ],
        targets: [
          ...fieldSliderTargets,
          "canvas.renderScale",
        ],
      },
      {
        interaction: "control-change",
        invalidates: [dispersionPassIds.previewFrame],
        mustNotInvalidate: [
          dispersionPassIds.shaderResource,
          dispersionPassIds.imageExport,
        ],
        targets: [
          ...fieldChangeTargets,
          "canvas.aspectRatio",
          "canvas.size.width",
          "canvas.size.height",
          "canvas.infinity",
        ],
      },
      {
        interaction: "control-change",
        invalidates: [],
        mustNotInvalidate: [
          dispersionPassIds.shaderResource,
          dispersionPassIds.previewFrame,
          dispersionPassIds.imageExport,
        ],
        targets: [
          dispersionTargets.imageFormat,
          dispersionTargets.imageResolution,
          "panels.timeline.extended",
        ],
      },
      {
        interaction: "animation-frame",
        invalidates: [dispersionPassIds.previewFrame],
        mustNotInvalidate: [
          dispersionPassIds.shaderResource,
          dispersionPassIds.imageExport,
        ],
        targets: ["runtime.animation-frame"],
      },
      {
        interaction: "timeline-playback",
        invalidates: [dispersionPassIds.previewFrame],
        mustNotInvalidate: [
          dispersionPassIds.shaderResource,
          dispersionPassIds.imageExport,
        ],
        targets: ["runtime.timeline"],
      },
      {
        interaction: "timeline-scrub",
        invalidates: [dispersionPassIds.previewFrame],
        mustNotInvalidate: [
          dispersionPassIds.shaderResource,
          dispersionPassIds.imageExport,
        ],
        targets: ["runtime.timeline"],
      },
      {
        interaction: "viewport-drag",
        invalidates: [dispersionPassIds.previewFrame],
        mustNotInvalidate: [
          dispersionPassIds.shaderResource,
          dispersionPassIds.imageExport,
        ],
        targets: ["runtime.canvas.viewport"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [dispersionPassIds.previewFrame],
        mustNotInvalidate: [
          dispersionPassIds.shaderResource,
          dispersionPassIds.imageExport,
        ],
        targets: ["runtime.canvas.viewport"],
      },
      {
        interaction: "export",
        invalidates: [dispersionPassIds.imageExport],
        mustNotInvalidate: [
          dispersionPassIds.shaderResource,
          dispersionPassIds.previewFrame,
        ],
        targets: [
          "export.png",
          dispersionTargets.imageFormat,
          dispersionTargets.imageResolution,
          dispersionTargets.includeBackground,
          dispersionTargets.background,
        ],
      },
    ],
    passes: [
      {
        cacheKey: ["canvas.element"],
        cost: {
          dimensions: [],
          frequency: "once",
          relationship: "constant",
        },
        id: dispersionPassIds.shaderResource,
        inputs: [
          "canvas.element",
          "pinned Paper noise texture",
          "precompiled official Paper Lens Distortion shader",
        ],
        invalidatedBy: ["canvas.element"],
        kind: "preprocess",
        lifecycle: {
          cache: "retained-resource",
          resourceScope: "renderer",
        },
        output: "intermediate",
        quality: "full",
        runsOn: "gpu",
      },
      {
        cost: {
          dimensions: ["lens-samples", "mask-count"],
          frequency: "frame",
          relationship: "linear",
        },
        id: dispersionPassIds.previewFrame,
        inputs: [
          "normalized dispersion settings",
          "product scene frame",
          "infinite viewport size and runtime camera",
          "selected render scale",
          "Toolcraft timeline progress",
          "bounded soft ellipse mask uniforms and preview mode",
        ],
        invalidatedBy: [
          ...fieldSliderTargets,
          ...fieldChangeTargets,
          "canvas.aspectRatio",
          "canvas.size.width",
          "canvas.size.height",
          "canvas.renderScale",
          "runtime.timeline",
          "canvas.infinity",
          "runtime.canvas.viewport",
        ],
        kind: "composite",
        lifecycle: { cache: "none", resourceScope: "renderer" },
        output: "preview",
        quality: "retina",
        runsOn: "gpu",
      },
      {
        cost: {
          dimensions: ["image-long-edge", "lens-samples", "mask-count"],
          frequency: "batch",
          relationship: "quadratic",
        },
        id: dispersionPassIds.imageExport,
        inputs: [
          "normalized dispersion settings",
          "runtime-selected scene frame",
          "selected timeline progress",
          "image export settings",
          "bounded soft ellipse mask uniforms with preview overlay disabled",
        ],
        invalidatedBy: [
          "export.png",
          dispersionTargets.imageFormat,
          dispersionTargets.imageResolution,
          dispersionTargets.includeBackground,
          dispersionTargets.background,
        ],
        kind: "export",
        lifecycle: { cache: "none", resourceScope: "call" },
        output: "export",
        quality: "export",
        runsOn: "export-only",
      },
    ],
    runtimeId: "dispersion.renderer@7",
  });

export const dispersionPipelinePasses = {
  imageExport: dispersionRendererPipelineRegistration.getPass(
    dispersionPassIds.imageExport,
  ),
  previewFrame: dispersionRendererPipelineRegistration.getPass(
    dispersionPassIds.previewFrame,
  ),
  shaderResource: dispersionRendererPipelineRegistration.getPass(
    dispersionPassIds.shaderResource,
  ),
} as const;
