import { PRISM_PRESET_NAMES, presetControlValues } from "./prism-presets";
import {
  PRISM_BACKGROUND_TARGET,
  PRISM_ENTRIES,
  PRISM_KEYS,
  PRISM_PALETTES,
  prismTarget,
  type PrismKey,
  type PrismSectionId,
} from "./prism-table";

export type PrismRandomScope = PrismSectionId | "all" | "colors";

type Random = () => number;

const between = (random: Random, min: number, max: number): number => min + random() * (max - min);

function hslHex(hue: number, saturation: number, lightness: number): string {
  const h = ((hue % 1) + 1) % 1;
  const channel = (n: number): number => {
    const k = (n + h * 12) % 12;
    const a = saturation * Math.min(lightness, 1 - lightness);
    return lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return `#${[channel(0), channel(8), channel(4)]
    .map((value) => Math.round(value * 255).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function randomColors(random: Random): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  if (random() < 0.35) {
    const hue = random();
    const spread = between(random, 0.08, 0.3);
    values[prismTarget("palette")] = "custom";
    (["c0", "c1", "c2", "c3"] as const).forEach((key, index) => {
      values[prismTarget(key)] = hslHex(
        hue + (index - 1.5) * spread,
        between(random, 0.55, 1),
        between(random, 0.55, 0.8),
      );
    });
  } else {
    const presets = PRISM_PALETTES.filter((palette) => palette.value !== "custom");
    values[prismTarget("palette")] = presets[Math.floor(random() * presets.length)]?.value ?? "spectrum";
  }
  const hue = random();
  values[PRISM_BACKGROUND_TARGET] = hslHex(hue, between(random, 0.2, 0.7), between(random, 0.012, 0.035));
  values[prismTarget("bg2")] = hslHex(
    hue + between(random, -0.1, 0.1),
    between(random, 0.3, 0.8),
    between(random, 0.04, 0.12),
  );
  return values;
}

function randomKey(key: PrismKey, random: Random): unknown {
  const entry = PRISM_ENTRIES[key];
  switch (entry.kind) {
    case "slider": {
      const span = entry.max - entry.min;
      const low = entry.randomMin ?? Math.max(entry.min, entry.def - span * 0.25);
      const high = entry.randomMax ?? Math.min(entry.max, entry.def + span * 0.25);
      const value = between(random, low, high);
      const snapped = Math.round(value / entry.step) * entry.step;
      return Number(Math.min(entry.max, Math.max(entry.min, snapped)).toFixed(6));
    }
    case "int":
      return Math.round(between(random, entry.min, entry.max));
    case "select": {
      const options = entry.options;
      if (key === "mirror") {
        // Mirroring is rare so most random looks keep one coherent sheet.
        return random() < 0.75 ? "none" : options[Math.floor(random() * options.length)]?.value;
      }
      if (key === "maskType") {
        const weighted = ["none", "beam", "beam", "ellipse", "arc", "ring"];
        return weighted[Math.floor(random() * weighted.length)];
      }
      return options[Math.floor(random() * options.length)]?.value ?? entry.def;
    }
    case "bool":
      return random() < 0.25;
    case "color":
      return entry.def;
  }
}

/** Values for one randomize action, ready for a single `controls.apply` command. */
export function randomizeValues(
  scope: PrismRandomScope,
  random: Random = Math.random,
): Record<string, unknown> {
  if (scope === "colors") return randomColors(random);
  const values: Record<string, unknown> = {};
  for (const key of PRISM_KEYS) {
    const entry = PRISM_ENTRIES[key];
    if (scope !== "all" && entry.section !== scope) continue;
    if (entry.section === "spectrum" && (key === "palette" || /^c[0-3]$/.test(key))) continue;
    if (key === "bg2") continue;
    if (entry.kind === "color") continue;
    values[prismTarget(key)] = randomKey(key, random);
  }
  if (scope === "all" || scope === "spectrum" || scope === "backdrop") {
    Object.assign(values, randomColors(random));
    if (scope === "backdrop") delete values[prismTarget("palette")];
    if (scope === "backdrop") {
      for (const key of ["c0", "c1", "c2", "c3"] as const) delete values[prismTarget(key)];
      delete values[PRISM_BACKGROUND_TARGET];
    }
    if (scope === "spectrum") {
      delete values[PRISM_BACKGROUND_TARGET];
      delete values[prismTarget("bg2")];
    }
  }
  if (scope === "all" || scope === "surface") {
    values[prismTarget("seed")] = Math.floor(random() * 1000);
  }
  return values;
}

/** Preset action values: every Prism target at its default plus the preset's overrides. */
export function presetValues(name: string): Record<string, unknown> | null {
  return PRISM_PRESET_NAMES.includes(name) ? presetControlValues(name) : null;
}
