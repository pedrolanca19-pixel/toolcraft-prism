import type { Locator, Page } from "@playwright/test";

import { getDispersionAcceptanceId } from "../src/app/app-acceptance-data";
import { dispersionTargets } from "../src/app/dispersion/dispersion-values";
import { expectToolcraftAcceptanceOutcome } from "./browser-acceptance-outcome-helpers";
import { expectToolcraftSegmentedControlCellsPreservePadding } from "./performance-control-layout-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { expect } from "./toolcraft-product-test";
import {
  proveGrainAmountDensity,
  sampleCanvasPixels,
} from "./dispersion-grain-density-proof";
import {
  backgroundRgba,
  canvasSelector,
  applicabilityCases,
  chooseOption,
  proveApplicabilityCase,
  proveSliderAcrossApplicabilityCases,
  proveSliderChange,
  setTextControl,
  type ProofSession,
} from "./dispersion-browser-helpers";

export async function proveSettingsTransfer(page: Page): Promise<void> {
  const flow = page
    .locator(`[data-toolcraft-control-target="${dispersionTargets.flow}"]`)
    .getByRole("slider");
  await expectToolcraftAcceptanceOutcome(
    async () => Number(await flow.getAttribute("aria-valuenow")),
    async () => {
      await flow.focus();
      await flow.press("End");
      const pending = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Export Settings", exact: true })
        .click();
      const settings = await pending;
      await flow.focus();
      await flow.press("Home");
      const chooserPromise = page.waitForEvent("filechooser");
      await page
        .getByRole("button", { name: "Import Settings", exact: true })
        .click();
      const chooser = await chooserPromise;
      const file = await settings.path();
      expect(file).not.toBeNull();
      await chooser.setFiles(file!);
    },
    {
      evidenceType: "command-side-effect",
      requirementId: getDispersionAcceptanceId("runtime.settingsTransfer"),
      stabilityIntervalMs: 80,
      timeoutMs: 20_000,
    },
  );
}

export async function proveCanvasControl(
  session: ProofSession,
  target: "canvas.aspectRatio" | "canvas.size.height" | "canvas.size.width",
): Promise<void> {
  const action =
    target === "canvas.aspectRatio"
      ? (control: Locator, currentPage: Page) =>
          chooseOption(currentPage, control, "1:1")
      : (control: Locator) =>
          setTextControl(
            control,
            target === "canvas.size.width" ? "1600" : "900",
          );
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction(target, action),
    {
      requirementId: getDispersionAcceptanceId(target),
      selector: canvasSelector,
      timeoutMs: 20_000,
    },
  );
}

export async function proveFrameShape(
  page: Page,
  session: ProofSession,
): Promise<void> {
  await expectToolcraftSegmentedControlCellsPreservePadding(page, "Shape", {
    requirementId: getDispersionAcceptanceId(dispersionTargets.shape),
    target: dispersionTargets.shape,
  });
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction(dispersionTargets.shape, (control) =>
      control.getByRole("button", { name: "Circle", exact: true }).click(),
    ),
    {
      requirementId: getDispersionAcceptanceId(dispersionTargets.shape),
      selector: canvasSelector,
      timeoutMs: 20_000,
    },
  );
}

export async function proveApplicableSlider(
  session: ProofSession,
  target: string,
): Promise<void> {
  await proveSliderAcrossApplicabilityCases(session, target);
}

export async function proveEffectSlider(
  page: Page,
  session: ProofSession,
  target: string,
): Promise<void> {
  const grainTargets = new Set<string>([
    dispersionTargets.grainAmount,
    dispersionTargets.grainScale,
    dispersionTargets.grainSoftness,
    dispersionTargets.grainDistortion,
    dispersionTargets.grainDrift,
  ]);
  const effectMode = page.locator(
    `[data-toolcraft-control-target="${dispersionTargets.effectMode}"]`,
  );
  await chooseOption(
    page,
    effectMode,
    grainTargets.has(target) ? "Grain Gradient" : "Sparkle",
  );
  await expect(
    page.locator(`[data-toolcraft-control-target="${target}"]`),
  ).toBeVisible();
  if (target === dispersionTargets.grainAmount) {
    await proveGrainAmountDensity(page);
  }
  await proveSliderAcrossApplicabilityCases(session, target);
}

async function enableLensEffect(page: Page): Promise<void> {
  const renderScale = page
    .locator('[data-toolcraft-control-target="canvas.renderScale"]')
    .getByRole("slider");
  await renderScale.focus();
  await renderScale.press("Home");
  await expect(page.locator(canvasSelector)).toHaveAttribute(
    "data-render-scale",
    "1",
  );
  const control = page.locator(
    `[data-toolcraft-control-target="${dispersionTargets.lensEnabled}"]`,
  );
  const toggle = control.getByRole("switch");
  await control.scrollIntoViewIfNeeded();
  if (!(await toggle.isChecked())) await toggle.click();
  await expect(page.locator(canvasSelector)).toHaveAttribute(
    "data-lens-distortion",
    "on",
  );
}

export async function proveLensEnabled(session: ProofSession): Promise<void> {
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction(dispersionTargets.lensEnabled, (control) =>
      control.getByRole("switch").click(),
    ),
    {
      requirementId: getDispersionAcceptanceId(dispersionTargets.lensEnabled),
      selector: canvasSelector,
      timeoutMs: 20_000,
    },
  );
}

export async function proveLensSlider(
  session: ProofSession,
  page: Page,
  target: string,
): Promise<void> {
  await enableLensEffect(page);
  await proveSliderAcrossApplicabilityCases(session, target, 2);
  if (target === dispersionTargets.lensCount) {
    const field = page.locator(
      `[data-toolcraft-control-target="${dispersionTargets.lensCount}"]`,
    );
    const slider = field.getByRole("slider").first();
    const track = field.locator('[data-slot="slider-track"]').first();
    const thumb = field.locator('[data-slot="slider-thumb"]').first();
    const current = Number(await slider.getAttribute("aria-valuenow"));
    const minimum = Number(
      (await slider.getAttribute("aria-valuemin")) ??
        (await slider.getAttribute("min")),
    );
    const maximum = Number(
      (await slider.getAttribute("aria-valuemax")) ??
        (await slider.getAttribute("max")),
    );
    const normalized = (current - minimum) / Math.max(1, maximum - minimum);
    const targetRatio = normalized < 0.5 ? 0.82 : 0.18;
    const trackBox = await track.boundingBox();
    const thumbBox = await thumb.boundingBox();
    expect(trackBox).not.toBeNull();
    expect(thumbBox).not.toBeNull();

    await page.mouse.move(
      thumbBox!.x + thumbBox!.width / 2,
      thumbBox!.y + thumbBox!.height / 2,
    );
    await page.mouse.down();
    try {
      await page.mouse.move(
        trackBox!.x + trackBox!.width * targetRatio,
        trackBox!.y + trackBox!.height / 2,
        { steps: 3 },
      );
      await expect(slider).not.toHaveAttribute(
        "aria-valuenow",
        String(current),
      );
      const requested = await slider.getAttribute("aria-valuenow");
      expect(requested).not.toBeNull();
      const canvas = page.locator(canvasSelector);
      await expect(canvas).toHaveAttribute(
        "data-lens-requested-count",
        requested!,
      );
      // The exact Paper pass must finish while the pointer is still held down,
      // proving live full-quality updates rather than a mouseup-only refresh.
      await expect(canvas).toHaveAttribute("data-lens-count", requested!, {
        timeout: 20_000,
      });
    } finally {
      await page.mouse.up();
    }
  }
}

export async function proveCustomSpectrumColor(
  session: ProofSession,
  target: string,
  label: string,
  hex: string,
): Promise<void> {
  for (const applicabilityCase of applicabilityCases(target)) {
    const requirementId = await proveApplicabilityCase(
      session,
      getDispersionAcceptanceId(target),
      applicabilityCase,
    );
    if (applicabilityCase.expectation !== "visible") continue;
    await expectToolcraftProductObservableToChange(
      session,
      session.controlAction(target, async (control) => {
        const input = control.getByRole("textbox", { name: `${label} hex` });
        await input.fill(hex);
        await input.blur();
      }),
      {
        requirementId,
        selector: canvasSelector,
        timeoutMs: 20_000,
      },
    );
  }
}

export async function proveSelectControl(
  session: ProofSession,
  target: string,
  label: string,
  requirementId = getDispersionAcceptanceId(target),
): Promise<void> {
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction(target, (control, currentPage) =>
      chooseOption(currentPage, control, label),
    ),
    {
      requirementId,
      selector: canvasSelector,
      timeoutMs: 20_000,
    },
  );
}

export async function proveEffectMode(
  page: Page,
  session: ProofSession,
): Promise<void> {
  for (const applicabilityCase of applicabilityCases(
    dispersionTargets.effectMode,
  )) {
    const distributionOwnsCase =
      applicabilityCase.selectorTarget === dispersionTargets.grainDistribution;
    await chooseOption(
      page,
      page.locator(
        `[data-toolcraft-control-target="${dispersionTargets.effectMode}"]`,
      ),
      distributionOwnsCase ? "Grain Gradient" : "Sparkle",
    );
    const requirementId = await proveApplicabilityCase(
      session,
      getDispersionAcceptanceId(dispersionTargets.effectMode),
      applicabilityCase,
    );
    if (applicabilityCase.expectation !== "visible") continue;
    await proveSelectControl(
      session,
      dispersionTargets.effectMode,
      distributionOwnsCase ? "Sparkle" : "Grain Gradient",
      requirementId,
    );
  }
}

export async function proveEffectArea(
  page: Page,
  session: ProofSession,
): Promise<void> {
  const slider = page
    .locator(`[data-toolcraft-control-target="${dispersionTargets.sparkle}"]`)
    .getByRole("slider")
    .first();
  await slider.focus();
  await slider.press("End");
  await page.waitForTimeout(100);
  const visibleLabels = ["Color bands", "Glow"] as const;
  let visibleIndex = 0;
  for (const applicabilityCase of applicabilityCases(
    dispersionTargets.effectArea,
  )) {
    const requirementId = await proveApplicabilityCase(
      session,
      getDispersionAcceptanceId(dispersionTargets.effectArea),
      applicabilityCase,
    );
    if (applicabilityCase.expectation === "visible") {
      await proveSelectControl(
        session,
        dispersionTargets.effectArea,
        visibleLabels[visibleIndex % visibleLabels.length],
        requirementId,
      );
      visibleIndex += 1;
    }
  }
}

export async function proveGrainDistribution(
  page: Page,
  session: ProofSession,
): Promise<void> {
  const visibleLabels = ["Surface", "Screen"] as const;
  let preparedStrongFixture = false;
  let visibleIndex = 0;
  for (const applicabilityCase of applicabilityCases(
    dispersionTargets.grainDistribution,
  )) {
    const requirementId = await proveApplicabilityCase(
      session,
      getDispersionAcceptanceId(dispersionTargets.grainDistribution),
      applicabilityCase,
    );
    if (applicabilityCase.expectation === "visible") {
      if (!preparedStrongFixture) {
        await expectToolcraftProductObservableToChange(
          page,
          async () => {
            const amount = page
              .locator(
                `[data-toolcraft-control-target="${dispersionTargets.grainAmount}"]`,
              )
              .getByRole("slider");
            await amount.focus();
            await amount.press("End");
          },
          { selector: canvasSelector, timeoutMs: 20_000 },
        );
        preparedStrongFixture = true;
      }
      const screenPixels =
        visibleIndex === 0 ? await sampleCanvasPixels(page) : undefined;
      await proveSelectControl(
        session,
        dispersionTargets.grainDistribution,
        visibleLabels[visibleIndex % visibleLabels.length],
        requirementId,
      );
      if (!screenPixels) {
        visibleIndex += 1;
        continue;
      }
      const surfacePixels = await sampleCanvasPixels(page);
      let activeChannels = 0;
      let activeDifference = 0;
      let activePixels = 0;
      let redistributedPixels = 0;
      for (let index = 0; index < screenPixels.length; index += 4) {
        const isWavePixel = [0, 1, 2].some(
          (channel) =>
            Math.max(
              Math.abs(
                (screenPixels[index + channel] ?? 0) - backgroundRgba[channel],
              ),
              Math.abs(
                (surfacePixels[index + channel] ?? 0) - backgroundRgba[channel],
              ),
            ) > 12,
        );
        if (!isWavePixel) continue;
        activePixels += 1;
        let pixelDifference = 0;
        for (let channel = 0; channel < 3; channel += 1) {
          const channelDifference = Math.abs(
            (screenPixels[index + channel] ?? 0) -
              (surfacePixels[index + channel] ?? 0),
          );
          pixelDifference = Math.max(pixelDifference, channelDifference);
          activeDifference += channelDifference;
          activeChannels += 1;
        }
        if (pixelDifference >= 6) redistributedPixels += 1;
      }
      expect(activeChannels).toBeGreaterThan(150);
      const normalizedDifference = activeDifference / (activeChannels * 255);
      const redistributedRatio = redistributedPixels / activePixels;
      expect(
        redistributedRatio,
        `Surface should redistribute a meaningful share of active wave pixels (normalized RGB difference ${normalizedDifference.toFixed(4)}).`,
      ).toBeGreaterThan(0.05);
      visibleIndex += 1;
    }
  }
}

export async function proveMotionSlider(
  session: ProofSession,
  target: string,
): Promise<void> {
  await proveSliderChange(session, target);
}
