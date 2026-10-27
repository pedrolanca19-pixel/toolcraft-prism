import type { Page } from "@playwright/test";

import { getDispersionAcceptanceId } from "../src/app/app-acceptance-data";
import { dispersionTargets } from "../src/app/dispersion/dispersion-values";
import {
  expectToolcraftInfinityCanvasModeEvidence,
  observeInfinityCanvas,
} from "./browser-infinity-canvas-evidence";
import { expectToolcraftCanvasRenderScaleEvidence } from "./browser-render-scale-evidence";
import {
  expectToolcraftPersistenceState,
  expectToolcraftViewportSideEffect,
} from "./browser-state-evidence-helpers";
import {
  readToolcraftBrowserObservation,
  runToolcraftBrowserAction,
} from "./browser-proof-session";
import { expectToolcraftDiscreteSliderMarkers } from "./performance-control-layout-helpers";
import { expect } from "./toolcraft-product-test";
import {
  canvasSelector,
  chooseOption,
  ensureTimelineVisible,
  pausePlayback,
  playPlayback,
  setTextControl,
  setTimelineDuration,
  type ProofSession,
} from "./dispersion-browser-helpers";

export async function proveRenderScale(page: Page): Promise<void> {
  const renderScale = page
    .locator('[data-toolcraft-control-target="canvas.renderScale"]')
    .getByRole("slider");
  await expectToolcraftCanvasRenderScaleEvidence(page, {
    canvasSelector,
    requirementId: getDispersionAcceptanceId("canvas.renderScale"),
    selectedScale: 2,
    stateTransitions: [
      {
        run: async () => {
          await renderScale.focus();
          await renderScale.press("End");
          await expect(page.locator(canvasSelector)).toHaveAttribute(
            "data-render-scale",
            "2",
          );
        },
        state: "interaction",
      },
      {
        run: async () => {
          await playPlayback(page);
          await page.waitForTimeout(140);
        },
        state: "playback",
      },
      {
        run: async () => {
          await pausePlayback(page);
          await page.waitForTimeout(140);
        },
        state: "steady",
      },
    ],
    target: "canvas.renderScale",
  });
  await expectToolcraftDiscreteSliderMarkers(
    page,
    "canvas.renderScale",
    getDispersionAcceptanceId("canvas.renderScale"),
  );
}

export async function proveInfinityMode(
  page: Page,
  session: ProofSession,
): Promise<void> {
  await page
    .locator(`[data-toolcraft-control-target="${dispersionTargets.shape}"]`)
    .getByRole("button", { name: "Rounded", exact: true })
    .click();
  const infinity = page
    .locator('[data-toolcraft-control-target="canvas.infinity"]')
    .getByRole("switch");
  if (await infinity.isChecked()) await infinity.click();
  const before = await observeInfinityCanvas(page);
  await infinity.click();
  const enabled = await observeInfinityCanvas(page);
  const viewport = page.getByRole("application", { name: "Canvas viewport" });
  const box = await viewport.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.35, box!.y + box!.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width * 0.35 + 52,
    box!.y + box!.height * 0.5 - 34,
    { steps: 8 },
  );
  await page.mouse.up();
  const afterPan = await observeInfinityCanvas(page);
  await expect(page.locator('[data-slot="toolcraft-runtime-app"]')).toHaveAttribute(
    "data-toolcraft-persistence-status",
    "success",
  );
  await runToolcraftBrowserAction(session.reload(), "reload");
  await expect(page.locator(canvasSelector)).toBeVisible();
  const afterReload = await observeInfinityCanvas(page);
  const restoredSwitch = page
    .locator('[data-toolcraft-control-target="canvas.infinity"]')
    .getByRole("switch");
  await restoredSwitch.click();
  const restored = await observeInfinityCanvas(page);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  const undone = await observeInfinityCanvas(page);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  const redone = await observeInfinityCanvas(page);
  await expectToolcraftInfinityCanvasModeEvidence(
    { afterPan, afterReload, before, enabled, redone, restored, undone },
    {
      expectedFiniteSize: { height: 1080, width: 1920 },
      expectedSceneRect: { height: 1080, width: 1920, x: -960, y: -540 },
      requirementId: getDispersionAcceptanceId(
        "canvas.infinity.mode-and-restoration",
      ),
      target: "canvas.infinity",
    },
  );
}

export async function provePersistence(
  page: Page,
  session: ProofSession,
): Promise<void> {
  const persistence = session.observe((root) => {
    const mode = root.querySelector<HTMLElement>(
      '[data-toolcraft-control-target="dispersion.mode"] [data-slot="select-value"]',
    );
    const width = root.querySelector<HTMLInputElement>(
      '[data-toolcraft-control-target="canvas.size.width"] input',
    );
    const height = root.querySelector<HTMLInputElement>(
      '[data-toolcraft-control-target="canvas.size.height"] input',
    );
    const duration = Array.from(root.querySelectorAll<HTMLElement>('[role="slider"]')).find(
      (candidate) => candidate.getAttribute("aria-label") === "Playback position",
    );
    const extended = root.querySelector<HTMLElement>(
      '[data-toolcraft-control-target="panels.timeline.extended"] [role="switch"]',
    );
    return {
      duration: Number(duration?.getAttribute("aria-valuemax") ?? 0),
      extended: extended?.getAttribute("aria-checked") === "true",
      height: Number(height?.value ?? 0),
      mode: mode?.textContent?.trim() ?? "",
      width: Number(width?.value ?? 0),
    };
  });
  const expected = {
    duration: 7,
    extended: true,
    height: 960,
    mode: "Edge Glass",
    width: 1440,
  };
  await expectToolcraftPersistenceState(
    persistence,
    session.targetAction("canvas.size.width", async (currentPage) => {
      await chooseOption(
        currentPage,
        currentPage.locator(
          `[data-toolcraft-control-target="${dispersionTargets.mode}"]`,
        ),
        "Edge Glass",
      );
      await setTextControl(
        currentPage.locator('[data-toolcraft-control-target="canvas.size.width"]'),
        "1440",
      );
      await setTextControl(
        currentPage.locator('[data-toolcraft-control-target="canvas.size.height"]'),
        "960",
      );
      await ensureTimelineVisible(currentPage);
      await setTimelineDuration(currentPage, 7);
    }),
    session.reload(),
    expected,
    {
      requirementId: getDispersionAcceptanceId("runtime.persistence.reload"),
      stabilityIntervalMs: 120,
      timeoutMs: 30_000,
      assertRestoredOutput: async () => {
        await expect(page.locator(canvasSelector)).toHaveAttribute(
          "data-dispersion-mode",
          "edge",
        );
      },
    },
  );
}

export async function proveViewport(
  page: Page,
  session: ProofSession,
): Promise<void> {
  const viewport = session.observe((root) => {
    const world = root.querySelector<HTMLElement>("[data-toolcraft-canvas-world]");
    const canvas = root.querySelector<HTMLCanvasElement>(
      'canvas[data-dispersion-canvas="true"]',
    );
    return {
      offsetX: Number(world?.dataset.toolcraftCanvasOffsetX ?? 0),
      offsetY: Number(world?.dataset.toolcraftCanvasOffsetY ?? 0),
      outputHeight: Number(canvas?.style.height.replace("px", "") ?? 0),
      outputWidth: Number(canvas?.style.width.replace("px", "") ?? 0),
      zoom: Number(world?.dataset.toolcraftCanvasZoom ?? 1),
    };
  });
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  const zoomed = await readToolcraftBrowserObservation(viewport);
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await expectToolcraftViewportSideEffect(
    viewport,
    session.targetAction("canvas.viewport", (currentPage) =>
      currentPage.getByRole("button", { name: "Zoom in", exact: true }).click(),
    ),
    zoomed,
    {
      requirementId: getDispersionAcceptanceId("runtime.canvas.viewport"),
      stabilityIntervalMs: 80,
    },
  );
}
