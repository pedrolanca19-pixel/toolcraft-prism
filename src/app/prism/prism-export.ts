import type { ToolcraftProductExportRenderer } from "@/toolcraft/runtime";

import { createPrismGl, type PrismGl } from "./prism-gl";
import { readPrismSettings } from "./prism-settings";

type ExportResource = Readonly<{ canvas: HTMLCanvasElement; gl: PrismGl }>;

let cached: ExportResource | null = null;
let releaseTimer = 0;

function acquire(): ExportResource {
  window.clearTimeout(releaseTimer);
  if (!cached) {
    const canvas = document.createElement("canvas");
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
  renderFrame({ context, frame, pixelRatio, signal, state, timelineProgress }) {
    signal.throwIfAborted();
    const settings = readPrismSettings(state.values);
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
  },
} satisfies ToolcraftProductExportRenderer;
