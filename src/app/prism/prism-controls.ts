import type {
  ToolcraftControlSchema,
  ToolcraftControlSectionSchema,
} from "@/toolcraft/runtime";

import {
  PRISM_BACKGROUND_DEFAULT,
  PRISM_BACKGROUND_TARGET,
  PRISM_ENTRIES,
  PRISM_INCLUDE_BACKGROUND_TARGET,
  PRISM_KEYS,
  prismTarget,
  type PrismKey,
  type PrismSectionId,
} from "./prism-table";
import { PRISM_PRESET_NAMES } from "./prism-presets";

const always = { mode: "always" } as const;

type ConditionalApplicability = Extract<
  ToolcraftControlSchema["applicability"],
  { mode: "conditional" }
>;

const applicabilityByKey: Partial<Record<PrismKey, ConditionalApplicability>> = {};

for (const key of ["c0", "c1", "c2", "c3"] as const) {
  applicabilityByKey[key] = {
    all: [{ equals: true, target: prismTarget("customColors") }],
    mode: "conditional",
  };
}

for (const key of [
  "maskType", "maskAngle", "maskX", "maskY", "maskSize", "maskSoft", "maskWarp", "maskInvert",
] as const) {
  applicabilityByKey[key] = {
    all: [{ equals: true, target: prismTarget("maskEnabled") }],
    mode: "conditional",
  };
}

for (const key of [
  "ribCount", "ribWidth", "ribIrregular", "ribAngle", "ribLens", "ribShift", "ribEdge", "ribEdgeWidth",
] as const) {
  applicabilityByKey[key] = {
    all: [{ equals: true, target: prismTarget("ribsEnabled") }],
    mode: "conditional",
  };
}

const performanceReasonBySection: Record<PrismSectionId, string> = {
  backdrop: "Updates one gradient uniform in the single field pass.",
  finish: "Updates tone, vignette or grain uniforms in the composite pass.",
  folds: "Updates fold uniforms evaluated by the fixed-cost height field.",
  glow: "Updates bloom uniforms in the fixed three-level blur chain.",
  highlights: "Updates highlight uniforms evaluated per pixel.",
  lighting: "Updates lighting uniforms evaluated per pixel.",
  mask: "Updates the analytic mask uniforms in the field pass.",
  motion: "Changes loop phase uniforms read by the next timeline frame.",
  placement: "Updates the view transform applied before the height field.",
  refraction: "Updates spectral phase and dispersion uniforms.",
  ribs: "Updates the analytic rib lens uniforms evaluated once per pixel in the field pass.",
  spectrum: "Updates palette lookup uniforms in the field pass.",
  surface: "Updates warp and detail uniforms of the bounded height field.",
};

function buildControl(key: PrismKey): ToolcraftControlSchema {
  const entry = PRISM_ENTRIES[key];
  const common = {
    applicability: applicabilityByKey[key] ?? always,
    performanceReason: performanceReasonBySection[entry.section],
    performanceRole: "responsiveness" as const,
    target: prismTarget(key),
  };

  switch (entry.kind) {
    case "slider":
    case "int": {
      const positions = Math.round((entry.max - entry.min) / entry.step) + 1;
      const discrete = entry.kind === "int";
      return {
        ...common,
        defaultValue: entry.def,
        label: entry.label,
        max: entry.max,
        min: entry.min,
        sliderValueKind: discrete ? "discrete" : "continuous",
        step: entry.step,
        type: "slider",
        ...(discrete && positions <= 32 ? { variant: "discrete" as const } : {}),
        ...("unit" in entry && entry.unit ? { unit: entry.unit } : {}),
      };
    }
    case "bool":
      return { ...common, defaultValue: entry.def, label: entry.label, type: "switch" };
    case "select":
      return {
        ...common,
        defaultValue: entry.def,
        label: entry.label,
        options: entry.options,
        type: "select",
      };
    case "color":
      return {
        ...common,
        defaultValue: entry.def,
        label: entry.label,
        ...(entry.section === "spectrum" ? { semanticGroup: "palette-stops" } : {}),
        type: "color",
      };
  }
}

function sectionControls(section: PrismSectionId): Record<string, ToolcraftControlSchema> {
  return Object.fromEntries(
    PRISM_KEYS.filter((key) => PRISM_ENTRIES[key].section === section).map((key) => [
      key,
      buildControl(key),
    ]),
  );
}

const sectionTitles: Record<PrismSectionId, string> = {
  backdrop: "Backdrop",
  finish: "Finish",
  folds: "Fold Layers",
  glow: "Glow",
  highlights: "Highlights",
  lighting: "Lighting",
  mask: "Light Mask",
  motion: "Motion",
  placement: "Placement",
  refraction: "Refraction",
  ribs: "Glass Ribs",
  spectrum: "Spectrum",
  surface: "Surface Detail",
};

export const PRISM_RANDOMIZABLE_SECTIONS = [
  "motion",
  "folds",
  "surface",
  "lighting",
  "highlights",
  "spectrum",
  "refraction",
  "glow",
  "placement",
  "ribs",
  "mask",
  "backdrop",
  "finish",
] as const satisfies readonly PrismSectionId[];

export const prismShuffleTarget = (section: PrismSectionId): string => `prism.shuffle-${section}`;

function shuffleControl(section: PrismSectionId): ToolcraftControlSchema {
  return {
    actions: [
      { icon: "shuffle", label: "Randomize", value: `random:${section}` },
    ],
    applicability: always,
    label: "Variation",
    performanceReason: "Writes a batch of control values in one history step.",
    performanceRole: "responsiveness",
    target: prismShuffleTarget(section),
    type: "actions",
  };
}

function prismSection(section: PrismSectionId): ToolcraftControlSectionSchema {
  return {
    controls: {
      ...sectionControls(section),
      ...(section === "spectrum"
        ? {
            editAsCustom: {
              actions: [{ icon: "copy", label: "Edit as custom", value: "palette:custom" }],
              applicability: {
                all: [{ equals: false, target: prismTarget("customColors") }],
                mode: "conditional",
              },
              label: "Stops",
              performanceReason: "Copies four color values in one history step.",
              performanceRole: "responsiveness",
              target: "prism.palette.edit",
              type: "actions",
            } satisfies ToolcraftControlSchema,
          }
        : {}),
      shuffle: shuffleControl(section),
    },
    id: section,
    title: sectionTitles[section],
  };
}

const presetsSection: ToolcraftControlSectionSchema = {
  controls: {
    presets: {
      actions: PRISM_PRESET_NAMES.map((name) => ({
        label: name,
        value: `preset:${name}`,
      })),
      applicability: always,
      label: false,
      performanceReason: "Replaces the Prism values in one history step.",
      performanceRole: "responsiveness",
      target: "prism.presets",
      type: "actions",
    },
    randomizeAll: {
      actions: [
        { icon: "shuffle", label: "Randomize all", value: "random:all" },
        { icon: "wand-sparkles", label: "Colors only", value: "random:colors" },
      ],
      applicability: always,
      label: "Variation",
      performanceReason: "Writes a batch of control values in one history step.",
      performanceRole: "responsiveness",
      target: "prism.randomize",
      type: "actions",
    },
  },
  id: "presets",
  title: "Presets",
};

const backgroundSection: ToolcraftControlSectionSchema = {
  controls: {
    includeBackground: {
      applicability: always,
      defaultValue: true,
      label: "Background",
      performanceReason: "Toggles the runtime background fill and the backdrop overlay.",
      performanceRole: "responsiveness",
      target: PRISM_INCLUDE_BACKGROUND_TARGET,
      type: "switch",
    },
    background: {
      applicability: always,
      defaultValue: PRISM_BACKGROUND_DEFAULT,
      label: "Background color",
      performanceReason: "Changes the runtime-owned background fill.",
      performanceRole: "responsiveness",
      target: PRISM_BACKGROUND_TARGET,
      type: "color",
    },
  },
  id: "background",
  title: "Background",
};

export const prismControlSections: readonly ToolcraftControlSectionSchema[] = [
  presetsSection,
  prismSection("motion"),
  prismSection("folds"),
  prismSection("surface"),
  prismSection("lighting"),
  prismSection("highlights"),
  prismSection("spectrum"),
  prismSection("refraction"),
  prismSection("glow"),
  prismSection("placement"),
  prismSection("ribs"),
  prismSection("mask"),
  backgroundSection,
  prismSection("backdrop"),
  prismSection("finish"),
];
