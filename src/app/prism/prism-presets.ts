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
  // Reeded-glass poster look: black field, ribs that each show a flipped slice of a cyan, blue
  // and white light, orange bloom and heavy grain. Works best on a portrait canvas.
  "Fluted glass": {
    cycles: 1, flowAngle: 18, flow: 0.22, evolve: 0.35, foldSpeed: 1, hueDrift: 0,
    foldFreq: 0.9, foldAngle: 38, foldSpread: 38, layers: 3, layerFalloff: 0.62, foldSharp: 0.2,
    foldNoise: 1, foldNoiseScale: 0.8, warp: 1, warpScale: 0.4, detail: 0, detailScale: 3,
    octaves: 4, coverage: 1, edgeSoft: 0.3, seed: 7, intensity: 1.7, relief: 0.2,
    lightAngle: 40, lightElev: 42, ambient: 0.35, diffuse: 0.2, specular: 0, shine: 28, rim: 0,
    rimPower: 2.4, ridge: 1.2, ridgePow: 1, whiten: 0.1, palette: "spectrum",
    customColors: true, c0: "#0A2BFF", c1: "#10E4F0", c2: "#FFFFFF", c3: "#2A6BFF",
    hueOffset: 0.02, hueRange: 1, bands: 0.8, bandSharp: 0, bandMirror: true, bandAngle: 60,
    bandGradient: 2, tilt: 0.3, tiltAngle: 20, dispersion: 0.12, saturation: 0.8, bloom: 1,
    bloomThreshold: 0.45, bloomRadius: 2.2, bloomSpread: 0.6, bloomTint: "#FF5A14",
    bloomTintAmt: 0.6, aberration: 0.012, zoom: 1, panX: 0, panY: 0, rotate: 0, stretch: 1,
    persp: 0.15, mirror: "y", ribsEnabled: true, ribCount: 20, ribWidth: 0.92,
    ribIrregular: 0.9, ribAngle: 0, ribLens: 7, ribShift: 0.25, ribEdge: 1.4,
    ribEdgeWidth: 0.07, maskEnabled: true, maskType: "beam", maskAngle: 90, maskX: 0.46,
    maskY: 0, maskSize: 1.2, maskSoft: 0.45, maskWarp: 1, maskInvert: false, bg2: "#0A1030",
    bgAngle: 90, bgAmount: 0, exposure: 0.85, contrast: 2.2, vignette: 0, grain: 0.14,
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
  "Fluted glass": "#050506",
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
