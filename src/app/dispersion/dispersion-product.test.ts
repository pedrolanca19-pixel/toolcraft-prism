import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import type { ToolcraftState } from "@/toolcraft/runtime";

import {
  DISPERSION_AUTOMATED_ACCEPTANCE_TEST,
  appControlSectionInventory,
  appProductReadiness,
  appTransferMode,
} from "../app-acceptance-data";
import { appPerformance, appRenderPlanAssessment } from "../app-performance";
import { appSchema } from "../app-schema";
import {
  PAPER_GRAIN_AMOUNT_MAX,
  PAPER_GRAIN_COMPOSITE_GLSL,
  PAPER_GRAIN_NOISE_GLSL,
  PAPER_GRAIN_SHAPE_RECIPE,
  extractPaperGrainNoiseKernel,
  extractPaperGrainShapeRecipe,
  toPaperGrainParameters,
} from "./dispersion-paper-grain";
import {
  PAPER_LENS_DISTORTION_FRAGMENT_SHADER,
  PaperLensDistortionPass,
  toPaperLensParameters,
} from "./dispersion-lens-distortion";
import {
  DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL,
  DISPERSION_LIGHT_SHEET_CORE_GLSL,
} from "./dispersion-light-sheet-core";
import {
  DISPERSION_MASK_COVERAGE_GLSL,
  DISPERSION_MASK_UNIFORMS_GLSL,
} from "./dispersion-masks-glsl";
import {
  MAX_DISPERSION_MASKS,
  createDefaultDispersionMask,
  getDispersionMaskCoverageAtPoint,
  getDispersionMaskUnionCoverageAtPoint,
} from "./dispersion-masks-values";
import { DISPERSION_FIELD_FRAGMENT_SHADER } from "./dispersion-shaders";
import {
  DISPERSION_DEFAULTS,
  DISPERSION_SPECTRUM_PRESETS,
  getDispersionPhase,
  readDispersionSettings,
} from "./dispersion-values";

function createState(values: Record<string, unknown> = {}): ToolcraftState {
  return { values } as unknown as ToolcraftState;
}

describe("dispersion product model", () => {
  it("normalizes defaults and preserves a seamless loop", () => {
    const settings = readDispersionSettings(createState());

    expect(settings.mode).toBe("central");
    expect(settings.effectMode).toBe("sparkle");
    expect(settings.effectArea).toBe("all");
    expect(settings.grainDistribution).toBe("screen");
    expect(settings.shape).toBe("rect");
    expect(settings.lens).toMatchObject({
      angle: 2,
      count: 35,
      dispersion: 0,
      dispersionShift: 0.11,
      enabled: false,
      spread: 0.97,
      swirl: -0.14,
    });
    expect(settings.masks).toEqual({ enabled: true, items: [], preview: false });
    expect(settings).toMatchObject(DISPERSION_DEFAULTS);
    expect(getDispersionPhase(0)).toEqual(getDispersionPhase(1));
  });

  it("normalizes the bounded mask collection and matches the soft ellipse recipe", () => {
    const defaultMask = createDefaultDispersionMask();
    const settings = readDispersionSettings(
      createState({
        "masks.items": Array.from(
          { length: MAX_DISPERSION_MASKS + 2 },
          (_, index) =>
            index === 0
              ? {
                  blur: 999,
                  center: { x: -5, y: 5 },
                  height: 0,
                  rotation: 200,
                  width: 999,
                }
              : defaultMask,
        ),
        "masks.enabled": false,
        "masks.preview": true,
      }),
    );

    expect(settings.masks.items).toHaveLength(MAX_DISPERSION_MASKS);
    expect(settings.masks.items[0]).toEqual({
      blur: 100,
      center: { x: -1, y: 1 },
      height: 2,
      rotation: 90,
      width: 200,
    });
    expect(settings.masks.preview).toBe(true);
    expect(settings.masks.enabled).toBe(false);
    expect(
      getDispersionMaskCoverageAtPoint(defaultMask, { x: 0.5, y: 0.5 }),
    ).toBe(1);
    expect(
      getDispersionMaskCoverageAtPoint(defaultMask, { x: 0.7, y: 0.5 }),
    ).toBeCloseTo(0.5, 6);
    expect(
      getDispersionMaskCoverageAtPoint(defaultMask, { x: 0.95, y: 0.5 }),
    ).toBe(0);
    expect(
      getDispersionMaskUnionCoverageAtPoint([], { x: 0, y: 0 }),
    ).toBe(1);
    expect(DISPERSION_MASK_UNIFORMS_GLSL).toContain(
      `uniform vec2 uMaskCenter[${MAX_DISPERSION_MASKS}]`,
    );
    expect(DISPERSION_MASK_COVERAGE_GLSL).toContain(
      "remaining *= 1.0 - coverage",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).toContain(
      "light *= appliedMaskCoverage",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).toContain(
      "mix(1.0, maskCoverage, uMaskEnabled)",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).toContain(
      "uMaskPreview < 0.5 ? appliedMaskCoverage : 1.0",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).toContain(
      "uMaskPreview >= 0.5 && uMaskCount > 0",
    );
  });

  it("clamps numeric settings and rejects unknown finite choices", () => {
    const settings = readDispersionSettings(
      createState({
        "dispersion.height": 999,
        "dispersion.colorBalance": { x: 4, y: -4 },
        "dispersion.mode": "unknown",
        "effect.mode": "unknown",
        "effect.area": "unknown",
        "effect.grain.amount": 999,
        "effect.grain.distribution": "unknown",
        "effect.sparkle.size": -5,
        "dispersion.position": Number.NaN,
        "dispersion.spectrum": "unknown",
        "frame.shape": "unknown",
        "motion.seed": -20,
        "lens.count": 999,
        "lens.enabled": "yes",
        "lens.lensBulge": -9,
        "lens.spread": 9,
      }),
    );

    expect(settings.height).toBe(72);
    expect(settings.colorBalance).toEqual({ x: 1, y: -1 });
    expect(settings.mode).toBe("central");
    expect(settings.effectMode).toBe("sparkle");
    expect(settings.effectArea).toBe("all");
    expect(settings.grainAmount).toBe(100);
    expect(settings.grainDistribution).toBe("screen");
    expect(settings.sparkleSize).toBe(0);
    expect(settings.position).toBe(DISPERSION_DEFAULTS.position);
    expect(settings.seed).toBe(0);
    expect(settings.shape).toBe("rect");
    expect(settings.spectrum).toBe("prism");
    expect(settings.lens).toMatchObject({
      count: 50,
      enabled: false,
      lensBulge: -1,
      spread: 1,
    });
  });

  it("normalizes edited color control values", () => {
    const edited = readDispersionSettings(
      createState({ "appearance.background": { hex: "#101820" } }),
    );
    const invalid = readDispersionSettings(
      createState({ "appearance.background": { hex: "not-a-color" } }),
    );

    expect(edited.background).toBe("#101820");
    expect(invalid.background).toBe(DISPERSION_DEFAULTS.background);
  });

  it("uses the imported settings snapshot as the product defaults", () => {
    expect(DISPERSION_DEFAULTS).toMatchObject({
      background: "#E6E6E6",
      chromaSplit: 14,
      customColorA: "#C2C2CC",
      customColorB: "#3E4A8C",
      customColorC: "#C2C2CC",
      customColorD: "#BCB69E",
      effectArea: "all",
      glow: 43,
      height: 40,
      inset: 13,
      intensity: 86,
      lens: {
        angle: 2,
        dispersion: 0,
        dispersionShift: 0.11,
        spread: 0.97,
        swirl: -0.14,
      },
      position: 48,
      refraction: 36,
      shape: "rect",
      shimmer: 80,
      softness: 70,
      spectrum: "prism",
      spread: 62,
    });
  });

  it("keeps the Porcelain spectrum preset bounded and aligned with the schema", () => {
    const settings = readDispersionSettings(
      createState({ "dispersion.spectrum": "porcelain" }),
    );
    const porcelain = DISPERSION_SPECTRUM_PRESETS.porcelain;
    const spectrumSection = appSchema.panels.controls?.sections.find(
      (section) => section.id === "color",
    );
    const spectrumControl = spectrumSection?.controls.spectrum;

    expect(settings.spectrum).toBe("porcelain");
    expect(
      porcelain.amp.every(
        (amplitude, channel) => amplitude <= porcelain.base[channel],
      ),
    ).toBe(true);
    expect(porcelain.amp2).toBeUndefined();
    expect(spectrumControl).toMatchObject({ type: "select" });
    if (spectrumControl?.type !== "select" || !spectrumControl.options) {
      throw new Error("Spectrum must remain a select with finite options.");
    }
    expect(spectrumControl.options.map((option) => option.value).sort()).toEqual(
      [...Object.keys(DISPERSION_SPECTRUM_PRESETS), "custom"].sort(),
    );
  });

  it("uses the pinned Paper Grain Gradient noise kernel and prop model", () => {
    expect(PAPER_GRAIN_NOISE_GLSL).toBe(extractPaperGrainNoiseKernel());
    expect(PAPER_GRAIN_NOISE_GLSL).toContain("float snoise(vec2 v)");
    expect(PAPER_GRAIN_NOISE_GLSL).toContain("vec4 fbmR(");
    expect(PAPER_GRAIN_NOISE_GLSL).toContain(
      "texture2D(u_noiseTexture, fract(uv))",
    );
    expect(PAPER_GRAIN_SHAPE_RECIPE).toBe(extractPaperGrainShapeRecipe());
    expect(PAPER_GRAIN_SHAPE_RECIPE).toContain(
      "float noise = clamp(rawNoise, 0., 1.);",
    );
    expect(PAPER_GRAIN_SHAPE_RECIPE).toContain(
      "shape += u_noise * 10. / u_colorsCount * noise;",
    );
    expect(PAPER_GRAIN_COMPOSITE_GLSL).toContain("vec3 paperSpectrumGradient");
    expect(PAPER_GRAIN_AMOUNT_MAX).toBe(1);
    expect(toPaperGrainParameters(DISPERSION_DEFAULTS)).toEqual({
      intensity: 0.5,
      noise: 0.5,
      scale: 1.6,
      softness: 0.5,
      speed: 0.35,
    });
    expect(
      toPaperGrainParameters({
        ...DISPERSION_DEFAULTS,
        grainAmount: 100,
      }).noise,
    ).toBe(1);

    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).toContain(
      "vec2 grain_uv = normalizedGrainCoord * uGrainScale + drift",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).toContain(
      "float projectedSurfaceHit = 1.0 - exp",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).toMatch(
      /mix\(\s*1\.0,\s*surfaceDistribution,\s*grainDistribution\s*\)/,
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).toContain(
      "float mappedGrainAmount = uGrainAmount",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).toContain(
      "light = mix(paperOver, luminousSurface, grainDistribution)",
    );
    expect(DISPERSION_FIELD_FRAGMENT_SHADER).toContain(
      "uniform vec2 uColorBalance;",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).toContain(
      "vec3 balanceStops = vec3(",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).toContain(
      "light *= exp2(balanceStops)",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).not.toContain(
      "surfaceMapNoise",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).toContain("paperGrainSample");
    expect(
      DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL.match(
        /vec4\s+\w+Grain\s*=\s*paperGrainSample\(/g,
      ),
    ).toHaveLength(3);
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).toContain(
      "vec2(173.17, -91.73)",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).toContain(
      "vec2(-247.61, 149.29)",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).toContain(
      "float secondaryDensity = smoothstep(0.48, 0.82, mappedGrainAmount)",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).toContain(
      "float tertiaryDensity = smoothstep(0.72, 1.0, mappedGrainAmount)",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).toContain(
      "1.0 - (1.0 - primaryOpacity)",
    );
    expect(DISPERSION_FIELD_FRAGMENT_SHADER).toContain(
      DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL,
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).not.toContain(
      "step(0.5, signal)",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).not.toContain(
      "vec3(grainTone)",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).not.toContain(
      "surfaceGrainUv",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).not.toContain(
      "mix(screenGrain",
    );
    expect(DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL).not.toContain(
      "p * grainFrequency",
    );
  });

  it("uses the pinned Paper Lens Distortion shader and React prop model", () => {
    expect(PAPER_LENS_DISTORTION_FRAGMENT_SHADER).toContain(
      "uniform float u_lensBulge;",
    );
    expect(PAPER_LENS_DISTORTION_FRAGMENT_SHADER).toContain(
      "for (int i = 0; i < 50; i++)",
    );
    expect(PAPER_LENS_DISTORTION_FRAGMENT_SHADER).toContain(
      "vec2 spreadAxis = getSpread",
    );
    expect(toPaperLensParameters(DISPERSION_DEFAULTS.lens)).toMatchObject({
      angle: 2,
      bias: 1,
      count: 35,
      dispersion: 0,
      focusCenter: 0.8,
      focusEdges: 1,
      lensBulge: 0,
      lensCircle: 0,
      perspective: 0.1,
      spread: 0.97,
      swirl: -0.14,
    });
  });

  it("prewarms the retained Paper program only once", async () => {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const pass = new PaperLensDistortionPass(geometry);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
    const compileAsync = vi.fn(async () => new THREE.Scene());
    const renderer = { compileAsync } as unknown as THREE.WebGLRenderer;

    const firstPreparation = pass.prepare(renderer, camera);
    const secondPreparation = pass.prepare(renderer, camera);

    expect(firstPreparation).toBe(secondPreparation);
    await firstPreparation;
    expect(compileAsync).toHaveBeenCalledTimes(1);

    pass.dispose();
    geometry.dispose();
  });

  it(DISPERSION_AUTOMATED_ACCEPTANCE_TEST, () => {
    expect(appProductReadiness).toMatchObject({
      mode: "product",
      productName: "Prism Flow",
      viewInteraction: { mode: "non-spatial" },
    });
    expect(appTransferMode.animationIntent).toMatchObject({
      mode: "timeline-playback",
    });
    expect(appSchema.canvas.sizing.mode).toBe("editable-output");
    expect(appSchema.canvas.renderScale.enabled).toBe(true);
    expect(appSchema.panels.timeline?.mode).toBe("playback");
    expect(appControlSectionInventory).toHaveLength(14);

    const frameSection = appSchema.panels.controls?.sections.find(
      (section) => section.id === "frame",
    );
    expect(frameSection?.controls.cornerRadius.applicability).toMatchObject({
      mode: "conditional",
    });

    const effectPlacementSection = appSchema.panels.controls?.sections.find(
      (section) => section.id === "effect-placement",
    );
    const effectStyleSection = appSchema.panels.controls?.sections.find(
      (section) => section.id === "effect-style",
    );
    expect(Object.keys(effectPlacementSection?.controls ?? {})).toHaveLength(3);
    expect(Object.keys(effectStyleSection?.controls ?? {})).toHaveLength(8);
    expect(
      effectPlacementSection?.controls.grainDistribution.applicability,
    ).toMatchObject({
      all: [{ equals: "grain", target: "effect.mode" }],
      mode: "conditional",
    });
    expect(effectStyleSection?.controls.grainDrift.applicability).toMatchObject(
      {
        all: [{ equals: "grain", target: "effect.mode" }],
        mode: "conditional",
      },
    );
    const lensSampling = appSchema.panels.controls?.sections.find(
      (section) => section.id === "lens-distortion-sampling",
    );
    expect(lensSampling?.controls.enabled).toMatchObject({
      defaultValue: false,
      target: "lens.enabled",
      type: "switch",
    });
    expect(lensSampling?.controls.count).toMatchObject({
      max: 50,
      min: 2,
      performanceRole: "workload",
      target: "lens.count",
    });
    const masks = appSchema.panels.controls?.sections.find(
      (section) => section.id === "masks",
    );
    expect(masks?.controls.items).toMatchObject({
      defaultValue: [],
      hardMaxItems: 12,
      target: "masks.items",
      type: "collectionActions",
    });
    expect(masks?.controls.enabled).toMatchObject({
      defaultValue: true,
      target: "masks.enabled",
      type: "switch",
    });
    expect(masks?.controls.preview).toMatchObject({
      defaultValue: false,
      target: "masks.preview",
      type: "switch",
    });
  });

  it("dispersion performance config derives every scenario from the canonical pipeline", () => {
    expect(appPerformance.rendererPipeline?.passes).toHaveLength(3);
    expect(appPerformance.scenarios.length).toBeGreaterThan(0);
    expect(appPerformance.workloadEnvelope?.dimensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          batchMax: 12,
          id: "mask-count",
          interactiveMax: 12,
        }),
      ]),
    );
    expect(appRenderPlanAssessment.errors).toEqual([]);
    expect(appPerformance.kernelBenchmarkDecisions).toEqual([
      expect.objectContaining({
        candidates: ["canvas-2d", "webgl"],
        id: "dispersion.preview-frame",
        selected: "webgl",
      }),
    ]);
    expect(appRenderPlanAssessment.requiredBenchmarks).toEqual([]);
  });
});
