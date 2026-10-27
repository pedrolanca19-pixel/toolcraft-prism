import { describe, expect, it } from "vitest";

import { appSchema } from "./app-schema";
import { dispersionTargets } from "./dispersion/dispersion-values";

function findSection(id: string) {
  return appSchema.panels.controls?.sections.find(
    (section) => section.id === id,
  );
}

describe("dispersion schema sections", () => {
  it("keeps the field mode select and the trajectory curve in the field section", () => {
    const foundation = findSection("dispersion-field-foundation");
    const shaping = findSection("dispersion-field-shaping");
    expect(foundation?.controls.mode).toMatchObject({
      target: dispersionTargets.mode,
      type: "select",
    });
    expect(shaping?.controls.curve).toMatchObject({
      applicability: { mode: "always" },
      target: dispersionTargets.curve,
      type: "select",
    });
    const curve = shaping?.controls.curve;
    const curveOptions =
      curve && "options" in curve
        ? (curve.options ?? []).map((option) => option.value)
        : [];
    expect(curveOptions).toEqual([
      "line",
      "valley",
      "arch",
      "scurve",
      "drape",
      "cradle",
    ]);
    expect(shaping?.controls.curveDepth).toMatchObject({
      defaultValue: 0,
      target: dispersionTargets.curveDepth,
      type: "slider",
    });
  });

  it("keeps corner radius conditional on the rounded frame", () => {
    const frame = findSection("frame");
    expect(frame?.controls.cornerRadius?.applicability).toMatchObject({
      mode: "conditional",
    });
  });

  it("places the bounded compound mask collection immediately after Frame", () => {
    const sections = appSchema.panels.controls?.sections ?? [];
    expect(sections.findIndex((section) => section.id === "masks")).toBe(
      sections.findIndex((section) => section.id === "frame") + 1,
    );
    const masks = findSection("masks");
    expect(masks?.controls.items).toMatchObject({
      addLabel: "Add mask",
      defaultValue: [],
      hardMaxItems: 12,
      recommendedMaxItems: 12,
      removeLabel: "Remove mask",
      target: dispersionTargets.maskItems,
      type: "collectionActions",
    });
    const items = masks?.controls.items;
    expect(items && "itemControls" in items ? items.itemControls : undefined)
      .toMatchObject({
        blur: { defaultValue: 20, max: 100, min: 0, type: "slider" },
        center: {
          coordinateMode: "screen",
          defaultValue: { x: 0, y: 0 },
          max: 1,
          min: -1,
          type: "vector",
        },
        height: { defaultValue: 40, max: 200, min: 2, type: "slider" },
        rotation: { defaultValue: 0, max: 90, min: -90, type: "slider" },
        width: { defaultValue: 40, max: 200, min: 2, type: "slider" },
      });
    expect(masks?.controls.preview).toMatchObject({
      defaultValue: false,
      target: dispersionTargets.maskPreview,
      type: "switch",
    });
  });

  it("restores Color Balance as the built-in two-axis Pad", () => {
    const colorBalance = findSection("color-balance");
    expect(colorBalance?.controls.balance).toMatchObject({
      applicability: { mode: "always" },
      coordinateMode: "cartesian",
      defaultValue: { x: 0, y: 0 },
      target: dispersionTargets.colorBalance,
      type: "vector",
      variant: "colorBalance",
      xLabel: "Cyan / Red",
      yLabel: "Blue / Yellow",
    });
  });
});
