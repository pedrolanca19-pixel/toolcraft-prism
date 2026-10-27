export type DispersionViewWindow = Readonly<{
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}>;

/** Logical image coordinates for a viewport-sized raster, in backing pixels.
 * The procedural scene is centered on world zero; screen Y points down, GL Y up. */
export function getDispersionViewWindow(
  viewport: Readonly<{ width: number; height: number }>,
  camera: Readonly<{ zoom: number; offset: Readonly<{ x: number; y: number }> }>,
  backingScale: number,
): DispersionViewWindow {
  const zoom = camera.zoom / 100;
  const width = 1920 * zoom * backingScale;
  const height = 1080 * zoom * backingScale;
  return {
    width,
    height,
    offsetX: (width - viewport.width * backingScale) / 2 - camera.offset.x * backingScale,
    offsetY: (height - viewport.height * backingScale) / 2 + camera.offset.y * backingScale,
  };
}
