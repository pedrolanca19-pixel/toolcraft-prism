import {
  assessToolcraftRenderPlan,
  defineToolcraftPerformance,
  defineToolcraftSchemaDiscreteFixtureAdapter,
  deriveToolcraftPerformancePaths,
  type ToolcraftEnvelopePerformanceConfig,
  type ToolcraftPerformanceScenario,
} from "@/toolcraft/runtime";

import { appSchema } from "./app-schema";
import { prismRendererPipelineRegistration } from "./prism/prism-pipeline";

const imageResolutionAdapter = defineToolcraftSchemaDiscreteFixtureAdapter(appSchema, {
  dimensionId: "image-long-edge",
  entries: [
    { appliedValue: "2k", value: 2048 },
    { appliedValue: "4k", value: 4096 },
    { appliedValue: "8k", value: 8192 },
  ],
  target: "export.image.resolution",
});

const basePerformance = {
  fixtureAdapters: {
    dimensions: { "image-long-edge": imageResolutionAdapter },
  },
  rendererPipeline: prismRendererPipelineRegistration,
  rendererStrategy: "webgl" as const,
  rendererTechnique: {
    exportRenderer: "webgl" as const,
    gpu: {
      export: {
        backend: "webgl" as const,
        exception: {
          evidence:
            "Prism Field must run where WebGPU is unavailable, including Safari releases before 26, Firefox on several platforms and many Android devices; the field, blur and composite programs use only WebGL2 features.",
          kind: "browser-compatibility" as const,
        },
        provider: "native" as const,
      },
      preview: {
        backend: "webgl" as const,
        exception: {
          evidence:
            "Prism Field must run where WebGPU is unavailable, including Safari releases before 26, Firefox on several platforms and many Android devices; the field, blur and composite programs use only WebGL2 features.",
          kind: "browser-compatibility" as const,
        },
        provider: "native" as const,
      },
    },
    fidelityRisks: [
      "Float32 shader arithmetic can differ by one color level between GPUs, so acceptance proves visible structure and decoded artifact semantics rather than byte identity.",
      "JPG cannot keep a transparent background; the selected Background color is opaque in JPG exports.",
    ],
    intentionalRasterizationReason:
      "The sheet is evaluated per pixel by a fixed-cost height-field shader before still and video delivery.",
    layers: [
      {
        content: ["shader", "composite"],
        exportMode: "included" as const,
        id: "prism-light-sheet",
        intentionalRasterizationReason:
          "One fixed-cost fragment pass shades the folded sheet; bloom adds three fixed blur levels.",
        kind: "product-foreground" as const,
        primitiveCount: "medium" as const,
        renderer: "webgl" as const,
        uiSelector: '[data-prism-canvas="true"]',
      },
    ],
    performanceRisks: [
      "The field pass evaluates three height samples per pixel, each with a fixed 3-octave warp, up to three fold layers and up to six detail octaves, so cost scales with backing pixels but not with any control value.",
      "The canvas always allocates exact CSS × devicePixelRatio × Resolution scale backing pixels, and the bloom chain adds three fixed blur levels at quarter, eighth and sixteenth size.",
      "8K still export raises GPU fill, readback and encoding cost quadratically with the selected long edge.",
    ],
    previewExportDifferenceReason:
      "Preview and export run the same retained program chain; export draws at full artifact resolution into an offscreen canvas before the runtime composites and encodes it.",
    previewRenderer: "webgl" as const,
    productRepresentation: "pixel" as const,
    rendererStrategy: "webgl" as const,
    sourceRepresentation: "procedural-data" as const,
    whyNotAlternativeStrategies: [
      "DOM and CSS filters cannot evaluate a per-pixel folded height field with spectral color.",
      "SVG filters cannot reproduce the noise-driven surface and bloom chain at exact render-scale backing.",
      "Canvas 2D would shade pixels on the CPU and diverge from the retained WebGL preview and export renderer.",
    ],
  },
  scenarios: [] as readonly ToolcraftPerformanceScenario[],
  usesCustomRenderer: true,
  workloadEnvelope: {
    dimensions: [
      {
        batchMax: 8192,
        defaultValue: 4096,
        id: "image-long-edge",
        mapping: "quadratic" as const,
        source: { kind: "schema-target" as const, target: "export.image.resolution" },
        unit: "pixels",
      },
    ],
  },
} satisfies ToolcraftEnvelopePerformanceConfig;

const performancePaths = deriveToolcraftPerformancePaths(appSchema, basePerformance);

const scenarios: readonly ToolcraftPerformanceScenario[] = performancePaths.map(
  (path, index): ToolcraftPerformanceScenario => {
    const common = {
      automated: true,
      automatedTestName: "Prism Field performance config derives every scenario from the canonical pipeline",
      browser: true,
      browserTestName: `browser perf: prism path ${path.id}`,
      coversTargets: path.targets,
      expectedObservable: path.interaction.startsWith("viewport-")
        ? "The Toolcraft viewport changes while playback state and the retained canvas stay stable."
        : "The preview or delivered still persistently reflects the compiled fixture values.",
      fixture: `compiled-prism-${path.id}`,
      id: `prism-path-${String(index + 1).padStart(2, "0")}`,
      pathId: path.id,
      target: path.targets.length === 1 ? path.targets[0] : undefined,
      uiSelector: '[data-prism-canvas="true"]',
    };

    if (path.interaction === "export") {
      return {
        ...common,
        actionValue: "export.png",
        completionEvidence: "download",
        controlLabel: "Export PNG",
        interaction: "export",
      };
    }
    return { ...common, interaction: path.interaction };
  },
);

export const appPerformance: ToolcraftEnvelopePerformanceConfig =
  defineToolcraftPerformance({ ...basePerformance, scenarios });

export const appRenderPlanAssessment = assessToolcraftRenderPlan(appSchema, appPerformance);
