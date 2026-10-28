import { prismBrowserTestName } from "../src/app/prism/prism-acceptance";
import { expectToolcraftImageExportArtifact, expectToolcraftVideoExportArtifact } from "./browser-media-export-evidence";
import { FIXTURE_BACKGROUND_RGBA, expectedPixelsFrom, expectedSamplesFrom, inspectImage, inspectVideoDecoded, videoSchedule, withFreshVideoExport } from "./prism-export-helpers";
import { exportImage, exportVideo, FIXTURE_SIZE, openProof } from "./prism-browser-helpers";
import { test } from "./toolcraft-product-test";
import { VIDEO_PROOF_SECONDS, downloadFromAction } from "./prism-export-helpers";

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

  // Headless decoding can miss a frame; each attempt exports and decodes a fresh video.
  await withFreshVideoExport(async () => {
    const baselineVideo = await inspectVideoDecoded(page, await exportVideo(page), VIDEO_PROOF_SECONDS);
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
});
