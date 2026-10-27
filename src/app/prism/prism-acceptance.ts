import type {
  ToolcraftComponentAcceptance,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftFiniteSelectorInventoryEntry,
} from "../acceptance/types";
import type { ToolcraftPersistableStateSlice } from "@/toolcraft/runtime";

import {
  PRISM_RANDOMIZABLE_SECTIONS,
  prismControlSections,
  prismShuffleTarget,
} from "./prism-controls";
import { PRISM_PRESET_NAMES } from "./prism-presets";
import { PRISM_ENTRIES, prismTarget, type PrismKey } from "./prism-table";

export const PRISM_AUTOMATED_ACCEPTANCE_TEST =
  "Prism Field maps every control to a renderer setting";
export const PRISM_BROWSER_FILE = "e2e/product-prism.spec.ts" as const;
export const PRISM_FIXTURE =
  "A 160×90 Prism Field canvas at Resolution scale 1 with the default settings, playback paused at its first frame.";

export const prismBrowserTestName = (id: string): string => `browser: Prism Field ${id}`;

type Describe = Readonly<{
  componentType: string;
  evidence: ToolcraftComponentAcceptance["evidence"];
  expectedObservable: string;
  id: string;
  kind?: ToolcraftComponentAcceptance["kind"];
  target?: string;
  userAction: string;
}>;

export function prismRow(
  descriptor: Describe,
  extra: Partial<ToolcraftComponentAcceptance> = {},
): ToolcraftComponentAcceptance {
  return {
    automated: true,
    automatedTestName: PRISM_AUTOMATED_ACCEPTANCE_TEST,
    browser: {
      budget: "standard",
      file: PRISM_BROWSER_FILE,
      testName: prismBrowserTestName(descriptor.id),
    },
    componentType: descriptor.componentType,
    evidence: descriptor.evidence,
    expectedObservable: descriptor.expectedObservable,
    fixture: PRISM_FIXTURE,
    id: descriptor.id,
    kind: descriptor.kind ?? "control",
    userAction: descriptor.userAction,
    ...(descriptor.target ? { target: descriptor.target } : {}),
    ...extra,
  };
}

const sectionNotes: Readonly<
  Record<string, Readonly<{ entity: string; reason: string }>>
> = {
  backdrop: {
    entity: "Backdrop",
    reason: "These controls tint the area behind the light with one gradient overlay.",
  },
  finish: {
    entity: "Finish",
    reason: "These controls grade the final image: tone, vignette and film grain.",
  },
  folds: {
    entity: "Fold layers",
    reason: "These controls shape the folded sine layers that make up the sheet.",
  },
  glow: {
    entity: "Glow",
    reason: "These controls drive bloom and chromatic aberration around bright light.",
  },
  highlights: {
    entity: "Highlights",
    reason: "These controls set specular, rim and ridge light on the sheet.",
  },
  lighting: {
    entity: "Lighting",
    reason: "These controls set the key light and the overall light level.",
  },
  mask: {
    entity: "Light mask",
    reason: "These controls choose and place the shape that confines the light.",
  },
  motion: {
    entity: "Motion",
    reason: "These controls set how the sheet moves during one timeline loop.",
  },
  placement: {
    entity: "Placement",
    reason: "These controls transform the sheet inside the canvas.",
  },
  presets: {
    entity: "Presets",
    reason: "These actions replace groups of settings in one step.",
  },
  refraction: {
    entity: "Refraction",
    reason: "These controls set how surface tilt and dispersion shift the colors.",
  },
  spectrum: {
    entity: "Spectrum",
    reason: "These controls choose the palette and how color bands follow the folds.",
  },
  surface: {
    entity: "Surface detail",
    reason: "These controls warp and roughen the sheet and seed its pattern.",
  },
};

const finiteSelectorsBySection: Readonly<
  Record<string, readonly ToolcraftFiniteSelectorInventoryEntry[]>
> = {
  folds: [
    {
      reason: "Layer count changes how many fold layers are summed, not which controls apply.",
      role: "parameter",
      target: prismTarget("layers"),
    },
  ],
  motion: [
    {
      reason: "Cycles per loop sets how many motion revolutions fit in one loop.",
      role: "parameter",
      target: prismTarget("cycles"),
    },
    {
      reason: "Fold travel sets whole fold-phase revolutions per cycle, forward or backward.",
      role: "parameter",
      target: prismTarget("foldSpeed"),
    },
    {
      reason: "Hue cycles sets whole palette revolutions per cycle.",
      role: "parameter",
      target: prismTarget("hueDrift"),
    },
  ],
  surface: [
    {
      reason: "Detail octaves changes how many noise octaves roughen the surface.",
      role: "parameter",
      target: prismTarget("octaves"),
    },
  ],
  mask: [
    {
      affectedTargets: [],
      reason: "The mask shape decides whether the placement controls apply at all.",
      role: "branch",
      target: prismTarget("maskType"),
    },
    {
      reason: "Invert flips the light and shadow sides of the chosen mask.",
      role: "parameter",
      target: prismTarget("maskInvert"),
    },
  ],
  placement: [
    {
      reason: "Mirror reflects the sheet without changing which controls apply.",
      role: "parameter",
      target: prismTarget("mirror"),
    },
  ],
  spectrum: [
    {
      affectedTargets: [],
      reason: "The palette decides whether the four custom color stops apply.",
      role: "branch",
      target: prismTarget("palette"),
    },
    {
      reason: "Mirror bands changes how the palette repeats along the sheet.",
      role: "parameter",
      target: prismTarget("bandMirror"),
    },
  ],
};

const prismAuthoredSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] =
  prismControlSections
    .filter((section) => section.id in sectionNotes)
    .map((section) => {
      const note = sectionNotes[section.id]!;
      return {
        entity: note.entity,
        entityId: section.id,
        finiteSelectors: finiteSelectorsBySection[section.id] ?? [],
        groupingReason: note.reason,
        id: section.id,
        targets: Object.values(section.controls).map((control) => control.target),
        title: section.title ?? section.id,
      };
    });

const expectedByKey: Readonly<Partial<Record<PrismKey, string>>> = {
  cycles: "More cycles per loop make the animated frames at the same progress differ.",
  palette: "Every palette recolors the sheet; Custom shows the four color stops.",
  maskType: "Each mask shape confines the light to a different region of the canvas.",
  mirror: "Each mirror mode reflects the sheet differently across the canvas axes.",
};

function describeControl(key: PrismKey): Describe {
  const entry = PRISM_ENTRIES[key];
  const target = prismTarget(key);
  const componentType =
    entry.kind === "slider" || entry.kind === "int"
      ? "slider"
      : entry.kind === "bool"
        ? "switch"
        : entry.kind;
  return {
    componentType,
    evidence: "rendered-pixels",
    expectedObservable:
      expectedByKey[key] ??
      `Changing ${entry.kind === "color" ? "the color" : "the setting"} changes the pixels of the rendered sheet.`,
    id: target,
    target,
    userAction:
      entry.kind === "slider" || entry.kind === "int"
        ? `Drag the ${typeof entry.label === "string" ? entry.label : key} slider and compare the canvas pixels.`
        : `Change ${typeof entry.label === "string" ? entry.label : key} through its control and compare the canvas pixels.`,
  };
}

export const prismControlAcceptance: readonly ToolcraftComponentAcceptance[] = (
  Object.keys(PRISM_ENTRIES) as PrismKey[]
).map((key) => {
  const entry = PRISM_ENTRIES[key];
  const extra: Partial<ToolcraftComponentAcceptance> =
    entry.kind === "select" ? { optionCoverage: "each-visible-item" } : {};
  return prismRow(describeControl(key), extra);
});

const runtimeSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] = [
  {
    entity: "Canvas background",
    entityId: "runtime.setup",
    finiteSelectors: [
      {
        reason: "Background on or off changes only the runtime fill and the backdrop overlay.",
        role: "parameter",
        target: "export.includeBackground",
      },
    ],
    groupingReason: "These controls decide whether and in which color the canvas is filled.",
    id: "runtime.setup",
    targets: ["export.includeBackground", "appearance.background"],
    title: "Settings",
  },
  {
    entity: "Image export",
    entityId: "runtime.image-export",
    finiteSelectors: [
      {
        reason: "Image format selects the encoded still image type.",
        role: "parameter",
        target: "export.image.format",
      },
      {
        reason: "Image resolution selects the long edge of the exported still.",
        role: "parameter",
        target: "export.image.resolution",
      },
    ],
    groupingReason: "These controls configure the exported still image.",
    id: "runtime.image-export",
    targets: ["export.image.format", "export.image.resolution"],
    title: "Image Export",
  },
  {
    entity: "Video export",
    entityId: "runtime.video-export",
    finiteSelectors: [
      {
        reason: "Video format selects the encoded container.",
        role: "parameter",
        target: "export.video.format",
      },
      {
        reason: "Video resolution selects the exported frame size.",
        role: "parameter",
        target: "export.video.resolution",
      },
    ],
    groupingReason: "These controls configure the exported loop video.",
    id: "runtime.video-export",
    targets: ["export.video.format", "export.video.resolution"],
    title: "Video Export",
  },
];

export const prismSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] = [
  ...runtimeSectionInventory,
  ...prismAuthoredSectionInventory,
];

const actionRows: readonly ToolcraftComponentAcceptance[] = [
  prismRow(
    {
      componentType: "actions",
      evidence: "command-side-effect",
      expectedObservable:
        "Each preset button replaces the Prism settings with that preset and changes the rendered pixels.",
      id: "prism.presets",
      target: "prism.presets",
      userAction: "Click every preset button and read back the palette and mask values.",
    },
    { actionCoverage: PRISM_PRESET_NAMES.map((name) => `preset:${name}`) },
  ),
  prismRow(
    {
      componentType: "actions",
      evidence: "command-side-effect",
      expectedObservable:
        "Randomize all and Colors only write new values for the Prism settings and colors.",
      id: "prism.randomize",
      target: "prism.randomize",
      userAction: "Click Randomize all and Colors only and read back changed values.",
    },
    { actionCoverage: ["random:all", "random:colors"] },
  ),
  prismRow(
    {
      componentType: "actions",
      evidence: "command-side-effect",
      expectedObservable:
        "Edit as custom switches to the Custom palette and copies the active preset colors into its four stops.",
      id: "prism.palette.edit",
      target: "prism.palette.edit",
      userAction: "Choose the Aurora palette, click Edit as custom and read the four stops.",
    },
    { actionCoverage: ["palette:custom"] },
  ),
  ...PRISM_RANDOMIZABLE_SECTIONS.map((section) =>
    prismRow(
      {
        componentType: "actions",
        evidence: "command-side-effect",
        expectedObservable: `Randomize writes new values only for the ${section} section controls.`,
        id: prismShuffleTarget(section),
        target: prismShuffleTarget(section),
        userAction: `Click Randomize in the ${section} section and read back the changed values.`,
      },
      { actionCoverage: [`random:${section}`] },
    ),
  ),
];

const runtimeRows = (persistenceSlices: readonly ToolcraftPersistableStateSlice[]): readonly ToolcraftComponentAcceptance[] => [
  prismRow(
    {
      componentType: "switch",
      evidence: "rendered-pixels",
      expectedObservable:
        "Background off removes the runtime fill and the backdrop overlay; the preview becomes transparent.",
      id: "export.includeBackground",
      target: "export.includeBackground",
      userAction: "Toggle Background and compare preview and exported pixels.",
    },
    { backgroundOutputCoverage: "all-required-background-output" },
  ),
  prismRow({
    componentType: "color",
    evidence: "rendered-pixels",
    expectedObservable: "Background color changes the fill behind the light.",
    id: "appearance.background",
    target: "appearance.background",
    userAction: "Pick a different Background color and compare the canvas pixels.",
  }),
  prismRow(
    {
      componentType: "select",
      evidence: "exported-bytes",
      expectedObservable: "PNG and JPG produce files of the matching type with the canvas size.",
      id: "export.image.format",
      target: "export.image.format",
      userAction: "Select every image format and export.",
    },
    { optionCoverage: "each-visible-item" },
  ),
  prismRow(
    {
      componentType: "select",
      evidence: "exported-bytes",
      expectedObservable: "2K, 4K and 8K produce a long edge of 2048, 4096 and 8192 pixels.",
      id: "export.image.resolution",
      target: "export.image.resolution",
      userAction: "Select a resolution and export.",
    },
    { optionCoverage: "each-visible-item" },
  ),
  prismRow(
    {
      componentType: "select",
      evidence: "exported-bytes",
      expectedObservable: "MP4 and WebM export a decodable video of the timeline duration.",
      id: "export.video.format",
      target: "export.video.format",
      userAction: "Select every video format and export.",
    },
    { optionCoverage: "each-visible-item" },
  ),
  prismRow(
    {
      componentType: "select",
      evidence: "exported-bytes",
      expectedObservable: "Current and 4K produce the matching even-sized frames.",
      id: "export.video.resolution",
      target: "export.video.resolution",
      userAction: "Select every video resolution and export.",
    },
    { optionCoverage: "each-visible-item" },
  ),
  prismRow(
    {
      componentType: "panelActions",
      evidence: "exported-bytes",
      expectedObservable:
        "Export PNG and Export MP4 download decodable artifacts with the selected format and size.",
      id: "actions.output",
      target: "actions.output",
      userAction: "Click Export PNG, then Export MP4, and inspect the downloads.",
    },
    {
      actionCoverage: ["export.png", "export.video"],
      exportArtifactCoverage: [
        "all-required-image-export-behavior",
        "all-required-video-export-behavior",
      ],
    },
  ),
  prismRow(
    {
      componentType: "timeline",
      evidence: "timeline-output",
      expectedObservable:
        "Pause, scrub, duration and loop drive the rendered frame; the wrapped frame matches the first frame.",
      id: "timeline.playback",
      kind: "runtime",
      userAction: "Pause, scrub, edit the duration and let the loop wrap.",
    },
    {
      timelineCoverage: "playback",
      timelineLoopProof: {
        direction: "forward-only",
        durationChange: "reproved-after-edit",
        reversePlayback: "forbidden",
        seam: "first-last-match",
      },
      timelinePlaybackCoverage: "all-playback-behavior",
    },
  ),
  prismRow(
    {
      componentType: "slider",
      evidence: "rendered-pixels",
      expectedObservable:
        "Resolution scale preserves CSS size and allocates the selected backing pixels while interacting, playing and at rest.",
      id: "canvas.renderScale",
      kind: "runtime",
      target: "canvas.renderScale",
      userAction: "Set Resolution scale to 2 and compare CSS and WebGL backing sizes.",
    },
    {
      renderScaleCoverage: {
        kind: "selected-backing-pixels",
        states: ["interaction", "playback", "steady"],
      },
    },
  ),
  ...(["mode-continuity-and-restoration", "scene-bounds-image-export", "scene-bounds-video-export"] as const).map(
    (coverage) =>
      prismRow(
        {
          componentType: "canvas",
          evidence:
            coverage === "mode-continuity-and-restoration"
              ? "viewport-side-effect"
              : "exported-bytes",
          expectedObservable:
            coverage === "mode-continuity-and-restoration"
              ? "Infinity canvas keeps the sheet, view and dormant finite size, and restores them when switched off."
              : coverage === "scene-bounds-image-export"
                ? "An Infinity image export covers the whole sheet at the artboard size."
                : "An Infinity video export keeps the saved artboard size and duration.",
          id: `canvas.infinity.${coverage}`,
          kind: "runtime",
          target: "canvas.infinity",
          userAction: "Switch Infinity canvas on and off and export while it is on.",
        },
        { infinityCanvasCoverage: coverage },
      ),
  ),
  prismRow(
    {
      componentType: "persistence",
      evidence: "persistence-state",
      expectedObservable:
        "Edited values, canvas size and zoom, panels and timeline are restored after a real browser reload.",
      id: "persistence.reload",
      kind: "runtime",
      target: "canvas.size.width",
      userAction: "Edit settings, move panels, wait for persistence and reload the page.",
    },
    {
      browser: {
        budget: "extended-io",
        file: PRISM_BROWSER_FILE,
        testName: prismBrowserTestName("persistence.reload"),
      },
      persistenceCoverage: "reload",
      persistenceSlices,
    },
  ),
];

export const prismRuntimeAcceptance = runtimeRows;
export const prismActionAcceptance = actionRows;
