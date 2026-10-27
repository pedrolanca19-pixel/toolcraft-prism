import type { ToolcraftControlSectionSchema } from "@/toolcraft/runtime";

import {
  DISPERSION_MASK_DEFAULTS,
  MAX_DISPERSION_MASKS,
  createDefaultDispersionMask,
  dispersionMaskTargets,
} from "./dispersion-masks-values";

const defaultMask = createDefaultDispersionMask();
const uniformUpdateReason =
  "Updates one bounded mask uniform record without changing shader pass count.";

export const dispersionMaskSections: readonly ToolcraftControlSectionSchema[] = [
  {
    controls: {
      items: {
        addLabel: "Add mask",
        applicability: { mode: "always" },
        defaultValue: DISPERSION_MASK_DEFAULTS.items,
        description:
          "Adds up to 12 soft elliptical masks. The visible wave is the union of all masks; with no masks the wave remains unchanged.",
        hardMaxItems: MAX_DISPERSION_MASKS,
        itemControls: {
          center: {
            coordinateMode: "screen",
            defaultValue: defaultMask.center,
            description: "Moves the mask center in screen coordinates.",
            label: "Center",
            max: 1,
            min: -1,
            performanceReason: uniformUpdateReason,
            performanceRole: "responsiveness",
            step: 0.01,
            type: "vector",
            xLabel: "X",
            yLabel: "Y",
          },
          width: {
            defaultValue: defaultMask.width,
            description: "Sets the ellipse diameter along its local X axis.",
            label: "Width",
            max: 200,
            min: 2,
            performanceReason: uniformUpdateReason,
            performanceRole: "responsiveness",
            sliderValueKind: "continuous",
            step: 1,
            type: "slider",
            unit: "%",
          },
          height: {
            defaultValue: defaultMask.height,
            description: "Sets the ellipse diameter along its local Y axis.",
            label: "Height",
            max: 200,
            min: 2,
            performanceReason: uniformUpdateReason,
            performanceRole: "responsiveness",
            sliderValueKind: "continuous",
            step: 1,
            type: "slider",
            unit: "%",
          },
          rotation: {
            defaultValue: defaultMask.rotation,
            description: "Rotates the ellipse around its center.",
            label: "Rotation",
            max: 90,
            min: -90,
            performanceReason: uniformUpdateReason,
            performanceRole: "responsiveness",
            sliderValueKind: "continuous",
            step: 1,
            type: "slider",
            unit: "°",
          },
          blur: {
            defaultValue: defaultMask.blur,
            description: "Softens the mask boundary around the ellipse edge.",
            label: "Blur",
            max: 100,
            min: 0,
            performanceReason: uniformUpdateReason,
            performanceRole: "responsiveness",
            sliderValueKind: "continuous",
            step: 1,
            type: "slider",
            unit: "%",
          },
        },
        itemLabel: "Mask",
        label: "Masks",
        orderRole: "primary",
        performanceReason:
          "Mask count increases the bounded per-fragment union loop up to the fixed 12-mask shader ceiling.",
        performanceRole: "workload",
        recommendedMaxItems: MAX_DISPERSION_MASKS,
        removeLabel: "Remove mask",
        target: dispersionMaskTargets.maskItems,
        type: "collectionActions",
      },
      enabled: {
        applicability: { mode: "always" },
        defaultValue: DISPERSION_MASK_DEFAULTS.enabled,
        description:
          "Switches between the masked composition and the same dispersion output without mask clipping. Preview and export use the selected state.",
        label: "Apply masks",
        orderRole: "detail",
        performanceReason:
          "Switches a bounded shader branch without changing mask cardinality or pass count.",
        performanceRole: "responsiveness",
        target: dispersionMaskTargets.maskEnabled,
        type: "switch",
      },
      preview: {
        applicability: { mode: "always" },
        defaultValue: DISPERSION_MASK_DEFAULTS.preview,
        description:
          "Shows every mask as a translucent red overlay while leaving the wave unmasked. Export never includes this overlay.",
        label: "Show masks",
        orderRole: "detail",
        performanceReason:
          "Switches a bounded shader preview branch without changing mask cardinality or pass count.",
        performanceRole: "responsiveness",
        target: dispersionMaskTargets.maskPreview,
        type: "switch",
      },
    },
    id: "masks",
    layoutGroups: [
      { columns: 2, controls: ["enabled", "preview"], layout: "inline" },
    ],
    layout: "standalone",
    title: "Masks",
  },
];
