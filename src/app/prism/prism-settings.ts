import {
  PRISM_BACKGROUND_DEFAULT,
  PRISM_BACKGROUND_TARGET,
  PRISM_ENTRIES,
  PRISM_INCLUDE_BACKGROUND_TARGET,
  PRISM_KEYS,
  PRISM_PALETTES,
  prismTarget,
  type PrismKey,
  type PrismTableEntry,
} from "./prism-table";

type SettingValue<Entry extends PrismTableEntry> = Entry extends {
  kind: "slider" | "int";
}
  ? number
  : Entry extends { kind: "bool" }
    ? boolean
    : string;

export type PrismControlSettings = {
  -readonly [Key in PrismKey]: SettingValue<(typeof PRISM_ENTRIES)[Key]>;
};

export type PrismSettings = PrismControlSettings & {
  background: string;
  includeBackground: boolean;
};

export type PrismRgb = readonly [number, number, number];

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function readEntry(entry: PrismTableEntry, value: unknown): number | string | boolean {
  switch (entry.kind) {
    case "slider":
    case "int": {
      const clamped = clampNumber(value, entry.min, entry.max, entry.def);
      return entry.kind === "int" ? Math.round(clamped) : clamped;
    }
    case "bool":
      return typeof value === "boolean" ? value : entry.def;
    case "select":
      return entry.options.some((option) => option.value === value)
        ? (value as string)
        : entry.def;
    case "color":
      return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
        ? value.toUpperCase()
        : entry.def;
  }
}

export function readPrismSettings(
  values: Readonly<Record<string, unknown>>,
): PrismSettings {
  const settings: Record<string, number | string | boolean> = {};
  for (const key of PRISM_KEYS) {
    settings[key] = readEntry(PRISM_ENTRIES[key], values[prismTarget(key)]);
  }
  const background = values[PRISM_BACKGROUND_TARGET];
  settings.background =
    typeof background === "string" && /^#[0-9a-f]{6}$/i.test(background)
      ? background.toUpperCase()
      : PRISM_BACKGROUND_DEFAULT;
  settings.includeBackground =
    values[PRISM_INCLUDE_BACKGROUND_TARGET] === false ? false : true;
  return settings as PrismSettings;
}

export function hexToRgb(hex: string): PrismRgb {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#000000";
  return [1, 3, 5].map((index) =>
    parseInt(value.slice(index, index + 2), 16) / 255,
  ) as unknown as PrismRgb;
}

/** Four gradient stops for the active palette; `null` selects the hue wheel. */
export function resolvePrismStops(
  settings: PrismSettings,
): readonly [PrismRgb, PrismRgb, PrismRgb, PrismRgb] | null {
  if (!settings.customColors && settings.palette === "spectrum") return null;
  const preset = PRISM_PALETTES.find((palette) => palette.value === settings.palette);
  const hexes = settings.customColors
    ? ([settings.c0, settings.c1, settings.c2, settings.c3] as const)
    : (preset?.stops ?? ([settings.c0, settings.c1, settings.c2, settings.c3] as const));
  return hexes.map(hexToRgb) as unknown as readonly [PrismRgb, PrismRgb, PrismRgb, PrismRgb];
}

export type PrismMotion = Readonly<{
  /** Noise-domain loop circle: x offset, y (third noise axis). */
  evolve: readonly [number, number];
  drift: readonly [number, number];
  /** Fold phase in radians. */
  foldPhase: number;
  /** Hue drift in whole hue cycles. */
  hueCycles: number;
}>;

const TAU = Math.PI * 2;

/** Fractional part that stays in [0, 1) for negative inputs. */
const fract = (value: number): number => value - Math.floor(value);

/**
 * Every moving quantity is a whole number of revolutions per loop, so frame 0 and the
 * wrapped frame are identical and playback only ever moves forward.
 */
export function getPrismMotion(
  settings: PrismSettings,
  progress: number,
): PrismMotion {
  const theta = TAU * fract(settings.cycles * progress);
  const driftStart = (settings.flowAngle * Math.PI) / 180;
  const driftRadius = settings.flow * 3;
  const evolveRadius = settings.evolve * 2.2;
  return {
    drift: [
      driftRadius * Math.cos(theta + driftStart),
      driftRadius * Math.sin(theta + driftStart),
    ],
    evolve: [evolveRadius * Math.cos(theta), evolveRadius * Math.sin(theta)],
    // Reduced to one revolution so the wrapped frame feeds the shader the same uniforms as frame 0.
    foldPhase: TAU * fract(settings.foldSpeed * settings.cycles * progress),
    hueCycles: fract(settings.hueDrift * settings.cycles * progress),
  };
}
