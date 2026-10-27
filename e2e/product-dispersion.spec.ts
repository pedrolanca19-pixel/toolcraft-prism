import type { Page } from "@playwright/test";

import {
  getDispersionAcceptanceId,
  getDispersionBrowserTestName,
} from "../src/app/app-acceptance-data";
import { dispersionTargets } from "../src/app/dispersion/dispersion-values";
import { createToolcraftBrowserProofSession } from "./browser-proof-session";
import {
  proveInfinityMode,
  provePersistence,
  proveRenderScale,
  proveViewport,
} from "./dispersion-canvas-proof";
import {
  canvasSelector,
  pausePlayback,
  type ProofSession,
} from "./dispersion-browser-helpers";
import { proveBorderModeAbsent } from "./dispersion-border-proof";
import { proveInfinityAppearance } from "./dispersion-infinity-appearance-proof";
import { proveColorBalancePad } from "./dispersion-color-balance-proof";
import {
  proveMaskApplication,
  proveMaskCollection,
  proveMaskPreviewExportClean,
} from "./dispersion-masks-proof";
import {
  proveApplicableSlider,
  proveCanvasControl,
  proveCustomSpectrumColor,
  proveEffectArea,
  proveEffectMode,
  proveEffectSlider,
  proveGrainDistribution,
  proveLensEnabled,
  proveLensSlider,
  proveFrameShape,
  proveMotionSlider,
  proveSelectControl,
  proveSettingsTransfer,
} from "./dispersion-control-proof";
import {
  proveBackgroundColor,
  proveExportFormat,
  proveExportResolution,
  proveImageAction,
  proveIncludeBackground,
  proveInfinityExport,
} from "./dispersion-export-proof";
import { proveTimeline } from "./dispersion-timeline-proof";
import { expect, test } from "./toolcraft-product-test";

async function openProof(
  page: Page,
  options: Readonly<{ preserveDefaultRenderScale?: boolean }> = {},
): Promise<ProofSession> {
  page.setDefaultTimeout(60_000);
  // Playwright provides a fresh BrowserContext for every test, so the page
  // already has empty storage. Avoiding an immediate second navigation also
  // keeps Vite's first-load dependency refresh from invalidating the proof
  // session while it is being created.
  await page.goto("/", { waitUntil: "networkidle" });
  const session = await createToolcraftBrowserProofSession(page);
  await expect(page.locator(canvasSelector)).toBeVisible();
  await expect(page.locator(canvasSelector)).toHaveAttribute(
    "data-dispersion-mode",
    "central",
  );
  await proveBorderModeAbsent(page);
  if (!options.preserveDefaultRenderScale) {
    const renderScale = page
      .locator('[data-toolcraft-control-target="canvas.renderScale"]')
      .getByRole("slider");
    await renderScale.focus();
    await page.keyboard.press("Home");
    await expect(page.locator(canvasSelector)).toHaveAttribute(
      "data-render-scale",
      "1",
    );
  }
  await pausePlayback(page);
  return session;
}

test.setTimeout(600_000);

test(getDispersionBrowserTestName("runtime.settingsTransfer"), async ({ page }) => {
  await openProof(page);
  await proveSettingsTransfer(page);
});

for (const target of [
  "canvas.aspectRatio",
  "canvas.size.width",
  "canvas.size.height",
] as const) {
  test(getDispersionBrowserTestName(target), async ({ page }) => {
    const session = await openProof(page);
    await proveCanvasControl(session, target);
  });
}

test(getDispersionBrowserTestName("canvas.renderScale"), async ({ page }) => {
  await openProof(page, { preserveDefaultRenderScale: true });
  await proveRenderScale(page);
});

test(
  getDispersionBrowserTestName("canvas.infinity.mode-and-restoration"),
  async ({ page }) => {
    const session = await openProof(page);
    await proveInfinityAppearance(page);
    await proveInfinityMode(page, session);
  },
);

test(
  getDispersionBrowserTestName("canvas.infinity.scene-bounds-image-export"),
  async ({ page }) => {
    await openProof(page);
    await proveInfinityExport(page);
  },
);

test(getDispersionBrowserTestName(dispersionTargets.shape), async ({ page }) => {
  const session = await openProof(page);
  await proveFrameShape(page, session);
});

test(
  getDispersionBrowserTestName(dispersionTargets.maskItems),
  async ({ page }) => {
    const session = await openProof(page);
    await proveMaskCollection(page, session);
  },
);

test(
  getDispersionBrowserTestName("masks.items.properties"),
  async ({ page }) => {
    const session = await openProof(page);
    await proveMaskCollection(
      page,
      session,
      getDispersionAcceptanceId("masks.items.properties"),
    );
  },
);

test(
  getDispersionBrowserTestName(dispersionTargets.maskEnabled),
  async ({ page }) => {
    const session = await openProof(page);
    await proveMaskApplication(page, session);
  },
);

test(
  getDispersionBrowserTestName(dispersionTargets.maskPreview),
  async ({ page }) => {
    const session = await openProof(page);
    await proveMaskPreviewExportClean(page, session);
  },
);

test(
  getDispersionBrowserTestName(dispersionTargets.lensEnabled),
  async ({ page }) => {
    const session = await openProof(page);
    await proveLensEnabled(session);
  },
);

for (const target of [
  dispersionTargets.lensSpread,
  dispersionTargets.lensBias,
  dispersionTargets.lensAngle,
  dispersionTargets.lensPerspective,
  dispersionTargets.lensCount,
  dispersionTargets.lensDispersion,
  dispersionTargets.lensDispersionShift,
  dispersionTargets.lensDispersionColor,
  dispersionTargets.lensFocusCenter,
  dispersionTargets.lensFocusEdges,
  dispersionTargets.lensSwirl,
  dispersionTargets.lensBulge,
  dispersionTargets.lensCircle,
  dispersionTargets.lensNoise,
  dispersionTargets.lensNoiseFrequency,
  dispersionTargets.lensNoiseOffset,
  dispersionTargets.lensGrainMixer,
  dispersionTargets.lensGrainOverlay,
  dispersionTargets.lensImageX,
  dispersionTargets.lensImageY,
]) {
  test(getDispersionBrowserTestName(target), async ({ page }) => {
    const session = await openProof(page);
    await proveLensSlider(session, page, target);
  });
}

for (const target of [
  dispersionTargets.cornerRadius,
  dispersionTargets.position,
  dispersionTargets.inset,
  dispersionTargets.height,
  dispersionTargets.refraction,
  dispersionTargets.spread,
  dispersionTargets.softness,
  dispersionTargets.chromaSplit,
  dispersionTargets.bend,
  dispersionTargets.curveDepth,
  dispersionTargets.shading,
  dispersionTargets.intensity,
  dispersionTargets.glow,
]) {
  test(getDispersionBrowserTestName(target), async ({ page }) => {
    const session = await openProof(page);
    await proveApplicableSlider(session, target);
  });
}

for (const [target, label] of [
  [dispersionTargets.mode, "Edge Glass"],
  [dispersionTargets.curve, "S-curve"],
  [dispersionTargets.spectrum, "Aurora"],
] as const) {
  test(getDispersionBrowserTestName(target), async ({ page }) => {
    const session = await openProof(page);
    await proveSelectControl(session, target, label);
  });
}


test(
  getDispersionBrowserTestName(dispersionTargets.effectMode),
  async ({ page }) => {
    const session = await openProof(page);
    await proveEffectMode(page, session);
  },
);

for (const [target, label, hex] of [
  [dispersionTargets.customColorA, "Color 1", "#F22E52"],
  [dispersionTargets.customColorB, "Color 2", "#21D4FD"],
  [dispersionTargets.customColorC, "Color 3", "#F7E733"],
  [dispersionTargets.customColorD, "Color 4", "#7A45FF"],
] as const) {
  test(getDispersionBrowserTestName(target), async ({ page }) => {
    const session = await openProof(page);
    await proveCustomSpectrumColor(session, target, label, hex);
  });
}

test(
  getDispersionBrowserTestName(dispersionTargets.colorBalance),
  async ({ page }) => {
    const session = await openProof(page);
    await proveColorBalancePad(page, session);
  },
);

test(
  getDispersionBrowserTestName(dispersionTargets.effectArea),
  async ({ page }) => {
    const session = await openProof(page);
    await proveEffectArea(page, session);
  },
);

test(
  getDispersionBrowserTestName(dispersionTargets.grainDistribution),
  async ({ page }) => {
    const session = await openProof(page);
    await proveGrainDistribution(page, session);
  },
);

for (const target of [
  dispersionTargets.sparkle,
  dispersionTargets.sparkleSize,
  dispersionTargets.sparkleTwinkle,
  dispersionTargets.grainAmount,
  dispersionTargets.grainScale,
  dispersionTargets.grainSoftness,
  dispersionTargets.grainDistortion,
  dispersionTargets.grainDrift,
]) {
  test(getDispersionBrowserTestName(target), async ({ page }) => {
    const session = await openProof(page);
    await proveEffectSlider(page, session, target);
  });
}

for (const target of [
  dispersionTargets.flow,
  dispersionTargets.undulation,
  dispersionTargets.detail,
  dispersionTargets.shimmer,
  dispersionTargets.seed,
]) {
  test(getDispersionBrowserTestName(target), async ({ page }) => {
    const session = await openProof(page);
    await proveMotionSlider(session, target);
  });
}

test(
  getDispersionBrowserTestName(dispersionTargets.includeBackground),
  async ({ page }) => {
    const session = await openProof(page);
    await proveIncludeBackground(page, session);
  },
);

test(getDispersionBrowserTestName(dispersionTargets.background), async ({ page }) => {
  const session = await openProof(page);
  await proveBackgroundColor(page, session);
});

test(getDispersionBrowserTestName(dispersionTargets.imageFormat), async ({ page }) => {
  const session = await openProof(page);
  await proveExportFormat(page, session);
});

test(
  getDispersionBrowserTestName(dispersionTargets.imageResolution),
  async ({ page }) => {
    const session = await openProof(page);
    await proveExportResolution(page, session);
  },
);

test(getDispersionBrowserTestName("export.actions"), async ({ page }) => {
  const session = await openProof(page);
  await proveImageAction(page, session);
});

test(getDispersionBrowserTestName("runtime.timeline.playback"), async ({ page }) => {
  const session = await openProof(page);
  await proveTimeline(page, session);
});

test(getDispersionBrowserTestName("runtime.persistence.reload"), async ({ page }) => {
  const session = await openProof(page);
  await provePersistence(page, session);
});

test(getDispersionBrowserTestName("runtime.canvas.viewport"), async ({ page }) => {
  const session = await openProof(page);
  await proveViewport(page, session);
});
