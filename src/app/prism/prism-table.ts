/**
 * Single source of truth for every Prism Field setting: label, range, default and
 * owning section. The schema, the renderer settings reader and the randomizer are
 * all derived from this table so they cannot drift apart.
 */

export type PrismSectionId =
  | "motion"
  | "folds"
  | "surface"
  | "lighting"
  | "highlights"
  | "spectrum"
  | "refraction"
  | "glow"
  | "placement"
  | "ribs"
  | "mask"
  | "backdrop"
  | "finish";

type NumberEntry = Readonly<{
  def: number;
  /** Optional randomizer bounds; otherwise the default ±25% of the range. */
  kind: "slider" | "int";
  label: string;
  max: number;
  min: number;
  randomMax?: number;
  randomMin?: number;
  section: PrismSectionId;
  step: number;
  unit?: "°";
}>;

type SelectEntry = Readonly<{
  def: string;
  kind: "select";
  label: string;
  options: readonly Readonly<{ label: string; value: string }>[];
  section: PrismSectionId;
}>;

type BoolEntry = Readonly<{
  def: boolean;
  kind: "bool";
  label: string;
  section: PrismSectionId;
}>;

type ColorEntry = Readonly<{
  def: string;
  kind: "color";
  label: string | false;
  section: PrismSectionId;
}>;

export type PrismTableEntry =
  | NumberEntry
  | SelectEntry
  | BoolEntry
  | ColorEntry;

const slider = (
  section: PrismSectionId,
  label: string,
  min: number,
  max: number,
  step: number,
  def: number,
  extra: Partial<Pick<NumberEntry, "randomMax" | "randomMin" | "unit">> = {},
): NumberEntry => ({ def, kind: "slider", label, max, min, section, step, ...extra });

const int = (
  section: PrismSectionId,
  label: string,
  min: number,
  max: number,
  def: number,
): NumberEntry => ({ def, kind: "int", label, max, min, section, step: 1 });

const angle = (
  section: PrismSectionId,
  label: string,
  min: number,
  max: number,
  def: number,
): NumberEntry => ({ def, kind: "slider", label, max, min, section, step: 1, unit: "°" });

export const PRISM_PALETTES = [
  { label: "Spectrum", stops: null, value: "spectrum" },
  { label: "Pastel", stops: ["#FFC6EC", "#C3D2FF", "#BFFBE6", "#FFF0BD"], value: "pastel" },
  { label: "Aurora", stops: ["#18F0A8", "#2F7BFF", "#B04BFF", "#2FF0E0"], value: "aurora" },
  { label: "Sunset", stops: ["#FF4D6D", "#FF9A3C", "#FFD86B", "#B84BFF"], value: "sunset" },
  { label: "Ice", stops: ["#E6FBFF", "#7FD6FF", "#5B7BFF", "#B9F3FF"], value: "ice" },
  { label: "Ember", stops: ["#FF3B1D", "#FF9D1A", "#FFE08A", "#C4144B"], value: "ember" },
  { label: "Gold wire", stops: ["#FFF3C4", "#F2B24D", "#FFFAF0", "#D98A2B"], value: "gold" },
] as const;

export const PRISM_ENTRIES = {
  // Motion: every rate is a whole number of cycles per timeline loop, so the loop is seamless.
  cycles: int("motion", "Cycles per loop", 1, 4, 1),
  flowAngle: angle("motion", "Drift direction", -180, 180, 18),
  flow: slider("motion", "Drift radius", 0, 2, 0.01, 0.22),
  evolve: slider("motion", "Morphing", 0, 2, 0.01, 0.35),
  foldSpeed: int("motion", "Fold travel", -3, 3, 1),
  hueDrift: int("motion", "Hue cycles", -2, 2, 0),

  foldFreq: slider("folds", "Fold density", 0.3, 12, 0.01, 2.2),
  foldAngle: angle("folds", "Fold angle", -180, 180, 38),
  foldSpread: angle("folds", "Layer spread", -90, 90, 38),
  layers: int("folds", "Layer count", 1, 3, 3),
  layerFalloff: slider("folds", "Layer weight", 0.2, 1, 0.01, 0.62),
  foldSharp: slider("folds", "Crease sharpness", 0, 1, 0.01, 0.35),
  foldNoise: slider("folds", "Wobble", 0, 2, 0.01, 0.55),
  foldNoiseScale: slider("folds", "Wobble scale", 0.1, 4, 0.01, 0.8),

  warp: slider("surface", "Warp", 0, 2.5, 0.01, 0.65),
  warpScale: slider("surface", "Warp scale", 0.1, 3, 0.01, 0.7),
  detail: slider("surface", "Micro relief", 0, 0.8, 0.01, 0.06),
  detailScale: slider("surface", "Relief scale", 0.5, 10, 0.01, 3),
  octaves: int("surface", "Detail octaves", 1, 6, 4),
  coverage: slider("surface", "Coverage", 0, 1, 0.01, 1),
  edgeSoft: slider("surface", "Edge softness", 0.01, 1, 0.01, 0.3),
  seed: int("surface", "Seed", 0, 999, 7),

  intensity: slider("lighting", "Prism intensity", 0, 4, 0.01, 1.5, { randomMax: 1.6, randomMin: 1 }),
  relief: slider("lighting", "Relief depth", 0, 1.5, 0.01, 0.9),
  lightAngle: angle("lighting", "Light azimuth", -180, 180, 40),
  lightElev: angle("lighting", "Light elevation", 5, 90, 42),
  ambient: slider("lighting", "Ambient", 0, 1, 0.01, 0.03, { randomMax: 0.12, randomMin: 0 }),
  diffuse: slider("lighting", "Diffuse", 0, 2, 0.01, 1, { randomMax: 1.4, randomMin: 0.6 }),

  specular: slider("highlights", "Specular", 0, 4, 0.01, 1.1, { randomMax: 1.8, randomMin: 0.4 }),
  shine: slider("highlights", "Specular focus", 2, 200, 1, 28),
  rim: slider("highlights", "Rim light", 0, 3, 0.01, 0.75, { randomMax: 1.2, randomMin: 0.2 }),
  rimPower: slider("highlights", "Rim reach", 0.5, 8, 0.01, 2.4),
  ridge: slider("highlights", "Ridge glow", 0, 3, 0.01, 0.7, { randomMax: 1.2, randomMin: 0.2 }),
  ridgePow: slider("highlights", "Ridge focus", 0.5, 8, 0.01, 2.2),
  whiten: slider("highlights", "White core", 0, 1, 0.01, 0.4, { randomMax: 0.4, randomMin: 0 }),

  palette: {
    def: "spectrum",
    kind: "select",
    label: "Palette",
    options: PRISM_PALETTES.map(({ label, value }) => ({ label, value })),
    section: "spectrum",
  } satisfies SelectEntry,
  customColors: { def: false, kind: "bool", label: "Custom colors", section: "spectrum" } satisfies BoolEntry,
  c0: { def: "#FFC6EC", kind: "color", label: false, section: "spectrum" } satisfies ColorEntry,
  c1: { def: "#C3D2FF", kind: "color", label: false, section: "spectrum" } satisfies ColorEntry,
  c2: { def: "#BFFBE6", kind: "color", label: false, section: "spectrum" } satisfies ColorEntry,
  c3: { def: "#FFF0BD", kind: "color", label: false, section: "spectrum" } satisfies ColorEntry,
  hueOffset: slider("spectrum", "Hue shift", 0, 1, 0.005, 0.02),
  hueRange: slider("spectrum", "Spectral range", 0.05, 3, 0.01, 0.75),
  bands: slider("spectrum", "Band density", 0, 8, 0.01, 1.5),
  bandSharp: slider("spectrum", "Band edge", 0, 1, 0.01, 0),
  bandMirror: { def: false, kind: "bool", label: "Mirror bands", section: "spectrum" } satisfies BoolEntry,
  bandAngle: angle("spectrum", "Gradient angle", -180, 180, 60),
  bandGradient: slider("spectrum", "Spatial gradient", -3, 3, 0.01, 0.35),

  tilt: slider("refraction", "Tilt color", -3, 3, 0.01, 0.3),
  tiltAngle: angle("refraction", "Tilt direction", -180, 180, 20),
  dispersion: slider("refraction", "Dispersion", 0, 0.5, 0.001, 0.04, { randomMax: 0.15, randomMin: 0 }),
  saturation: slider("refraction", "Prism saturation", 0, 1.5, 0.01, 0.8, { randomMax: 1.2, randomMin: 0.6 }),

  bloom: slider("glow", "Bloom", 0, 3, 0.01, 0.8, { randomMax: 1.2, randomMin: 0.3 }),
  bloomThreshold: slider("glow", "Bloom Threshold", 0, 1, 0.01, 0.3),
  bloomRadius: slider("glow", "Bloom Radius", 0.2, 4, 0.01, 1.2),
  bloomSpread: slider("glow", "Spread", 0, 1, 0.01, 0.5),
  bloomTint: { def: "#FFFFFF", kind: "color", label: "Bloom Tint", section: "glow" } satisfies ColorEntry,
  bloomTintAmt: slider("glow", "Tint amount", 0, 1, 0.01, 0),
  aberration: slider("glow", "Aberration", 0, 0.03, 0.0005, 0.004, { randomMax: 0.012, randomMin: 0 }),

  zoom: slider("placement", "Zoom", 0.2, 4, 0.01, 1, { randomMax: 2, randomMin: 0.6 }),
  panX: slider("placement", "Position X", -2, 2, 0.01, 0, { randomMax: 0.4, randomMin: -0.4 }),
  panY: slider("placement", "Position Y", -2, 2, 0.01, 0, { randomMax: 0.3, randomMin: -0.3 }),
  rotate: angle("placement", "Prism rotation", -180, 180, 0),
  stretch: slider("placement", "Stretch", 0.25, 4, 0.01, 1),
  persp: slider("placement", "Perspective", -1, 1, 0.01, 0.15),
  mirror: {
    def: "none",
    kind: "select",
    label: "Mirror",
    options: [
      { label: "None", value: "none" },
      { label: "Horizontal", value: "horizontal" },
      { label: "Vertical", value: "vertical" },
      { label: "Both", value: "both" },
    ],
    section: "placement",
  } satisfies SelectEntry,

  // Fluted (reeded) glass: ribs that each act as a cylindrical lens in front of the sheet.
  ribsEnabled: { def: false, kind: "bool", label: "Use glass ribs", section: "ribs" } satisfies BoolEntry,
  ribCount: int("ribs", "Number of ribs", 2, 120, 28),
  ribWidth: slider("ribs", "Rib width", 0.3, 1, 0.01, 0.92),
  ribIrregular: slider("ribs", "Irregularity", 0, 1, 0.01, 0.35),
  ribAngle: angle("ribs", "Orientation", -60, 60, 0),
  ribLens: slider("ribs", "Lens strength", 0, 8, 0.01, 1.4),
  ribShift: slider("ribs", "Lens displacement", 0, 2, 0.01, 0.25),
  ribEdge: slider("ribs", "Edge glow", 0, 3, 0.01, 0.8),
  ribEdgeWidth: slider("ribs", "Edge width", 0.02, 0.5, 0.01, 0.12),

  maskEnabled: { def: true, kind: "bool", label: "Use mask", section: "mask" } satisfies BoolEntry,
  maskType: {
    def: "beam",
    kind: "select",
    label: "Shape",
    options: [
      { label: "Beam", value: "beam" },
      { label: "Ellipse", value: "ellipse" },
      { label: "Arc", value: "arc" },
      { label: "Ring", value: "ring" },
      { label: "Image", value: "image" },
    ],
    section: "mask",
  } satisfies SelectEntry,
  maskAngle: angle("mask", "Mask angle", -180, 180, 18),
  maskX: slider("mask", "Mask X", -1.5, 1.5, 0.01, 0, { randomMax: 0.3, randomMin: -0.3 }),
  maskY: slider("mask", "Mask Y", -1, 1, 0.01, 0, { randomMax: 0.2, randomMin: -0.2 }),
  maskSize: slider("mask", "Mask size", 0.05, 2, 0.01, 0.5, { randomMax: 0.8, randomMin: 0.3 }),
  maskSoft: slider("mask", "Mask softness", 0.01, 2, 0.01, 0.7, { randomMax: 1, randomMin: 0.3 }),
  maskWarp: slider("mask", "Organic edge", 0, 1, 0.01, 0.35),
  maskInvert: { def: false, kind: "bool", label: "Invert mask", section: "mask" } satisfies BoolEntry,

  bg2: { def: "#0A1030", kind: "color", label: "Backdrop color", section: "backdrop" } satisfies ColorEntry,
  bgAngle: angle("backdrop", "Backdrop angle", -180, 180, 90),
  bgAmount: slider("backdrop", "Backdrop amount", 0, 1, 0.01, 1),

  exposure: slider("finish", "Exposure", 0.2, 3, 0.01, 1, { randomMax: 1.6, randomMin: 0.7 }),
  contrast: slider("finish", "Prism contrast", 0.5, 2, 0.01, 1.05, { randomMax: 1.4, randomMin: 0.9 }),
  vignette: slider("finish", "Vignette", 0, 1, 0.01, 0.3),
  grain: slider("finish", "Film grain", 0, 0.3, 0.005, 0.035),
} satisfies Record<string, PrismTableEntry>;

export type PrismKey = keyof typeof PRISM_ENTRIES;

export const PRISM_KEYS = Object.keys(PRISM_ENTRIES) as readonly PrismKey[];

export const prismTarget = (key: PrismKey): string => `prism.${key}`;

/** Runtime-owned Background pair, authored once and relocated into Setup. */
export const PRISM_BACKGROUND_TARGET = "appearance.background";
export const PRISM_BACKGROUND_DEFAULT = "#04050A";
export const PRISM_INCLUDE_BACKGROUND_TARGET = "export.includeBackground";
