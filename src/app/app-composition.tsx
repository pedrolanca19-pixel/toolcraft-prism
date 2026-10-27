import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react";

import { appSchema } from "./app-schema";
import { dispersionExportRenderer } from "./dispersion/dispersion-export";
import { dispersionRendererPipelineRegistration } from "./dispersion/dispersion-pipeline";
import { DispersionRenderer } from "./dispersion/dispersion-renderer";
import { DispersionInfiniteViewport } from "./dispersion/dispersion-infinite-viewport";
import {
  dispersionTargets,
  readDispersionSettings,
} from "./dispersion/dispersion-values";

export const appComposition: ToolcraftAppComposition = {
  canvasContent: <DispersionRenderer />,
  infiniteCanvasContent: <DispersionInfiniteViewport />,
  exportRenderer: dispersionExportRenderer,
  modelPresentation: { mode: "runtime" },
  renderDefaultCanvasMedia: false,
  rendererPipelineRegistration: dispersionRendererPipelineRegistration,
  sceneBoundsProvider: ({ state }) => {
    const settings = readDispersionSettings(state);
    const isCircle =
      state.values[dispersionTargets.shape] === "circle" ||
      settings.shape === "circle";
    return [
      {
        height: 1080,
        width: isCircle ? 1080 : 1920,
        x: isCircle ? -540 : -960,
        y: -540,
      },
    ];
  },
  schema: appSchema,
};
