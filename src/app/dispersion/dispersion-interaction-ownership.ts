import type { ToolcraftInteractionOwnershipEntry } from "../acceptance/types";

import { dispersionTargets } from "./dispersion-values";

export const dispersionInteractionOwnership: readonly ToolcraftInteractionOwnershipEntry[] = [
  {
    alternative: {
      reason:
        "Canvas effect handles would obscure the wave and duplicate exact mode-specific parameters already owned by the panel.",
      surface: "canvas",
    },
    capability: "property-edit",
    evidence: {
      detail:
        "The user explicitly requested a dropdown with dedicated settings for every wave effect.",
      source: "user-request",
    },
    id: "wave-effect-properties",
    reason:
      "A panel selector with conditional built-in controls keeps every effect discoverable, resettable, persistent, and exportable.",
    surface: "panel",
    target: dispersionTargets.effectMode,
  },
  {
    alternative: {
      reason:
        "A canvas toggle would add editor chrome over the light field and duplicate a standard mode switch.",
      surface: "canvas",
    },
    capability: "property-edit",
    evidence: {
      detail:
        "The user requested focal convergence as configurable wave behavior.",
      source: "user-request",
    },
    id: "focal-convergence-enable",
    reason:
      "A panel switch cleanly separates the reference-preserving field from focal behavior and owns conditional controls.",
    surface: "panel",
    target: dispersionTargets.focusEnabled,
  },
  {
    alternative: {
      reason:
        "A canvas gesture cannot express an exact convergence amount without duplicating the panel slider.",
      surface: "canvas",
    },
    capability: "property-edit",
    evidence: {
      detail:
        "The user requested convergence as a configurable wave-behavior control.",
      source: "user-request",
    },
    id: "focal-convergence-strength",
    reason:
      "A panel slider makes the pull amount precise, resettable, persistent, and exportable.",
    surface: "panel",
    target: dispersionTargets.convergence,
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
        "Canvas branch handles would obscure the light field and duplicate exact count and spread values already requested as controls.",
      surface: "canvas",
    },
    capability: "property-edit",
    evidence: {
      detail:
        "The user explicitly requested configurable controls for stronger wave splitting and more varied branch behavior.",
      source: "user-request",
    },
    id: "wave-branch-properties",
    reason:
      "Panel sliders keep branch count and separation deterministic, resettable, persistent, and available to export.",
    surface: "panel",
    target: dispersionTargets.branchCount,
  },
  {
    alternative: {
      reason:
        "A canvas drag would duplicate the same focal-point operation and add persistent editor chrome over the output.",
      surface: "canvas",
    },
    capability: "precise-value-entry",
    evidence: {
      detail:
        "The user asked for the convergence point and its canvas position to be configurable controls.",
      source: "user-request",
    },
    id: "focal-convergence-values",
    reason:
      "The built-in Vector pad provides direct two-axis placement plus exact reset, history, persistence, and settings transfer.",
    surface: "panel",
    target: dispersionTargets.focalPoint,
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
