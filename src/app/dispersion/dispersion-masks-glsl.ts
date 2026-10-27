import { MAX_DISPERSION_MASKS } from "./dispersion-masks-values";

export const DISPERSION_MASK_UNIFORMS_GLSL = String.raw`
const int DISPERSION_MAX_MASKS = ${MAX_DISPERSION_MASKS};
uniform int uMaskCount;
uniform vec2 uMaskCenter[${MAX_DISPERSION_MASKS}];
uniform vec4 uMaskAxes[${MAX_DISPERSION_MASKS}];
uniform float uMaskBlur[${MAX_DISPERSION_MASKS}];
uniform float uMaskEnabled;
uniform float uMaskPreview;
`;

export const DISPERSION_MASK_COVERAGE_GLSL = String.raw`
float dispersionMaskCoverage(vec2 fragCoord) {
  if (uMaskCount <= 0) return 1.0;

  vec2 screenPoint = fragCoord / max(iResolution.xy, vec2(1.0));
  float shortEdge = max(min(iResolution.x, iResolution.y), 1.0);
  vec2 shortEdgeScale = iResolution.xy / shortEdge;
  float remaining = 1.0;

  for (int index = 0; index < DISPERSION_MAX_MASKS; index++) {
    if (index >= uMaskCount) break;
    vec2 delta = (screenPoint - uMaskCenter[index]) * shortEdgeScale;
    vec4 axes = uMaskAxes[index];
    vec2 localPoint = vec2(
      delta.x * axes.x + delta.y * axes.y,
      -delta.x * axes.y + delta.y * axes.x
    );
    float distanceToCenter = length(localPoint * axes.zw);
    float feather = clamp(uMaskBlur[index], 0.0, 1.0);
    float coverage = feather <= 0.00001
      ? 1.0 - step(1.000001, distanceToCenter)
      : 1.0 - smoothstep(
          1.0 - feather,
          1.0 + feather,
          distanceToCenter
        );
    remaining *= 1.0 - coverage;
  }

  return 1.0 - remaining;
}
`;
