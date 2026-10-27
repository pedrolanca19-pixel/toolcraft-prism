import type { Download, Locator, Page } from "@playwright/test";

import {
  getToolcraftApplicabilityRequirementId,
  getToolcraftControlApplicabilityCases,
  type ToolcraftControlApplicabilityCase,
} from "../src/app/app-acceptance";
import {
  appControlSectionInventory,
  getDispersionAcceptanceId,
} from "../src/app/app-acceptance-data";
import { appSchema } from "../src/app/app-schema";
import { expectToolcraftControlApplicabilityState } from "./browser-control-applicability-evidence";
import {
  readToolcraftBrowserObservation,
  type ToolcraftBrowserProofSession,
} from "./browser-proof-session";
import { inspectToolcraftImageDownload } from "./image-artifact-inspection";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { expect } from "./toolcraft-product-test";

export type ProofSession = ToolcraftBrowserProofSession;

export const canvasSelector = 'canvas[data-dispersion-canvas="true"]';
export const backgroundRgba = [231, 231, 236, 255] as const;

export async function pausePlayback(page: Page): Promise<void> {
  const pause = page.getByRole("button", { name: "Pause playback", exact: true });
  // The 2x backing canvas animates behind this fixed toolbar button. Forcing
  // the setup click avoids Playwright's irrelevant layout-stability wait while
  // preserving the real pointer event and runtime transport command.
  if ((await pause.count()) === 1) {
    await pause.click({ force: true, timeout: 60_000 });
  }
}

export async function playPlayback(page: Page): Promise<void> {
  const play = page.getByRole("button", { name: "Play playback", exact: true });
  if ((await play.count()) === 1) await play.click();
}

export async function ensureTimelineVisible(page: Page): Promise<void> {
  const slider = page.getByRole("slider", {
    name: "Playback position",
    exact: true,
  });
  if ((await slider.count()) === 1) return;
  await page
    .locator('[data-toolcraft-control-target="panels.timeline.extended"]')
    .getByRole("switch")
    .click();
  await expect(slider).toBeVisible();
}

export async function chooseOption(
  page: Page,
  control: Locator,
  label: string,
): Promise<void> {
  const combobox = control.getByRole("combobox");
  await combobox.scrollIntoViewIfNeeded();
  if ((await combobox.getAttribute("aria-expanded")) !== "true") {
    await combobox.click();
  }
  const option = page
    .locator('[data-slot="select-item"]')
    .filter({ hasText: label })
    .last();
  await expect(option).toBeVisible();
  await option.click();
}

export async function setTextControl(
  control: Locator,
  value: string,
): Promise<void> {
  const input = control.locator("input").first();
  await input.fill(value);
  await input.press("Enter");
}

export async function setTimelineDuration(
  page: Page,
  value: number,
): Promise<void> {
  await page
    .getByRole("button", { name: "Edit timeline duration", exact: true })
    .click();
  const input = page.getByRole("textbox", { name: "timeline duration" });
  await input.fill(String(value));
  await input.press("Enter");
}

export async function setTimelineFraction(
  page: Page,
  fraction: number,
): Promise<void> {
  await ensureTimelineVisible(page);
  const slider = page.getByRole("slider", {
    name: "Playback position",
    exact: true,
  });
  if (fraction === 0) {
    await slider.focus();
    await slider.press("Home");
  } else {
    const box = await slider.boundingBox();
    expect(box).not.toBeNull();
    await slider.click({
      position: {
        x: Math.max(1, Math.min(box!.width - 1, box!.width * fraction)),
        y: box!.height / 2,
      },
    });
  }
  await expect
    .poll(async () =>
      Number(
        await page.locator(canvasSelector).getAttribute("data-dispersion-progress"),
      ),
    )
    .toBeCloseTo(fraction, 1);
}

export async function canvasHash(page: Page): Promise<string> {
  return page.locator(canvasSelector).evaluate((node) => {
    const source = node as HTMLCanvasElement;
    const sample = document.createElement("canvas");
    sample.width = 96;
    sample.height = 54;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) return "missing-context";
    context.drawImage(source, 0, 0, sample.width, sample.height);
    const bytes = context.getImageData(0, 0, sample.width, sample.height).data;
    let hash = 2166136261;
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
    return hash.toString(16);
  });
}

export async function exportImage(page: Page): Promise<Download> {
  const pending = page.waitForEvent("download", { timeout: 120_000 });
  await page.getByRole("button", { name: "Export PNG", exact: true }).click();
  return pending;
}

export async function inspectImage(page: Page, download: Download) {
  return inspectToolcraftImageDownload({ backgroundRgba, download, page });
}

async function setSelectorCase(
  control: Locator,
  page: Page,
  applicabilityCase: ToolcraftControlApplicabilityCase,
): Promise<void> {
  const label = applicabilityCase.selectorOptionLabel;
  switch (applicabilityCase.selectorControlType) {
    case "switch": {
      const switchControl = control.getByRole("switch");
      const expected = String(applicabilityCase.selectorValue);
      if ((await switchControl.getAttribute("aria-checked")) !== expected) {
        await switchControl.click();
      }
      return;
    }
    case "segmented":
      await control
        .getByRole("button", { name: label, exact: true })
        .click();
      return;
    case "select":
      await chooseOption(page, control, label ?? "");
      return;
    default:
      throw new Error(
        `Unsupported dispersion applicability selector ${applicabilityCase.selectorControlType}.`,
      );
  }
}

export function applicabilityCases(target: string) {
  return getToolcraftControlApplicabilityCases({
    schema: appSchema,
    sectionInventory: appControlSectionInventory,
    target,
  });
}

export async function proveApplicabilityCase(
  session: ProofSession,
  baseRequirementId: string,
  applicabilityCase: ToolcraftControlApplicabilityCase,
): Promise<string> {
  await expectToolcraftControlApplicabilityState(
    session,
    session.controlAction(
      applicabilityCase.selectorTarget,
      (control, page) => setSelectorCase(control, page, applicabilityCase),
    ),
    applicabilityCase,
    { baseRequirementId, timeoutMs: 15_000 },
  );
  return getToolcraftApplicabilityRequirementId(
    baseRequirementId,
    applicabilityCase,
  );
}

export async function proveSliderChange(
  session: ProofSession,
  target: string,
  requirementId = getDispersionAcceptanceId(target),
  dragSteps = 12,
): Promise<void> {
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction(target, async (_control, page) => {
      const slider = page
        .locator(`[data-toolcraft-control-target="${target}"]`)
        .getByRole("slider")
        .first();
      await slider.scrollIntoViewIfNeeded();
      await expect(slider).toBeVisible();
      await page.waitForTimeout(50);
      const current = Number(await slider.getAttribute("aria-valuenow"));
      const min = Number(await slider.getAttribute("aria-valuemin"));
      const max = Number(await slider.getAttribute("aria-valuemax"));
      const normalized = (current - min) / Math.max(1, max - min);
      const field = page.locator(
        `[data-toolcraft-control-target="${target}"]`,
      );
      const track = field.locator('[data-slot="slider-track"]').first();
      const thumb = field.locator('[data-slot="slider-thumb"]').first();
      const trackBox = await track.boundingBox();
      const thumbBox = await thumb.boundingBox();
      expect(trackBox).not.toBeNull();
      expect(thumbBox).not.toBeNull();
      const targetRatio = normalized < 0.55 ? 0.78 : 0.24;
      await page.mouse.move(
        thumbBox!.x + thumbBox!.width / 2,
        thumbBox!.y + thumbBox!.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        trackBox!.x + trackBox!.width * targetRatio,
        trackBox!.y + trackBox!.height / 2,
        { steps: dragSteps },
      );
      await page.mouse.up();
    }),
    {
      requirementId,
      selector: canvasSelector,
      stabilityIntervalMs: 80,
      timeoutMs: 20_000,
    },
  );
}

export async function proveSliderAcrossApplicabilityCases(
  session: ProofSession,
  target: string,
  dragSteps = 12,
): Promise<void> {
  const cases = applicabilityCases(target);
  if (cases.length === 0) {
    await proveSliderChange(session, target, undefined, dragSteps);
    return;
  }
  for (const applicabilityCase of cases) {
    const requirementId = await proveApplicabilityCase(
      session,
      getDispersionAcceptanceId(target),
      applicabilityCase,
    );
    if (applicabilityCase.expectation === "visible") {
      await proveSliderChange(session, target, requirementId, dragSteps);
    }
  }
}

export async function readObservation<T>(
  observation: Parameters<typeof readToolcraftBrowserObservation<T>>[0],
): Promise<T> {
  return readToolcraftBrowserObservation(observation);
}
