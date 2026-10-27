import { expect, type Locator, type Page } from "@playwright/test";

import { deriveToolcraftPerformancePaths } from "@/toolcraft/runtime";

import { appPerformance } from "../src/app/app-performance";
import { appSchema } from "../src/app/app-schema";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import {
  dragToolcraftCanvasViewport,
  zoomToolcraftCanvasViewport,
} from "./performance-canvas-helpers";
import type { ToolcraftCompiledFixtureApplications } from "./performance-compiled-fixture-runtime";
import type {
  ToolcraftPerformanceCanvasBacking,
  ToolcraftPerformancePathActionContext,
  ToolcraftPerformancePathAdapter,
} from "./performance-path-adapter-contract";

const outputSelector = '[data-dispersion-canvas="true"]';

async function control(page: Page, target: string): Promise<Locator> {
  return getToolcraftControlFieldByTarget(page, target);
}

async function setLensEnabled(page: Page, enabled: boolean): Promise<void> {
  const field = await control(page, "lens.enabled");
  const toggle = field.getByRole("switch");
  if ((await toggle.isChecked()) !== enabled) await toggle.click();
  await expect(page.locator(outputSelector)).toHaveAttribute(
    "data-lens-distortion",
    enabled ? "on" : "off",
  );
}

async function prepare(page: Page, lensEnabled: boolean): Promise<void> {
  await page.goto("/");
  await expect(page.locator(outputSelector)).toBeVisible();
  await expect(page.locator(outputSelector)).toHaveAttribute(
    "data-dispersion-engine",
    "webgl2",
  );
  const pause = page.getByRole("button", { name: "Pause playback" });
  if ((await pause.count()) > 0) await pause.click();
  await setLensEnabled(page, lensEnabled);
}

async function ensureTimeline(page: Page): Promise<Locator> {
  const slider = page.getByRole("slider", { name: "Playback position" });
  if ((await slider.count()) === 0) {
    const timeline = await control(page, "panels.timeline.extended");
    await timeline.getByRole("switch").click();
  }
  await expect(slider).toBeVisible();
  return slider;
}

async function editSlider(
  page: Page,
  target: string,
  value: number,
): Promise<void> {
  const field = await control(page, target);
  const edit = field.getByRole("button", { name: /^Edit .+ value$/u });
  if ((await edit.count()) > 0) {
    await edit.click();
    const input = field.getByRole("textbox");
    await input.fill(String(value));
    await input.press("Enter");
    return;
  }
  await field.getByRole("slider").fill(String(value));
}

async function readSlider(page: Page, target: string): Promise<number> {
  const field = await control(page, target);
  return Number(
    await field.getByRole("slider").first().getAttribute("aria-valuenow"),
  );
}

async function chooseOption(
  page: Page,
  target: string,
  label: string,
): Promise<void> {
  const field = await control(page, target);
  const combobox = field.getByRole("combobox");
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

async function selectedOption(page: Page, target: string): Promise<string> {
  const field = await control(page, target);
  return (await field.getByRole("combobox").textContent())?.trim() ?? "";
}

async function setMaskCount(page: Page, value: number): Promise<void> {
  const target = Math.min(12, Math.max(0, Math.round(value)));
  const field = await control(page, "masks.items");
  const canvas = page.locator(outputSelector);
  let current = Number(await canvas.getAttribute("data-mask-count"));
  while (current < target) {
    await field.getByRole("button", { name: "Add mask" }).click();
    current += 1;
  }
  while (current > target) {
    await field.getByRole("button", { name: "Remove mask" }).click();
    current -= 1;
  }
  await expect(canvas).toHaveAttribute("data-mask-count", String(target));
}

function fixtureApplications(
  page: Page,
  dimensions: readonly string[],
): ToolcraftCompiledFixtureApplications {
  const applications: ToolcraftCompiledFixtureApplications = {};
  if (dimensions.includes("lens-samples")) {
    applications["lens-samples"] = {
      applyValue: async (value) => {
        const count = Number(value);
        await editSlider(page, "lens.count", count);
        await expect(page.locator(outputSelector)).toHaveAttribute(
          "data-lens-count",
          String(count),
          { timeout: 15_000 },
        );
      },
      observeValue: () => readSlider(page, "lens.count"),
    };
  }
  if (dimensions.includes("image-long-edge")) {
    applications["image-long-edge"] = {
      applyValue: (value) => {
        const resolution = String(value);
        return chooseOption(
          page,
          "export.image.resolution",
          resolution === "2k" ? "2K" : resolution === "8k" ? "8K" : "4K",
        );
      },
      observeValue: async () => {
        const option = await selectedOption(page, "export.image.resolution");
        return option.includes("2K") ? "2k" : option.includes("8K") ? "8k" : "4k";
      },
    };
  }
  if (dimensions.includes("mask-count")) {
    applications["mask-count"] = {
      applyValue: (value) => setMaskCount(page, Number(value)),
      observeValue: async () =>
        Number(await page.locator(outputSelector).getAttribute("data-mask-count")),
    };
  }
  return applications;
}

async function outputSignature(page: Page): Promise<string> {
  return page.locator(outputSelector).evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    return JSON.stringify({
      backing: [canvas.width, canvas.height],
      lens: canvas.dataset.lensDistortion,
      maskCount: canvas.dataset.maskCount,
      maskPreview: canvas.dataset.maskPreview,
      requestedLensCount: canvas.dataset.lensRequestedCount,
      requestedShape: canvas.dataset.dispersionRequestedShape,
      progress: canvas.dataset.dispersionProgress,
    });
  });
}

async function dragLensCount({
  page,
}: ToolcraftPerformancePathActionContext): Promise<void> {
  const field = await control(page, "lens.count");
  const slider = field.locator("[data-base-ui-slider-control]").first();
  await slider.scrollIntoViewIfNeeded();
  const box = await slider.boundingBox();
  if (!box) throw new Error("Could not measure the Lens Count slider.");
  const thumb = field.getByRole("slider").first();
  const minimum = Number(
    (await thumb.getAttribute("aria-valuemin")) ??
      (await thumb.getAttribute("min")),
  );
  const maximum = Number(
    (await thumb.getAttribute("aria-valuemax")) ??
      (await thumb.getAttribute("max")),
  );
  const current = Number(await thumb.getAttribute("aria-valuenow"));
  const target = current >= maximum - 1 ? maximum - 2 : maximum;
  const ratioFor = (value: number) =>
    (value - minimum) / Math.max(1, maximum - minimum);
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * ratioFor(current), y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * ratioFor(target), y);
  await page.mouse.up();
  await expect(thumb).toHaveAttribute("aria-valuenow", String(target));
}

async function changeLensFrame({
  page,
  phase,
}: ToolcraftPerformancePathActionContext): Promise<void> {
  const field = await control(page, "frame.shape");
  const label = phase === "cold" ? "Rectangle" : phase === "warm" ? "Circle" : "Rounded";
  await field.getByRole("button", { name: label, exact: true }).click();
}

async function verifyLensCountRendered({
  page,
}: ToolcraftPerformancePathActionContext): Promise<void> {
  const count = await readSlider(page, "lens.count");
  await expect(page.locator(outputSelector)).toHaveAttribute(
    "data-lens-count",
    String(count),
    { timeout: 15_000 },
  );
}

async function verifyRequestedShapeRendered({
  page,
}: ToolcraftPerformancePathActionContext): Promise<void> {
  const canvas = page.locator(outputSelector);
  const shape = await canvas.getAttribute("data-dispersion-requested-shape");
  if (!shape) throw new Error("The requested dispersion shape is unavailable.");
  await expect(canvas).toHaveAttribute("data-dispersion-shape", shape, {
    timeout: 15_000,
  });
}

async function changeNonRenderingControl({
  page,
}: ToolcraftPerformancePathActionContext): Promise<void> {
  const current = await selectedOption(page, "export.image.format");
  await chooseOption(
    page,
    "export.image.format",
    current.includes("JPG") ? "PNG" : "JPG",
  );
}

async function playTimeline({ page }: ToolcraftPerformancePathActionContext): Promise<void> {
  const play = page.getByRole("button", { name: "Play playback" });
  if ((await play.count()) > 0) await play.click();
  await page.waitForTimeout(120);
  const pause = page.getByRole("button", { name: "Pause playback" });
  if ((await pause.count()) > 0) await pause.click();
}

async function scrubTimeline({
  page,
  phase,
}: ToolcraftPerformancePathActionContext): Promise<void> {
  const slider = await ensureTimeline(page);
  const box = await slider.boundingBox();
  if (!box) throw new Error("Could not measure the dispersion timeline.");
  const ratio = phase === "cold" ? 0.24 : phase === "warm" ? 0.56 : 0.82;
  await slider.click({ position: { x: box.width * ratio, y: box.height / 2 } });
}

const paths = deriveToolcraftPerformancePaths(appSchema, appPerformance);

function adapterForPath(
  path: (typeof paths)[number],
): ToolcraftPerformancePathAdapter {
  const lensWorkload = path.workloadDimensions.includes("lens-samples");
  const base = {
    pathId: path.id,
    prepare: (page: Page) => prepare(page, lensWorkload),
    ...(path.workloadDimensions.length > 0
      ? {
          fixtureApplications: (page: Page) =>
            fixtureApplications(page, path.workloadDimensions),
        }
      : {}),
  } as const;

  switch (path.interaction) {
    case "export":
      return {
        ...base,
        output: {
          kind: "download",
          label: "Export PNG",
          verify: async (download) => {
            expect(await download.failure()).toBeNull();
            expect(download.suggestedFilename()).toMatch(/\.(png|jpg)$/u);
            expect(await download.path()).toBeTruthy();
          },
        },
      };
    case "initial-render":
      return {
        ...base,
        action: async ({ page }) => {
          await page.reload();
          await expect(page.locator(outputSelector)).toHaveAttribute(
            "data-lens-distortion",
            "on",
          );
        },
      };
    case "animation-frame":
    case "timeline-playback":
      return {
        ...base,
        action: playTimeline,
        observeOutcome: ({ page }) => outputSignature(page),
      };
    case "timeline-scrub":
      return {
        ...base,
        action: scrubTimeline,
        observeOutcome: ({ page }) => outputSignature(page),
      };
    case "control-drag":
      return {
        ...base,
        action: dragLensCount,
        observeOutcome: ({ page }) => outputSignature(page),
        verifyOutcome: verifyLensCountRendered,
      };
    case "control-change":
      return path.invalidates.length > 0
        ? {
            ...base,
            action: changeLensFrame,
            observeOutcome: ({ page }) => outputSignature(page),
            verifyOutcome: verifyRequestedShapeRendered,
          }
        : {
            ...base,
            action: changeNonRenderingControl,
            observeOutcome: ({ page }) =>
              selectedOption(page, "export.image.format"),
          };
    case "viewport-drag":
      return {
        ...base,
        action: ({ page }) => dragToolcraftCanvasViewport(page),
      };
    case "viewport-zoom":
      return {
        ...base,
        action: ({ page }) => zoomToolcraftCanvasViewport(page, 1),
      };
    default:
      throw new Error(
        `Unsupported Dispersion performance path: ${path.interaction}`,
      );
  }
}

export const appPerformanceCanvasBacking: ToolcraftPerformanceCanvasBacking = {
  canvasSelector: outputSelector,
};

export const appPerformancePathAdapters = paths.map(adapterForPath);
