import { defineToolcraft } from "@/toolcraft/runtime";

import { appIdentity } from "./app-identity";
import { dispersionControlSections } from "./dispersion/dispersion-schema-sections";

export const appSchema = defineToolcraft({
  canvas: {
    enabled: true,
    renderScale: true,
    size: { height: 1080, unit: "px", width: 1920 },
    sizing: { mode: "editable-output" },
    upload: false,
  },
  export: {
    png: { background: "include" },
  },
  identity: appIdentity,
  panels: {
    controls: {
      sections: dispersionControlSections,
      title: "Prism Flow",
    },
    timeline: {
      defaultDurationSeconds: 60,
      enabled: true,
      mode: "playback",
    },
  },
  persistence: {
    include: ["values", "canvas", "panels", "timeline"],
    key: "toolcraft:prism-flow:state:v1",
    storage: "localStorage",
    version: 9,
  },
  settingsTransfer: {
    appId: "prism-flow",
    enabled: "auto",
    fileName: "prism-flow-settings.json",
  },
  toolbar: {
    history: true,
    radar: true,
    theme: true,
    zoom: true,
  },
});
