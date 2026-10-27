import {
  assessToolcraftRenderPlan,
  defineToolcraftFixtureAdapter,
  defineToolcraftPerformance,
  defineToolcraftSchemaDiscreteFixtureAdapter,
  deriveToolcraftPerformancePaths,
  type ToolcraftEnvelopePerformanceConfig,
  type ToolcraftPerformanceScenario,
} from "@/toolcraft/runtime";

import { appSchema } from "./app-schema";
import { createDefaultDispersionMask } from "./dispersion/dispersion-masks-values";
import { dispersionRendererPipelineRegistration } from "./dispersion/dispersion-pipeline";

const imageResolutionAdapter = defineToolcraftSchemaDiscreteFixtureAdapter(
  appSchema,
  {
    dimensionId: "image-long-edge",
    entries: [
      { appliedValue: "2k", value: 2048 },
      { appliedValue: "4k", value: 4096 },
      { appliedValue: "8k", value: 8192 },
    ],
    target: "export.image.resolution",
  },
);

const lensSamplesAdapter = defineToolcraftFixtureAdapter({
  apply: (value: number) => Math.round(value),
  dimensionId: "lens-samples",
  observe: (value: number) => value,
});

function createMaskCountFixture(value: number) {
  const count = Math.min(12, Math.max(0, Math.round(value)));
  return Array.from({ length: count }, (_, index) => ({
    ...createDefaultDispersionMask(),
    center: {
      x: ((index % 4) - 1.5) * 0.35,
      y: (Math.floor(index / 4) - 1) * 0.4,
    },
  }));
}

const maskCountAdapter = defineToolcraftFixtureAdapter({
  apply: createMaskCountFixture,
  dimensionId: "mask-count",
  observe: (value: ReturnType<typeof createMaskCountFixture>) => value.length,
});

const basePerformance = {
  fixtureAdapters: {
    dimensions: {
      "image-long-edge": imageResolutionAdapter,
      "lens-samples": lensSamplesAdapter,
      "mask-count": maskCountAdapter,
    },
  },
  rendererPipeline: dispersionRendererPipelineRegistration,
  rendererStrategy: "webgl" as const,
  kernelBenchmarkDecisions: [
    {
      candidates: ["canvas-2d", "webgl"] as const,
      decision:
        "At the required 50-sample Lens ceiling, the retained WebGL fullscreen pass executes Paper's bounded chromatic texture loop in one GPU submission; Canvas 2D must issue and composite the same 50 full-frame samples individually and cannot preserve the official GLSL transform.",
      id: "dispersion.preview-frame",
      selected: "webgl" as const,
    },
  ],
  rendererTechnique: {
    exportRenderer: "webgl" as const,
    fidelityRisks: [
      "WebGL texture precision and browser color management can shift subpixel channel edges slightly, so acceptance proves optical structure and decoded artifact semantics rather than byte identity.",
      "JPG cannot preserve transparent rounded or circular corners; the selected background remains opaque while product caustics stay clipped to the chosen mask.",
    ],
    intentionalRasterizationReason:
      "The product evaluates a fixed 38-step raymarched light sheet per contributing pixel before still-image delivery.",
    layers: [
      {
        content: ["composite", "shader"],
        exportMode: "composited" as const,
        id: "dispersion-background",
        kind: "background" as const,
        primitiveCount: "low" as const,
        renderer: "webgl" as const,
        uiSelector: '[data-dispersion-canvas="true"]',
      },
      {
        content: ["composite", "shader"],
        exportMode: "included" as const,
        id: "paper-lens-distortion",
        intentionalRasterizationReason:
          "The optional official Paper image filter performs multi-tap chromatic sampling and radial lens warping over the completed dispersion frame.",
        kind: "product-foreground" as const,
        primitiveCount: "low" as const,
        renderer: "webgl" as const,
        uiSelector: '[data-dispersion-canvas="true"]',
      },
      {
        content: ["composite", "shader"],
        exportMode: "included" as const,
        id: "dispersion-optical-field",
        intentionalRasterizationReason:
          "The canonical field uses one fixed 38-step light-sheet core; Sparkle and Paper Grain remain mutually exclusive fixed-cost branches in the same bounded GPU layer.",
        kind: "product-foreground" as const,
        primitiveCount: "medium" as const,
        renderer: "webgl" as const,
        uiSelector: '[data-dispersion-canvas="true"]',
      },
    ],
    performanceRisks: [
      "The canvas always allocates exact CSS \u00d7 devicePixelRatio \u00d7 Resolution-scale backing pixels. The retained 38-step field is shaded before any exact-backing copy or optional Lens Distortion pass.",
      "Every contributing fragment accumulates the same fixed 38-step raymarch; field controls change uniforms without changing raymarch cardinality.",
      "Paper Grain reuses one retained 128×128 randomizer texture and a fixed three-octave package kernel; its amount, scale, softness, distortion, drift, and area controls change uniforms without adding passes or workload cardinality.",
      "Lens Distortion is a conditional fullscreen post-process with a retained program precompiled before first use. Its official loop is bounded at 50 taps; Count is modeled explicitly as the linear lens-samples workload dimension while every other lens control changes cached uniforms only, and preview submission adds no synchronous flush barrier.",
      "Soft ellipse masking uses one fixed 12-iteration shader loop with an early count break. Mask cardinality is modeled as the linear mask-count workload dimension, while center, size, rotation, blur, and preview mode update uniforms without adding passes.",
      "8K still export increases GPU fill, snapshot, encoding, and memory cost quadratically with selected long edge.",
    ],
    previewExportDifferenceReason:
      "Preview and export call the same retained 38-step optical core followed by the same optional Paper Lens Distortion pass; export uses full artifact resolution before restoring preview state.",
    previewRenderer: "webgl" as const,
    productRepresentation: "pixel" as const,
    rendererStrategy: "webgl" as const,
    sourceRepresentation: "procedural-data" as const,
    whyNotAlternativeStrategies: [
      "DOM and CSS filters cannot execute the 38-step light-sheet core while preserving the optical palette.",
      "SVG filters cannot express the same 38-step raymarch at exact render-scale backing.",
      "Canvas 2D additive strokes caused the rejected pastel wash and would diverge from the retained preview/export renderer.",
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
        source: {
          kind: "schema-target" as const,
          target: "export.image.resolution",
        },
        unit: "pixels",
      },
      {
        batchMax: 50,
        defaultValue: 35,
        id: "lens-samples",
        interactiveMax: 50,
        mapping: "direct" as const,
        source: {
          kind: "schema-target" as const,
          target: "lens.count",
          workloadBoundary: "maximum" as const,
        },
        unit: "samples",
      },
      {
        batchMax: 12,
        defaultValue: 0,
        id: "mask-count",
        interactiveMax: 12,
        mapping: "direct" as const,
        source: {
          kind: "schema-target" as const,
          target: "masks.items",
        },
        unit: "masks",
      },
    ],
  },
} satisfies ToolcraftEnvelopePerformanceConfig;

const performancePaths = deriveToolcraftPerformancePaths(
  appSchema,
  basePerformance,
);

const scenarios: readonly ToolcraftPerformanceScenario[] = performancePaths.map(
  (path, index): ToolcraftPerformanceScenario => {
    const common = {
      automated: true,
      automatedTestName:
        "dispersion performance config derives every scenario from the canonical pipeline",
      browser: true,
      browserTestName: `browser perf: dispersion path ${path.id}`,
      coversTargets: path.targets,
      expectedObservable: path.interaction.startsWith("viewport-")
        ? "The Toolcraft viewport changes while dispersion playback state and retained canvas ownership remain stable."
        : "The preview or delivered still persistently reflects the compiled dispersion fixture values.",
      fixture: `compiled-dispersion-${path.id}`,
      id: `dispersion-path-${String(index + 1).padStart(2, "0")}`,
      pathId: path.id,
      target: path.targets.length === 1 ? path.targets[0] : undefined,
      uiSelector: '[data-dispersion-canvas="true"]',
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
  defineToolcraftPerformance({
    ...basePerformance,
    scenarios,
  });

export const appRenderPlanAssessment = assessToolcraftRenderPlan(
  appSchema,
  appPerformance,
);
