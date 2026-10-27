import type { ToolcraftProductExportRenderer } from "@/toolcraft/runtime";

import { createPrismGl, type PrismGl } from "./prism-gl";
import { prismPipelinePasses } from "./prism-pipeline";
import { readPrismSettings } from "./prism-settings";

type ExportResource = Readonly<{ canvas: OffscreenCanvas; gl: PrismGl }>;

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
    const render = (): void => {
      const { canvas, gl } = acquire();
      try {
        gl.render({
          height: Math.max(2, Math.round(frame.height * pixelRatio)),
          includeBackdrop: settings.includeBackground,
          progress: timelineProgress,
          settings,
          width: Math.max(2, Math.round(frame.width * pixelRatio)),
        });
        context.drawImage(canvas, frame.x, frame.y, frame.width, frame.height);
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
