import type { Page } from "@playwright/test";

import { getDispersionAcceptanceId } from "../src/app/app-acceptance-data";
import { dispersionTargets } from "../src/app/dispersion/dispersion-values";
import { expectToolcraftExportedArtifact } from "./browser-acceptance-outcome-helpers";
import { expectToolcraftBackgroundOutputSemantics } from "./browser-background-output-evidence";
import {
  expectToolcraftInfinityCanvasBackgroundEvidence,
  expectToolcraftInfinityCanvasImageExportEvidence,
  observeInfinityCanvasBackground,
} from "./browser-infinity-canvas-evidence";
import { expectToolcraftImageExportArtifact } from "./browser-media-export-evidence";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { expect } from "./toolcraft-product-test";
import {
  applicabilityCases,
  backgroundRgba,
  canvasSelector,
  chooseOption,
  exportImage,
  inspectImage,
  proveApplicabilityCase,
  readObservation,
  setTimelineFraction,
  type ProofSession,
} from "./dispersion-browser-helpers";

export async function proveIncludeBackground(
  page: Page,
  session: ProofSession,
): Promise<void> {
  const include = page
    .locator(`[data-toolcraft-control-target="${dispersionTargets.includeBackground}"]`)
    .getByRole("switch");
  if (!(await include.isChecked())) await include.click();
  const format = page.locator(
    `[data-toolcraft-control-target="${dispersionTargets.imageFormat}"]`,
  );
  const resolution = page.locator(
    `[data-toolcraft-control-target="${dispersionTargets.imageResolution}"]`,
  );
  await chooseOption(page, format, "PNG");
  await chooseOption(page, resolution, "2K");

  const observePreview = session.observe(async (root) => {
    const switchControl = root.querySelector<HTMLElement>(
      '[data-toolcraft-control-target="export.includeBackground"] [role="switch"]',
    );
    const source = root.querySelector<HTMLCanvasElement>(
      'canvas[data-dispersion-canvas="true"]',
    );
    const surface = root.querySelector<HTMLElement>(
      '[data-dispersion-surface="true"]',
    );
    const sample = document.createElement("canvas");
    sample.width = 48;
    sample.height = 27;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (context && source) context.drawImage(source, 0, 0, 48, 27);
    const bytes =
      context?.getImageData(0, 0, 48, 27).data ?? new Uint8ClampedArray();
    let hash = 2166136261;
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
    return {
      backgroundVisible: switchControl?.getAttribute("aria-checked") === "true",
      outputSignature: `${hash.toString(16)}:${surface ? getComputedStyle(surface).backgroundColor : "missing"}`,
    };
  });

  await include.click();
  const expectedPreview = await readObservation(observePreview);
  await include.click();
  await expectToolcraftBackgroundOutputSemantics(
    observePreview,
    session.controlAction(
      dispersionTargets.includeBackground,
      (control) => control.getByRole("switch").click(),
    ),
    expectedPreview,
    session.targetAction("actions.output", (currentPage) => exportImage(currentPage)),
    async (download) => {
      const inspected = await inspectImage(page, download);
      return {
        ...inspected.inspection,
        backgroundAlpha: inspected.observation.normalizedPixels[3] ?? 255,
      };
    },
    {
      requirementId: getDispersionAcceptanceId(
        dispersionTargets.includeBackground,
      ),
      stabilityIntervalMs: 80,
      timeoutMs: 120_000,
    },
  );

  const backgroundExcluded = await observeInfinityCanvasBackground(page);
  await include.click();
  const backgroundRestored = await observeInfinityCanvasBackground(page);
  const infinity = page
    .locator('[data-toolcraft-control-target="canvas.infinity"]')
    .getByRole("switch");
  await infinity.click();
  const infinite = await observeInfinityCanvasBackground(page);
  await infinity.click();
  await expectToolcraftInfinityCanvasBackgroundEvidence(
    { backgroundExcluded, backgroundRestored, infinite },
    {
      expectedBackgroundColor: "#E7E7EC",
      requirementId: getDispersionAcceptanceId(
        dispersionTargets.includeBackground,
      ),
      target: dispersionTargets.includeBackground,
    },
  );
}

export async function proveBackgroundColor(
  page: Page,
  session: ProofSession,
): Promise<void> {
  await setTimelineFraction(page, 0);
  const cases = [...applicabilityCases(dispersionTargets.background)].sort(
    (left, right) =>
      Number(right.expectation === "visible") -
      Number(left.expectation === "visible"),
  );
  let visibleIndex = 0;
  for (const applicabilityCase of cases) {
    const requirementId = await proveApplicabilityCase(
      session,
      getDispersionAcceptanceId(dispersionTargets.background),
      applicabilityCase,
    );
    if (applicabilityCase.expectation === "visible") {
      const include = page
        .locator(
          `[data-toolcraft-control-target="${dispersionTargets.includeBackground}"]`,
        )
        .getByRole("switch");
      if (await include.isChecked()) await include.click();
      if (!(await include.isChecked())) await include.click();
      const expectedColor =
        visibleIndex % 2 === 0
          ? { hex: "#101820", rgba: [16, 24, 32, 255] as const }
          : { hex: "#D9E6F2", rgba: [217, 230, 242, 255] as const };
      visibleIndex += 1;
      await expectToolcraftProductObservableToChange(
        session,
        session.controlAction(
          dispersionTargets.background,
          async (control) => {
            const input = control.getByRole("textbox", {
              name: "Background color hex",
            });
            await input.fill(expectedColor.hex);
            await input.blur();
          },
        ),
        {
          requirementId,
          selector: '[data-dispersion-surface="true"]',
          timeoutMs: 20_000,
        },
      );
      await expect(
        page.locator('[data-dispersion-surface="true"]'),
      ).toHaveCSS(
        "background-color",
        `rgb(${expectedColor.rgba.slice(0, 3).join(", ")})`,
      );
      await expectToolcraftExportedArtifact(
        session.targetAction(dispersionTargets.background, (currentPage) =>
          exportImage(currentPage),
        ),
        async (download) => {
          const inspected = await inspectImage(page, download);
          const offset = (1 * 64 + 1) * 4;
          const sampled = Array.from(
            inspected.observation.normalizedPixels.subarray(
              offset,
              offset + 4,
            ),
          );
          // The raymarched sheet emits a faint volumetric glow across most of
          // the frame (reference parity), so sample the stable corner margin
          // where the selected background must dominate the artifact. The
          // timeline is fixed above so the glow contribution is deterministic.
          for (let channel = 0; channel < 4; channel += 1) {
            expect(
              Math.abs((sampled[channel] ?? 0) - expectedColor.rgba[channel]!),
            ).toBeLessThanOrEqual(12);
          }
          return inspected.inspection;
        },
        { requirementId },
      );
    }
  }
}

export async function proveExportFormat(
  page: Page,
  session: ProofSession,
): Promise<void> {
  const formatLabels = ["PNG", "JPG"] as const;
  let formatIndex = 0;
  for (const applicabilityCase of applicabilityCases(
    dispersionTargets.imageFormat,
  )) {
    const requirementId = await proveApplicabilityCase(
      session,
      getDispersionAcceptanceId(dispersionTargets.imageFormat),
      applicabilityCase,
    );
    const label = formatLabels[formatIndex % formatLabels.length]!;
    formatIndex += 1;
    await expectToolcraftExportedArtifact(
      session.controlAction(
        dispersionTargets.imageFormat,
        async (control, currentPage) => {
          await chooseOption(currentPage, control, label);
          return exportImage(currentPage);
        },
      ),
      async (download) => (await inspectImage(page, download)).inspection,
      { requirementId },
    );
  }

}

export async function proveExportResolution(
  page: Page,
  session: ProofSession,
): Promise<void> {
  const resolutionLabels = ["2K", "4K", "8K"] as const;
  let resolutionIndex = 0;
  for (const applicabilityCase of applicabilityCases(
    dispersionTargets.imageResolution,
  )) {
    const requirementId = await proveApplicabilityCase(
      session,
      getDispersionAcceptanceId(dispersionTargets.imageResolution),
      applicabilityCase,
    );
    const label = resolutionLabels[resolutionIndex % resolutionLabels.length]!;
    resolutionIndex += 1;
    await expectToolcraftExportedArtifact(
      session.controlAction(
        dispersionTargets.imageResolution,
        async (control, currentPage) => {
          await chooseOption(currentPage, control, label);
          return exportImage(currentPage);
        },
      ),
      async (download) => (await inspectImage(page, download)).inspection,
      { requirementId },
    );
  }
}

export async function proveInfinityExport(page: Page): Promise<void> {
  const include = page
    .locator(`[data-toolcraft-control-target="${dispersionTargets.includeBackground}"]`)
    .getByRole("switch");
  if (!(await include.isChecked())) await include.click();
  await chooseOption(
    page,
    page.locator(
      `[data-toolcraft-control-target="${dispersionTargets.imageFormat}"]`,
    ),
    "PNG",
  );
  await chooseOption(
    page,
    page.locator(
      `[data-toolcraft-control-target="${dispersionTargets.imageResolution}"]`,
    ),
    "2K",
  );
  await page
    .locator(`[data-toolcraft-control-target="${dispersionTargets.shape}"]`)
    .getByRole("button", { name: "Circle", exact: true })
    .click();
  const infinity = page
    .locator('[data-toolcraft-control-target="canvas.infinity"]')
    .getByRole("switch");
  if (await infinity.isChecked()) await infinity.click();
  const finite = (await inspectImage(page, await exportImage(page))).inspection;
  await infinity.click();
  const infinite = (await inspectImage(page, await exportImage(page))).inspection;
  await infinity.click();
  await expectToolcraftInfinityCanvasImageExportEvidence(
    { finite, infinite },
    {
      expectedFiniteSize: { height: 1152, width: 2048 },
      expectedInfiniteSize: { height: 2048, width: 2048 },
      requirementId: getDispersionAcceptanceId(
        "canvas.infinity.scene-bounds-image-export",
      ),
      target: "canvas.infinity",
    },
  );
}

export async function proveImageAction(
  page: Page,
  session: ProofSession,
): Promise<void> {
  const include = page
    .locator(`[data-toolcraft-control-target="${dispersionTargets.includeBackground}"]`)
    .getByRole("switch");
  if (!(await include.isChecked())) await include.click();
  await chooseOption(
    page,
    page.locator(
      `[data-toolcraft-control-target="${dispersionTargets.imageFormat}"]`,
    ),
    "PNG",
  );
  await chooseOption(
    page,
    page.locator(
      `[data-toolcraft-control-target="${dispersionTargets.imageResolution}"]`,
    ),
    "2K",
  );
  const reference = await inspectImage(page, await exportImage(page));
  expect(reference.inspection.nonBackgroundBounds).not.toBeNull();
  const size = 64;
  let expectedPixel:
    | { rgba: [number, number, number, number]; xRatio: number; yRatio: number }
    | undefined;
  for (let y = 0; y < size && !expectedPixel; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const rgba = Array.from(
        reference.observation.normalizedPixels.subarray(offset, offset + 4),
      ) as [number, number, number, number];
      const distance = Math.hypot(
        rgba[0] - backgroundRgba[0],
        rgba[1] - backgroundRgba[1],
        rgba[2] - backgroundRgba[2],
        rgba[3] - backgroundRgba[3],
      );
      if (distance > 48) {
        expectedPixel = {
          rgba,
          xRatio: (x + 0.5) / size,
          yRatio: (y + 0.5) / size,
        };
        break;
      }
    }
  }
  expect(expectedPixel).toBeDefined();
  await expectToolcraftImageExportArtifact(
    session.controlAction("actions.output", (_control, currentPage) =>
      exportImage(currentPage),
    ),
    {
      backgroundRgba,
      expectedBounds: reference.inspection.nonBackgroundBounds!,
      expectedHeight: reference.inspection.height,
      expectedMediaType: "image/png",
      expectedPixels: [expectedPixel!],
      expectedWidth: reference.inspection.width,
      page,
      requirementId: getDispersionAcceptanceId("export.actions"),
    },
  );
}
