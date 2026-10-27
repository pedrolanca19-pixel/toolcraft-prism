export const MAX_DISPERSION_MASKS = 12;

export const dispersionMaskTargets = {
  maskEnabled: "masks.enabled",
  maskItems: "masks.items",
  maskPreview: "masks.preview",
} as const;

export type DispersionMaskCenter = Readonly<{
  x: number;
  y: number;
}>;

export type DispersionMask = Readonly<{
  blur: number;
  center: DispersionMaskCenter;
  height: number;
  rotation: number;
  width: number;
}>;

export type DispersionMaskSettings = Readonly<{
  enabled: boolean;
  items: readonly DispersionMask[];
  preview: boolean;
}>;

export const DISPERSION_MASK_DEFAULTS: DispersionMaskSettings = {
  enabled: true,
  items: [],
  preview: false,
};

export function createDefaultDispersionMask(): DispersionMask {
  return {
    blur: 20,
    center: { x: 0, y: 0 },
    height: 40,
    rotation: 0,
    width: 40,
  };
}

function readNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function readMask(value: unknown): DispersionMask {
  const fallback = createDefaultDispersionMask();
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  const candidate = value as Readonly<Record<string, unknown>>;
  const centerCandidate =
    candidate.center !== null &&
    typeof candidate.center === "object" &&
    !Array.isArray(candidate.center)
      ? (candidate.center as Readonly<Record<string, unknown>>)
      : {};
  return {
    blur: readNumber(candidate.blur, fallback.blur, 0, 100),
    center: {
      x: readNumber(centerCandidate.x, fallback.center.x, -1, 1),
      y: readNumber(centerCandidate.y, fallback.center.y, -1, 1),
    },
    height: readNumber(candidate.height, fallback.height, 2, 200),
    rotation: readNumber(candidate.rotation, fallback.rotation, -90, 90),
    width: readNumber(candidate.width, fallback.width, 2, 200),
  };
}

export function readDispersionMaskSettings(
  values: Readonly<Record<string, unknown>>,
): DispersionMaskSettings {
  const enabled = values[dispersionMaskTargets.maskEnabled];
  const items = values[dispersionMaskTargets.maskItems];
  const preview = values[dispersionMaskTargets.maskPreview];
  return {
    enabled:
      typeof enabled === "boolean" ? enabled : DISPERSION_MASK_DEFAULTS.enabled,
    items: Array.isArray(items)
      ? items.slice(0, MAX_DISPERSION_MASKS).map(readMask)
      : DISPERSION_MASK_DEFAULTS.items,
    preview:
      typeof preview === "boolean" ? preview : DISPERSION_MASK_DEFAULTS.preview,
  };
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const normalized = Math.min(
    1,
    Math.max(0, (value - edge0) / (edge1 - edge0)),
  );
  return normalized * normalized * (3 - 2 * normalized);
}

export function getDispersionMaskCoverageAtPoint(
  mask: DispersionMask,
  screenPoint: DispersionMaskCenter,
  resolution: Readonly<{ height: number; width: number }> = {
    height: 1,
    width: 1,
  },
): number {
  const width = Math.max(1, resolution.width);
  const height = Math.max(1, resolution.height);
  const shortEdge = Math.min(width, height);
  const centerX = (mask.center.x + 1) / 2;
  const centerY = (1 - mask.center.y) / 2;
  const deltaX = (screenPoint.x - centerX) * (width / shortEdge);
  const deltaY = (screenPoint.y - centerY) * (height / shortEdge);
  const angle = (mask.rotation * Math.PI) / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const localX = deltaX * cosine + deltaY * sine;
  const localY = -deltaX * sine + deltaY * cosine;
  const radiusX = mask.width / 200;
  const radiusY = mask.height / 200;
  const distance = Math.hypot(localX / radiusX, localY / radiusY);
  const feather = mask.blur / 100;
  return feather <= 1e-5
    ? distance <= 1
      ? 1
      : 0
    : 1 - smoothstep(1 - feather, 1 + feather, distance);
}

export function getDispersionMaskUnionCoverageAtPoint(
  masks: readonly DispersionMask[],
  screenPoint: DispersionMaskCenter,
  resolution?: Readonly<{ height: number; width: number }>,
): number {
  if (masks.length === 0) return 1;
  return 1 - masks.slice(0, MAX_DISPERSION_MASKS).reduce((remaining, mask) => {
    return (
      remaining *
      (1 - getDispersionMaskCoverageAtPoint(mask, screenPoint, resolution))
    );
  }, 1);
}
