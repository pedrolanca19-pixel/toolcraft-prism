import type { ToolcraftPanelActionHandler } from "@/toolcraft/runtime/react";

import { presetValues, randomizeValues, type PrismRandomScope } from "./prism-random";
import { PRISM_PALETTES, prismTarget } from "./prism-table";
import { readPrismSettings } from "./prism-settings";

const SECTION_IDS = new Set<string>([
  "motion", "folds", "surface", "lighting", "highlights", "spectrum", "refraction",
  "glow", "placement", "ribs", "mask", "backdrop", "finish",
]);

function isScope(value: string): value is PrismRandomScope {
  return value === "all" || value === "colors" || SECTION_IDS.has(value);
}

function wheelHex(hue: number): string {
  const channel = (offset: number): number => {
    const c = Math.min(1, Math.max(0, Math.abs((((hue * 6 + offset) % 6) + 6) % 6 - 3) - 1));
    return c * c * (3 - 2 * c);
  };
  return `#${[channel(0), channel(4), channel(2)]
    .map((value) => Math.round(value * 255).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

/** Copies the active palette (preset stops or four samples of the hue wheel) into the custom stops. */
function editAsCustomValues(values: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const settings = readPrismSettings(values);
  const preset = PRISM_PALETTES.find((palette) => palette.value === settings.palette);
  const hexes =
    preset?.stops ??
    [0, 1, 2, 3].map((index) => wheelHex(((index / 4) * settings.hueRange + settings.hueOffset) % 1));
  const next: Record<string, unknown> = { [prismTarget("customColors")]: true };
  hexes.forEach((hex, index) => {
    next[prismTarget((["c0", "c1", "c2", "c3"] as const)[index] ?? "c0")] = hex;
  });
  return next;
}

export const prismPanelActionHandler: ToolcraftPanelActionHandler = ({ action, dispatch, state }) => {
  const separator = action.value.indexOf(":");
  const kind = action.value.slice(0, separator);
  const name = action.value.slice(separator + 1);
  if (kind === "preset") {
    const values = presetValues(name);
    if (values) dispatch({ label: `Preset ${name}`, type: "controls.apply", values });
    return;
  }
  if (kind === "random" && isScope(name)) {
    dispatch({
      label: name === "all" ? "Randomize all" : `Randomize ${name}`,
      type: "controls.apply",
      values: randomizeValues(name),
    });
    return;
  }
  if (action.value === "palette:custom") {
    dispatch({ label: "Edit palette as custom", type: "controls.apply", values: editAsCustomValues(state.values) });
  }
};

