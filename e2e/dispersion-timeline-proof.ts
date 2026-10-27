import type { Page } from "@playwright/test";

import { getDispersionAcceptanceId } from "../src/app/app-acceptance-data";
import { readToolcraftBrowserObservation } from "./browser-proof-session";
import {
  expectToolcraftTimelineDuration,
  expectToolcraftTimelineLoop,
  expectToolcraftTimelinePauseResume,
  expectToolcraftTimelineRenderedFrame,
  expectToolcraftTimelineScrub,
  type ToolcraftTimelineLoopCycleProof,
} from "./browser-timeline-evidence-helpers";
import { expect } from "./toolcraft-product-test";
import {
  canvasHash,
  canvasSelector,
  ensureTimelineVisible,
  pausePlayback,
  playPlayback,
  setTimelineDuration,
  setTimelineFraction,
  type ProofSession,
} from "./dispersion-browser-helpers";

async function collectTimelineLoopCycle(
  page: Page,
  durationSeconds: number,
): Promise<ToolcraftTimelineLoopCycleProof> {
  const normalizedPhases: number[] = [];
  for (const phase of [0, 0.25, 0.5, 0.75, 0.99, 0.01]) {
    await setTimelineFraction(page, phase);
    normalizedPhases.push(
      Number(
        await page.locator(canvasSelector).getAttribute("data-dispersion-progress"),
      ),
    );
  }
  await setTimelineFraction(page, 0);
  const seamStartSignature = await canvasHash(page);
  const slider = page.getByRole("slider", {
    name: "Playback position",
    exact: true,
  });
  await slider.focus();
  await slider.press("End");
  await expect(page.locator(canvasSelector)).toHaveAttribute(
    "data-dispersion-progress",
    "0.000000",
  );
  const seamEndSignature = await canvasHash(page);
  return {
    durationSeconds,
    normalizedPhases,
    seamEndSignature,
    seamStartSignature,
  };
}

function observeTimelineFrame(session: ProofSession) {
  return session.observe(async (root) => {
    const slider = Array.from(root.querySelectorAll<HTMLElement>('[role="slider"]')).find(
      (candidate) => candidate.getAttribute("aria-label") === "Playback position",
    );
    const source = root.querySelector<HTMLCanvasElement>(
      'canvas[data-dispersion-canvas="true"]',
    );
    const sample = document.createElement("canvas");
    sample.width = 72;
    sample.height = 40;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (context && source) context.drawImage(source, 0, 0, 72, 40);
    const bytes =
      context?.getImageData(0, 0, 72, 40).data ?? new Uint8ClampedArray();
    let hash = 2166136261;
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
    return {
      currentTimeSeconds: Number(slider?.getAttribute("aria-valuenow") ?? 0),
      outputSignature: hash.toString(16),
    };
  });
}

export async function proveTimeline(
  page: Page,
  session: ProofSession,
): Promise<void> {
  await ensureTimelineVisible(page);
  await pausePlayback(page);
  await setTimelineDuration(page, 8);
  const observation = observeTimelineFrame(session);

  await setTimelineFraction(page, 0.5);
  const expectedHalf = await readToolcraftBrowserObservation(observation);
  await setTimelineFraction(page, 0);
  await expectToolcraftTimelineScrub(
    observation,
    session.targetAction("runtime.timeline", (currentPage) =>
      setTimelineFraction(currentPage, 0.5),
    ),
    expectedHalf,
    {
      requirementId: getDispersionAcceptanceId("runtime.timeline.playback"),
      stabilityIntervalMs: 80,
    },
  );

  await setTimelineFraction(page, 0.25);
  const expectedQuarter = await readToolcraftBrowserObservation(observation);
  await setTimelineFraction(page, 0);
  await expectToolcraftTimelineRenderedFrame(
    observation,
    session.targetAction("runtime.timeline", (currentPage) =>
      setTimelineFraction(currentPage, 0.25),
    ),
    expectedQuarter,
    {
      requirementId: getDispersionAcceptanceId("runtime.timeline.playback"),
      stabilityIntervalMs: 80,
    },
  );

  const initialCycle = await collectTimelineLoopCycle(page, 8);
  const durationObservation = session.observe((root) => {
    const slider = Array.from(root.querySelectorAll<HTMLElement>('[role="slider"]')).find(
      (candidate) => candidate.getAttribute("aria-label") === "Playback position",
    );
    const duration = Number(slider?.getAttribute("aria-valuemax") ?? 0);
    return {
      renderedCycleDurationSeconds: duration,
      timelineDurationSeconds: duration,
    };
  });
  await expectToolcraftTimelineDuration(
    durationObservation,
    session.targetAction("runtime.timeline", (currentPage) =>
      setTimelineDuration(currentPage, 6),
    ),
    6,
    {
      requirementId: getDispersionAcceptanceId("runtime.timeline.playback"),
      stabilityIntervalMs: 80,
    },
  );
  const resizedCycle = await collectTimelineLoopCycle(page, 6);
  await page.locator('[data-slot="toolcraft-runtime-app"]').evaluate(
    (root, proof) => {
      root.setAttribute("data-dispersion-loop-proof", JSON.stringify(proof));
    },
    { initial: initialCycle, resized: resizedCycle },
  );
  await expectToolcraftTimelineLoop(
    session.observe((root) =>
      JSON.parse(root.getAttribute("data-dispersion-loop-proof") ?? "{}"),
    ),
    {
      requirementId: getDispersionAcceptanceId("runtime.timeline.playback"),
    },
  );

  await playPlayback(page);
  const playbackObservation = session.observe(async (root) => {
    const source = root.querySelector<HTMLCanvasElement>(
      'canvas[data-dispersion-canvas="true"]',
    );
    const progress = Number(source?.dataset.dispersionProgress ?? 0);
    const durationSlider = Array.from(
      root.querySelectorAll<HTMLElement>('[role="slider"]'),
    ).find((candidate) => candidate.getAttribute("aria-label") === "Playback position");
    const sample = document.createElement("canvas");
    sample.width = 72;
    sample.height = 40;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (context && source) context.drawImage(source, 0, 0, 72, 40);
    const bytes =
      context?.getImageData(0, 0, 72, 40).data ?? new Uint8ClampedArray();
    let hash = 2166136261;
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
    return {
      currentTimeSeconds:
        progress * Number(durationSlider?.getAttribute("aria-valuemax") ?? 0),
      outputSignature: hash.toString(16),
      playing: root.querySelector('[aria-label="Pause playback"]') !== null,
    };
  });
  await expectToolcraftTimelinePauseResume(
    playbackObservation,
    session.targetAction("runtime.timeline", (currentPage) => pausePlayback(currentPage)),
    session.targetAction("runtime.timeline", (currentPage) => playPlayback(currentPage)),
    {
      requirementId: getDispersionAcceptanceId("runtime.timeline.playback"),
      pauseWindowMs: 140,
      stabilityIntervalMs: 80,
      timeoutMs: 20_000,
    },
  );
  await pausePlayback(page);
}
