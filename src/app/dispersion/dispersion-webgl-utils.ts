import * as THREE from "three";

export const DISPERSION_EFFECT_AREA_VALUES = {
  all: 0,
  bands: 3,
  core: 1,
  glow: 2,
  veil: 4,
} as const;

export function writeHexSrgb(hex: string, target: THREE.Vector3): void {
  const normalized = hex.replace(/^#/, "");
  const value = Number.parseInt(normalized, 16);
  if (!Number.isFinite(value) || normalized.length !== 6) {
    target.set(0, 0, 0);
    return;
  }
  target.set(
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  );
}
