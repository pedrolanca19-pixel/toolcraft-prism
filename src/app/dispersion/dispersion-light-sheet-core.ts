/**
 * Canonical volumetric light-sheet used by Dispersion Studio.
 *
 * The material supplies `dispersionDomainPosition()` in the reference
 * Cartesian domain. Everything that gives the wave its visual character
 * remains here: camera ray, 38-step march, three folds, interference, fog,
 * cosine palette, channel split, caustic accumulation, and glow.
 */
export const DISPERSION_LIGHT_SHEET_CORE_GLSL = String.raw`
struct DispersionSheetResult {
  vec3 color;
  float sheetW;
  vec3 sheetAcc;
};

DispersionSheetResult marchDispersionSheet(
  vec2 viewUv,
  float timeElapsed,
  float baseRoute
) {
  vec3 rayDir = normalize(vec3(viewUv, 1.0));
  vec3 accumulatedColor = vec3(0.0);
  float totalDistance = 0.0;
  float sheetW = 0.0;
  vec3 sheetAcc = vec3(0.0);

  for (int marchIndex = 0; marchIndex < 38; marchIndex++) {
    vec3 localPos = rayDir * totalDistance;
    localPos.z -= 2.0;
    vec3 currentPos = dispersionDomainPosition(localPos, baseRoute);

    float wTime = timeElapsed * uWaveSpeed;
    float waveHeight = (
      sin(currentPos.x * uWave1Freq + wTime) * uWave1Amp +
      sin(currentPos.z * uWave2Freq - wTime * 0.6) * uWave2Amp +
      sin(
        currentPos.x * uWave3FreqX -
        currentPos.z * uWave3FreqZ +
        wTime * 1.6
      ) * uWave3Amp
    ) * uWaveHeight;

    // Control extension: the macro-curve bends the sheet itself in world
    // space — the emission, palette, fog, and march behavior are untouched;
    // the surface the rays graze simply dips, arches, or swoops in 3D, so
    // the band thins where it turns edge-on and widens where it faces the
    // camera. Zero depth restores the reference surface exactly.
    waveHeight += uCurveAmp * 7.0 * dispersionCurveProfile(currentPos.x / 7.0);

    float distToWave = abs(currentPos.y - waveHeight);
    float distToWaveR = abs(currentPos.y - (waveHeight - uChannelSplit));
    float distToWaveB = abs(currentPos.y - (waveHeight + uChannelSplit));

    if (totalDistance > 0.7) {
      float sheetBlend = 0.15 / (distToWave * distToWave + 0.01);
      float causticW = sheetBlend * sheetBlend;
      sheetW += causticW;
      sheetAcc += vec3(currentPos.x, currentPos.z, waveHeight) * causticW;
    }

    currentPos /= uFoldingOffset;
    float stepSize = min(distToWave - 0.080, 0.0) + uStepBase;
    totalDistance += stepSize;
    if (totalDistance >= 36.5) break;

    float patternX = sin(
      currentPos.x + cos(currentPos.y) * cos(currentPos.z)
    );
    float patternY = sin(
      currentPos.z +
      sin(currentPos.y) * cos(currentPos.x + timeElapsed)
    );
    float basePattern = smoothstep(
      0.5 - 0.34 * uPatternSoft,
      0.7 + 0.22 * uPatternSoft,
      patternX * patternY
    );
    basePattern = mix(basePattern, 0.78, uPatternSoft * 0.7);

    float blendFactor = 0.15 / (distToWave * distToWave + 0.01);
    float mixedPattern = mix(basePattern, 1.0, blendFactor);
    vec3 channelMix = vec3(
      mix(
        basePattern,
        1.0,
        0.15 / (distToWaveR * distToWaveR + 0.01)
      ),
      mixedPattern,
      mix(
        basePattern,
        1.0,
        0.15 / (distToWaveB * distToWaveB + 0.01)
      )
    );

    float glowIntensity = uGlowIntensity / (uGlowSpread + stepSize);
    float distanceFade = smoothstep(36.5, 7.3, totalDistance);
    vec3 paletteColor = uPaletteBase + uPaletteAmp * cos(
      totalDistance * uPaletteFreq + uPalettePhase + uPaletteShift
    );
    paletteColor += uPalette2Amp * cos(
      2.0 * (totalDistance * uPaletteFreq + uPaletteShift)
    );
    paletteColor = max(paletteColor, vec3(0.0));
    paletteColor = mix(
      vec3(dot(paletteColor, vec3(1.0 / 3.0))),
      paletteColor,
      uChroma
    );
    // Control extension: adjustable chiaroscuro. The sheet's analytic
    // normal (waves + macro-curve) lights the accumulated glow near the
    // surface — convex lit crests brighten, concave shaded dips darken —
    // so the bend reads as depth. uShading 0 leaves the reference emission
    // untouched; the far veil is excluded via the proximity term.
    float shadeMix = uShading * clamp(blendFactor, 0.0, 1.0);
    if (shadeMix > 0.0) {
      // currentPos was folded for the pattern; unfold to the wave domain
      vec3 wavePos = currentPos * uFoldingOffset;
      float dWdx = (
        cos(wavePos.x * uWave1Freq + wTime) * uWave1Freq * uWave1Amp +
        cos(wavePos.x * uWave3FreqX - wavePos.z * uWave3FreqZ + wTime * 1.6) *
          uWave3FreqX * uWave3Amp
      ) * uWaveHeight + uCurveAmp * dispersionCurveSlope(wavePos.x / 7.0);
      float dWdz = (
        cos(wavePos.z * uWave2Freq - wTime * 0.6) * uWave2Freq * uWave2Amp -
        cos(wavePos.x * uWave3FreqX - wavePos.z * uWave3FreqZ + wTime * 1.6) *
          uWave3FreqZ * uWave3Amp
      ) * uWaveHeight;
      vec3 sheetNormal = normalize(vec3(-dWdx, 1.0, -dWdz));
      float lit = 0.5 + 0.5 * dot(sheetNormal, normalize(vec3(-0.4, 0.85, -0.3)));
      float shade = mix(1.0, 0.28 + 1.25 * lit, shadeMix);
      paletteColor *= shade;
    }
    accumulatedColor +=
      glowIntensity * channelMix * distanceFade * paletteColor;
  }

  DispersionSheetResult result;
  result.color = accumulatedColor;
  result.sheetW = sheetW;
  result.sheetAcc = sheetAcc;
  return result;
}
`;

/** Shared post-processing keeps both spatial modes visually identical. */
export const DISPERSION_LIGHT_SHEET_COMPOSITE_GLSL = String.raw`
float generateFineNoise(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 8.6231);
  p3 += dot(p3, p3.yzx + 67.92);
  return fract((p3.x + p3.y) * p3.z);
}

float sheetGrainLayer(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = p - cell;
  vec2 eased = f * f * (3.0 - 2.0 * f);
  float bl = generateFineNoise(cell + vec2(19.7, 7.3));
  float br = generateFineNoise(cell + vec2(20.7, 7.3));
  float tl = generateFineNoise(cell + vec2(19.7, 8.3));
  float tr = generateFineNoise(cell + vec2(20.7, 8.3));
  return mix(mix(bl, br, eased.x), mix(tl, tr, eased.x), eased.y);
}

float dispersionEffectRegionMask(float area, vec3 lightColor) {
  float peak = max(lightColor.r, max(lightColor.g, lightColor.b));
  float trough = min(lightColor.r, min(lightColor.g, lightColor.b));
  float chroma = max(peak - trough, 0.0);
  float wholeWave = smoothstep(0.015, 0.12, peak);
  float core = smoothstep(0.14, 0.65, peak);
  float glow = smoothstep(0.045, 0.20, peak) *
    (1.0 - smoothstep(0.50, 0.90, peak));
  float bands = wholeWave * smoothstep(0.035, 0.24, chroma);
  float veil = smoothstep(0.008, 0.075, peak) *
    (1.0 - smoothstep(0.18, 0.48, peak));
  if (area < 0.5) return wholeWave;
  if (area < 1.5) return core;
  if (area < 2.5) return glow;
  if (area < 3.5) return bands;
  return veil;
}

vec4 composeDispersionSheet(
  DispersionSheetResult sheet,
  vec2 fragCoord,
  float effectTime,
  float grainDistribution,
  float edgeFade
) {
  vec3 light = sheet.color;
  float areaMask = dispersionEffectRegionMask(uEffectArea, light);

  if (uEffectMode < 0.5 && uNoiseAmount > 0.0 && areaMask > 0.0) {
    vec3 sheetMean = sheet.sheetAcc / max(sheet.sheetW, 1e-5);
    vec2 surface = vec2(sheetMean.x, sheetMean.y + sheetMean.z);
    float sparkleFrequency = exp2((0.5 - uSparkleSize) * 2.0);
    float speck =
      0.66 * sheetGrainLayer(surface * 64.0 * sparkleFrequency) +
      0.34 * sheetGrainLayer(
        surface * 136.3 * sparkleFrequency + vec2(37.2, 11.6)
      );
    float twinklePhase = 0.5 + 0.5 * sin(
      effectTime * 0.1 + speck * 12.5663706
    );
    float twinkle = mix(
      1.0,
      mix(0.65, 1.35, twinklePhase),
      uSparkleTwinkle
    );
    float sparkleGrain = (speck - 0.5) * 2.0;
    light *= max(
      1.0 + sparkleGrain * uNoiseAmount * areaMask * twinkle,
      0.0
    );
  }

  if (uEffectMode >= 0.5 && uGrainAmount > 0.0 && areaMask > 0.0) {
    float driftPhase = effectTime * 0.1;
    vec2 drift = vec2(cos(driftPhase), sin(driftPhase)) *
      (96.0 * uGrainDrift);
    // Keep every grain undistorted and independent from DPR/render scale.
    // At a 720 px short side this matches Paper's native pixel-domain recipe.
    float grainReferenceScale = 720.0 / max(
      min(iResolution.x, iResolution.y),
      1.0
    );
    vec2 normalizedGrainCoord = fragCoord * grainReferenceScale;
    vec2 grain_uv = normalizedGrainCoord * uGrainScale + drift;

    // Surface changes only where the planar grains are visible. Compress the
    // accumulated ray/sheet hits like optical depth so the projection stays
    // continuous, treats crests and troughs equally, and never invents a
    // second noisy terrain. Paper Amount remains the sole density/color input.
    float projectedSurfaceHit = 1.0 - exp(
      -0.035 * max(sheet.sheetW, 0.0)
    );
    float surfaceDistribution = pow(
      clamp(projectedSurfaceHit, 0.0, 1.0),
      0.75
    );
    float distributionMask = mix(
      1.0,
      surfaceDistribution,
      grainDistribution
    );
    float mappedGrainAmount = uGrainAmount;
    float amountGate = smoothstep(0.0, 0.05, mappedGrainAmount);
    vec4 primaryGrain = paperGrainSample(
      grain_uv,
      uGrainDistortion * amountGate,
      mappedGrainAmount,
      uGrainSoftness
    );
    vec4 secondaryGrain = paperGrainSample(
      grain_uv + vec2(173.17, -91.73),
      uGrainDistortion * amountGate,
      mappedGrainAmount,
      uGrainSoftness
    );
    vec4 tertiaryGrain = paperGrainSample(
      grain_uv + vec2(-247.61, 149.29),
      uGrainDistortion * amountGate,
      mappedGrainAmount,
      uGrainSoftness
    );
    float secondaryDensity = smoothstep(0.48, 0.82, mappedGrainAmount);
    float tertiaryDensity = smoothstep(0.72, 1.0, mappedGrainAmount);
    float grainMask = areaMask * distributionMask;
    float primaryOpacity = clamp(
      primaryGrain.a * grainMask * 1.55,
      0.0,
      1.0
    );
    float secondaryOpacity = clamp(
      secondaryGrain.a * grainMask * secondaryDensity * 1.35,
      0.0,
      1.0
    );
    float tertiaryOpacity = clamp(
      tertiaryGrain.a * grainMask * tertiaryDensity * 1.20,
      0.0,
      1.0
    );
    float grainOpacity = 1.0 - (1.0 - primaryOpacity) *
      (1.0 - secondaryOpacity) * (1.0 - tertiaryOpacity);
    float grainWeight = primaryOpacity + secondaryOpacity + tertiaryOpacity;
    vec3 grainColor = (
      primaryGrain.rgb * primaryOpacity +
      secondaryGrain.rgb * secondaryOpacity +
      tertiaryGrain.rgb * tertiaryOpacity
    ) / max(grainWeight, 1e-5);
    vec3 paperOver = mix(light, grainColor, grainOpacity);
    vec3 grainEmission = grainColor * grainOpacity;
    vec3 luminousSurface = light +
      (vec3(1.0) - clamp(light, 0.0, 1.0)) * grainEmission;
    light = mix(paperOver, luminousSurface, grainDistribution);
  }

  float maskCoverage = dispersionMaskCoverage(fragCoord);
  float appliedMaskCoverage = mix(1.0, maskCoverage, uMaskEnabled);
  if (uMaskPreview < 0.5) {
    light *= appliedMaskCoverage;
  }

  float luminance = dot(light, vec3(0.2125, 0.7154, 0.0721));
  light = mix(vec3(luminance), light, uSaturationX);

  // Stable two-axis optical grading. Multiplicative gains preserve black and
  // alpha while the neutral pad position remains an exact identity transform.
  // X runs Cyan (-) to Red (+); Y runs Blue (-) to Yellow (+).
  vec3 balanceStops = vec3(
    0.45 * uColorBalance.x + 0.25 * uColorBalance.y,
    -0.25 * uColorBalance.x + 0.25 * uColorBalance.y,
    -0.25 * uColorBalance.x - 0.45 * uColorBalance.y
  );
  light *= exp2(balanceStops);

  if (edgeFade > 0.0) {
    vec2 screen = fragCoord / max(iResolution.xy, vec2(1.0));
    vec2 edge = min(screen, 1.0 - screen);
    float fade =
      smoothstep(0.0, edgeFade, edge.x) *
      smoothstep(0.0, edgeFade, edge.y);
    light *= fade;
  }

  float dither = (
    generateFineNoise(fragCoord + vec2(12.34, 56.78)) - 0.5
  ) / 128.0;
  light += vec3(
    dither * (uMaskPreview < 0.5 ? appliedMaskCoverage : 1.0)
  );

  float lum = clamp(max(light.r, max(light.g, light.b)), 0.0, 1.0);
  float keyed = mix(lum, lum * lum * (3.0 - 2.0 * lum), 0.5);
  float alpha = mix(keyed, 1.0, uOpaque);
  float bgLum = dot(uBg, vec3(0.2125, 0.7154, 0.0721));
  float sourceGain = mix(keyed, 1.0, bgLum * uOpaque);
  vec3 rgb = light * sourceGain + uBg * (1.0 - keyed) * uOpaque;
  if (uMaskPreview >= 0.5 && uMaskCount > 0) {
    float maskOverlayAlpha = 0.35 * maskCoverage;
    rgb = mix(rgb, vec3(0.92, 0.12, 0.12), maskOverlayAlpha);
    alpha = max(alpha, maskOverlayAlpha);
  }
  vec4 composite = vec4(rgb, alpha);
  return uRemoveBackdrop > 0.5
    ? dispersionRemoveBackdrop(composite, uBg)
    : composite;
}
`;
