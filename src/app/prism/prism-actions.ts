import type { ToolcraftPanelActionHandler } from "@/toolcraft/runtime/react";

import { presetValues, randomizeValues, type PrismRandomScope } from "./prism-random";
import { PRISM_PALETTES, prismTarget } from "./prism-table";
import { readPrismSettings, resolvePrismStops } from "./prism-settings";

const SECTION_IDS = new Set<string>([
  "motion", "folds", "surface", "lighting", "highlights", "spectrum", "refraction",
  "glow", "placement", "mask", "backdrop", "finish",
]);

function isScope(value: string): value is PrismRandomScope {
  return value === "all" || value === "colors" || SECTION_IDS.has(value);
}

/** Copies the active preset palette into the four editable stops and selects Custom. */
function editAsCustomValues(values: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const settings = readPrismSettings(values);
  const stops = resolvePrismStops(settings);
  const preset = PRISM_PALETTES.find((palette) => palette.value === settings.palette);
  const hexes = preset?.stops;
  const next: Record<string, unknown> = { [prismTarget("palette")]: "custom" };
  if (stops && hexes) {
    hexes.forEach((hex, index) => {
      next[prismTarget((["c0", "c1", "c2", "c3"] as const)[index] ?? "c0")] = hex;
    });
  }
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

