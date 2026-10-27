import type { ToolcraftProductExportRenderer } from "@/toolcraft/runtime";

import { dispersionPipelinePasses } from "./dispersion-pipeline";
import {
  dispersionTargets,
  readDispersionSettings,
} from "./dispersion-values";
import type { DispersionGlFrame } from "./dispersion-webgl";

export type DispersionExportProvider = Readonly<{
  snapshot(frame: DispersionGlFrame): Promise<ImageBitmap>;
}>;

let activeProvider: DispersionExportProvider | null = null;

function traceOutputMask(
  context: CanvasRenderingContext2D,
  frame: Readonly<{ height: number; width: number; x: number; y: number }>,
  settings: ReturnType<typeof readDispersionSettings>,
): void {
  const { height, width, x, y } = frame;
  context.beginPath();
  if (settings.shape === "circle") {
    context.arc(
      x + width / 2,
      y + height / 2,
      Math.min(width, height) / 2,
      0,
      Math.PI * 2,
    );
    context.closePath();
    return;
  }
  if (settings.shape !== "rounded") {
    context.rect(x, y, width, height);
    return;
  }

  const radius = Math.min(
    Math.min(width, height) / 2,
    (Math.min(width, height) * settings.cornerRadius) / 100,
  );
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height,
  );
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

export function registerDispersionExportProvider(
  provider: DispersionExportProvider,
): () => void {
  activeProvider = provider;
  return () => {
    if (activeProvider === provider) activeProvider = null;
  };
}

export const dispersionExportRenderer = {
  baseFileName: "prism-flow",
  async renderFrame({
    context,
    frame,
    pixelRatio,
    rendererPipeline,
    state,
    timelineProgress,
  }) {
    const settings = readDispersionSettings(state);
    const isJpeg = state.values[dispersionTargets.imageFormat] === "jpg";
    const render = async () => {
      if (!activeProvider) {
        throw new Error("The dispersion WebGL renderer is not ready for export.");
      }
      const bitmap = await activeProvider.snapshot({
        height: Math.max(1, Math.round(frame.height * pixelRatio)),
        includeBackground: settings.includeBackground || isJpeg,
        loopSeconds: state.timeline.durationSeconds,
        maskPreview: false,
        opaqueOutside: isJpeg,
        progress: timelineProgress,
        settings,
        width: Math.max(1, Math.round(frame.width * pixelRatio)),
      });
      try {
        context.clearRect(frame.x, frame.y, frame.width, frame.height);
        if (isJpeg) {
          context.fillStyle = settings.background;
          context.fillRect(frame.x, frame.y, frame.width, frame.height);
        }
        context.save();
        try {
          traceOutputMask(context, frame, settings);
          context.clip();
          context.drawImage(
            bitmap,
            frame.x,
            frame.y,
            frame.width,
            frame.height,
          );
        } finally {
          context.restore();
        }
      } finally {
        bitmap.close();
      }
    };

    if (rendererPipeline) {
      await rendererPipeline.runPass(
        dispersionPipelinePasses.imageExport,
        undefined,
        render,
      );
      return;
    }
    await render();
  },
} satisfies ToolcraftProductExportRenderer;
