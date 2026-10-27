import { expect, type Page } from "@playwright/test";

const removedBorderTargets = [
  "dispersion.distribution",
  "border.influence",
  "border.spotSize",
  "border.spots",
  "border.pulse",
  "border.turbulence",
] as const;

export async function proveBorderModeAbsent(page: Page): Promise<void> {
  const result = await page.evaluate((targets) => {
    const canvas = document.querySelector<HTMLElement>(
      '[data-dispersion-canvas="true"]',
    );
    const exactText = (value: string) =>
      Array.from(document.querySelectorAll("body *")).some(
        (element) => element.children.length === 0 && element.textContent?.trim() === value,
      );

    return {
      borderLabel: exactText("Border"),
      distributionAttribute: canvas?.hasAttribute(
        "data-dispersion-distribution",
      ),
      presentTargets: targets.filter((target) =>
        document.querySelector(`[data-toolcraft-control-target="${target}"]`),
      ),
      waveModeLabel: exactText("Wave Mode"),
    };
  }, removedBorderTargets);

  expect(result).toEqual({
    borderLabel: false,
    distributionAttribute: false,
    presentTargets: [],
    waveModeLabel: false,
  });
}
