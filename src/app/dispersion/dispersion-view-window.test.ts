import { describe, expect, it } from "vitest";
import { getDispersionViewWindow } from "./dispersion-view-window";

describe("dispersion unbounded view coordinates", () => {
  it("preserves the centered finite image coordinates at the same zoom", () => {
    expect(getDispersionViewWindow({ width: 1440, height: 1000 },
      { zoom: 100, offset: { x: 0, y: 0 } }, 2)).toEqual({
      width: 3840, height: 2160, offsetX: 480, offsetY: 80,
    });
  });
  it("keeps pan in screen pixels and flips only its GL Y direction", () => {
    expect(getDispersionViewWindow({ width: 1440, height: 1000 },
      { zoom: 50, offset: { x: 52, y: -34 } }, 2)).toEqual({
      width: 1920, height: 1080, offsetX: -584, offsetY: -528,
    });
  });
  it("centers the same world origin after viewport resize at Retina scale", () => {
    const view = getDispersionViewWindow({ width: 1600, height: 900 },
      { zoom: 70, offset: { x: 0, y: 0 } }, 4);
    expect((1600 * 4 / 2 + view.offsetX) / view.width).toBeCloseTo(0.5);
    expect((900 * 4 / 2 + view.offsetY) / view.height).toBeCloseTo(0.5);
  });
});
