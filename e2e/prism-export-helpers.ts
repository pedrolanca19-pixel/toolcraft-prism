import type { Download, Page } from "@playwright/test";

import {
  getToolcraftRgbaDistance,
  TOOLCRAFT_DECODED_OBSERVATION_SIZE,
  type ToolcraftDecodedPixelObservation,
  type ToolcraftExpectedDecodedPixel,
  type ToolcraftExpectedDecodedVideoSample,
} from "./decoded-pixel-observation";
import { inspectToolcraftImageDownload, type ToolcraftInspectedImageArtifact } from "./image-artifact-inspection";
import {
  inspectToolcraftVideoDownload,
  type ToolcraftInspectedVideoArtifact,
  type ToolcraftScheduledVideoFrame,
} from "./video-artifact-inspection";
import { createToolcraftVideoFrameSchedule } from "../src/toolcraft/runtime/export/video-frame-schedule";
import { canvasSelector } from "./prism-browser-helpers";

/** The fixture workspace paints #04050A behind the sheet. */
export const FIXTURE_BACKGROUND_RGBA = [4, 5, 10, 255] as const;

const SAMPLE_RATIOS: readonly (readonly [number, number])[] = [
  [0.2, 0.25], [0.5, 0.25], [0.8, 0.25], [0.35, 0.55], [0.65, 0.55], [0.2, 0.8], [0.5, 0.8], [0.8, 0.8],
];

export function pixelAt(
  observation: ToolcraftDecodedPixelObservation,
  xRatio: number,
  yRatio: number,
): readonly [number, number, number, number] {
  const size = TOOLCRAFT_DECODED_OBSERVATION_SIZE;
  const x = Math.min(size - 1, Math.floor(xRatio * size));
  const y = Math.min(size - 1, Math.floor(yRatio * size));
  const offset = (y * size + x) * 4;
  const { normalizedPixels: p } = observation;
  return [p[offset]!, p[offset + 1]!, p[offset + 2]!, p[offset + 3]!];
}

export function expectedPixelsFrom(
  observation: ToolcraftDecodedPixelObservation,
): readonly ToolcraftExpectedDecodedPixel[] {
  return SAMPLE_RATIOS.map(([xRatio, yRatio]) => ({
    rgba: pixelAt(observation, xRatio, yRatio),
    xRatio,
    yRatio,
  }));
}

export async function inspectImage(
  page: Page,
  download: Download,
): Promise<ToolcraftInspectedImageArtifact> {
  return inspectToolcraftImageDownload({
    backgroundRgba: FIXTURE_BACKGROUND_RGBA,
    download,
    page,
  });
}

const BLOCKS = 8;

function blockMeans(pixels: ArrayLike<number>, size: number): number[] {
  const step = size / BLOCKS;
  const means = new Array<number>(BLOCKS * BLOCKS * 3).fill(0);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const block = (Math.floor(y / step) * BLOCKS + Math.floor(x / step)) * 3;
      for (let channel = 0; channel < 3; channel += 1) {
        means[block + channel]! += pixels[(y * size + x) * 4 + channel]! / (step * step);
      }
    }
  }
  return means;
}

/**
 * Mean RGB distance between the exported image and the live canvas, compared as 8×8 block
 * averages so per-pixel grain and sampling density do not count as a difference.
 */
export async function meanDistanceToPreview(
  page: Page,
  observation: ToolcraftDecodedPixelObservation,
): Promise<number> {
  const size = TOOLCRAFT_DECODED_OBSERVATION_SIZE;
  const preview = await page.locator(canvasSelector).evaluate((node, [gridSize, [red, green, blue]]) => {
    const source = node as HTMLCanvasElement;
    const sample = document.createElement("canvas");
    sample.width = gridSize;
    sample.height = gridSize;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Unable to sample the preview canvas.");
    // The canvas is translucent; the runtime Background sits behind it, as in the export.
    context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
    context.fillRect(0, 0, gridSize, gridSize);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, gridSize, gridSize);
    return Array.from(context.getImageData(0, 0, gridSize, gridSize).data);
  }, [size, FIXTURE_BACKGROUND_RGBA] as const);
  const exported = blockMeans(observation.normalizedPixels, size);
  const live = blockMeans(preview, size);
  let total = 0;
  for (let block = 0; block < BLOCKS * BLOCKS; block += 1) {
    total += getToolcraftRgbaDistance(
      exported.slice(block * 3, block * 3 + 3),
      live.slice(block * 3, block * 3 + 3),
    );
  }
  return total / (BLOCKS * BLOCKS);
}

export function videoSchedule(durationSeconds: number): readonly ToolcraftScheduledVideoFrame[] {
  return createToolcraftVideoFrameSchedule(durationSeconds);
}

export async function inspectVideo(
  page: Page,
  download: Download,
  durationSeconds: number,
): Promise<ToolcraftInspectedVideoArtifact> {
  return inspectToolcraftVideoDownload({
    backgroundRgba: FIXTURE_BACKGROUND_RGBA,
    download,
    page,
    schedule: videoSchedule(durationSeconds),
  });
}

export function expectedSamplesFrom(
  inspected: ToolcraftInspectedVideoArtifact,
): readonly ToolcraftExpectedDecodedVideoSample[] {
  return inspected.sampleTimes.map((timeSeconds, index) => ({
    pixels: expectedPixelsFrom(inspected.observations[index]!),
    timeSeconds,
  }));
}
