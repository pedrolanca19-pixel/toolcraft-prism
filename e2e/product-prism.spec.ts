import type { Download, Locator, Page } from "@playwright/test";

import { PRISM_PRESET_NAMES } from "../src/app/prism/prism-presets";
import { PRISM_ENTRIES, PRISM_KEYS, prismTarget, type PrismKey } from "../src/app/prism/prism-table";
import { prismBrowserTestName } from "../src/app/prism/prism-acceptance";
import { assertToolcraftExpectedDecodedPixels, getToolcraftRgbaDistance } from "./decoded-pixel-observation";
import { expectToolcraftBackgroundOutputSemantics } from "./browser-background-output-evidence";
import { readToolcraftBrowserObservation, runToolcraftBrowserValueAction } from "./browser-proof-session";
import { expectToolcraftImageExportArtifact, expectToolcraftVideoExportArtifact } from "./browser-media-export-evidence";
import { expectToolcraftExportedArtifact } from "./browser-acceptance-outcome-helpers";
import {
  FIXTURE_BACKGROUND_RGBA,
  expectedPixelsFrom,
  expectedSamplesFrom,
  pixelAt,
  inspectImage,
  inspectVideo,
  meanDistanceToPreview,
  videoSchedule,
} from "./prism-export-helpers";
import { appSchema } from "../src/app/app-schema";
import { expectToolcraftPersistenceState } from "./browser-state-evidence-helpers";
import { getToolcraftFiniteArtboardRect } from "../src/toolcraft/runtime/scene";
import {
  expectToolcraftInfinityCanvasBackgroundEvidence,
  expectToolcraftInfinityCanvasImageExportEvidence,
  expectToolcraftInfinityCanvasModeEvidence,
  expectToolcraftInfinityCanvasVideoExportEvidence,
  observeInfinityCanvas,
  observeInfinityCanvasBackground,
} from "./browser-infinity-canvas-evidence";
import { dragToolcraftCanvasViewport } from "./performance-canvas-helpers";
import { captureIdentity, compareIdentity, redo, setInfinity, undo, waitForCanvasMode } from "./prism-infinity-helpers";
import { expectToolcraftCanvasRenderScaleEvidence } from "./browser-render-scale-evidence";
import { expectToolcraftStandardTimelinePlayback } from "./browser-standard-timeline-evidence";
import { expectToolcraftAcceptanceOutcome } from "./browser-acceptance-outcome-helpers";
import {
  applicabilityCases,
  canvasHash,
  canvasSelector,
  chooseOption,
  exportImage,
  exportVideo,
  FIXTURE_SIZE,
  controlField,
  ensureTimelineVisible,
  pausePlayback,
  playPlayback,
  setTimelineDuration,
  openProof,
  prismValuesSnapshot,
  type ProofSession,
  proveApplicabilityCase,
  proveColorChange,
  proveSelectChange,
  proveSliderChange,
  proveSwitchChange,
} from "./prism-browser-helpers";
import { expectToolcraftDiscreteSliderMarkers } from "./performance-control-layout-helpers";
import { expect, test } from "./toolcraft-product-test";

/**
 * Values a control's proof starts from when the shipped default would hide the
 * control's effect. Everything else starts from the shipped defaults.
 */
const PROOF_START: Partial<Record<PrismKey, Readonly<Record<string, unknown>>>> = {
  bloomTint: { [prismTarget("bloomTintAmt")]: 0.8 },
  bloomTintAmt: { [prismTarget("bloomTint")]: "#FF3366" },
  edgeSoft: { [prismTarget("coverage")]: 0.5 },
};

const CONDITIONAL_KEYS: ReadonlySet<PrismKey> = new Set([
  "c0", "c1", "c2", "c3",
  "maskType", "maskAngle", "maskX", "maskY", "maskSize", "maskSoft", "maskWarp", "maskInvert",
]);

const COLOR_PROOF: Readonly<Record<string, string>> = {
  bg2: "#33CC99", bloomTint: "#33CC99", c0: "#33CC99", c1: "#CC3366", c2: "#3366CC", c3: "#CCCC33",
};

for (const key of PRISM_KEYS) {
  const entry = PRISM_ENTRIES[key];
  const target = prismTarget(key);
  test(prismBrowserTestName(target), async ({ page }) => {
    const session = await openProof(page, [entry.section], PROOF_START[key]);
    const prove = async (requirementId: string): Promise<void> => {
      switch (entry.kind) {
        case "slider":
        case "int":
          await proveSliderChange(session, target, requirementId);
          return;
        case "bool":
          await proveSwitchChange(session, target, requirementId);
          return;
        case "color":
          await proveColorChange(session, target, COLOR_PROOF[key] ?? "#33CC99", requirementId);
          return;
        case "select":
          for (const option of entry.options) {
            if (option.value === entry.def) continue;
            await proveSelectChange(session, target, option.label, requirementId);
          }
          return;
      }
    };
    if (CONDITIONAL_KEYS.has(key)) {
      for (const applicabilityCase of applicabilityCases(target)) {
        const requirementId = await proveApplicabilityCase(session, target, applicabilityCase);
        if (applicabilityCase.expectation === "visible") await prove(requirementId);
      }
      return;
    }
    if (entry.kind === "int" && (entry.max - entry.min) / entry.step + 1 <= 32) {
      await expectToolcraftDiscreteSliderMarkers(page, target);
    }
    await prove(target);
  });
}

const SECTION_IDS = [
  "motion", "folds", "surface", "lighting", "highlights", "spectrum", "refraction", "glow",
  "placement", "mask", "backdrop", "finish",
] as const;

async function expectActionToChangeOutput(
  session: ProofSession,
  page: Page,
  target: string,
  label: string,
  requirementId: string = target,
): Promise<void> {
  await expectToolcraftAcceptanceOutcome(
    async () => `${await prismValuesSnapshot(page)}|${await canvasHash(page)}`,
    session.controlAction(target, (control) =>
      control.getByRole("button", { name: label, exact: true }).click(),
    ),
    { evidenceType: "command-side-effect", requirementId, stabilityIntervalMs: 80, timeoutMs: 15_000 },
  );
}

test(prismBrowserTestName("prism.presets"), async ({ page }) => {
  const session = await openProof(page, ["presets"]);
  // The first preset matches the shipped defaults, so it goes last to keep every click a change.
  for (const name of [...PRISM_PRESET_NAMES.slice(1), ...PRISM_PRESET_NAMES.slice(0, 1)]) {
    await expectActionToChangeOutput(session, page, "prism.presets", name);
  }
});

test(prismBrowserTestName("prism.randomize"), async ({ page }) => {
  const session = await openProof(page, ["presets"]);
  await expectActionToChangeOutput(session, page, "prism.randomize", "Randomize all");
  await expectActionToChangeOutput(session, page, "prism.randomize", "Colors only");
});

test(prismBrowserTestName("prism.palette.edit"), async ({ page }) => {
  const session = await openProof(page, ["spectrum"]);
  const target = "prism.palette.edit";
  for (const applicabilityCase of applicabilityCases(target)) {
    const requirementId = await proveApplicabilityCase(session, target, applicabilityCase);
    if (applicabilityCase.expectation === "visible") {
      await expectActionToChangeOutput(session, page, target, "Edit as custom", requirementId);
    }
  }
});

for (const section of SECTION_IDS) {
  const target = `prism.shuffle-${section}`;
  test(prismBrowserTestName(target), async ({ page }) => {
    const session = await openProof(page, [section]);
    await expectActionToChangeOutput(session, page, target, "Randomize");
  });
}

test(prismBrowserTestName("timeline.playback"), async ({ page }) => {
  const session = await openProof(page, ["runtime.setup"]);
  await expectToolcraftStandardTimelinePlayback(session, {
    markerSelector: canvasSelector,
    requirementId: "timeline.playback",
  });
});

test(prismBrowserTestName("canvas.renderScale"), async ({ page }) => {
  const session = await openProof(page, ["runtime.setup"]);
  const target = "canvas.renderScale";
  await expectToolcraftDiscreteSliderMarkers(page, target);
  const slider = controlField(page, target).getByRole("slider").first();
  await slider.focus();
  await slider.press("End");
  await expect(slider).toHaveAttribute("aria-valuenow", "2");
  const selectedScale = 2;
  await ensureTimelineVisible(page);
  void session;
  await expectToolcraftCanvasRenderScaleEvidence(page, {
    canvasSelector,
    requirementId: target,
    selectedScale,
    stateTransitions: [
      {
        run: () => dragToolcraftCanvasViewport(page, { x: 40, y: 20 }),
        state: "interaction",
      },
      { run: () => playPlayback(page), state: "playback" },
      {
        run: async () => {
          await pausePlayback(page);
          await page.waitForTimeout(400);
        },
        state: "steady",
      },
    ],
    target,
  });
});

/** Mean RGB distance allowed between the exported image and the live preview of the same settings. */
const PREVIEW_MATCH_DISTANCE = 16;

test(prismBrowserTestName("export.image.format"), async ({ page }) => {
  const session = await openProof(page, ["runtime.image-export"]);
  let pngPixels: ReturnType<typeof expectedPixelsFrom> | undefined;
  for (const [label, mediaType] of [["PNG", "image/png"], ["JPG", "image/jpeg"]] as const) {
    await expectToolcraftExportedArtifact(
      session.controlAction("export.image.format", async (control, currentPage) => {
        await chooseOption(currentPage, control, label);
        return exportImage(currentPage);
      }),
      async (download) => {
        const inspected = await inspectImage(page, download);
        expect(inspected.inspection.mediaType).toBe(mediaType);
        expect([inspected.inspection.width, inspected.inspection.height]).toEqual([2048, 1152]);
        const distance = await meanDistanceToPreview(page, inspected.observation);
        expect(distance).toBeLessThan(PREVIEW_MATCH_DISTANCE);
        if (mediaType === "image/png") {
          pngPixels = expectedPixelsFrom(inspected.observation);
        } else {
          // The lossy encoder may only drift from the lossless frame within the shared tolerance.
          assertToolcraftExpectedDecodedPixels({
            expectedPixels: pngPixels!,
            mediaType,
            observation: inspected.observation,
          });
        }
        return inspected.inspection;
      },
      { requirementId: "export.image.format" },
    );
  }
});

test(prismBrowserTestName("export.image.resolution"), async ({ page }) => {
  const session = await openProof(page, ["runtime.image-export"]);
  for (const [label, longEdge] of [["2K", 2048], ["4K", 4096], ["8K", 8192]] as const) {
    await expectToolcraftExportedArtifact(
      session.controlAction("export.image.resolution", async (control, currentPage) => {
        await chooseOption(currentPage, control, label);
        return exportImage(currentPage);
      }),
      async (download) => {
        const inspected = await inspectImage(page, download);
        expect([inspected.inspection.width, inspected.inspection.height]).toEqual([
          longEdge,
          Math.round((longEdge * 9) / 16),
        ]);
        const distance = await meanDistanceToPreview(page, inspected.observation);
        expect(distance).toBeLessThan(PREVIEW_MATCH_DISTANCE);
        return inspected.inspection;
      },
      { requirementId: "export.image.resolution" },
    );
  }
});

const VIDEO_PROOF_SECONDS = 1;
// Software GL needs about nine seconds per 4K frame, so the 4K proof exports three frames.
const VIDEO_4K_PROOF_SECONDS = 0.1;

test(prismBrowserTestName("export.video.format"), async ({ page }) => {
  const session = await openProof(page, ["runtime.video-export"], {}, VIDEO_PROOF_SECONDS);
  for (const [label, mediaType] of [["WebM", "video/webm"], ["MP4", "video/mp4"]] as const) {
    await expectToolcraftExportedArtifact(
      session.controlAction("export.video.format", async (control, currentPage) => {
        await chooseOption(currentPage, control, label);
        return exportVideo(currentPage);
      }),
      async (download) => {
        const inspected = await inspectVideo(page, download, VIDEO_PROOF_SECONDS);
        expect(inspected.inspection.mediaType).toBe(mediaType);
        expect(inspected.inspection.frameCount).toBe(videoSchedule(VIDEO_PROOF_SECONDS).length);
        expect(inspected.inspection.durationMs).toBeCloseTo(VIDEO_PROOF_SECONDS * 1000, -2);
        expect(new Set(inspected.inspection.samplePixelHashes).size).toBeGreaterThan(1);
        return inspected.inspection;
      },
      { requirementId: "export.video.format" },
    );
  }
});

test(prismBrowserTestName("export.video.resolution"), async ({ page }) => {
  const session = await openProof(page, ["runtime.video-export"], {}, VIDEO_4K_PROOF_SECONDS);
  for (const [label, width, height] of [["Current", 160, 90], ["4K", 3840, 2160]] as const) {
    await expectToolcraftExportedArtifact(
      session.controlAction("export.video.resolution", async (control, currentPage) => {
        await chooseOption(currentPage, control, label);
        return exportVideo(currentPage);
      }),
      async (download) => {
        const inspected = await inspectVideo(page, download, VIDEO_4K_PROOF_SECONDS);
        expect([inspected.inspection.width, inspected.inspection.height]).toEqual([width, height]);
        expect(inspected.inspection.frameCount).toBe(videoSchedule(VIDEO_4K_PROOF_SECONDS).length);
        return inspected.inspection;
      },
      { requirementId: "export.video.resolution" },
    );
  }
});

async function downloadFromAction(control: Locator, page: Page, name: RegExp): Promise<Download> {
  const pending = page.waitForEvent("download", { timeout: 240_000 });
  await control.getByRole("button", { name }).click();
  return pending;
}

test(prismBrowserTestName("actions.output"), async ({ page }) => {
  const session = await openProof(page, [], {}, VIDEO_PROOF_SECONDS);
  const exportImageAction = session.controlAction("actions.output", (control, currentPage) =>
    downloadFromAction(control, currentPage, /^Export (PNG|JPG)$/u),
  );
  const exportVideoAction = session.controlAction("actions.output", (control, currentPage) =>
    downloadFromAction(control, currentPage, /^Export (WebM|MP4)$/u),
  );

  // A first export of the same settings gives the pixels the proven export must reproduce.
  const baselineImage = await inspectImage(page, await exportImage(page));
  await expectToolcraftImageExportArtifact(exportImageAction, {
    backgroundRgba: FIXTURE_BACKGROUND_RGBA,
    expectedBounds: baselineImage.inspection.nonBackgroundBounds!,
    expectedHeight: 1152,
    expectedMediaType: "image/png",
    expectedPixels: expectedPixelsFrom(baselineImage.observation),
    expectedWidth: 2048,
    page,
    requirementId: "actions.output",
  });

  const baselineVideo = await inspectVideo(page, await exportVideo(page), VIDEO_PROOF_SECONDS);
  await expectToolcraftVideoExportArtifact(exportVideoAction, {
    animated: true,
    backgroundRgba: FIXTURE_BACKGROUND_RGBA,
    expectedDurationSeconds: VIDEO_PROOF_SECONDS,
    expectedHeight: FIXTURE_SIZE.height,
    expectedMediaType: "video/webm",
    expectedSamples: expectedSamplesFrom(baselineVideo),
    expectedWidth: FIXTURE_SIZE.width,
    page,
    requirementId: "actions.output",
    schedule: videoSchedule(VIDEO_PROOF_SECONDS),
  });
});

/** A small, hard-edged mask leaves the corners empty so a missing background is observable as alpha 0. */
const EMPTY_CORNER_START = {
  [prismTarget("grain")]: 0,
  [prismTarget("maskSize")]: 0.2,
  [prismTarget("maskSoft")]: 0.05,
  [prismTarget("vignette")]: 0,
} as const;

test(prismBrowserTestName("export.includeBackground"), async ({ page }) => {
  const session = await openProof(page, ["runtime.setup"], EMPTY_CORNER_START, VIDEO_PROOF_SECONDS);
  const target = "export.includeBackground";
  const toggleBackground = session.controlAction(target, (control) => control.getByRole("switch").click());
  const observePreview = session.observe((root) => {
    const canvas = root.querySelector<HTMLCanvasElement>('canvas[data-prism-canvas="true"]');
    const sample = document.createElement("canvas");
    sample.width = 80;
    sample.height = 45;
    const context = sample.getContext("2d", { willReadFrequently: true });
    let hash = 2166136261;
    if (canvas && context) {
      context.drawImage(canvas, 0, 0, sample.width, sample.height);
      for (const byte of context.getImageData(0, 0, sample.width, sample.height).data) {
        hash = Math.imul(hash ^ byte, 16777619) >>> 0;
      }
    }
    return {
      backgroundVisible: root.querySelector("[data-toolcraft-finite-background-layer]") !== null,
      outputSignature: hash.toString(16),
    };
  });

  // Reference pass: the preview signature of the excluded state is what the proven toggle must reach.
  await runToolcraftBrowserValueAction(toggleBackground);
  await expect.poll(async () => (await readToolcraftBrowserObservation(observePreview)).backgroundVisible).toBe(false);
  await page.waitForTimeout(300);
  const excluded = await readToolcraftBrowserObservation(observePreview);
  await runToolcraftBrowserValueAction(toggleBackground);
  await expect.poll(async () => (await readToolcraftBrowserObservation(observePreview)).backgroundVisible).toBe(true);

  const exportImageAction = session.controlAction("actions.output", (control, currentPage) =>
    downloadFromAction(control, currentPage, /^Export (PNG|JPG)$/u),
  );
  const exportVideoAction = session.controlAction("actions.output", (control, currentPage) =>
    downloadFromAction(control, currentPage, /^Export (WebM|MP4)$/u),
  );
  await expectToolcraftBackgroundOutputSemantics(observePreview, toggleBackground, excluded, exportImageAction, async (download) => {
    const inspected = await inspectImage(page, download);
    return { ...inspected.inspection, backgroundAlpha: pixelAt(inspected.observation, 0, 0)[3] };
  }, {
    requirementId: target,
    stabilityIntervalMs: 80,
    video: {
      exportArtifact: exportVideoAction,
      inspectArtifact: async (download) => {
        const inspected = await inspectVideo(page, download, VIDEO_PROOF_SECONDS);
        const corner = pixelAt(inspected.observations[0]!, 0, 0);
        return {
          ...inspected.inspection,
          backgroundIncluded: getToolcraftRgbaDistance(corner, FIXTURE_BACKGROUND_RGBA) < 48,
        };
      },
    },
  });

  // The recipe leaves the background excluded; switch it back on, then check the Infinity viewport.
  await runToolcraftBrowserValueAction(toggleBackground);
  await expect.poll(async () => (await readToolcraftBrowserObservation(observePreview)).backgroundVisible).toBe(true);
  await setInfinity(page, true);
  const infinite = await observeInfinityCanvasBackground(page);
  await runToolcraftBrowserValueAction(toggleBackground);
  await expect.poll(async () => (await observeInfinityCanvasBackground(page)).backgroundEnabled).toBe(false);
  const backgroundExcluded = await observeInfinityCanvasBackground(page);
  await runToolcraftBrowserValueAction(toggleBackground);
  await expect.poll(async () => (await observeInfinityCanvasBackground(page)).backgroundEnabled).toBe(true);
  const backgroundRestored = await observeInfinityCanvasBackground(page);
  await expectToolcraftInfinityCanvasBackgroundEvidence(
    { backgroundExcluded, backgroundRestored, infinite },
    { expectedBackgroundColor: "#04050A", requirementId: target, target },
  );
});

const FIXTURE_SCENE_RECT = getToolcraftFiniteArtboardRect({ ...FIXTURE_SIZE, unit: "px" });

test(prismBrowserTestName("canvas.infinity.mode-continuity-and-restoration"), async ({ page }) => {
  await openProof(page, ["runtime.setup"]);
  const before = await observeInfinityCanvas(page);
  const initialIdentity = await captureIdentity(page);

  await setInfinity(page, true);
  const enabled = await observeInfinityCanvas(page);
  const beforeToEnabled = await compareIdentity(page, initialIdentity);

  await dragToolcraftCanvasViewport(page, { x: 60, y: 30 });
  const afterPan = await observeInfinityCanvas(page);

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator('[data-slot="toolcraft-runtime-app"]')).toHaveCount(1);
  await waitForCanvasMode(page, "infinite");
  const afterReload = await observeInfinityCanvas(page);
  const restoredIdentity = await captureIdentity(page);

  await setInfinity(page, false);
  const restored = await observeInfinityCanvas(page);
  const afterReloadToRestored = await compareIdentity(page, restoredIdentity);

  await undo(page);
  await waitForCanvasMode(page, "infinite");
  const undone = await observeInfinityCanvas(page);
  const restoredToUndone = await compareIdentity(page, restoredIdentity);

  await redo(page);
  await waitForCanvasMode(page, "finite");
  const redone = await observeInfinityCanvas(page);
  const undoneToRedone = await compareIdentity(page, restoredIdentity);

  await expectToolcraftInfinityCanvasModeEvidence(
    { afterPan, afterReload, before, enabled, redone, restored, undone },
    { afterReloadToRestored, beforeToEnabled, restoredToUndone, undoneToRedone },
    {
      expectedFiniteSize: FIXTURE_SIZE,
      expectedSceneRect: FIXTURE_SCENE_RECT,
      requirementId: "canvas.infinity.mode-continuity-and-restoration",
      target: "canvas.infinity",
    },
  );
});

test(prismBrowserTestName("canvas.infinity.scene-bounds-image-export"), async ({ page }) => {
  await openProof(page, ["runtime.setup"]);
  const artifactOf = async () => {
    const { inspection } = await inspectImage(page, await exportImage(page));
    return {
      byteLength: inspection.byteLength,
      decodedPixelHash: inspection.decodedPixelHash,
      height: inspection.height,
      width: inspection.width,
    };
  };
  const finite = await artifactOf();
  await setInfinity(page, true);
  const infinite = await artifactOf();
  await expectToolcraftInfinityCanvasImageExportEvidence(
    { finite, infinite },
    {
      expectedSize: { height: 1152, width: 2048 },
      requirementId: "canvas.infinity.scene-bounds-image-export",
      target: "canvas.infinity",
    },
  );
});

test(prismBrowserTestName("canvas.infinity.scene-bounds-video-export"), async ({ page }) => {
  await openProof(page, ["runtime.setup"], {}, VIDEO_PROOF_SECONDS);
  const artifactOf = async () => {
    const { inspection } = await inspectVideo(page, await exportVideo(page), VIDEO_PROOF_SECONDS);
    return {
      byteLength: inspection.byteLength,
      durationMs: inspection.durationMs,
      frameCount: inspection.frameCount,
      height: inspection.height,
      samplePixelHashes: inspection.samplePixelHashes,
      width: inspection.width,
    };
  };
  const finite = await artifactOf();
  await setInfinity(page, true);
  const infinite = await artifactOf();
  await expectToolcraftInfinityCanvasVideoExportEvidence(
    { finite, infinite },
    {
      expectedSize: FIXTURE_SIZE,
      requirementId: "canvas.infinity.scene-bounds-video-export",
      target: "canvas.infinity",
    },
  );
});

type PersistedWorkspace = {
  canvasStyleWidth: string | null;
  controlsCollapsed: boolean;
  controlsOffsetX: number | null;
  controlsOffsetY: number | null;
  persistedCanvasWidth: number | null;
  persistedCanvasZoom: number | null;
  persistedControlsCollapsed: boolean | null;
  persistedControlsOffsetX: number | null;
  persistedControlsOffsetY: number | null;
  persistedFoldFreq: number | null;
  persistedTimelineDuration: number | null;
  persistedValuesWidth: number | null;
  visibleZoom: string | null;
};

test(prismBrowserTestName("persistence.reload"), async ({ page }) => {
  const storageKey = appSchema.persistence.storage === "localStorage" ? appSchema.persistence.key : "";
  await page.addInitScript((key) => {
    Object.defineProperty(window, "__prismPersistenceKey", { configurable: false, value: key, writable: false });
  }, storageKey);
  const session = await openProof(page, ["runtime.setup", "folds"]);
  const changedWidth = FIXTURE_SIZE.width + 1;
  const changedZoom = 110;
  const changedOffset = { x: -48, y: 24 } as const;
  const changedDuration = 12;
  const foldFreqMax = PRISM_ENTRIES.foldFreq.max;

  const observeWorkspace = session.observe<PersistedWorkspace>((root) => {
    const canvas = root.querySelector<HTMLElement>("[data-toolcraft-editable-canvas]");
    const controlsHost = root.querySelector<HTMLElement>('[data-panel-type="controls"]');
    const toolbar = root.querySelector<HTMLElement>('[data-toolcraft-inspect-toolbar="true"]');
    const visibleZoom =
      [...(toolbar?.querySelectorAll("span") ?? [])]
        .map((candidate) => candidate.textContent?.trim() ?? "")
        .find((text) => /^\d+%$/u.test(text)) ?? null;
    const key = (window as Window & { __prismPersistenceKey?: unknown }).__prismPersistenceKey;
    const raw = typeof key === "string" ? localStorage.getItem(key) : null;
    const state = raw
      ? (JSON.parse(raw) as {
          state?: {
            canvas?: { size?: { width?: unknown }; zoom?: unknown };
            panels?: { controls?: { collapsed?: unknown; offset?: { x?: unknown; y?: unknown } } };
            timeline?: { durationSeconds?: unknown };
            values?: Record<string, unknown>;
          };
        }).state
      : undefined;
    const number = (value: unknown): number | null => (typeof value === "number" ? value : null);
    return {
      canvasStyleWidth: canvas?.style.width ?? null,
      controlsCollapsed: root.querySelector('[aria-label="Expand controls"]') !== null,
      controlsOffsetX: controlsHost ? Number(controlsHost.dataset.panelOffsetX) : null,
      controlsOffsetY: controlsHost ? Number(controlsHost.dataset.panelOffsetY) : null,
      persistedCanvasWidth: number(state?.canvas?.size?.width),
      persistedCanvasZoom: number(state?.canvas?.zoom),
      persistedControlsCollapsed:
        typeof state?.panels?.controls?.collapsed === "boolean" ? state.panels.controls.collapsed : null,
      persistedControlsOffsetX: number(state?.panels?.controls?.offset?.x),
      persistedControlsOffsetY: number(state?.panels?.controls?.offset?.y),
      persistedFoldFreq: number(state?.values?.["prism.foldFreq"]),
      persistedTimelineDuration: number(state?.timeline?.durationSeconds),
      persistedValuesWidth: number(state?.values?.["canvas.size.width"]),
      visibleZoom,
    };
  });

  await expectToolcraftPersistenceState(
    observeWorkspace,
    session.controlAction("canvas.size.width", async (control, currentPage) => {
      const input = control.locator("input");
      await expect(input).toHaveValue(String(FIXTURE_SIZE.width));
      await input.fill(String(changedWidth));
      await input.press("Enter");

      const foldFreq = controlField(currentPage, prismTarget("foldFreq")).getByRole("slider").first();
      await foldFreq.focus();
      await foldFreq.press("End");
      await expect(foldFreq).toHaveAttribute("aria-valuenow", String(foldFreqMax));

      await setTimelineDuration(currentPage, changedDuration);
      await currentPage.getByRole("button", { name: "Zoom in" }).click();

      const controlsHost = currentPage.locator('[data-panel-type="controls"]');
      const dragBox = await controlsHost.locator('[data-panel-drag-handle=""]').first().boundingBox();
      expect(dragBox).not.toBeNull();
      await currentPage.mouse.move(dragBox!.x + dragBox!.width / 2, dragBox!.y + dragBox!.height / 2);
      await currentPage.mouse.down();
      await currentPage.mouse.move(
        dragBox!.x + dragBox!.width / 2 + changedOffset.x,
        dragBox!.y + dragBox!.height / 2 + changedOffset.y,
        { steps: 4 },
      );
      await currentPage.mouse.up();
      await expect(controlsHost).toHaveAttribute("data-panel-offset-x", String(changedOffset.x));
      await expect(controlsHost).toHaveAttribute("data-panel-offset-y", String(changedOffset.y));

      await currentPage.getByRole("button", { name: "Collapse controls" }).click();
      await expect(currentPage.getByRole("button", { name: "Expand controls" })).toBeVisible();
      await expect(currentPage.locator('[data-slot="toolcraft-runtime-app"]')).toHaveAttribute(
        "data-toolcraft-persistence-status",
        "success",
      );
    }),
    session.reload(),
    {
      canvasStyleWidth: `${changedWidth}px`,
      controlsCollapsed: true,
      controlsOffsetX: changedOffset.x,
      controlsOffsetY: changedOffset.y,
      persistedCanvasWidth: changedWidth,
      persistedCanvasZoom: changedZoom,
      persistedControlsCollapsed: true,
      persistedControlsOffsetX: changedOffset.x,
      persistedControlsOffsetY: changedOffset.y,
      persistedFoldFreq: foldFreqMax,
      persistedTimelineDuration: changedDuration,
      persistedValuesWidth: changedWidth,
      visibleZoom: `${changedZoom}%`,
    },
    { requirementId: "persistence.reload", stabilityIntervalMs: 0 },
  );
});

test(prismBrowserTestName("appearance.background"), async ({ page }) => {
  const session = await openProof(page, ["runtime.setup"]);
  await proveColorChange(session, "appearance.background", "#33CC99");
});
