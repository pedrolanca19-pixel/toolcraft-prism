import { expect, test } from "./toolcraft-product-test";

const canvasSelector = 'canvas[data-dispersion-canvas="true"]';

test("default dispersion uses shader refraction with dark volume and a compact caustic", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const canvas = page.locator(canvasSelector);
  await expect(canvas).toBeVisible();
  const pause = page.getByRole("button", {
    exact: true,
    name: "Pause playback",
  });
  if ((await pause.count()) === 1) await pause.click({ force: true });
  const timelineToggle = page
    .locator('[data-toolcraft-control-target="panels.timeline.extended"]')
    .getByRole("switch");
  if ((await timelineToggle.count()) === 1 && !(await timelineToggle.isChecked())) {
    await timelineToggle.click({ force: true });
  }
  const playbackPosition = page.getByRole("slider", {
    exact: true,
    name: "Playback position",
  });
  await playbackPosition.focus();
  await playbackPosition.press("Home");

  await expect(canvas).toHaveAttribute("data-dispersion-engine", "webgl2");
  await expect
    .poll(() => canvas.getAttribute("data-dispersion-progress"))
    .not.toBeNull();

  const metrics = await canvas.evaluate((source) => {
    const sample = document.createElement("canvas");
    sample.width = 256;
    sample.height = 144;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Reference proof requires a 2D sampler.");
    context.fillStyle = "#000000";
    context.fillRect(0, 0, sample.width, sample.height);
    context.drawImage(source as HTMLCanvasElement, 0, 0, 256, 144);

    const bytes = context.getImageData(0, 0, 256, 144).data;
    const luminance: number[] = [];
    let brightPixels = 0;
    let chromaticPixels = 0;
    let darkPixels = 0;
    for (let index = 0; index < bytes.length; index += 4) {
      const red = bytes[index] ?? 0;
      const green = bytes[index + 1] ?? 0;
      const blue = bytes[index + 2] ?? 0;
      const value = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      const chroma =
        Math.max(red, green, blue) - Math.min(red, green, blue);
      luminance.push(value);
      if (value < 205) darkPixels += 1;
      if (value > 247) brightPixels += 1;
      if (chroma > 42) chromaticPixels += 1;
    }
    luminance.sort((left, right) => left - right);
    const count = luminance.length;
    return {
      brightRatio: brightPixels / count,
      chromaticRatio: chromaticPixels / count,
      darkRatio: darkPixels / count,
      luminanceP05: luminance[Math.floor(count * 0.05)] ?? 255,
      luminanceMax: luminance[count - 1] ?? 0,
    };
  });

  expect(metrics.luminanceP05).toBeLessThan(205);
  expect(metrics.luminanceMax).toBeGreaterThan(252);
  expect(metrics.darkRatio).toBeGreaterThan(0.05);
  expect(metrics.brightRatio).toBeGreaterThan(0.003);
  // The reference-like black default should preserve visible spectral color
  // without turning the entire frame into a uniform rainbow wash.
  expect(metrics.chromaticRatio).toBeGreaterThan(0.012);
  expect(metrics.chromaticRatio).toBeLessThan(0.3);
});
