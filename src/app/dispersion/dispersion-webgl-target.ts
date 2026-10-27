import * as THREE from "three";

export function acquireDispersionRenderTarget(
  current: THREE.WebGLRenderTarget | null,
  width: number,
  height: number,
): THREE.WebGLRenderTarget {
  if (current) {
    if (current.width !== width || current.height !== height) {
      current.setSize(width, height);
    }
    return current;
  }
  return new THREE.WebGLRenderTarget(width, height, {
    colorSpace: THREE.NoColorSpace,
    depthBuffer: false,
    format: THREE.RGBAFormat,
    generateMipmaps: false,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
    stencilBuffer: false,
    type: THREE.UnsignedByteType,
  });
}
