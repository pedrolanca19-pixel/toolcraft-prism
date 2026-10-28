import { PRISM_ENTRIES, PRISM_KEYS, prismTarget, type PrismKey } from "./prism-table";

export type PrismPresetValues = Partial<Record<PrismKey, number | string | boolean>>;

/** Overrides applied on top of the defaults, as in the original Prism Field presets. */
export const PRISM_PRESETS: Readonly<Record<string, PrismPresetValues>> = {
  "Prism sheet": {},
  "Aurora silk": {
    palette: "aurora", bands: 0.9, hueRange: 1, dispersion: 0.03, foldFreq: 1.6, warp: 1.1,
    foldSharp: 0.1, bg2: "#06121F", maskEnabled: false, bloom: 0.8, whiten: 0.15, intensity: 1.3,
  },
  "Iridescent glass": {
    palette: "spectrum", hueRange: 1.4, bands: 2.4, bandSharp: 0.35, dispersion: 0.1, foldFreq: 2.8,
    foldSharp: 0.6, relief: 1, specular: 1.6, bloom: 0.6, aberration: 0.01, maskType: "ellipse",
    maskSize: 1.2, maskSoft: 1, intensity: 1.2, whiten: 0.2,
  },
  "Sunset ribbon": {
    palette: "sunset", bands: 0.7, hueRange: 0.9, dispersion: 0.03, foldFreq: 1.3, foldAngle: 70,
    layers: 2, bg2: "#240A1A", maskType: "beam", maskAngle: -25, maskSize: 0.45, maskSoft: 0.5,
    intensity: 1, bloom: 0.6, whiten: 0.12, saturation: 1,
  },
  "Gold wire": {
    palette: "gold", bands: 0.5, hueRange: 0.6, dispersion: 0.01, saturation: 1, foldFreq: 3.4,
    foldSharp: 0.8, detail: 0.03, ridge: 1.4, ridgePow: 4, diffuse: 0.5, bg2: "#120C05",
    maskType: "arc", maskSize: 0.5, intensity: 1, bloom: 0.6, whiten: 0.2,
  },
  "Chromatic ice": {
    palette: "ice", bands: 1.8, hueRange: 1.1, dispersion: 0.12, aberration: 0.012, foldFreq: 2,
    relief: 1, bg2: "#04162A", maskType: "ring", maskSize: 0.9, maskSoft: 0.9, bloom: 0.7,
    intensity: 1.2,
  },
  "Striped neon": {
    palette: "spectrum", bandSharp: 0.9, bandMirror: true, bands: 3, hueRange: 1.2, dispersion: 0.05,
    foldFreq: 4, foldSharp: 0.9, detail: 0, relief: 1, intensity: 0.9, bloom: 0.9,
    bloomThreshold: 0.25, whiten: 0, exposure: 0.9, grain: 0.06, maskEnabled: false, bg2: "#10041E",
  },
  "Soft haze": {
    palette: "pastel", bands: 0.6, hueRange: 0.7, dispersion: 0.02, foldFreq: 0.9, foldSharp: 0,
    warp: 1.4, detail: 0, relief: 0.4, ridge: 1.2, ridgePow: 1.2, intensity: 1.1, saturation: 1.2,
    bg2: "#15152A", maskType: "ellipse", maskSize: 1.4, maskSoft: 1.6, bloom: 0.7, whiten: 0.05,
  },
};

export const PRISM_PRESET_NAMES = Object.keys(PRISM_PRESETS);

/** Backdrop-bottom colors the presets used as the original Background A. */
export const PRISM_PRESET_BACKGROUNDS: Readonly<Record<string, string>> = {
  "Aurora silk": "#02050A",
  "Sunset ribbon": "#0A0408",
  "Gold wire": "#050403",
  "Chromatic ice": "#02060C",
  "Striped neon": "#02020A",
  "Soft haze": "#0B0B14",
};

export function presetControlValues(name: string): Record<string, unknown> {
  const overrides = PRISM_PRESETS[name] ?? {};
  const values: Record<string, unknown> = {};
  for (const key of PRISM_KEYS) {
    values[prismTarget(key)] = key in overrides ? overrides[key] : PRISM_ENTRIES[key].def;
  }
  const background = PRISM_PRESET_BACKGROUNDS[name];
  if (background) values["appearance.background"] = background;
  else values["appearance.background"] = "#04050A";
  return values;
}
