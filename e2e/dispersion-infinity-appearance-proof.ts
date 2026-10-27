import type { Page } from "@playwright/test";

import { canvasSelector } from "./dispersion-browser-helpers";
import { expect } from "./toolcraft-product-test";

async function captureAppearance(page: Page, background: string) {
  return page.locator(canvasSelector).evaluate((element, color) => {
    const canvas = element as HTMLCanvasElement;
    const sample = document.createElement("canvas");
    sample.width = 128;
    sample.height = 72;
    const context = sample.getContext("2d")!;
    context.drawImage(canvas, 0, 0, sample.width, sample.height);
    const raw = context.getImageData(0, 0, sample.width, sample.height).data;
    let transparent = 0;
    for (let index = 3; index < raw.length; index += 4) {
      if (raw[index] < 255) transparent += 1;
    }
    context.clearRect(0, 0, sample.width, sample.height);
    context.fillStyle = color;
    context.fillRect(0, 0, sample.width, sample.height);
    const rect = canvas.getBoundingClientRect();
    const viewport = document.querySelector('[role="application"][aria-label="Canvas viewport"]')!
      .getBoundingClientRect();
    // Compare the same world-space patch, not the differently sized rasters.
    context.drawImage(canvas,
      (viewport.x + viewport.width / 2 - 80 - rect.x) * canvas.width / rect.width,
      (viewport.y + viewport.height / 2 - 45 - rect.y) * canvas.height / rect.height,
      160 * canvas.width / rect.width, 90 * canvas.height / rect.height,
      0, 0, sample.width, sample.height);

    return {
      pixels: Array.from(context.getImageData(0, 0, sample.width, sample.height).data),
      progress: canvas.dataset.dispersionProgress,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      transparent,
    };
  }, background);
}

function pixelDifference(before: number[], after: number[]) {
  let sum = 0;
  let maximum = 0;
  for (let index = 0; index < before.length; index += 1) {
    if (index % 4 === 3) continue;
    const difference = Math.abs(before[index] - after[index]);
    sum += difference;
    maximum = Math.max(maximum, difference);
  }
  return { maximum, mean: sum / (before.length * 0.75) };
}

/** Compare real rendered pixels at one paused phase, not just shader uniforms. */
export async function proveInfinityAppearance(page: Page): Promise<void> {
  const infinity = page
    .locator('[data-toolcraft-control-target="canvas.infinity"]')
    .getByRole("switch");
  const lens = page
    .locator('[data-toolcraft-control-target="lens.enabled"]')
    .getByRole("switch");
  const backgroundInput = page.locator(
    '[data-toolcraft-control-target="appearance.background"] input',
  );

  for (const lensEnabled of [false, true]) {
    await lens.setChecked(lensEnabled);
    for (const background of ["#E6E6E6", "#000000", "#FFFFFF", "#1B3550"]) {
      await backgroundInput.fill(background);
      await backgroundInput.press("Enter");
      await page.waitForTimeout(500);
      const before = await captureAppearance(page, background);
      await infinity.click();
      await expect.poll(async () => {
        const after = await captureAppearance(page, background);
        return pixelDifference(before.pixels, after.pixels).maximum;
      }).toBeLessThanOrEqual(2);
      const enabled = await captureAppearance(page, background);
      const viewport = await page.getByRole("application", { name: "Canvas viewport" }).boundingBox();
      expect(enabled.rect).toEqual(viewport);
      expect(enabled.progress).toBe(before.progress);
      expect(enabled.transparent).toBeGreaterThan(0);
      // 8-bit premultiplication and downsampling can differ by two code values.
      expect(pixelDifference(before.pixels, enabled.pixels).maximum).toBeLessThanOrEqual(2);

      await infinity.click();
      await expect.poll(async () => {
        const restored = await captureAppearance(page, background);
        return pixelDifference(before.pixels, restored.pixels).maximum;
      }).toBe(0);
      expect((await captureAppearance(page, background)).rect).toEqual(before.rect);
    }
  }
  await lens.setChecked(false);
  await backgroundInput.fill("#E6E6E6");
  await backgroundInput.press("Enter");
}
