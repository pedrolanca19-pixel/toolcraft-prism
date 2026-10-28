import { prismBrowserTestName } from "../src/app/prism/prism-acceptance";
import { inspectImage, inspectVideo } from "./prism-export-helpers";
import { getToolcraftFiniteArtboardRect } from "../src/toolcraft/runtime/scene";
import { expectToolcraftInfinityCanvasImageExportEvidence, expectToolcraftInfinityCanvasModeEvidence, expectToolcraftInfinityCanvasVideoExportEvidence, observeInfinityCanvas } from "./browser-infinity-canvas-evidence";
import { dragToolcraftCanvasViewport } from "./performance-canvas-helpers";
import { captureIdentity, compareIdentity, redo, setInfinity, undo, waitForCanvasMode } from "./prism-infinity-helpers";
import { expectToolcraftCanvasRenderScaleEvidence } from "./browser-render-scale-evidence";
import { canvasSelector, exportImage, exportVideo, FIXTURE_SIZE, controlField, ensureTimelineVisible, pausePlayback, playPlayback, openProof } from "./prism-browser-helpers";
import { expectToolcraftDiscreteSliderMarkers } from "./performance-control-layout-helpers";
import { expect, test } from "./toolcraft-product-test";
import { VIDEO_PROOF_SECONDS } from "./prism-export-helpers";

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
