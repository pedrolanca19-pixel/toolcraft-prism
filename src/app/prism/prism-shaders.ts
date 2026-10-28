import { PRISM_ENTRIES, PRISM_KEYS, type PrismKey } from "./prism-table";

/** Keys the renderer resolves itself instead of binding one-to-one. */
const RESOLVED_KEYS = new Set<PrismKey>(["palette", "customColors", "c0", "c1", "c2", "c3"]);

function uniformDeclarations(): string {
  return PRISM_KEYS.filter((key) => !RESOLVED_KEYS.has(key))
    .map((key) => {
      const entry = PRISM_ENTRIES[key];
      switch (entry.kind) {
        case "slider":
        case "int":
          return `uniform float u_${key};`;
        case "color":
          return `uniform vec3 u_${key};`;
        case "select":
        case "bool":
          return `uniform int u_${key};`;
      }
    })
    .join("\n");
}

const HEAD = `#version 300 es
precision highp float;
precision highp int;
out vec4 outColor;
uniform vec2 u_res;
uniform vec2 u_drift;
uniform vec2 u_ev;
uniform float u_foldT;
uniform float u_hueT;
uniform float u_frameSeed;
uniform int u_palMode;
uniform int u_hasBackdrop;
uniform vec3 u_stop0;
uniform vec3 u_stop1;
uniform vec3 u_stop2;
uniform vec3 u_stop3;
${uniformDeclarations()}
const float TAU = 6.28318530718;
`;

export const PRISM_VERTEX_SHADER = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/**
 * Light sheet. Height field of folded sine layers deformed by 3D gradient noise; its
 * gradient gives the surface normal. Colour is a spectral palette read at a phase made
 * of height, tilt and space, with per-channel phase offsets for dispersion.
 * Output is premultiplied light over an optional backdrop; runtime owns the background.
 */
export const PRISM_SCENE_SHADER = `${HEAD}
vec3 hash33(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float gnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(mix(dot(hash33(i + vec3(0, 0, 0)), f - vec3(0, 0, 0)), dot(hash33(i + vec3(1, 0, 0)), f - vec3(1, 0, 0)), u.x),
        mix(dot(hash33(i + vec3(0, 1, 0)), f - vec3(0, 1, 0)), dot(hash33(i + vec3(1, 1, 0)), f - vec3(1, 1, 0)), u.x), u.y),
    mix(mix(dot(hash33(i + vec3(0, 0, 1)), f - vec3(0, 0, 1)), dot(hash33(i + vec3(1, 0, 1)), f - vec3(1, 0, 1)), u.x),
        mix(dot(hash33(i + vec3(0, 1, 1)), f - vec3(0, 1, 1)), dot(hash33(i + vec3(1, 1, 1)), f - vec3(1, 1, 1)), u.x), u.y),
    u.z);
}

float fbm(vec3 p, int oct) {
  float a = 0.5, s = 0.0, n = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= oct) break;
    s += a * gnoise(p);
    n += a;
    p = p * 2.03 + vec3(1.7, 9.2, 0.6);
    a *= 0.5;
  }
  return 1.3 * s / n;
}

float heightAt(vec2 p) {
  vec2 q = p - u_drift;
  vec2 w = vec2(
    fbm(vec3(q * u_warpScale + vec2(u_ev.x, u_ev.x * 0.31), u_ev.y), 3),
    fbm(vec3(q * u_warpScale + 17.3 + vec2(u_ev.x * 0.31, u_ev.x), u_ev.y + 3.1), 3));
  q += w * u_warp;
  float h = 0.0, amp = 1.0, tot = 0.0;
  for (int i = 0; i < 3; i++) {
    if (float(i) >= u_layers) break;
    float fi = float(i);
    float ang = radians(u_foldAngle + fi * u_foldSpread);
    vec2 d = vec2(cos(ang), sin(ang));
    float f = u_foldFreq * (1.0 + 0.41 * fi);
    float wob = gnoise(vec3(q * u_foldNoiseScale + fi * 5.7 + vec2(0.0, u_ev.x * 0.5), u_ev.y * 0.7 + fi * 2.3)) * u_foldNoise * TAU * 0.5;
    float ph = dot(q, d) * f + u_foldT * (i == 0 ? 1.0 : 2.0) + wob;
    float s = sin(ph);
    float crease = 1.0 - 2.0 * abs(s);
    h += amp * mix(s, crease, u_foldSharp);
    tot += amp;
    amp *= u_layerFalloff;
  }
  h /= tot;
  h += fbm(vec3(q * u_detailScale + vec2(u_ev.x * 0.8, 0.0), u_ev.y * 1.5 + 40.0), int(u_octaves + 0.5)) * u_detail;
  return h;
}

vec3 hueWheel(float h) {
  vec3 c = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c * c * (3.0 - 2.0 * c);
}

vec3 stopAt(int i) {
  if (i == 0) return u_stop0;
  if (i == 1) return u_stop1;
  if (i == 2) return u_stop2;
  return u_stop3;
}

vec3 stopsGradient(float x) {
  float u;
  float s;
  int n;
  if (u_bandMirror == 1) {
    u = clamp(x, 0.0, 1.0);
    s = u * 3.0;
    n = 3;
  } else {
    u = fract(x);
    s = u * 4.0;
    n = 4;
  }
  int i = int(floor(s));
  float f = smoothstep(0.0, 1.0, fract(s));
  return mix(stopAt(i % 4), stopAt((i + 1) % n), f);
}

float tri(float x) { return 1.0 - abs(1.0 - 2.0 * fract(x * 0.5)); }

vec3 palette(float ph) {
  float t = u_bandMirror == 1 ? tri(ph + 2.0 * u_hueT) : ph;
  float x = t * u_hueRange + u_hueOffset;
  if (u_bandMirror == 0) x += u_hueT;
  return u_palMode == 0 ? hueWheel(x) : stopsGradient(x);
}

float maskAt(vec2 uv) {
  if (u_maskEnabled == 0) return 1.0;
  vec2 c = uv - vec2(u_maskX, u_maskY);
  float a = radians(u_maskAngle);
  c = mat2(cos(a), -sin(a), sin(a), cos(a)) * c;
  c += vec2(gnoise(vec3(c * 1.7, u_ev.y * 0.5)), gnoise(vec3(c * 1.7 + 9.0, u_ev.y * 0.5))) * u_maskWarp * 0.35;
  float d;
  if (u_maskType == 0) d = abs(c.y) - u_maskSize * 0.5;
  else if (u_maskType == 1) d = length(c * vec2(1.0, 1.5)) - u_maskSize * 0.5;
  else if (u_maskType == 2) d = abs(length(c + vec2(0.0, 1.5)) - 1.5) - u_maskSize * 0.5;
  else d = abs(length(c) - u_maskSize * 0.8) - u_maskSize * 0.25;
  float s = u_maskSoft * 0.5;
  float m = 1.0 - smoothstep(-s, s, d);
  return u_maskInvert == 1 ? 1.0 - m : m;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;

  vec2 p = uv;
  if (u_mirror == 1 || u_mirror == 3) p.x = abs(p.x);
  if (u_mirror == 2 || u_mirror == 3) p.y = abs(p.y);
  p -= vec2(u_panX, u_panY);
  float rr = radians(u_rotate);
  p = mat2(cos(rr), -sin(rr), sin(rr), cos(rr)) * p;
  p /= max(0.2, 1.0 + u_persp * p.y);
  p /= u_zoom;
  p.x /= u_stretch;
  float sd = u_seed;
  p += vec2(fract(sd * 0.6180339) * 40.0, fract(sd * 0.7548776) * 40.0);

  // Finite-difference step in sheet space, so the relief does not depend on the output resolution.
  float e = 2.0 / (1024.0 * u_zoom);
  float h0 = heightAt(p);
  float hx = heightAt(p + vec2(e, 0.0));
  float hy = heightAt(p + vec2(0.0, e));
  vec2 g = vec2(hx - h0, hy - h0) / e;
  vec3 n = normalize(vec3(-g * u_relief * 0.3, 1.0));
  float hn = clamp(h0 * 0.5 + 0.5, 0.0, 1.0);

  float la = radians(u_lightAngle), le = radians(u_lightElev);
  vec3 L = normalize(vec3(cos(la) * cos(le), sin(la) * cos(le), sin(le)));
  float diff = pow(max(dot(n, L), 0.0), 2.5);
  float spec = pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), u_shine);
  float fres = pow(1.0 - n.z, u_rimPower);
  float ridge = pow(hn, u_ridgePow);
  float I = u_ambient + u_diffuse * diff + u_specular * spec + u_rim * fres * 6.0 + u_ridge * ridge;

  float ta = radians(u_tiltAngle), ba = radians(u_bandAngle);
  float ph = h0 * u_bands
           + dot(n.xy, vec2(cos(ta), sin(ta))) * u_tilt * 4.0
           + dot(uv, vec2(cos(ba), sin(ba))) * u_bandGradient;
  ph = mix(ph, floor(ph) + smoothstep(0.35, 0.65, fract(ph)), u_bandSharp);
  vec3 col = vec3(palette(ph + u_dispersion).r, palette(ph).g, palette(ph - u_dispersion).b);
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = max(mix(vec3(luma), col, u_saturation), 0.0);

  float cov = (1.0 - u_coverage) * 0.95;
  float es = max(u_edgeSoft * 0.5, 0.001);
  float a = mix(smoothstep(cov - es, cov + es, hn), 1.0, step(0.999, u_coverage));
  float m = maskAt(uv) * a;

  vec3 light = col * I * u_intensity * m;
  light += vec3(smoothstep(0.7, 1.8, I * u_intensity)) * u_whiten * m;
  light = 1.0 - exp(-light * u_exposure);
  light = pow(light, vec3(u_contrast));

  // Backdrop tint: a gradient overlay that exists only while the runtime Background is on.
  float bt = dot(uv, vec2(cos(radians(u_bgAngle)), sin(radians(u_bgAngle)))) + 0.5;
  float backdropAlpha = u_hasBackdrop == 1 ? smoothstep(0.0, 1.0, bt) * u_bgAmount : 0.0;
  vec3 overlay = u_bg2 * backdropAlpha;
  vec3 premult = overlay + light - overlay * light;
  float alpha = clamp(backdropAlpha + (1.0 - backdropAlpha) * max(light.r, max(light.g, light.b)), 0.0, 1.0);
  outColor = vec4(min(premult, vec3(alpha)), alpha);
}`;

export const PRISM_BLUR_SHADER = `${HEAD}
uniform sampler2D u_src;
uniform vec2 u_dir;
uniform int u_first;
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec3 c = texture(u_src, uv).rgb * 0.2270270270;
  c += texture(u_src, uv + u_dir * 1.3846153846).rgb * 0.3162162162;
  c += texture(u_src, uv - u_dir * 1.3846153846).rgb * 0.3162162162;
  c += texture(u_src, uv + u_dir * 3.2307692308).rgb * 0.0702702703;
  c += texture(u_src, uv - u_dir * 3.2307692308).rgb * 0.0702702703;
  if (u_first == 1) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    c *= smoothstep(u_bloomThreshold, u_bloomThreshold + 0.25, l);
  }
  outColor = vec4(c, 1.0);
}`;

export const PRISM_COMPOSITE_SHADER = `${HEAD}
// Integer hash: unlike sin()-based noise it keeps its distribution at 8K coordinates.
uint pcgHash(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}
uniform sampler2D u_scene;
uniform sampler2D u_b0;
uniform sampler2D u_b1;
uniform sampler2D u_b2;
// Pixel offset of the tile being presented inside the full u_res frame.
uniform vec2 u_tile;
void main() {
  vec2 frag = gl_FragCoord.xy + u_tile;
  vec2 uv = frag / u_res;
  vec2 off = (uv - 0.5) * u_aberration;
  vec4 s0 = texture(u_scene, uv);
  vec3 s = vec3(texture(u_scene, uv + off).r, s0.g, texture(u_scene, uv - off).b);

  vec3 b = texture(u_b0, uv).rgb * mix(0.55, 0.2, u_bloomSpread)
         + texture(u_b1, uv).rgb * mix(0.3, 0.4, u_bloomSpread)
         + texture(u_b2, uv).rgb * mix(0.12, 0.5, u_bloomSpread);
  b *= mix(vec3(1.0), u_bloomTint, u_bloomTintAmt);
  b = clamp(b * u_bloom, 0.0, 1.0);
  vec3 c = s + b - s * b;
  float a = max(s0.a, max(c.r, max(c.g, c.b)));

  vec2 q = (uv - 0.5) * vec2(u_res.x / u_res.y, 1.0);
  float v = u_vignette * smoothstep(0.35, 1.05, length(q));
  float n = float(pcgHash(pcgHash(uint(frag.x)) + uint(frag.y) + uint(u_frameSeed))) / 4294967295.0 - 0.5;
  float g = n * u_grain;

  if (u_hasBackdrop == 1) {
    // Black vignette and signed grain composited as overlays over the runtime background.
    c *= 1.0 - v;
    a = a * (1.0 - v) + v;
    if (g > 0.0) {
      c += vec3(g);
      a = a + g * (1.0 - a);
    } else {
      c *= 1.0 + g;
      a = a * (1.0 + g) - g;
    }
  } else {
    c *= (1.0 - v) * (1.0 + g * 2.0);
    a *= (1.0 - v);
  }
  a = clamp(a, 0.0, 1.0);
  outColor = vec4(min(clamp(c, 0.0, 1.0), vec3(a)), a);
}`;
