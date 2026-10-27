import {
  registerToolcraftRendererPipeline,
  type ToolcraftRendererPipelinePassContract,
} from "@/toolcraft/runtime";

import type { PrismGl } from "./prism-gl";
import { PRISM_ENTRIES, PRISM_KEYS, prismTarget } from "./prism-table";

export const prismPassIds = {
  imageExport: "prism.image-export",
  previewFrame: "prism.preview-frame",
  shaderResource: "prism.shader-resource",
} as const;

type PrismPipelineContracts = {
  [prismPassIds.imageExport]: ToolcraftRendererPipelinePassContract<void>;
  [prismPassIds.previewFrame]: ToolcraftRendererPipelinePassContract<void>;
  [prismPassIds.shaderResource]: ToolcraftRendererPipelinePassContract<
    PrismGl,
    PrismGl,
    readonly [HTMLCanvasElement]
  >;
};

const sliderTargets = PRISM_KEYS.filter((key) => {
  const { kind } = PRISM_ENTRIES[key];
  return kind === "slider" || kind === "int";
}).map(prismTarget);

const changeTargets = PRISM_KEYS.filter((key) => {
  const { kind } = PRISM_ENTRIES[key];
  return kind === "select" || kind === "bool" || kind === "color";
}).map(prismTarget);

const backgroundTargets = ["export.includeBackground", "appearance.background"] as const;
const exportSettingTargets = [
  "export.image.format",
  "export.image.resolution",
  "export.video.format",
  "export.video.resolution",
] as const;

export const prismRendererPipelineRegistration =
  registerToolcraftRendererPipeline<PrismPipelineContracts>()({
    interactionInvalidation: [
      {
        interaction: "initial-render",
        invalidates: [prismPassIds.shaderResource, prismPassIds.previewFrame],
        mustNotInvalidate: [prismPassIds.imageExport],
        targets: ["runtime.initial-render"],
      },
      {
        interaction: "control-drag",
        invalidates: [prismPassIds.previewFrame],
        mustNotInvalidate: [prismPassIds.shaderResource, prismPassIds.imageExport],
        targets: [...sliderTargets, "canvas.renderScale"],
      },
      {
        interaction: "control-change",
        invalidates: [prismPassIds.previewFrame],
        mustNotInvalidate: [prismPassIds.shaderResource, prismPassIds.imageExport],
        targets: [
          ...changeTargets,
          ...backgroundTargets,
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
          prismPassIds.shaderResource,
          prismPassIds.previewFrame,
          prismPassIds.imageExport,
        ],
        targets: [...exportSettingTargets, "panels.timeline.extended"],
      },
      {
        interaction: "animation-frame",
        invalidates: [prismPassIds.previewFrame],
        mustNotInvalidate: [prismPassIds.shaderResource, prismPassIds.imageExport],
        targets: ["runtime.animation-frame"],
      },
      {
        interaction: "timeline-playback",
        invalidates: [prismPassIds.previewFrame],
        mustNotInvalidate: [prismPassIds.shaderResource, prismPassIds.imageExport],
        targets: ["runtime.timeline"],
      },
      {
        interaction: "timeline-scrub",
        invalidates: [prismPassIds.previewFrame],
        mustNotInvalidate: [prismPassIds.shaderResource, prismPassIds.imageExport],
        targets: ["runtime.timeline"],
      },
      {
        interaction: "viewport-drag",
        invalidates: [prismPassIds.previewFrame],
        mustNotInvalidate: [prismPassIds.shaderResource, prismPassIds.imageExport],
        targets: ["runtime.canvas.viewport"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [prismPassIds.previewFrame],
        mustNotInvalidate: [prismPassIds.shaderResource, prismPassIds.imageExport],
        targets: ["runtime.canvas.viewport"],
      },
      {
        interaction: "export",
        invalidates: [prismPassIds.imageExport],
        mustNotInvalidate: [prismPassIds.shaderResource, prismPassIds.previewFrame],
        targets: [
          "export.png",
          "export.video",
          ...exportSettingTargets,
          ...backgroundTargets,
        ],
      },
    ],
    passes: [
      {
        cacheKey: ["canvas.element"],
        cost: { dimensions: [], frequency: "once", relationship: "constant" },
        gpu: {
          resources: "sampled-textures",
          stage: "render",
          state: "stateless",
          surfaces: ["preview"],
        },
        id: prismPassIds.shaderResource,
        inputs: ["canvas.element", "compiled field, blur and composite programs"],
        invalidatedBy: ["canvas.element"],
        kind: "preprocess",
        lifecycle: { cache: "retained-resource", resourceScope: "renderer" },
        output: "intermediate",
        quality: "full",
        sceneBounds: {
          kind: "intrinsic" as const,
          reason:
            "The sheet is shaded for exactly the artboard rectangle of the canvas size; every intended pixel lies inside that rectangle and nothing is generated outside it.",
        },
        runsOn: "gpu",
      },
      {
        cost: { dimensions: [], frequency: "frame", relationship: "constant" },
        gpu: {
          resources: "sampled-textures",
          stage: "render",
          state: "stateless",
          surfaces: ["preview"],
        },
        id: prismPassIds.previewFrame,
        inputs: [
          "normalized prism settings",
          "product scene frame",
          "selected render scale and canvas zoom",
          "Toolcraft timeline loop progress",
        ],
        invalidatedBy: [
          ...sliderTargets,
          ...changeTargets,
          ...backgroundTargets,
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
        sceneBounds: {
          kind: "intrinsic" as const,
          reason:
            "The sheet is shaded for exactly the artboard rectangle of the canvas size; every intended pixel lies inside that rectangle and nothing is generated outside it.",
        },
        runsOn: "gpu",
      },
      {
        cost: {
          dimensions: ["image-long-edge"],
          frequency: "batch",
          relationship: "quadratic",
        },
        id: prismPassIds.imageExport,
        inputs: [
          "normalized prism settings",
          "runtime-selected scene frame",
          "selected timeline progress",
          "image or video export settings",
        ],
        invalidatedBy: [
          "export.png",
          "export.video",
          ...exportSettingTargets,
          ...backgroundTargets,
        ],
        kind: "export",
        lifecycle: { cache: "none", resourceScope: "call" },
        output: "export",
        quality: "export",
        runsOn: "export-only",
      },
    ],
    runtimeId: "prism-field.renderer@1",
  });

export const prismPipelinePasses = {
  imageExport: prismRendererPipelineRegistration.getPass(prismPassIds.imageExport),
  previewFrame: prismRendererPipelineRegistration.getPass(prismPassIds.previewFrame),
  shaderResource: prismRendererPipelineRegistration.getPass(prismPassIds.shaderResource),
} as const;
