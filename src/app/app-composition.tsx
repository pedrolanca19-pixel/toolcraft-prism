import { getToolcraftFiniteArtboardRect } from "@/toolcraft/runtime";
import { composeToolcraftApp } from "@/toolcraft/runtime/react";

import { appSchema } from "./app-schema";
import { prismPanelActionHandler } from "./prism/prism-actions";
import { prismExportRenderer } from "./prism/prism-export";
import { PrismRenderer } from "./prism/prism-renderer";

export const appComposition = composeToolcraftApp(appSchema, {
  actions: { onPanelAction: prismPanelActionHandler },
  scene: {
    canvasContent: <PrismRenderer />,
    rasterFrameRenderer: prismExportRenderer,
    renderDefaultCanvasMedia: false,
    sceneBoundsProvider: ({ state }) => [getToolcraftFiniteArtboardRect(state.canvas.size)],
  },
});
