import type {
  ToolcraftComponentAcceptance,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftProductReadiness,
  ToolcraftTransferMode,
} from "./acceptance/types";
import { appSchema, PRISM_LOOP_SECONDS } from "./app-schema";
import {
  prismActionAcceptance,
  prismControlAcceptance,
  prismRuntimeAcceptance,
  prismSectionInventory,
} from "./prism/prism-acceptance";

export const appTransferMode: ToolcraftTransferMode = {
  animationIntent: {
    loopDuration: {
      evidence:
        "Every motion setting is a whole number of cycles per loop, so any loop length is seamless; 20 seconds gives a calm default pace.",
      seconds: PRISM_LOOP_SECONDS,
      source: "product-derived",
    },
    mode: "timeline-playback",
  },
  mode: "new-toolcraft-app",
  referenceInputs: [],
};

export const appProductReadiness: ToolcraftProductReadiness = {
  exportIntent: {
    image: { mode: "toolcraft-default" },
    svg: { mode: "not-requested" },
    video: {
      evidence: {
        messageRef: "claude-code-session/session_01XwNnKEC2w4jxAZsHQVztvL#user-message:o-prism-flow-era-um-ref",
        messageText:
          "o prism flow era um ref da app mas eu quero as funcionalidade e todos os setting the primeira app que crias te",
        quote: "eu quero as funcionalidade e todos os setting the primeira app que crias te",
        source: "user-message",
      },
      mode: "user-requested",
    },
  },
  interactionOwnership: [],
  mode: "product",
  productName: "Prism Field",
  productSummary:
    "Animated field of prismatic light: a soft folded sheet with refraction, glow and spectral color bands.",
  requestedBehavior:
    "Generate an animated prismatic light sheet with a versatile set of controls, including every function and setting of the first Prism Field app: presets, randomize, mask, palette, backdrop, PNG export and video export.",
  viewInteraction: {
    mode: "non-spatial",
    reason:
      "The sheet is a shaded 2D shader image; it has no editable three-dimensional scene or model to orbit.",
  },
};

const persistenceSlices =
  appSchema.persistence.storage === "localStorage"
    ? appSchema.persistence.include
    : [];

export const appAcceptance: readonly ToolcraftComponentAcceptance[] = [
  ...prismControlAcceptance,
  ...prismActionAcceptance,
  ...prismRuntimeAcceptance(persistenceSlices),
];

export const appControlSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] =
  prismSectionInventory;
