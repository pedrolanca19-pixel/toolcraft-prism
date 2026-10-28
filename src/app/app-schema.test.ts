import { describe, expect, it } from "vitest";

import { appSchema, PRISM_LOOP_SECONDS } from "./app-schema";
import { PRISM_PRESETS, presetControlValues } from "./prism/prism-presets";
import { randomizeValues } from "./prism/prism-random";
import { getPrismMotion, readPrismSettings } from "./prism/prism-settings";
import {
  PRISM_ENTRIES,
  PRISM_KEYS,
  PRISM_PALETTES,
  prismTarget,
} from "./prism/prism-table";

function allControls() {
  return (appSchema.panels.controls?.sections ?? []).flatMap((section) =>
    Object.values(section.controls),
  );
}

describe("Prism Field schema", () => {
  it("is an editable-output canvas with render scale and a playback timeline", () => {
    expect(appSchema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(appSchema.canvas.upload).toBe(false);
    expect(appSchema.canvas.size).toMatchObject({ height: 1080, width: 1920 });
    expect(appSchema.panels.timeline).toMatchObject({
      defaultDurationSeconds: PRISM_LOOP_SECONDS,
      enabled: true,
      mode: "playback",
    });
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.modulePlan.modules.map(({ id }) => id)).toEqual(
      expect.arrayContaining(["image-export", "video-export", "timeline"]),
    );
  });

  it("exposes every table entry as a control with the table default", () => {
    const controls = new Map(allControls().map((control) => [control.target, control]));
    for (const key of PRISM_KEYS) {
      const control = controls.get(prismTarget(key));
      expect(control, key).toBeDefined();
      expect(control?.defaultValue, key).toBe(PRISM_ENTRIES[key].def);
    }
  });

  it("keeps the palette stops visible only for custom colors", () => {
    const stop = allControls().find((control) => control.target === prismTarget("c0"));
    expect(stop?.applicability).toMatchObject({
      all: [{ equals: true, target: prismTarget("customColors") }],
      mode: "conditional",
    });
  });
});

describe("Prism Field settings", () => {
  it("reads defaults for an empty state and clamps out-of-range values", () => {
    const settings = readPrismSettings({});
    for (const key of PRISM_KEYS) expect(settings[key]).toBe(PRISM_ENTRIES[key].def);
    expect(settings.includeBackground).toBe(true);
    const clamped = readPrismSettings({
      [prismTarget("foldFreq")]: 999,
      [prismTarget("layers")]: 2.4,
      [prismTarget("maskType")]: "nonsense",
    });
    expect(clamped.foldFreq).toBe(12);
    expect(clamped.layers).toBe(2);
    expect(clamped.maskType).toBe("beam");
  });

  it("applies every preset with valid values", () => {
    for (const name of Object.keys(PRISM_PRESETS)) {
      const settings = readPrismSettings(presetControlValues(name));
      for (const key of PRISM_KEYS) {
        const entry = PRISM_ENTRIES[key];
        if (entry.kind === "slider" || entry.kind === "int") {
          expect(settings[key], `${name}.${key}`).toBeGreaterThanOrEqual(entry.min);
          expect(settings[key], `${name}.${key}`).toBeLessThanOrEqual(entry.max);
        }
      }
    }
    expect(PRISM_PALETTES.map(({ value }) => value)).toContain(
      readPrismSettings(presetControlValues("Aurora silk")).palette,
    );
  });

  it("randomizes within the control ranges", () => {
    let seed = 12345;
    const random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    for (let round = 0; round < 40; round += 1) {
      const settings = readPrismSettings(randomizeValues("all", random));
      for (const key of PRISM_KEYS) {
        const entry = PRISM_ENTRIES[key];
        if (entry.kind === "slider" || entry.kind === "int") {
          expect(settings[key]).toBeGreaterThanOrEqual(entry.min);
          expect(settings[key]).toBeLessThanOrEqual(entry.max);
        }
      }
    }
  });

  it("loops seamlessly: the wrapped frame animates exactly like frame zero", () => {
    for (const cycles of [1, 2, 4]) {
      const settings = readPrismSettings({
        [prismTarget("cycles")]: cycles,
        [prismTarget("foldSpeed")]: -2,
        [prismTarget("hueDrift")]: 1,
      });
      expect(getPrismMotion(settings, 1)).toEqual(getPrismMotion(settings, 0));
      expect(getPrismMotion(settings, 0.1)).not.toEqual(getPrismMotion(settings, 0));
    }
  });
});
