import { prismBrowserTestName } from "../src/app/prism/prism-acceptance";
import { expectToolcraftStandardTimelinePlayback } from "./browser-standard-timeline-evidence";
import { canvasSelector, openProof } from "./prism-browser-helpers";
import { test } from "./toolcraft-product-test";

test(prismBrowserTestName("timeline.playback"), async ({ page }) => {
  const session = await openProof(page, ["runtime.setup"]);
  await expectToolcraftStandardTimelinePlayback(session, {
    markerSelector: canvasSelector,
    requirementId: "timeline.playback",
  });
});
