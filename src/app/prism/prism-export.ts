import type { ToolcraftProductExportRenderer } from "@/toolcraft/runtime";

import { createPrismGl, type PrismGl } from "./prism-gl";
import { prismPipelinePasses } from "./prism-pipeline";
import { readPrismSettings } from "./prism-settings";

type ExportResource = Readonly<{ canvas: OffscreenCanvas; gl: PrismGl }>;

/** Browsers cap one WebGL drawing buffer near 33 megapixels; 4096 px tiles stay well inside it. */
const EXPORT_TILE_SIZE = 4096;

let cached: ExportResource | null = null;
let releaseTimer = 0;

function acquire(): ExportResource {
  window.clearTimeout(releaseTimer);
  if (!cached) {
    const canvas = new OffscreenCanvas(2, 2);
    cached = { canvas, gl: createPrismGl(canvas) };
  }
  return cached;
}

/** Frees the offscreen GL context shortly after the last export frame. */
function scheduleRelease(): void {
  window.clearTimeout(releaseTimer);
  releaseTimer = window.setTimeout(() => {
    cached?.gl.dispose();
    cached = null;
  }, 4000);
}

export const prismExportRenderer = {
  baseFileName: "prism-field",
  async renderFrame({
    context,
    frame,
    pixelRatio,
    rendererPipeline,
    signal,
    state,
    timelineProgress,
  }) {
    signal.throwIfAborted();
    const settings = readPrismSettings(state.values);
    const width = Math.max(2, Math.round(frame.width * pixelRatio));
    const height = Math.max(2, Math.round(frame.height * pixelRatio));
    const render = (): void => {
      const { canvas, gl } = acquire();
      try {
        gl.renderTiled(
          {
            height,
            includeBackdrop: settings.includeBackground,
            progress: timelineProgress,
            settings,
            width,
          },
          EXPORT_TILE_SIZE,
          (tile) => {
            // GL tiles start at the bottom-left; the 2D frame starts at the top-left.
            const top = height - tile.y - tile.height;
            context.drawImage(
              canvas,
              0,
              0,
              tile.width,
              tile.height,
              frame.x + (tile.x / width) * frame.width,
              frame.y + (top / height) * frame.height,
              (tile.width / width) * frame.width,
              (tile.height / height) * frame.height,
            );
          },
        );
      } finally {
        scheduleRelease();
      }
    };
    if (rendererPipeline) {
      await rendererPipeline.runPass(prismPipelinePasses.imageExport, undefined, render);
      return;
    }
    render();
  },
} satisfies ToolcraftProductExportRenderer;
