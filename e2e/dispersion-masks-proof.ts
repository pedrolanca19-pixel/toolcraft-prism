import type { Page } from "@playwright/test";

import { getDispersionAcceptanceId } from "../src/app/app-acceptance-data";
import { dispersionTargets } from "../src/app/dispersion/dispersion-values";
import { expectToolcraftExportedArtifact } from "./browser-acceptance-outcome-helpers";
import { expectToolcraftCompoundControlPartOutcome } from "./browser-state-evidence-helpers";
import {
  canvasHash,
  canvasSelector,
  chooseOption,
  exportImage,
  inspectImage,
  readObservation,
  type ProofSession,
} from "./dispersion-browser-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { expect } from "./toolcraft-product-test";

function observeMaskOutcome(session: ProofSession) {
  return session.observe((root) => {
    const source = root.querySelector(
      'canvas[data-dispersion-canvas="true"]',
    ) as HTMLCanvasElement | null;
    if (!source) return "missing";
    const sample = document.createElement("canvas");
    sample.width = 64;
    sample.height = 36;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) return "missing";
    context.drawImage(source, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    let hash = 2166136261;
    for (const byte of pixels) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
    return `${source.dataset.maskCount ?? "missing"}:${hash.toString(16)}`;
  });
}

async function waitForMaskCount(page: Page, count: number): Promise<void> {
  await expect(page.locator(canvasSelector)).toHaveAttribute(
    "data-mask-count",
    String(count),
  );
}

async function clickMaskAction(
  page: Page,
  name: "Add mask" | "Remove mask",
): Promise<void> {
  await page
    .locator(
      `[data-toolcraft-control-target="${dispersionTargets.maskItems}"]`,
    )
    .getByRole("button", { name, exact: true })
    .click();
}

async function setFirstMaskWidth(page: Page, value: number): Promise<void> {
  const slider = page
    .locator(
      `[data-toolcraft-control-target="${dispersionTargets.maskItems}"]`,
    )
    .getByRole("slider")
    .first();
  await slider.fill(String(value));
  await expect(slider).toHaveAttribute("aria-valuenow", String(value));
}

export async function proveMaskCollection(
  page: Page,
  session: ProofSession,
  requirementId = getDispersionAcceptanceId(dispersionTargets.maskItems),
): Promise<void> {
  const observation = observeMaskOutcome(session);

  await clickMaskAction(page, "Add mask");
  await waitForMaskCount(page, 1);
  const expectedAdded = await readObservation(observation);
  await clickMaskAction(page, "Remove mask");
  await waitForMaskCount(page, 0);

  await expectToolcraftCompoundControlPartOutcome(
    observation,
    session.controlAction(dispersionTargets.maskItems, () =>
      clickMaskAction(page, "Add mask"),
    ),
    expectedAdded,
    {
      part: "collectionActions.add",
      requirementId,
      timeoutMs: 20_000,
    },
  );

  const defaultWidthHash = await canvasHash(page);
  await setFirstMaskWidth(page, 120);
  await expect.poll(() => canvasHash(page)).not.toBe(defaultWidthHash);
  const expectedEdited = await readObservation(observation);
  await setFirstMaskWidth(page, 40);
  await expect.poll(() => canvasHash(page)).toBe(defaultWidthHash);

  await expectToolcraftCompoundControlPartOutcome(
    observation,
    session.controlAction(dispersionTargets.maskItems, () =>
      setFirstMaskWidth(page, 120),
    ),
    expectedEdited,
    {
      part: "collectionActions.items",
      requirementId,
      timeoutMs: 20_000,
    },
  );

  await clickMaskAction(page, "Remove mask");
  await waitForMaskCount(page, 0);
  const expectedRemoved = await readObservation(observation);
  await clickMaskAction(page, "Add mask");
  await waitForMaskCount(page, 1);
  await setFirstMaskWidth(page, 120);

  await expectToolcraftCompoundControlPartOutcome(
    observation,
    session.controlAction(dispersionTargets.maskItems, () =>
      clickMaskAction(page, "Remove mask"),
    ),
    expectedRemoved,
    {
      part: "collectionActions.remove",
      requirementId,
      timeoutMs: 20_000,
    },
  );

  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction(dispersionTargets.maskItems, () =>
      clickMaskAction(page, "Add mask"),
    ),
    { requirementId, selector: canvasSelector, timeoutMs: 20_000 },
  );
}

export async function proveMaskApplication(
  page: Page,
  session: ProofSession,
): Promise<void> {
  await clickMaskAction(page, "Add mask");
  await waitForMaskCount(page, 1);
  await expect(page.locator(canvasSelector)).toHaveAttribute(
    "data-mask-enabled",
    "on",
  );

  const maskedHash = await canvasHash(page);
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction(
      dispersionTargets.maskEnabled,
      async (control, currentPage) => {
        await control.getByRole("switch").click();
        await expect(currentPage.locator(canvasSelector)).toHaveAttribute(
          "data-mask-enabled",
          "off",
        );
        await expect.poll(() => canvasHash(currentPage)).not.toBe(maskedHash);
      },
    ),
    {
      requirementId: getDispersionAcceptanceId(
        dispersionTargets.maskEnabled,
      ),
      selector: canvasSelector,
      timeoutMs: 20_000,
    },
  );
}

async function sampleCanvasCenter(page: Page): Promise<readonly number[]> {
  return page.locator(canvasSelector).evaluate((node) => {
    const source = node as HTMLCanvasElement;
    const sample = document.createElement("canvas");
    sample.width = 1;
    sample.height = 1;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) return [];
    context.drawImage(
      source,
      source.width / 2,
      source.height / 2,
      1,
      1,
      0,
      0,
      1,
      1,
    );
    return Array.from(context.getImageData(0, 0, 1, 1).data);
  });
}

export async function proveMaskPreviewExportClean(
  page: Page,
  session: ProofSession,
): Promise<void> {
  await clickMaskAction(page, "Add mask");
  await waitForMaskCount(page, 1);
  await chooseOption(
    page,
    page.locator(
      `[data-toolcraft-control-target="${dispersionTargets.spectrum}"]`,
    ),
    "Mono",
  );
  const beforeHash = await canvasHash(page);
  let previewCenter: readonly number[] = [];

  await expectToolcraftExportedArtifact(
    session.controlAction(
      dispersionTargets.maskPreview,
      async (control, currentPage) => {
        await control.getByRole("switch").click();
        await expect(currentPage.locator(canvasSelector)).toHaveAttribute(
          "data-mask-preview",
          "on",
        );
        await expect.poll(() => canvasHash(currentPage)).not.toBe(beforeHash);
        previewCenter = await sampleCanvasCenter(currentPage);
        return exportImage(currentPage);
      },
    ),
    async (download) => {
      const inspected = await inspectImage(page, download);
      const centerOffset = (32 * 64 + 32) * 4;
      const exportedCenter = Array.from(
        inspected.observation.normalizedPixels.subarray(
          centerOffset,
          centerOffset + 4,
        ),
      );
      expect(previewCenter).toHaveLength(4);
      expect(exportedCenter).toHaveLength(4);
      expect((previewCenter[0] ?? 0) - (previewCenter[1] ?? 0)).toBeGreaterThan(
        (exportedCenter[0] ?? 0) - (exportedCenter[1] ?? 0) + 10,
      );
      return inspected.inspection;
    },
    {
      requirementId: getDispersionAcceptanceId(
        dispersionTargets.maskPreview,
      ),
    },
  );
}
