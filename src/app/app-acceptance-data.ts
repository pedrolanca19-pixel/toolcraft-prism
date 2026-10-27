import type { ToolcraftComponentAcceptance, ToolcraftControlSectionInventoryEntry,
  ToolcraftInteractionOwnershipEntry, ToolcraftProductReadiness,
  ToolcraftTransferMode } from "./acceptance/types";
import { appSchema } from "./app-schema";
import { dispersionEffectAcceptanceDescriptors } from "./dispersion/dispersion-effects-acceptance";
import { lensDistortionAcceptanceDescriptors, lensDistortionInteractionOwnership,
  lensDistortionSectionInventory } from "./dispersion/dispersion-lens-distortion-acceptance";
import {
  dispersionMaskAcceptanceDescriptors,
  dispersionMaskInteractionOwnership,
  dispersionMaskSectionInventory,
} from "./dispersion/dispersion-masks-acceptance";
import { dispersionVideoReferenceStudy } from "./dispersion/dispersion-video-reference-study";
import { dispersionTargets } from "./dispersion/dispersion-values";
import "./dispersion/dispersion-effect-section"; import "./dispersion/dispersion-interaction-ownership"; import "./dispersion/dispersion-section-inventory";
export const DISPERSION_AUTOMATED_ACCEPTANCE_TEST = "Prism Flow maps every control to deterministic canvas pixels";
export function getDispersionAcceptanceId(target: string): string {
  return target.startsWith("dispersion.") ? target : `dispersion.${target}`;
}
export function getDispersionBrowserTestName(target: string): string { return `browser: Prism Flow ${getDispersionAcceptanceId(target)}`; }
const FIXTURE = "The default 1920×1080 rounded Central field at timeline progress 0.23 with the Prism spectrum and a light neutral background.";
function controlAcceptance(
  entry: Omit<
    ToolcraftComponentAcceptance,
    | "automated"
    | "automatedTestName"
    | "browser"
    | "browserTestName"
    | "fixture"
    | "kind"
  >,
): ToolcraftComponentAcceptance {
  return {
    ...entry,
    automated: true,
    automatedTestName: DISPERSION_AUTOMATED_ACCEPTANCE_TEST,
    browser: true,
    browserTestName: getDispersionBrowserTestName(entry.id),
    fixture: FIXTURE,
    id: getDispersionAcceptanceId(entry.id),
    kind: "control",
  };
}
function outputControl(
  id: string,
  componentType: string,
  expectedObservable: string,
  userAction = `Change ${id} through its visible control.`,
): ToolcraftComponentAcceptance {
  return controlAcceptance({
    componentType,
    evidence: "rendered-pixels",
    expectedObservable,
    id,
    target: id,
    userAction,
  });
}
export const dispersionInteractionOwnership: readonly ToolcraftInteractionOwnershipEntry[] = [
  lensDistortionInteractionOwnership,
  ...dispersionMaskInteractionOwnership,
  {
    alternative: {
      reason:
        "A canvas paint gesture would duplicate effect selection and masks while obscuring the pixels being judged.",
      surface: "canvas",
    },
    capability: "property-edit",
    evidence: {
      detail:
        "The request explicitly asks for selectable Sparkle and Paper Grain effects with configurable wave areas and parameters.",
      source: "user-request",
    },
    id: "wave-effect-properties",
    reason:
      "The panel keeps effect branch, area mask, exact values, persistence, and export parity together.",
    surface: "panel",
    target: dispersionTargets.effectMode,
  },
  {
    alternative: {
      reason:
        "A canvas mask handle would duplicate the same exact frame-shape property and obscure the optical preview.",
      surface: "canvas",
    },
    capability: "property-edit",
    evidence: {
      detail:
        "The user explicitly requested configurable canvas shape and corner rounding as settings, not a shape object inside the output.",
      source: "user-request",
    },
    id: "frame-mask-properties",
    reason:
      "Built-in panel controls keep mask selection, exact radius, reset, persistence, and export parity together.",
    surface: "panel",
    target: dispersionTargets.shape,
  },
  {
    alternative: {
      reason:
        "A canvas drag would be less precise for the same vertical/radial placement value and would add editor chrome over the caustic.",
      surface: "canvas",
    },
    capability: "precise-value-entry",
    evidence: {
      detail:
        "The request calls for adjustable distance from edges and field height; exact persistent values are more useful than a duplicated drag gesture.",
      source: "user-request",
    },
    id: "field-placement-values",
    reason:
      "Full-width sliders provide repeatable placement and preserve a clean canvas for judging refraction.",
    surface: "panel",
    target: dispersionTargets.position,
  },
  {
    alternative: {
      reason:
        "Direct canvas manipulation cannot expose refraction, spread, softness, and bend as one discoverable optical recipe without duplicating controls.",
      surface: "canvas",
    },
    capability: "property-edit",
    evidence: {
      detail:
        "A usability comparison favors named optical controls because the reference provides visual behavior but no direct-manipulation affordance.",
      source: "usability-analysis",
    },
    id: "optical-properties",
    reason:
      "The panel groups constant-cost optical properties and gives each one an exact resettable value.",
    surface: "panel",
    target: dispersionTargets.refraction,
  },
  {
    alternative: {
      reason:
        "A canvas drag would duplicate the same two-axis grade and obscure the image whose color is being judged.",
      surface: "canvas",
    },
    capability: "precise-value-entry",
    evidence: {
      detail:
        "The user explicitly asked to restore gamma adjustment through the Pad component.",
      source: "user-request",
    },
    id: "color-balance-values",
    reason:
      "The built-in Color Balance Vector pad keeps both grading axes resettable, persistent, and available to settings transfer and export.",
    surface: "panel",
    target: dispersionTargets.colorBalance,
  },
];
export const appTransferMode: ToolcraftTransferMode = {
  animationIntent: {
    loopDuration: {
      evidence:
        "Speed selects a real-time target pace and the renderer plays a whole number of seamless cycles for the current loop duration. The 60-second default remains a calm forward drift while keeping timeline editing practical.",
      seconds: 60,
      source: "product-derived",
    },
    mode: "timeline-playback",
  },
  mode: "new-toolcraft-app",
  videoReferenceStudy: dispersionVideoReferenceStudy,
};
export const appProductReadiness: ToolcraftProductReadiness = {
  exportIntent: {
    image: { mode: "toolcraft-default" },
    video: { mode: "not-requested" },
  },
  interactionOwnership: dispersionInteractionOwnership,
  mode: "product",
  productName: "Prism Flow",
  productSummary:
    "A deterministic animated chromatic-dispersion canvas with one 38-step 3D light-sheet field, user-owned soft ellipse masks, configurable Sparkle or Paper Grain, and optional Paper Lens Distortion.",
  requestedBehavior:
    "Adjust the central 3D wave, shape it with up to 12 soft ellipse masks and an export-clean mask preview, configure Grain or Sparkle, grade the result through a two-axis Color Balance Pad, optionally apply Paper Lens Distortion, and export the selected timeline frame as PNG or JPG.",
  viewInteraction: {
    mode: "non-spatial",
    reason:
      "The visible product is a two-dimensional procedural optical field with no editable 3D scene, model, or camera orientation.",
  },
};
export const appControlSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] = [
  {
    entity: "Output frame mask",
    entityId: "dispersion-frame",
    groupingReason:
      "Shape and conditional corner radius jointly clip the complete product output rather than creating a separate shape object.",
    id: "frame",
    targets: [dispersionTargets.shape, dispersionTargets.cornerRadius],
    title: "Frame",
  },
  ...dispersionMaskSectionInventory,
  {
    entity: "Chromatic dispersion field",
    entityId: "dispersion-field",
    groupingReason:
      "Mode, placement, inset, band height, refraction, and spectral spread establish the field before its shaping workflow.",
    id: "dispersion-field-foundation",
    splitReason:
      "Foundation values establish placement and primary optics before the shaping workflow.",
    targets: [
      dispersionTargets.mode,
      dispersionTargets.position,
      dispersionTargets.inset,
      dispersionTargets.height,
      dispersionTargets.refraction,
      dispersionTargets.spread,
    ],
    title: "Dispersion Field — Foundation",
    workflowStage: "foundation",
  },
  {
    entity: "Chromatic dispersion field",
    entityId: "dispersion-field",
    groupingReason:
      "Softness, channel separation, tilt, macro-curve, curve depth, and shading finish the same analytic field after its foundation.",
    id: "dispersion-field-shaping",
    splitReason:
      "Shaping values refine the established field without changing its underlying placement workflow.",
    targets: [
      dispersionTargets.softness,
      dispersionTargets.chromaSplit,
      dispersionTargets.bend,
      dispersionTargets.curve,
      dispersionTargets.curveDepth,
      dispersionTargets.shading,
    ],
    title: "Dispersion Field — Shaping",
    workflowStage: "shaping",
  },
  {
    entity: "Wave image texture effect",
    entityId: "dispersion-effects",
    groupingReason:
      "Effect, wave area, and Grain distribution establish where the selected image texture effect is placed before styling.",
    id: "effect-placement",
    splitReason:
      "Placement is selected before the separate Sparkle or Grain appearance workflow.",
    targets: [
      dispersionTargets.effectMode,
      dispersionTargets.effectArea,
      dispersionTargets.grainDistribution,
    ],
    title: "Effect Placement",
    workflowStage: "placement",
  },
  {
    entity: "Wave image texture effect",
    entityId: "dispersion-effects",
    groupingReason:
      "Sparkle and Grain appearance controls disappear together outside their selected branch while preserving values.",
    id: "effect-style",
    splitReason:
      "Appearance tuning follows the placement workflow and keeps both effect branches together.",
    targets: [
      dispersionTargets.sparkle,
      dispersionTargets.sparkleSize,
      dispersionTargets.sparkleTwinkle,
      dispersionTargets.grainAmount,
      dispersionTargets.grainScale,
      dispersionTargets.grainSoftness,
      dispersionTargets.grainDistortion,
      dispersionTargets.grainDrift,
    ],
    title: "Effect Style",
    workflowStage: "style",
  },
  ...lensDistortionSectionInventory,
  {
    entity: "Dispersion spectral treatment",
    entityId: "dispersion-color",
    groupingReason:
      "Spectrum, its custom palette anchors, intensity, and white-caustic glow jointly define the field's color energy.",
    id: "color",
    targets: [
      dispersionTargets.spectrum,
      dispersionTargets.customColorA,
      dispersionTargets.customColorB,
      dispersionTargets.customColorC,
      dispersionTargets.customColorD,
      dispersionTargets.intensity,
      dispersionTargets.glow,
    ],
    title: "Spectrum",
  },
  {
    entity: "Dispersion color balance",
    entityId: "dispersion-color-balance",
    groupingReason:
      "The compound two-axis grading pad is the complete editable surface for stable cyan/red and blue/yellow balance.",
    id: "color-balance",
    targets: [dispersionTargets.colorBalance],
    title: "Color Balance",
  },
  {
    entity: "Seamless dispersion motion",
    entityId: "dispersion-motion",
    groupingReason:
      "Flow, undulation, detail, shimmer, and deterministic seed define the periodic deformation read by timeline playback.",
    id: "motion",
    targets: [
      dispersionTargets.flow,
      dispersionTargets.undulation,
      dispersionTargets.detail,
      dispersionTargets.shimmer,
      dispersionTargets.seed,
    ],
    title: "Motion",
  },
  {
    entity: "Dispersion output background",
    entityId: "dispersion-background",
    groupingReason:
      "Runtime Setup owns whether background is included and the exact color used by preview, Infinity, and export.",
    id: "runtime.setup",
    targets: [dispersionTargets.includeBackground, dispersionTargets.background],
    title: "Setup",
  },
  {
    entity: "Still-image delivery",
    entityId: "dispersion-image-export",
    groupingReason:
      "Format and resolution jointly define runtime image encoding for the selected timeline frame.",
    id: "image-export",
    targets: [dispersionTargets.imageFormat, dispersionTargets.imageResolution],
    title: "Image Export",
  },
];
const runtimeAcceptance: readonly ToolcraftComponentAcceptance[] = [
  {
    automated: true,
    automatedTestName: DISPERSION_AUTOMATED_ACCEPTANCE_TEST,
    browser: true,
    browserTestName: getDispersionBrowserTestName("runtime.settingsTransfer"),
    componentType: "settingsTransfer",
    evidence: "command-side-effect",
    expectedObservable:
      "Settings export and import restore the exact frame, masks, wave, field, effects, Lens Distortion, color, motion, and canvas values used by the deterministic output.",
    fixture: FIXTURE,
    id: getDispersionAcceptanceId("runtime.settingsTransfer"),
    kind: "runtime",
    userAction: "Export settings, change the field, import settings, and inspect the restored output.",
  },
  outputControl(
    "canvas.aspectRatio",
    "aspectRatio",
    "Changing aspect ratio changes the editable product frame while the dispersion remains clipped to the selected mask.",
  ),
  outputControl(
    "canvas.size.width",
    "text",
    "Canvas width changes the logical scene and WebGL backing width.",
  ),
  outputControl(
    "canvas.size.height",
    "text",
    "Canvas height changes the logical scene and WebGL backing height.",
  ),
  {
    automated: true,
    automatedTestName: DISPERSION_AUTOMATED_ACCEPTANCE_TEST,
    browser: true,
    browserTestName: getDispersionBrowserTestName("canvas.renderScale"),
    componentType: "slider",
    evidence: "rendered-pixels",
    expectedObservable:
      "Resolution scale preserves CSS size and allocates exact selected backing pixels during interaction, playback, and steady state.",
    fixture: FIXTURE,
    id: getDispersionAcceptanceId("canvas.renderScale"),
    kind: "runtime",
    renderScaleCoverage: {
      kind: "selected-backing-pixels",
      states: ["interaction", "playback", "steady"],
    },
    target: "canvas.renderScale",
    userAction: "Drag Resolution scale to 2 and compare CSS and WebGL backing dimensions.",
  },
  ...(["mode-and-restoration", "scene-bounds-image-export"] as const).map(
    (coverage): ToolcraftComponentAcceptance => ({
      automated: true,
      automatedTestName: DISPERSION_AUTOMATED_ACCEPTANCE_TEST,
      browser: true,
      browserTestName: getDispersionBrowserTestName(
        `canvas.infinity.${coverage}`,
      ),
      componentType: "canvas",
      evidence:
        coverage === "mode-and-restoration"
          ? "viewport-side-effect"
          : "exported-bytes",
      expectedObservable:
        coverage === "mode-and-restoration"
          ? "Infinity canvas preserves and restores exact finite canvas dimensions while the dispersion scene remains available."
          : "Infinite image export resolves the current product-owned dispersion scene bounds.",
      fixture: FIXTURE,
      id: getDispersionAcceptanceId(`canvas.infinity.${coverage}`),
      infinityCanvasCoverage: coverage,
      kind: "runtime",
      target: "canvas.infinity",
      userAction: "Toggle Infinity, pan and zoom, restore finite mode, and export the bounded output.",
    }),
  ),
];
const productAcceptance: readonly ToolcraftComponentAcceptance[] = [
  {
    ...outputControl(
      dispersionTargets.shape,
      "segmented",
      "Rectangle, Rounded, and Circle clip the complete dispersion output to distinct frame masks.",
      "Choose every Frame shape and compare center and corner pixels.",
    ),
    interactionId: "frame-mask-properties",
    optionCoverage: ["rect", "rounded", "circle"],
  },
  outputControl(
    dispersionTargets.cornerRadius,
    "slider",
    "Corner radius appears only for Rounded and changes the output corner arc without creating a second figure.",
  ),
  ...dispersionMaskAcceptanceDescriptors.map((descriptor) => ({
    ...controlAcceptance({
      componentType: descriptor.componentType,
      evidence: descriptor.evidence ?? "rendered-pixels",
      expectedObservable: descriptor.expectedObservable,
      id: descriptor.id ?? descriptor.target,
      target: descriptor.target,
      userAction: descriptor.userAction,
    }),
    ...(descriptor.controlPartCoverage
      ? { controlPartCoverage: descriptor.controlPartCoverage }
      : {}),
    interactionId: descriptor.interactionId,
  })),
  {
    ...outputControl(
      dispersionTargets.mode,
      "select",
      "Central, Edge Glass, Halo, Diagonal, and Ripple produce five distinct spatial field mappings with the same optical layers.",
      "Choose every Dispersion mode and inspect persistent product pixels.",
    ),
    optionCoverage: ["central", "edge", "halo", "diagonal", "ripple"],
  },
  {
    ...outputControl(
      dispersionTargets.position,
      "slider",
      "Position moves the shared ridge vertically while preserving the frame mask.",
    ),
    interactionId: "field-placement-values",
  },
  outputControl(
    dispersionTargets.inset,
    "slider",
    "Edge inset moves the rim or halo away from the selected frame boundary and also changes field breathing room in line modes.",
  ),
  outputControl(
    dispersionTargets.height,
    "slider",
    "Height changes the refractive band or glass-rim thickness.",
  ),
  {
    ...outputControl(
      dispersionTargets.refraction,
      "slider",
      "Refraction changes the spatial separation of cyan, magenta, and warm spectral channels around the white ridge.",
    ),
    interactionId: "optical-properties",
  },
  outputControl(
    dispersionTargets.spread,
    "slider",
    "Spread changes the distance-driven palette cycle while preserving the same translucent chromatic-lobe behavior.",
  ),
  outputControl(
    dispersionTargets.softness,
    "slider",
    "Softness smooths the volumetric texture into a cleaner gradient and diffuses the march.",
  ),
  outputControl(
    dispersionTargets.chromaSplit,
    "slider",
    "Chromatic split separates the red and blue sheets vertically so the caustic fans into rainbow fringes while zero preserves the reference's single sheet.",
  ),
  outputControl(
    dispersionTargets.bend,
    "slider",
    "Bend tilts the light sheet across the canvas without changing its optical layers.",
  ),
  {
    ...outputControl(
      dispersionTargets.curve,
      "select",
      "Line, Valley, Arch, S-curve, Drape, and Cradle bend the sheet's whole screen trajectory into distinct ribbon shapes.",
      "Choose every Curve profile and inspect the bent trajectory.",
    ),
    optionCoverage: ["line", "valley", "arch", "scurve", "drape", "cradle"],
  },
  outputControl(
    dispersionTargets.curveDepth,
    "slider",
    "Curve depth deepens the selected trajectory bend; zero restores the straight reference path.",
  ),
  outputControl(
    dispersionTargets.shading,
    "slider",
    "Shading lights and shades the sheet by its own slopes so bends read as 3D depth; zero keeps the flat reference emission.",
  ),
  ...dispersionEffectAcceptanceDescriptors.map((descriptor) => ({
    ...outputControl(
      descriptor.target,
      descriptor.componentType,
      descriptor.expectedObservable,
      "userAction" in descriptor ? descriptor.userAction : undefined,
    ),
    ...(descriptor.target === dispersionTargets.effectMode
      ? { interactionId: "wave-effect-properties" }
      : {}),
    ...("optionCoverage" in descriptor
      ? { optionCoverage: descriptor.optionCoverage }
      : {}),
  })),
  ...lensDistortionAcceptanceDescriptors.map(
    ([target, componentType, expectedObservable], index) => ({
      ...outputControl(target, componentType, expectedObservable),
      ...(index === 0
        ? { interactionId: "lens-distortion-properties" }
        : {}),
    }),
  ),
  {
    ...outputControl(
      dispersionTargets.spectrum,
      "select",
      "Prism, Aurora, Sunset, Ice, Porcelain, Dusk, and Mono remap every spectral layer while preserving luminance structure, and Custom re-anchors the palette to the four chosen colors.",
      "Choose every Spectrum and compare the rendered channel palette.",
    ),
    optionCoverage: [
      "prism",
      "aurora",
      "sunset",
      "ice",
      "porcelain",
      "dusk",
      "mono",
      "custom",
    ],
  },
  outputControl(
    dispersionTargets.customColorA,
    "color",
    "Custom color 1 appears only for the Custom spectrum and re-anchors the start of the palette cycle.",
  ),
  outputControl(
    dispersionTargets.customColorB,
    "color",
    "Custom color 2 appears only for the Custom spectrum and re-anchors the cycle's quarter point.",
  ),
  outputControl(
    dispersionTargets.customColorC,
    "color",
    "Custom color 3 appears only for the Custom spectrum and re-anchors the cycle's midpoint.",
  ),
  outputControl(
    dispersionTargets.customColorD,
    "color",
    "Custom color 4 appears only for the Custom spectrum and re-anchors the cycle's three-quarter point.",
  ),
  outputControl(
    dispersionTargets.intensity,
    "slider",
    "Intensity changes chromatic energy without moving the analytic ridge.",
  ),
  outputControl(
    dispersionTargets.glow,
    "slider",
    "Glow changes the thin white caustic and its broad soft-light contribution.",
  ),
  {
    ...outputControl(
      dispersionTargets.colorBalance,
      "vector",
      "Color Balance grades the completed dispersion through independent Cyan/Red and Blue/Yellow axes while the centered Pad leaves output neutral.",
      "Move the Color Balance Pad horizontally and vertically and compare the rendered channel balance.",
    ),
    controlPartCoverage: ["vector.x", "vector.y"],
    interactionId: "color-balance-values",
  },
  outputControl(
    dispersionTargets.flow,
    "slider",
    "Speed retunes the 3D wave in whole forward cycles while keeping first and last frames equal.",
  ),
  outputControl(
    dispersionTargets.undulation,
    "slider",
    "Undulation changes the primary periodic deformation amplitude.",
  ),
  outputControl(
    dispersionTargets.detail,
    "slider",
    "Detail changes the secondary harmonic without adding nondeterministic noise.",
  ),
  outputControl(
    dispersionTargets.shimmer,
    "slider",
    "Shimmer rotates the palette phase, changing which hues lead the spectral pattern.",
  ),
  outputControl(
    dispersionTargets.seed,
    "slider",
    "Seed deterministically changes harmonic phase while preserving the loop seam.",
  ),
  controlAcceptance({
    backgroundOutputCoverage: "all-required-background-output",
    componentType: "switch",
    evidence: "exported-bytes",
    expectedObservable:
      "Background off hides bounded preview color, restores finite mode, and exports transparent PNG outside the dispersion field.",
    id: dispersionTargets.includeBackground,
    target: dispersionTargets.includeBackground,
    userAction: "Toggle Background and export image output.",
  }),
  outputControl(
    dispersionTargets.background,
    "color",
    "Background color changes bounded preview, Infinity viewport, and encoded output.",
  ),
  {
    ...controlAcceptance({
      componentType: "select",
      evidence: "exported-bytes",
      expectedObservable:
        "PNG preserves optional alpha while JPG creates opaque JPEG bytes.",
      id: dispersionTargets.imageFormat,
      target: dispersionTargets.imageFormat,
      userAction: "Export PNG and JPG and inspect their decoded MIME types.",
    }),
    optionCoverage: ["png", "jpg"],
  },
  {
    ...controlAcceptance({
      componentType: "select",
      evidence: "exported-bytes",
      expectedObservable:
        "2K, 4K, and 8K produce exact decoded image dimensions.",
      id: dispersionTargets.imageResolution,
      target: dispersionTargets.imageResolution,
      userAction: "Export every image resolution and decode dimensions.",
    }),
    optionCoverage: ["2k", "4k", "8k"],
  },
  controlAcceptance({
    actionCoverage: ["export.png"],
    componentType: "panelActions",
    evidence: "exported-bytes",
    expectedObservable:
      "The sticky image action shows real progress and downloads a non-empty current-frame dispersion artifact.",
    exportArtifactCoverage: ["all-required-image-export-behavior"],
    id: "export.actions",
    target: "actions.output",
    userAction: "Run Export PNG and decode the artifact.",
  }),
  {
    automated: true,
    automatedTestName: DISPERSION_AUTOMATED_ACCEPTANCE_TEST,
    browser: true,
    browserTestName: getDispersionBrowserTestName("runtime.timeline.playback"),
    componentType: "timeline",
    evidence: "timeline-output",
    expectedObservable:
      "Play advances the optical field, pause freezes it, scrub restores exact frames, duration edits preserve the forward loop, and the seam matches.",
    fixture: FIXTURE,
    id: getDispersionAcceptanceId("runtime.timeline.playback"),
    kind: "runtime",
    timelineCoverage: "playback",
    timelineLoopProof: {
      direction: "forward-only",
      durationChange: "reproved-after-edit",
      reversePlayback: "forbidden",
      seam: "first-last-match",
    },
    timelinePlaybackCoverage: "all-playback-behavior",
    userAction: "Play, pause, scrub, edit duration, and sample the loop seam.",
  },
  {
    automated: true,
    automatedTestName: DISPERSION_AUTOMATED_ACCEPTANCE_TEST,
    browser: true,
    browserTestName: getDispersionBrowserTestName("runtime.persistence.reload"),
    componentType: "persistence",
    evidence: "persistence-state",
    expectedObservable:
      "Values, canvas, controls panel, and timeline restore after a real reload.",
    fixture: FIXTURE,
    id: getDispersionAcceptanceId("runtime.persistence.reload"),
    kind: "runtime",
    persistenceCoverage: "reload",
    persistenceSlices:
      appSchema.persistence.storage === "localStorage"
        ? appSchema.persistence.include
        : [],
    target: "canvas.size.width",
    userAction:
      "Change every persisted slice, wait for persistence, reload, and inspect the restored dispersion output.",
  },
  {
    automated: true,
    automatedTestName: DISPERSION_AUTOMATED_ACCEPTANCE_TEST,
    browser: true,
    browserTestName: getDispersionBrowserTestName("runtime.canvas.viewport"),
    componentType: "canvas",
    evidence: "viewport-side-effect",
    expectedObservable:
      "Drag, zoom, radar, and center preserve playback state while nonessential animation drawing is coalesced.",
    fixture: FIXTURE,
    id: getDispersionAcceptanceId("runtime.canvas.viewport"),
    kind: "runtime",
    target: "canvas.viewport",
    userAction:
      "Drag and zoom the canvas, use radar and center, and verify stable playback/output.",
  },
];
export const appAcceptance: readonly ToolcraftComponentAcceptance[] = [
  ...runtimeAcceptance,
  ...productAcceptance,
];
