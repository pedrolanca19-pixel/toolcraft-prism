import type { Download, Locator, Page } from "@playwright/test";

import {
  getToolcraftApplicabilityRequirementId,
  getToolcraftControlApplicabilityCases,
  type ToolcraftControlApplicabilityCase,
} from "../src/app/app-acceptance";
import { appControlSectionInventory } from "../src/app/app-acceptance-data";
import { appSchema } from "../src/app/app-schema";
import { PRISM_ENTRIES, PRISM_KEYS, prismTarget, type PrismKey } from "../src/app/prism/prism-table";
import { expectToolcraftControlApplicabilityState } from "./browser-control-applicability-evidence";
import {
  createToolcraftBrowserProofSession,
  readToolcraftBrowserObservation,
  type ToolcraftBrowserProofSession,
} from "./browser-proof-session";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { expect } from "./toolcraft-product-test";

export type ProofSession = ToolcraftBrowserProofSession;

export const canvasSelector = 'canvas[data-prism-canvas="true"]';
export const surfaceSelector = '[data-prism-surface="true"]';
/** Fixture canvas: small enough for software GL, large enough to show the sheet. */
/** Off the loop seam so motion controls that scale the phase (cycles, fold speed, hue drift) change the frame. */
export const FIXTURE_TIME_SECONDS = 7.4;
export const FIXTURE_SIZE = { height: 90, width: 160 } as const;

const PANEL_SECTION_IDS = [
  "runtime.setup", "runtime.image-export", "runtime.video-export", "presets", "motion", "folds",
  "surface", "lighting", "highlights", "spectrum", "refraction", "glow", "placement", "ribs", "mask",
  "backdrop", "finish",
] as const;

/** Section ids that keep their controls rendered; every other section starts collapsed. */
export type OpenSections = readonly string[] | "all";

function fixtureWorkspace(
  openSections: OpenSections,
  overrides: Readonly<Record<string, unknown>>,
  durationSeconds: number,
): string {
  const collapsedSections: Record<string, boolean> = {};
  if (openSections !== "all") {
    for (const id of PANEL_SECTION_IDS) {
      if (!openSections.includes(id)) collapsedSections[id] = true;
    }
  }
  const values: Record<string, unknown> = {
    "appearance.background": "#04050A",
    "canvas.aspectRatio": { height: 9, mode: "preset", value: "16:9", width: 16 },
    "canvas.renderScale": 1,
    "canvas.size.height": FIXTURE_SIZE.height,
    "canvas.size.width": FIXTURE_SIZE.width,
    "canvas.workspaceBackground": "dots",
    "export.image.format": "png",
    "export.image.resolution": "2k",
    "export.includeBackground": true,
    "export.video.format": "webm",
    "export.video.resolution": "current",
  };
  for (const key of PRISM_KEYS) values[prismTarget(key)] = PRISM_ENTRIES[key].def;
  Object.assign(values, overrides);
  const offset = { x: 0, y: 0 };
  return JSON.stringify({
    state: {
      canvas: {
        mode: "finite",
        offset,
        size: { ...FIXTURE_SIZE, unit: "px" },
        zoom: 100,
      },
      panels: {
        controls: { collapsedSections, offset },
        layers: { offset },
        timeline: { offset },
        toolbar: { offset },
      },
      timeline: {
        currentTimeSeconds: Math.min(FIXTURE_TIME_SECONDS, durationSeconds / 2),
        durationSeconds,
        expanded: false,
        isLooping: true,
        isPlaying: false,
        keyframeGroups: [],
        selectedKeyframeId: null,
      },
      values,
    },
    version: 2,
  });
}

function persistenceKey(): string {
  if (appSchema.persistence.storage !== "localStorage") {
    throw new Error("Prism Field persists its workspace in localStorage.");
  }
  return appSchema.persistence.key;
}

/**
 * Opens the app on a paused 160×90 fixture workspace. The workspace is written
 * once per browser context so a later real reload keeps the user's edits.
 */
export async function openProof(
  page: Page,
  openSections: OpenSections = "all",
  overrides: Readonly<Record<string, unknown>> = {},
  durationSeconds = 20,
): Promise<ProofSession> {
  page.setDefaultTimeout(60_000);
  const key = persistenceKey();
  const workspace = fixtureWorkspace(openSections, overrides, durationSeconds);
  await page.addInitScript(
    ([storageKey, snapshot]) => {
      if (window.localStorage.getItem(storageKey as string) === null) {
        window.localStorage.setItem(storageKey as string, snapshot as string);
      }
    },
    [key, workspace],
  );
  let lastNavigation = Date.now();
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) lastNavigation = Date.now();
  });
  await page.goto("/", { waitUntil: "networkidle" });
  // Vite's dev server may reload once more after its first dependency refresh; wait
  // for the page to stay put before the proof session binds to the runtime root.
  await expect
    .poll(
      async () =>
        Date.now() - lastNavigation > 3_000 &&
        (await page.locator('[data-slot="toolcraft-runtime-app"]').count()) === 1,
      { timeout: 90_000 },
    )
    .toBe(true);
  const session = await createToolcraftBrowserProofSession(page);
  const canvas = page.locator(canvasSelector);
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-prism-engine", "webgl2");
  await expect(canvas).toHaveAttribute("data-prism-progress", /.+/);
  return session;
}

export async function pausePlayback(page: Page): Promise<void> {
  const pause = page.getByRole("button", { name: "Pause playback", exact: true });
  if ((await pause.count()) === 1) await pause.click({ force: true });
}

export async function playPlayback(page: Page): Promise<void> {
  const play = page.getByRole("button", { name: "Play playback", exact: true });
  if ((await play.count()) === 1) await play.click({ force: true });
}

export async function ensureTimelineVisible(page: Page): Promise<void> {
  const slider = page.getByRole("slider", { name: "Playback position", exact: true });
  if ((await slider.count()) === 1) return;
  await page
    .locator('[data-toolcraft-control-target="panels.timeline.extended"]')
    .getByRole("switch")
    .click();
  await expect(slider).toBeVisible();
}

export async function setTimelineFraction(page: Page, fraction: number): Promise<void> {
  await ensureTimelineVisible(page);
  const slider = page.getByRole("slider", { name: "Playback position", exact: true });
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
    .poll(async () => Number(await page.locator(canvasSelector).getAttribute("data-prism-progress")))
    .toBeCloseTo(fraction, 1);
}

export async function setTimelineDuration(page: Page, seconds: number): Promise<void> {
  await ensureTimelineVisible(page);
  await page.getByRole("button", { name: "Edit timeline duration", exact: true }).click();
  const input = page.getByRole("textbox", { name: "timeline duration" });
  await input.fill(String(seconds));
  await input.press("Enter");
}

export async function chooseOption(page: Page, control: Locator, label: string): Promise<void> {
  const combobox = control.getByRole("combobox");
  await combobox.scrollIntoViewIfNeeded();
  if ((await combobox.getAttribute("aria-expanded")) !== "true") await combobox.click();
  const option = page.locator('[data-slot="select-item"]').filter({ hasText: label }).last();
  await expect(option).toBeVisible();
  await option.click();
}

export async function setTextControl(control: Locator, value: string): Promise<void> {
  const input = control.locator("input").first();
  await input.fill(value);
  await input.press("Enter");
}

export function controlField(page: Page, target: string): Locator {
  return page.locator(`[data-toolcraft-control-target="${target}"]`);
}

export async function canvasHash(page: Page): Promise<string> {
  return page.locator(canvasSelector).evaluate((node) => {
    const source = node as HTMLCanvasElement;
    const sample = document.createElement("canvas");
    sample.width = 80;
    sample.height = 45;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) return "missing-context";
    context.drawImage(source, 0, 0, sample.width, sample.height);
    const bytes = context.getImageData(0, 0, sample.width, sample.height).data;
    let hash = 2166136261;
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
    return hash.toString(16);
  });
}

export function applicabilityCases(target: string): readonly ToolcraftControlApplicabilityCase[] {
  return getToolcraftControlApplicabilityCases({
    schema: appSchema,
    sectionInventory: appControlSectionInventory,
    target,
  });
}

async function setSelectorCase(
  control: Locator,
  page: Page,
  applicabilityCase: ToolcraftControlApplicabilityCase,
): Promise<void> {
  switch (applicabilityCase.selectorControlType) {
    case "switch": {
      const toggle = control.getByRole("switch");
      if ((await toggle.getAttribute("aria-checked")) !== String(applicabilityCase.selectorValue)) {
        await toggle.click();
      }
      return;
    }
    case "select":
      await chooseOption(page, control, applicabilityCase.selectorOptionLabel ?? "");
      return;
    default:
      throw new Error(`Unsupported applicability selector ${applicabilityCase.selectorControlType}.`);
  }
}

export async function proveApplicabilityCase(
  session: ProofSession,
  baseRequirementId: string,
  applicabilityCase: ToolcraftControlApplicabilityCase,
): Promise<string> {
  await expectToolcraftControlApplicabilityState(
    session,
    session.controlAction(applicabilityCase.selectorTarget, (control, page) =>
      setSelectorCase(control, page, applicabilityCase),
    ),
    applicabilityCase,
    { baseRequirementId, timeoutMs: 15_000 },
  );
  return getToolcraftApplicabilityRequirementId(baseRequirementId, applicabilityCase);
}

export async function dragSlider(
  page: Page,
  target: string,
  options: Readonly<{ steps?: number }> = {},
): Promise<void> {
  const field = controlField(page, target);
  const slider = field.getByRole("slider").first();
  await slider.scrollIntoViewIfNeeded();
  await expect(slider).toBeVisible();
  // Base UI keeps aria-valuemin/max off the thumb, so the range comes from the control table.
  const entry = PRISM_ENTRIES[target.replace(/^prism\./u, "") as PrismKey];
  if (entry.kind !== "slider" && entry.kind !== "int") throw new Error(`${target} is not a slider.`);
  const current = Number(await slider.getAttribute("aria-valuenow"));
  const normalized = (current - entry.min) / Math.max(Number.EPSILON, entry.max - entry.min);
  const track = field.locator('[data-slot="slider-track"]').first();
  const thumb = field.locator('[data-slot="slider-thumb"]').first();
  const trackBox = await track.boundingBox();
  const thumbBox = await thumb.boundingBox();
  expect(trackBox).not.toBeNull();
  expect(thumbBox).not.toBeNull();
  const targetRatio = normalized < 0.55 ? 0.8 : 0.22;
  await page.mouse.move(thumbBox!.x + thumbBox!.width / 2, thumbBox!.y + thumbBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    trackBox!.x + trackBox!.width * targetRatio,
    trackBox!.y + trackBox!.height / 2,
    { steps: options.steps ?? 10 },
  );
  await page.mouse.up();
}

export async function proveSliderChange(
  session: ProofSession,
  target: string,
  requirementId: string = target,
): Promise<void> {
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction(target, (_control, page) => dragSlider(page, target)),
    {
      requirementId,
      selector: canvasSelector,
      stabilityIntervalMs: 80,
      timeoutMs: 30_000,
    },
  );
}

export async function proveSelectChange(
  session: ProofSession,
  target: string,
  label: string,
  requirementId: string = target,
): Promise<void> {
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction(target, (control, page) => chooseOption(page, control, label)),
    {
      requirementId,
      selector: canvasSelector,
      stabilityIntervalMs: 80,
      timeoutMs: 30_000,
    },
  );
}

export async function proveSwitchChange(
  session: ProofSession,
  target: string,
  requirementId: string = target,
): Promise<void> {
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction(target, (control) => control.getByRole("switch").click()),
    {
      requirementId,
      selector: canvasSelector,
      stabilityIntervalMs: 80,
      timeoutMs: 30_000,
    },
  );
}

export async function proveColorChange(
  session: ProofSession,
  target: string,
  hex: string,
  requirementId: string = target,
  selector: string = canvasSelector,
): Promise<void> {
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction(target, async (control) => {
      const input = control.locator('input[data-slot="input"]').first();
      await input.fill(hex);
      await input.blur();
    }),
    { requirementId, selector, stabilityIntervalMs: 80, timeoutMs: 30_000 },
  );
}

export async function exportImage(page: Page): Promise<Download> {
  const pending = page.waitForEvent("download", { timeout: 180_000 });
  await page.getByRole("button", { name: /^Export (PNG|JPG)$/u }).click();
  return pending;
}

export async function readObservation<T>(
  observation: Parameters<typeof readToolcraftBrowserObservation<T>>[0],
): Promise<T> {
  return readToolcraftBrowserObservation(observation);
}

/** Persisted Prism values; the workspace snapshot is rewritten after every committed change. */
export async function prismValuesSnapshot(page: Page): Promise<string> {
  const key = persistenceKey();
  return page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return "missing";
    const values = (JSON.parse(raw) as { state?: { values?: Record<string, unknown> } }).state?.values ?? {};
    return JSON.stringify(
      Object.keys(values)
        .filter((name) => name.startsWith("prism."))
        .sort()
        .map((name) => [name, values[name]]),
    );
  }, key);
}


export async function exportVideo(page: Page): Promise<Download> {
  const pending = page.waitForEvent("download", { timeout: 240_000 });
  await page.getByRole("button", { name: /^Export (WebM|MP4)$/u }).click();
  return pending;
}
