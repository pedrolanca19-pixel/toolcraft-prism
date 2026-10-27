import type {
  ToolcraftAcceptanceEvidence,
  ToolcraftControlPartCoverage,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftInteractionOwnershipEntry,
} from "../acceptance/types";

import { dispersionMaskTargets } from "./dispersion-masks-values";

export type DispersionMaskAcceptanceDescriptor = Readonly<{
  componentType: string;
  controlPartCoverage?: readonly ToolcraftControlPartCoverage[];
  evidence?: ToolcraftAcceptanceEvidence;
  expectedObservable: string;
  id?: string;
  interactionId: string;
  target: string;
  userAction: string;
}>;

export const dispersionMaskSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] = [
  {
    entity: "Soft ellipse mask collection",
    entityId: "dispersion-masks",
    groupingReason:
      "User-owned ellipse cardinality, per-mask geometry, feathering, and the export-clean preview overlay jointly define the wave visibility mask.",
    id: "masks",
    targets: [
      dispersionMaskTargets.maskEnabled,
      dispersionMaskTargets.maskItems,
      dispersionMaskTargets.maskPreview,
    ],
    title: "Masks",
  },
];

export const dispersionMaskInteractionOwnership: readonly ToolcraftInteractionOwnershipEntry[] = [
  {
    alternative: {
      reason:
        "A canvas gesture would hide a persistent comparison mode and duplicate a simple product setting outside the controls panel.",
      surface: "canvas",
    },
    capability: "property-edit",
    evidence: {
      detail:
        "The user explicitly asks for a toggle that switches between the composition with masks and without masks.",
      source: "user-request",
    },
    id: "masks-application-mode",
    reason:
      "The panel switch keeps the comparison state visible, persistent, resettable, and shared by preview and export.",
    surface: "panel",
    target: dispersionMaskTargets.maskEnabled,
  },
  {
    alternative: {
      reason:
        "Canvas add and remove affordances would duplicate collection cardinality and place editor chrome over the optical output.",
      surface: "canvas",
    },
    capability: "collection-edit",
    evidence: {
      detail:
        "The request explicitly defines plus and minus collection actions for a bounded set of circle masks.",
      source: "user-request",
    },
    id: "masks-collection-edit",
    reason:
      "The built-in collection control keeps add, remove, reset, persistence, and whole-record updates atomic.",
    surface: "panel",
    target: dispersionMaskTargets.maskItems,
  },
  {
    alternative: {
      reason:
        "Canvas handles are deferred, so duplicating center, size, rotation, and blur there would create two authorities for one mask record.",
      surface: "canvas",
    },
    capability: "precise-value-entry",
    evidence: {
      detail:
        "Built-in vector and slider fields provide exact bounded values for every mask property without obscuring the preview.",
      source: "usability-analysis",
    },
    id: "masks-transform-properties",
    reason:
      "Compound collection fields keep each ellipse transform and feather value together in one persistent item.",
    surface: "panel",
    target: dispersionMaskTargets.maskItems,
  },
  {
    alternative: {
      reason:
        "A canvas mode gesture would be undiscoverable and could be mistaken for product content during export.",
      surface: "canvas",
    },
    capability: "property-edit",
    evidence: {
      detail:
        "The request explicitly asks for a Show masks switch whose red overlay is preview-only.",
      source: "user-request",
    },
    id: "masks-preview-mode",
    reason:
      "The panel switch makes preview state explicit while export forces the clean masked composition.",
    surface: "panel",
    target: dispersionMaskTargets.maskPreview,
  },
];

export const dispersionMaskAcceptanceDescriptors: readonly DispersionMaskAcceptanceDescriptor[] = [
  {
    componentType: "collectionActions",
    controlPartCoverage: [
      "collectionActions.add",
      "collectionActions.remove",
      "collectionActions.items",
    ],
    expectedObservable:
      "Adding a mask creates one complete ellipse record, every item field changes that ellipse, overlapping ellipses form a soft union, and removing the final mask removes the complete record from preview and export.",
    interactionId: "masks-collection-edit",
    target: dispersionMaskTargets.maskItems,
    userAction:
      "Add two masks, edit center, width, height, rotation, and blur, then remove the final mask and compare preview and export.",
  },
  {
    componentType: "collectionActions",
    controlPartCoverage: [
      "collectionActions.add",
      "collectionActions.remove",
      "collectionActions.items",
    ],
    expectedObservable:
      "Center moves an ellipse in screen coordinates; width and height set short-edge-relative diameters; rotation turns its axes; and blur changes the soft boundary without changing collection cardinality.",
    id: "masks.items.properties",
    interactionId: "masks-transform-properties",
    target: dispersionMaskTargets.maskItems,
    userAction:
      "Edit every field of one mask record and compare the corresponding ellipse position, axes, angle, and feathered edge.",
  },
  {
    componentType: "switch",
    expectedObservable:
      "Apply masks switches the same composition between soft-union clipping and the full unmasked dispersion output in both preview and export.",
    interactionId: "masks-application-mode",
    target: dispersionMaskTargets.maskEnabled,
    userAction:
      "Add a mask, toggle Apply masks off and on, and compare the unmasked and masked product pixels.",
  },
  {
    componentType: "switch",
    evidence: "exported-bytes",
    expectedObservable:
      "Show masks leaves the wave unmasked and draws a translucent red soft-union overlay in preview, while exported pixels remain masked and never contain the red overlay.",
    interactionId: "masks-preview-mode",
    target: dispersionMaskTargets.maskPreview,
    userAction:
      "Enable Show masks, compare the red preview overlay, then export and confirm the clean masked artifact.",
  },
];
