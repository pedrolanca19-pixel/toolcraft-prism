import type { ToolcraftControlSectionSchema } from "@/toolcraft/runtime";

import {
  DISPERSION_DEFAULTS,
  dispersionTargets,
} from "./dispersion-values";
import { dispersionEffectSections } from "./dispersion-effects-schema";
import { lensDistortionControlSections } from "./dispersion-lens-distortion-schema";
import { dispersionMaskSections } from "./dispersion-masks-schema";

const responsive = (reason: string) => ({
  performanceReason: reason,
  performanceRole: "responsiveness" as const,
});

function fieldSlider(
  target: string,
  label: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  description: string,
) {
  return {
    applicability: { mode: "always" as const },
    defaultValue,
    description,
    label,
    max,
    min,
    orderRole: "detail" as const,
    semanticGroup: "field-geometry",
    sliderValueKind: "continuous" as const,
    step,
    target,
    type: "slider" as const,
    unit: "%",
    ...responsive(
      "Updates bounded sheet shader uniforms without changing the fixed raymarch cardinality.",
    ),
  };
}

function motionSlider(
  target: string,
  label: string,
  defaultValue: number,
  description: string,
) {
  return {
    applicability: { mode: "always" as const },
    defaultValue,
    description,
    label,
    max: 100,
    min: 0,
    orderRole: "detail" as const,
    sliderValueKind: "continuous" as const,
    step: 1,
    target,
    type: "slider" as const,
    unit: "%",
    ...responsive(
      "Changes bounded loop-phase uniforms consumed by the next timeline frame.",
    ),
  };
}

export const dispersionControlSections: readonly ToolcraftControlSectionSchema[] = [
  {
    controls: {
      shape: {
        applicability: { mode: "always" },
        defaultValue: DISPERSION_DEFAULTS.shape,
        description:
          "Clips the complete canvas output; it does not add a separate figure inside the canvas.",
        label: "Shape",
        options: [
          { label: "Rectangle", value: "rect" },
          { label: "Rounded", value: "rounded" },
          { label: "Circle", value: "circle" },
        ],
        orderRole: "mode",
        target: dispersionTargets.shape,
        type: "segmented",
        ...responsive(
          "Switches one constant-complexity clipping path before the next preview composite.",
        ),
      },
      cornerRadius: {
        applicability: {
          all: [{ equals: "rounded", target: dispersionTargets.shape }],
          mode: "conditional",
        },
        defaultValue: DISPERSION_DEFAULTS.cornerRadius,
        description:
          "Rounds the canvas mask as a percentage of its shorter edge.",
        label: "Corner radius",
        max: 50,
        min: 0,
        orderRole: "detail",
        sliderValueKind: "continuous",
        step: 1,
        target: dispersionTargets.cornerRadius,
        type: "slider",
        unit: "%",
        ...responsive(
          "Updates one rounded-rectangle mask with constant path complexity.",
        ),
      },
    },
    id: "frame",
    title: "Frame",
  },
  ...dispersionMaskSections,
  {
    controls: {
      mode: {
        applicability: { mode: "always" },
        defaultValue: DISPERSION_DEFAULTS.mode,
        description:
          "Frames the same raymarched light sheet five ways: central, hugging the lower edge, a wide halo panorama, a rising diagonal, or coupled ripples.",
        label: "Field mode",
        options: [
          { label: "Central", value: "central" },
          { label: "Edge Glass", value: "edge" },
          { label: "Halo", value: "halo" },
          { label: "Diagonal", value: "diagonal" },
          { label: "Ripple", value: "ripple" },
        ],
        orderRole: "mode",
        performanceReason:
          "Switches bounded view and wave uniforms consumed by the same fixed-cost sheet shader.",
        performanceRole: "responsiveness",
        semanticGroup: "field-geometry",
        target: dispersionTargets.mode,
        type: "select",
      },
      position: fieldSlider(
        dispersionTargets.position,
        "Position",
        DISPERSION_DEFAULTS.position,
        0,
        100,
        1,
        "Moves the sheet vertically through the canvas while preserving its optical structure.",
      ),
      inset: fieldSlider(
        dispersionTargets.inset,
        "Frame margin",
        DISPERSION_DEFAULTS.inset,
        0,
        40,
        1,
        "Fades the wave glow near the output edges and controls its breathing room inside the frame.",
      ),
      height: fieldSlider(
        dispersionTargets.height,
        "Thickness",
        DISPERSION_DEFAULTS.height,
        4,
        72,
        1,
        "Changes the glow falloff around the sheet so the caustic reads thinner or fuller.",
      ),
      refraction: fieldSlider(
        dispersionTargets.refraction,
        "Refraction",
        DISPERSION_DEFAULTS.refraction,
        0,
        80,
        1,
        "Strengthens the large wave folds that bend and displace the sheet.",
      ),
      spread: fieldSlider(
        dispersionTargets.spread,
        "Spread",
        DISPERSION_DEFAULTS.spread,
        4,
        100,
        1,
        "Scales the distance-driven palette cycle that fans the sheet into spectral bands.",
      ),
    },
    id: "dispersion-field-foundation",
    title: "Dispersion Field — Foundation",
  },
  {
    controls: {
      softness: fieldSlider(
        dispersionTargets.softness,
        "Sample spread",
        DISPERSION_DEFAULTS.softness,
        0,
        100,
        1,
        "Smooths the volumetric texture from the reference's smoky pattern to a clean gradient and diffuses the march; it is not Gaussian blur.",
      ),
      chromaSplit: fieldSlider(
        dispersionTargets.chromaSplit,
        "Chromatic split",
        DISPERSION_DEFAULTS.chromaSplit,
        0,
        100,
        1,
        "Separates the red and blue light sheets vertically so the caustic fans into rainbow fringes; zero keeps the reference's single sheet.",
      ),
      bend: fieldSlider(
        dispersionTargets.bend,
        "Tilt",
        DISPERSION_DEFAULTS.bend,
        0,
        100,
        1,
        "Tilts the sheet so it crosses the frame at a different angle.",
      ),
      curve: {
        applicability: { mode: "always" },
        defaultValue: DISPERSION_DEFAULTS.curve,
        description:
          "Bends the sheet itself in 3D: straight, sagging valley, arch, S-loop, sine drape, or a steep catenary cradle — the glow and motion stay untouched.",
        label: "Curve",
        options: [
          { label: "Line", value: "line" },
          { label: "Valley", value: "valley" },
          { label: "Arch", value: "arch" },
          { label: "S-curve", value: "scurve" },
          { label: "Drape", value: "drape" },
          { label: "Cradle", value: "cradle" },
        ],
        orderRole: "detail",
        performanceReason:
          "Switches one static view-space profile branch in the same fixed-cost sheet shader.",
        performanceRole: "responsiveness",
        semanticGroup: "field-geometry",
        target: dispersionTargets.curve,
        type: "select",
      },
      curveDepth: fieldSlider(
        dispersionTargets.curveDepth,
        "Curve depth",
        DISPERSION_DEFAULTS.curveDepth,
        0,
        100,
        1,
        "How deeply the selected Curve bends the sheet in space; zero keeps the flat reference surface.",
      ),
      shading: fieldSlider(
        dispersionTargets.shading,
        "Shading",
        DISPERSION_DEFAULTS.shading,
        0,
        100,
        1,
        "Adjustable chiaroscuro: the sheet's own slopes light and shade the glow so bends read as 3D depth; zero keeps the flat reference emission.",
      ),
    },
    id: "dispersion-field-shaping",
    title: "Dispersion Field — Shaping",
  },
  ...dispersionEffectSections,
  ...lensDistortionControlSections,
  {
    controls: {
      spectrum: {
        applicability: { mode: "always" },
        defaultValue: DISPERSION_DEFAULTS.spectrum,
        description:
          "Chooses the cosine-palette phases of the spectral bands; Prism reproduces the reference palette and Custom hands the palette to the four colors below.",
        label: "Spectrum",
        options: [
          { label: "Prism", value: "prism" },
          { label: "Aurora", value: "aurora" },
          { label: "Sunset", value: "sunset" },
          { label: "Ice", value: "ice" },
          { label: "Porcelain", value: "porcelain" },
          { label: "Dusk", value: "dusk" },
          { label: "Mono", value: "mono" },
          { label: "Custom", value: "custom" },
        ],
        orderRole: "color",
        target: dispersionTargets.spectrum,
        type: "select",
        ...responsive(
          "Updates the palette phase and chroma uniforms in the single field pass.",
        ),
      },
      customColorA: {
        applicability: {
          all: [{ equals: "custom", target: dispersionTargets.spectrum }],
          mode: "conditional",
        },
        defaultValue: DISPERSION_DEFAULTS.customColorA,
        description:
          "First palette anchor; the spectral cycle starts on this color.",
        label: "Color 1",
        orderRole: "color",
        target: dispersionTargets.customColorA,
        type: "color",
        ...responsive(
          "Updates the fitted palette uniforms in the single field pass.",
        ),
      },
      customColorB: {
        applicability: {
          all: [{ equals: "custom", target: dispersionTargets.spectrum }],
          mode: "conditional",
        },
        defaultValue: DISPERSION_DEFAULTS.customColorB,
        description:
          "Second palette anchor, one quarter into the spectral cycle.",
        label: "Color 2",
        orderRole: "color",
        target: dispersionTargets.customColorB,
        type: "color",
        ...responsive(
          "Updates the fitted palette uniforms in the single field pass.",
        ),
      },
      customColorC: {
        applicability: {
          all: [{ equals: "custom", target: dispersionTargets.spectrum }],
          mode: "conditional",
        },
        defaultValue: DISPERSION_DEFAULTS.customColorC,
        description:
          "Third palette anchor, halfway through the spectral cycle.",
        label: "Color 3",
        orderRole: "color",
        target: dispersionTargets.customColorC,
        type: "color",
        ...responsive(
          "Updates the fitted palette uniforms in the single field pass.",
        ),
      },
      customColorD: {
        applicability: {
          all: [{ equals: "custom", target: dispersionTargets.spectrum }],
          mode: "conditional",
        },
        defaultValue: DISPERSION_DEFAULTS.customColorD,
        description:
          "Fourth palette anchor, three quarters through the spectral cycle.",
        label: "Color 4",
        orderRole: "color",
        target: dispersionTargets.customColorD,
        type: "color",
        ...responsive(
          "Updates the fitted palette uniforms in the single field pass.",
        ),
      },
      intensity: {
        applicability: { mode: "always" },
        defaultValue: DISPERSION_DEFAULTS.intensity,
        description:
          "Applies luminance-based saturation to the accumulated spectral glow.",
        label: "Saturation",
        max: 100,
        min: 0,
        orderRole: "strength",
        sliderValueKind: "continuous",
        step: 1,
        target: dispersionTargets.intensity,
        type: "slider",
        unit: "%",
        ...responsive(
          "Changes one shader saturation coefficient without changing sample count.",
        ),
      },
      glow: {
        applicability: { mode: "always" },
        defaultValue: DISPERSION_DEFAULTS.glow,
        description:
          "Scales the volumetric glow energy from the soft veil up to the white-hot core.",
        label: "Glow",
        max: 100,
        min: 0,
        orderRole: "strength",
        sliderValueKind: "continuous",
        step: 1,
        target: dispersionTargets.glow,
        type: "slider",
        unit: "%",
        ...responsive(
          "Changes one fixed-cost emission uniform in the single field pass.",
        ),
      },
    },
    id: "color",
    title: "Spectrum",
  },
  {
    controls: {
      balance: {
        applicability: { mode: "always" },
        coordinateMode: "cartesian",
        defaultValue: DISPERSION_DEFAULTS.colorBalance,
        description:
          "Grades the completed dispersion image on two stable axes: Cyan to Red horizontally and Blue to Yellow vertically. The center is neutral.",
        label: "Balance",
        orderRole: "color",
        performanceReason:
          "Updates one fixed-cost color-gain uniform in the existing composite pass.",
        performanceRole: "responsiveness",
        target: dispersionTargets.colorBalance,
        type: "vector",
        variant: "colorBalance",
        xLabel: "Cyan / Red",
        yLabel: "Blue / Yellow",
      },
    },
    id: "color-balance",
    title: "Color Balance",
  },
  {
    controls: {
      flow: motionSlider(
        dispersionTargets.flow,
        "Speed",
        DISPERSION_DEFAULTS.flow,
        "Sets the real-time pace from a quarter-hour crawl to several times the reference pace; the pace holds regardless of timeline duration.",
      ),
      undulation: motionSlider(
        dispersionTargets.undulation,
        "Wobble",
        DISPERSION_DEFAULTS.undulation,
        "Sets the overall wave amplitude that swells and folds the sheet.",
      ),
      detail: motionSlider(
        dispersionTargets.detail,
        "Secondary motion",
        DISPERSION_DEFAULTS.detail,
        "Sets the fine ripple amplitude layered over the large waves.",
      ),
      shimmer: motionSlider(
        dispersionTargets.shimmer,
        "Light travel",
        DISPERSION_DEFAULTS.shimmer,
        "Rotates the spectral palette phase so different hues lead and travel through the pattern.",
      ),
      seed: motionSlider(
        dispersionTargets.seed,
        "Phase",
        DISPERSION_DEFAULTS.seed,
        "Offsets the deterministic loop phase without changing the loop direction.",
      ),
    },
    id: "motion",
    title: "Motion",
  },
  {
    controls: {
      includeBackground: {
        applicability: { mode: "always" },
        defaultValue: DISPERSION_DEFAULTS.includeBackground,
        description:
          "Controls bounded preview and still-image background visibility.",
        label: "Include",
        orderRole: "primary",
        target: dispersionTargets.includeBackground,
        type: "switch",
        ...responsive(
          "Changes one background fill and Infinity dependency without changing field geometry.",
        ),
      },
      background: {
        applicability: {
          all: [
            { equals: true, target: dispersionTargets.includeBackground },
          ],
          mode: "conditional",
        },
        defaultValue: DISPERSION_DEFAULTS.background,
        label: false,
        orderRole: "color",
        target: dispersionTargets.background,
        type: "color",
        ...responsive(
          "Changes one background fill in preview and image export.",
        ),
      },
    },
    id: "background",
    layoutGroups: [
      {
        columns: 2,
        controls: ["includeBackground", "background"],
        layout: "inline",
      },
    ],
    title: "Background",
  },
  {
    controls: {
      format: {
        applicability: { mode: "always" },
        defaultValue: "png",
        label: "Format",
        options: [
          { label: "PNG", value: "png" },
          { label: "JPG", value: "jpg" },
        ],
        orderRole: "mode",
        target: dispersionTargets.imageFormat,
        type: "select",
        ...responsive(
          "Selects runtime-owned image encoding without changing preview pixels.",
        ),
      },
      resolution: {
        applicability: { mode: "always" },
        defaultValue: "4k",
        label: "Resolution",
        options: [
          { label: "2K", value: "2k" },
          { label: "4K", value: "4k" },
          { label: "8K", value: "8k" },
        ],
        orderRole: "detail",
        performanceReason:
          "Changes batch render and encoding pixels up to the real 8K output boundary.",
        performanceRole: "workload",
        target: dispersionTargets.imageResolution,
        type: "select",
      },
    },
    id: "image-export",
    layoutGroups: [
      { columns: 2, controls: ["format", "resolution"], layout: "inline" },
    ],
    title: "Image Export",
  },
  {
    actionGroup: "secondary",
    controls: {
      outputActions: {
        applicability: { mode: "always" },
        actions: [
          {
            icon: "upload-simple",
            label: "Export PNG",
            role: "export-image",
            value: "export.png",
          },
        ],
        label: false,
        target: "actions.output",
        type: "panelActions",
      },
    },
    id: "output-actions",
    title: "Export",
  },
];
