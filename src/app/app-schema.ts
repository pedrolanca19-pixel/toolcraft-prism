import {
  defineToolcraft,
  imageExportModule,
  mediaSourceModule,
  timelineModule,
  videoExportModule,
} from "@/toolcraft/runtime";

import appDefaults from "./app-defaults.json" with { type: "json" };
import { appIdentity } from "./app-identity";
import { prismControlSections } from "./prism/prism-controls";

export const PRISM_LOOP_SECONDS = 20;

export const appSchema = defineToolcraft({
  defaults: appDefaults,
  base: {
    canvas: {
      enabled: true,
      renderScale: true,
      size: { height: 1080, unit: "px", width: 1920 },
      sizing: { mode: "editable-output" },
      upload: false,
    },
    identity: appIdentity,
    panels: {
      controls: {
        sections: prismControlSections,
        title: "Prism Field",
      },
    },
    toolbar: {
      history: true,
      radar: true,
      theme: true,
      zoom: true,
    },
  },
  modules: [
    imageExportModule(),
    mediaSourceModule(),
    timelineModule({ defaultDurationSeconds: PRISM_LOOP_SECONDS, mode: "playback" }),
    videoExportModule(),
  ],
});
