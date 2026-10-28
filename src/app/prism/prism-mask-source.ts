import type { ToolcraftMediaTransform } from "@/toolcraft/runtime";

/** Target of the Mask image upload; the runtime keeps the file, this module keeps its decoded pixels. */
export const PRISM_MASK_IMAGE_TARGET = "prism.maskImage";

/** Longest decoded side kept for the mask texture; larger uploads are scaled down once. */
const MASK_MAX_SIDE = 2048;

export type PrismMaskSource = Readonly<{
  bitmap: ImageBitmap;
  height: number;
  /** Changes whenever the pixels change, so GL contexts upload again only when needed. */
  version: number;
  width: number;
}>;

let current: PrismMaskSource | null = null;
let version = 0;
const listeners = new Set<() => void>();

export function getPrismMaskSource(): PrismMaskSource | null {
  return current;
}

export function subscribePrismMaskSource(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setPrismMaskSource(bitmap: ImageBitmap | null): void {
  const previous = current;
  version += 1;
  current = bitmap ? { bitmap, height: bitmap.height, version, width: bitmap.width } : null;
  for (const listener of listeners) listener();
  previous?.bitmap.close();
}

/** Decodes an uploaded image and applies the runtime rotate and flip actions. */
export async function decodePrismMask(
  url: string,
  transform: ToolcraftMediaTransform | undefined,
  signal: AbortSignal,
): Promise<ImageBitmap> {
  const response = await fetch(url, { signal });
  const source = await createImageBitmap(await response.blob());
  const rotation = transform?.rotationDeg ?? 0;
  const flipH = transform?.flipHorizontal === true;
  const flipV = transform?.flipVertical === true;
  const scale = Math.min(1, MASK_MAX_SIDE / Math.max(source.width, source.height));
  if (scale === 1 && rotation === 0 && !flipH && !flipV) return source;
  const quarter = rotation === 90 || rotation === 270;
  const width = Math.max(1, Math.round((quarter ? source.height : source.width) * scale));
  const height = Math.max(1, Math.round((quarter ? source.width : source.height) * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Prism Field could not prepare the mask image.");
  context.translate(width / 2, height / 2);
  context.rotate((rotation * Math.PI) / 180);
  context.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  const drawWidth = Math.round(source.width * scale);
  const drawHeight = Math.round(source.height * scale);
  context.drawImage(source, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  source.close();
  return createImageBitmap(canvas);
}
