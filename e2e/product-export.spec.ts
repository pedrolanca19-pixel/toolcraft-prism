import { prismTarget } from "../src/app/prism/prism-table";
import { prismBrowserTestName } from "../src/app/prism/prism-acceptance";
import { assertToolcraftExpectedDecodedPixels, getToolcraftRgbaDistance } from "./decoded-pixel-observation";
import { expectToolcraftBackgroundOutputSemantics } from "./browser-background-output-evidence";
import { readToolcraftBrowserObservation, runToolcraftBrowserValueAction } from "./browser-proof-session";
import { expectToolcraftExportedArtifact } from "./browser-acceptance-outcome-helpers";
import { FIXTURE_BACKGROUND_RGBA, expectedPixelsFrom, pixelAt, inspectImage, inspectVideoDecoded, meanDistanceToPreview, videoSchedule } from "./prism-export-helpers";
import { expectToolcraftInfinityCanvasBackgroundEvidence, observeInfinityCanvasBackground } from "./browser-infinity-canvas-evidence";
import { setInfinity } from "./prism-infinity-helpers";
import { chooseOption, exportImage, exportVideo, openProof } from "./prism-browser-helpers";
import { expect, test } from "./toolcraft-product-test";
import { VIDEO_PROOF_SECONDS, downloadFromAction } from "./prism-export-helpers";

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
        const inspected = await inspectVideoDecoded(page, download, VIDEO_PROOF_SECONDS);
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
        const inspected = await inspectVideoDecoded(page, download, VIDEO_4K_PROOF_SECONDS);
        expect([inspected.inspection.width, inspected.inspection.height]).toEqual([width, height]);
        expect(inspected.inspection.frameCount).toBe(videoSchedule(VIDEO_4K_PROOF_SECONDS).length);
        return inspected.inspection;
      },
      { requirementId: "export.video.resolution" },
    );
  }
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
        const inspected = await inspectVideoDecoded(page, download, VIDEO_PROOF_SECONDS);
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
