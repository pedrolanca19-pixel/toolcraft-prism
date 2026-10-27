import type { Page } from "@playwright/test";

import { dispersionTargets } from "../src/app/dispersion/dispersion-values";
import { chooseOption, canvasSelector } from "./dispersion-browser-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { expect } from "./toolcraft-product-test";

export async function sampleCanvasPixels(
  page: Page,
  width = 256,
  height = 144,
): Promise<number[]> {
  return page.locator(canvasSelector).evaluate(
    (node, size) => {
      const source = node as HTMLCanvasElement;
      const sample = document.createElement("canvas");
      sample.width = size.width;
      sample.height = size.height;
      const context = sample.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Could not sample Grain output.");
      context.drawImage(source, 0, 0, sample.width, sample.height);
      return Array.from(
        context.getImageData(0, 0, sample.width, sample.height).data,
      );
    },
    { height, width },
  );
}

function changedPixelCoverage(
  baseline: readonly number[],
  candidate: readonly number[],
  threshold = 5,
): number {
  let changedPixels = 0;
  let comparedPixels = 0;
  for (let index = 0; index < baseline.length; index += 4) {
    const difference = Math.max(
      Math.abs((baseline[index] ?? 0) - (candidate[index] ?? 0)),
      Math.abs((baseline[index + 1] ?? 0) - (candidate[index + 1] ?? 0)),
      Math.abs((baseline[index + 2] ?? 0) - (candidate[index + 2] ?? 0)),
    );
    if (difference >= threshold) changedPixels += 1;
    comparedPixels += 1;
  }
  return changedPixels / Math.max(comparedPixels, 1);
}

async function setSliderPercent(
  page: Page,
  target: string,
  percent: 0 | 50 | 100,
): Promise<void> {
  const slider = page
    .locator(`[data-toolcraft-control-target="${target}"]`)
    .getByRole("slider");
  await expectToolcraftProductObservableToChange(
    page,
    async () => {
      await slider.focus();
      if (percent === 0) {
        await slider.press("Home");
      } else if (percent === 100) {
        await slider.press("End");
      } else {
        const field = page.locator(
          `[data-toolcraft-control-target="${target}"]`,
        );
        const track = field.locator('[data-slot="slider-track"]').first();
        const thumb = field.locator('[data-slot="slider-thumb"]').first();
        const trackBox = await track.boundingBox();
        const thumbBox = await thumb.boundingBox();
        expect(trackBox).not.toBeNull();
        expect(thumbBox).not.toBeNull();
        await page.mouse.move(
          thumbBox!.x + thumbBox!.width / 2,
          thumbBox!.y + thumbBox!.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(
          trackBox!.x + trackBox!.width * 0.5,
          trackBox!.y + trackBox!.height / 2,
          { steps: 8 },
        );
        await page.mouse.up();
      }
    },
    { selector: canvasSelector, timeoutMs: 20_000 },
  );
  await expect(slider).toHaveAttribute("aria-valuenow", String(percent));
}

export async function proveGrainAmountDensity(page: Page): Promise<void> {
  await chooseOption(
    page,
    page.locator(
      `[data-toolcraft-control-target="${dispersionTargets.effectArea}"]`,
    ),
    "Core",
  );
  await chooseOption(
    page,
    page.locator(
      `[data-toolcraft-control-target="${dispersionTargets.grainDistribution}"]`,
    ),
    "Screen",
  );

  await setSliderPercent(page, dispersionTargets.grainAmount, 0);
  const baseline = await sampleCanvasPixels(page, 256, 144);
  await setSliderPercent(page, dispersionTargets.grainAmount, 50);
  const midpoint = await sampleCanvasPixels(page, 256, 144);
  await setSliderPercent(page, dispersionTargets.grainAmount, 100);
  const maximum = await sampleCanvasPixels(page, 256, 144);

  const midpointCoverage = changedPixelCoverage(baseline, midpoint);
  const maximumCoverage = changedPixelCoverage(baseline, maximum);
  expect(midpointCoverage).toBeGreaterThan(0.002);
  expect(
    maximumCoverage,
    `Amount 100 should add substantially more grain pixels than Amount 50 (${maximumCoverage.toFixed(4)} vs ${midpointCoverage.toFixed(4)}).`,
  ).toBeGreaterThan(midpointCoverage * 1.7);
}
