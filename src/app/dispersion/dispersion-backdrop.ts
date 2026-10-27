/** Recover transparent pixels whose source-over result matches the optical
 * composite on the runtime's selected background. Used after the final effect,
 * so lens sampling and light gain see the same colors as finite preview. */
export const DISPERSION_REMOVE_BACKDROP_GLSL = String.raw`
vec4 dispersionRemoveBackdrop(vec4 composite, vec3 background) {
  vec3 color = clamp(composite.rgb + background * (1.0 - composite.a), 0.0, 1.0);
  vec3 delta = color - background;
  // The smallest alpha that can represent all channels with 0 <= rgb <= alpha.
  // A luminance-only key cannot represent bright colored light on a pale ground.
  vec3 coverage = max(
    delta / max(vec3(1.0) - background, vec3(1e-5)),
    -delta / max(background, vec3(1e-5))
  );
  float alpha = clamp(max(coverage.r, max(coverage.g, coverage.b)), 0.0, 1.0);
  return vec4(clamp(color - background * (1.0 - alpha), 0.0, alpha), alpha);
}
`;
