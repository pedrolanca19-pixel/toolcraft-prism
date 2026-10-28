import { describe, expect, it } from "vitest";

import { deriveToolcraftPerformancePaths } from "@/toolcraft/runtime";

import { appPerformance } from "../app-performance";
import { appSchema } from "../app-schema";
import { PRISM_AUTOMATED_ACCEPTANCE_TEST } from "./prism-acceptance";
import { PRISM_SCENE_SHADER } from "./prism-shaders";
import { readPrismSettings } from "./prism-settings";
import { PRISM_ENTRIES, PRISM_KEYS, prismTarget } from "./prism-table";

const RESOLVED_BY_PALETTE = new Set(["palette", "customColors", "c0", "c1", "c2", "c3"]);

function alternativeValue(key: (typeof PRISM_KEYS)[number]): unknown {
  const entry = PRISM_ENTRIES[key];
  switch (entry.kind) {
    case "slider":
    case "int": {
      const candidate = entry.def === entry.max ? entry.min : entry.max;
      return candidate;
    }
    case "bool":
      return !entry.def;
    case "select":
      return entry.options.find((option) => option.value !== entry.def)?.value;
    case "color":
      return entry.def === "#123456" ? "#654321" : "#123456";
  }
}

describe("Prism Field product", () => {
  it(PRISM_AUTOMATED_ACCEPTANCE_TEST, () => {
    const defaults = readPrismSettings({});
    for (const key of PRISM_KEYS) {
      const changed = readPrismSettings({ [prismTarget(key)]: alternativeValue(key) });
      expect(changed[key], `${key} reaches the renderer settings`).not.toBe(defaults[key]);
      if (!RESOLVED_BY_PALETTE.has(key)) {
        expect(PRISM_SCENE_SHADER, `${key} is declared as a shader uniform`).toContain(`u_${key};`);
      }
    }
  });

  it("Prism Field performance config derives every scenario from the canonical pipeline", () => {
    const paths = deriveToolcraftPerformancePaths(appSchema, appPerformance);
    const scenarioPaths = appPerformance.scenarios.map((scenario) => scenario.pathId);
    expect(new Set(scenarioPaths).size).toBe(scenarioPaths.length);
    expect([...scenarioPaths].sort()).toEqual(paths.map((path) => path.id).sort());
    for (const scenario of appPerformance.scenarios) {
      const path = paths.find((candidate) => candidate.id === scenario.pathId);
      expect(scenario.coversTargets).toEqual(path?.targets);
    }
  });
});
