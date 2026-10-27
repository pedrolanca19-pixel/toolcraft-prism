import * as THREE from "three";
import type { DispersionViewWindow } from "./dispersion-view-window";

import type {
  DispersionMode,
  DispersionSettings,
} from "./dispersion-values";
import {
  DISPERSION_SPECTRUM_PRESETS,
  buildCustomSpectrumPreset,
} from "./dispersion-values";
import {
  createPaperGrainTexture,
  toPaperGrainParameters,
  type PaperGrainTextureResource,
} from "./dispersion-paper-grain";
import { PaperLensDistortionPass } from "./dispersion-lens-distortion";
import { MAX_DISPERSION_MASKS } from "./dispersion-masks-values";
import {
  DISPERSION_EFFECT_AREA_VALUES,
  writeHexSrgb,
} from "./dispersion-webgl-utils";
import { acquireDispersionRenderTarget } from "./dispersion-webgl-target";
import {
  DISPERSION_COPY_FRAGMENT_SHADER,
  DISPERSION_COPY_VERTEX_SHADER,
  DISPERSION_FIELD_FRAGMENT_SHADER,
  DISPERSION_SCREEN_VERTEX_SHADER,
} from "./dispersion-shaders";

export type DispersionGlFrame = Readonly<{
  height: number;
  includeBackground: boolean;
  /** Shade against the viewport background without painting a bounded fill. */
  previewOnBackground?: boolean;
  /** Unbounded preview samples a window into the same logical optical image. */
  viewWindow?: DispersionViewWindow;
  /** Current timeline loop duration; Speed derives its cycle count from it. */
  loopSeconds?: number;
  /** Preview shader density relative to the exact Toolcraft backing size. */
  internalScale?: number;
  /** Preview-only red mask overlay; export always passes false. */
  maskPreview?: boolean;
  opaqueOutside: boolean;
  progress: number;
  settings: DispersionSettings;
  width: number;
}>;

export type DispersionGlResource = Readonly<{
  canvas: HTMLCanvasElement;
  dispose(): void;
  render(frame: DispersionGlFrame): void;
  snapshot(frame: DispersionGlFrame): Promise<ImageBitmap>;
}>;

type FieldUniforms = Readonly<{
  iResolution: THREE.Uniform<THREE.Vector3>;
  uViewOffset: THREE.Uniform<THREE.Vector2>;
  iTime: THREE.Uniform<number>;
  uBg: THREE.Uniform<THREE.Vector3>;
  uChannelSplit: THREE.Uniform<number>;
  uChroma: THREE.Uniform<number>;
  uColorBalance: THREE.Uniform<THREE.Vector2>;
  uCurveAmp: THREE.Uniform<number>;
  uCurveForm: THREE.Uniform<number>;
  uShading: THREE.Uniform<number>;
  uEdgeFade: THREE.Uniform<number>;
  uEffectArea: THREE.Uniform<number>;
  uEffectMode: THREE.Uniform<number>;
  uFoldingOffset: THREE.Uniform<number>;
  uGlowIntensity: THREE.Uniform<number>;
  uGlowSpread: THREE.Uniform<number>;
  uGrainAmount: THREE.Uniform<number>;
  uGrainDistribution: THREE.Uniform<number>;
  uGrainDistortion: THREE.Uniform<number>;
  uGrainDrift: THREE.Uniform<number>;
  uGrainScale: THREE.Uniform<number>;
  uGrainSoftness: THREE.Uniform<number>;
  uMaskAxes: THREE.Uniform<THREE.Vector4[]>;
  uMaskBlur: THREE.Uniform<number[]>;
  uMaskCenter: THREE.Uniform<THREE.Vector2[]>;
  uMaskCount: THREE.Uniform<number>;
  uMaskEnabled: THREE.Uniform<number>;
  uMaskPreview: THREE.Uniform<number>;
  uNoiseAmount: THREE.Uniform<number>;
  uOpaque: THREE.Uniform<number>;
  uRemoveBackdrop: THREE.Uniform<number>;
  uPalette2Amp: THREE.Uniform<THREE.Vector3>;
  uPaletteAmp: THREE.Uniform<THREE.Vector3>;
  uPaletteBase: THREE.Uniform<THREE.Vector3>;
  uPaletteFreq: THREE.Uniform<number>;
  uPalettePhase: THREE.Uniform<THREE.Vector3>;
  uPaletteShift: THREE.Uniform<number>;
  uPatternSoft: THREE.Uniform<number>;
  uSaturationX: THREE.Uniform<number>;
  uStepBase: THREE.Uniform<number>;
  uSparkleSize: THREE.Uniform<number>;
  uSparkleTwinkle: THREE.Uniform<number>;
  uTiltX: THREE.Uniform<number>;
  uTimeScale: THREE.Uniform<number>;
  uWave1Amp: THREE.Uniform<number>;
  uWave1Freq: THREE.Uniform<number>;
  uWave2Amp: THREE.Uniform<number>;
  uWave2Freq: THREE.Uniform<number>;
  uWave3Amp: THREE.Uniform<number>;
  uWave3FreqX: THREE.Uniform<number>;
  uWave3FreqZ: THREE.Uniform<number>;
  uWaveHeight: THREE.Uniform<number>;
  uWaveSpeed: THREE.Uniform<number>;
  uYShift: THREE.Uniform<number>;
  uZoom: THREE.Uniform<number>;
  u_noiseTexture: THREE.Uniform<THREE.Texture>;
}>;

const LOOP_TIME_SPAN = 20 * Math.PI;

const DEFAULT_LOOP_SECONDS = 60;

const DISPERSION_WEBGL_CONTEXT_PARAMETERS = Object.freeze({
  alpha: true,
  antialias: false,
  depth: false,
  powerPreference: "high-performance" as const,
  premultipliedAlpha: true,
  preserveDrawingBuffer: true,
  stencil: false,
});

function speedCycles(flow: number, loopSeconds: number): number {
  const clampedFlow = Math.min(100, Math.max(0, flow));
  const targetSecondsPerCycle = Math.min(
    900,
    Math.max(40, 250 * Math.pow(2, (60 - clampedFlow) / 25)),
  );
  const duration =
    Number.isFinite(loopSeconds) && loopSeconds > 0
      ? loopSeconds
      : DEFAULT_LOOP_SECONDS;
  return Math.min(200, Math.max(1, Math.round(duration / targetSecondsPerCycle)));
}

const CURVE_INDEX: Readonly<Record<DispersionSettings["curve"], number>> = {
  arch: 2,
  cradle: 5,
  drape: 4,
  line: 0,
  scurve: 3,
  valley: 1,
};

const MODE_TUNING: Readonly<
  Record<
    DispersionMode,
    Readonly<{
      glowSpreadScale: number;
      tilt: number;
      wave1AmpScale: number;
      wave1FreqScale: number;
      waveHeightScale: number;
      yShift: number;
      zoom: number;
    }>
  >
> = {
  central: {
    glowSpreadScale: 1,
    tilt: 0,
    wave1AmpScale: 1,
    wave1FreqScale: 1,
    waveHeightScale: 1,
    yShift: 0,
    zoom: 1,
  },
  diagonal: {
    glowSpreadScale: 1,
    tilt: 0.34,
    wave1AmpScale: 1,
    wave1FreqScale: 1,
    waveHeightScale: 1,
    yShift: 0,
    zoom: 1,
  },
  edge: {
    glowSpreadScale: 0.9,
    tilt: 0,
    wave1AmpScale: 1,
    wave1FreqScale: 1,
    waveHeightScale: 0.5,
    yShift: 0.62,
    zoom: 0.92,
  },
  halo: {
    glowSpreadScale: 0.85,
    tilt: 0,
    wave1AmpScale: 1.2,
    wave1FreqScale: 1.3,
    waveHeightScale: 1.7,
    yShift: 0,
    zoom: 1.55,
  },
  ripple: {
    glowSpreadScale: 1,
    tilt: 0,
    wave1AmpScale: 1.6,
    wave1FreqScale: 2.2,
    waveHeightScale: 0.85,
    yShift: 0,
    zoom: 1,
  },
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function createFieldUniforms(noiseTexture: THREE.Texture): FieldUniforms {
  return {
    iResolution: new THREE.Uniform(new THREE.Vector3(1, 1, 1)),
    uViewOffset: new THREE.Uniform(new THREE.Vector2()),
    iTime: new THREE.Uniform(0),
    uBg: new THREE.Uniform(new THREE.Vector3(0, 0, 0)),
    uChannelSplit: new THREE.Uniform(0),
    uChroma: new THREE.Uniform(1),
    uColorBalance: new THREE.Uniform(new THREE.Vector2(0, 0)),
    uCurveAmp: new THREE.Uniform(0),
    uCurveForm: new THREE.Uniform(0),
    uShading: new THREE.Uniform(0),
    uEdgeFade: new THREE.Uniform(0),
    uEffectArea: new THREE.Uniform(1),
    uEffectMode: new THREE.Uniform(0),
    uFoldingOffset: new THREE.Uniform(20),
    uGlowIntensity: new THREE.Uniform(0.011),
    uGlowSpread: new THREE.Uniform(4),
    uGrainAmount: new THREE.Uniform(0.6),
    uGrainDistribution: new THREE.Uniform(0),
    uGrainDistortion: new THREE.Uniform(0.5),
    uGrainDrift: new THREE.Uniform(0.35),
    uGrainScale: new THREE.Uniform(1.125),
    uGrainSoftness: new THREE.Uniform(0.5),
    uMaskAxes: new THREE.Uniform(
      Array.from(
        { length: MAX_DISPERSION_MASKS },
        () => new THREE.Vector4(1, 0, 1, 1),
      ),
    ),
    uMaskBlur: new THREE.Uniform(
      Array.from({ length: MAX_DISPERSION_MASKS }, () => 0),
    ),
    uMaskCenter: new THREE.Uniform(
      Array.from(
        { length: MAX_DISPERSION_MASKS },
        () => new THREE.Vector2(0.5, 0.5),
      ),
    ),
    uMaskCount: new THREE.Uniform(0),
    uMaskEnabled: new THREE.Uniform(1),
    uMaskPreview: new THREE.Uniform(0),
    uNoiseAmount: new THREE.Uniform(0),
    uOpaque: new THREE.Uniform(1),
    uRemoveBackdrop: new THREE.Uniform(0),
    uPalette2Amp: new THREE.Uniform(new THREE.Vector3(0, 0, 0)),
    uPaletteAmp: new THREE.Uniform(new THREE.Vector3(1, 1, 1)),
    uPaletteBase: new THREE.Uniform(new THREE.Vector3(1, 1, 1)),
    uPaletteFreq: new THREE.Uniform(3),
    uPalettePhase: new THREE.Uniform(new THREE.Vector3(0, 1, 2)),
    uPaletteShift: new THREE.Uniform(0),
    uPatternSoft: new THREE.Uniform(0.44),
    uSaturationX: new THREE.Uniform(1),
    uStepBase: new THREE.Uniform(0.11),
    uSparkleSize: new THREE.Uniform(0.5),
    uSparkleTwinkle: new THREE.Uniform(0),
    uTiltX: new THREE.Uniform(0),
    uTimeScale: new THREE.Uniform(1),
    uWave1Amp: new THREE.Uniform(0.04),
    uWave1Freq: new THREE.Uniform(3),
    uWave2Amp: new THREE.Uniform(-0.1),
    uWave2Freq: new THREE.Uniform(0.4),
    uWave3Amp: new THREE.Uniform(0.1),
    uWave3FreqX: new THREE.Uniform(-0.7),
    uWave3FreqZ: new THREE.Uniform(-0.7),
    uWaveHeight: new THREE.Uniform(2),
    uWaveSpeed: new THREE.Uniform(0.5),
    uYShift: new THREE.Uniform(0),
    uZoom: new THREE.Uniform(1),
    u_noiseTexture: new THREE.Uniform(noiseTexture),
  };
}

class DispersionGlRenderer implements DispersionGlResource {
  readonly canvas: HTMLCanvasElement;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.OrthographicCamera;
  private readonly scene: THREE.Scene;
  private readonly geometry: THREE.PlaneGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly uniforms: FieldUniforms;
  private readonly paperGrain: PaperGrainTextureResource;
  private readonly copyScene: THREE.Scene;
  private readonly copyMaterial: THREE.ShaderMaterial;
  private readonly copyTexture: THREE.Uniform<THREE.Texture | null>;
  private readonly lensPass: PaperLensDistortionPass;
  private fieldTarget: THREE.WebGLRenderTarget | null = null;
  private lensTarget: THREE.WebGLRenderTarget | null = null;
  private width = 0;
  private height = 0;
  private lastFrame: DispersionGlFrame | null = null;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      ...DISPERSION_WEBGL_CONTEXT_PARAMETERS,
    });
    if (!this.renderer.capabilities.isWebGL2) {
      this.renderer.dispose();
      throw new Error("Dispersion Studio requires WebGL2.");
    }
    this.renderer.autoClear = false;
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
    this.camera.position.z = 1;
    this.geometry = new THREE.PlaneGeometry(2, 2);
    this.paperGrain = createPaperGrainTexture();
    this.uniforms = createFieldUniforms(this.paperGrain.texture);
    this.material = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      fragmentShader: DISPERSION_FIELD_FRAGMENT_SHADER,
      toneMapped: false,
      transparent: true,
      uniforms: this.uniforms,
      vertexShader: DISPERSION_SCREEN_VERTEX_SHADER,
    });

    this.scene = new THREE.Scene();
    this.scene.add(new THREE.Mesh(this.geometry, this.material));

    this.copyTexture = new THREE.Uniform<THREE.Texture | null>(null);
    this.copyMaterial = new THREE.ShaderMaterial({
      blending: THREE.NoBlending,
      depthTest: false,
      depthWrite: false,
      fragmentShader: DISPERSION_COPY_FRAGMENT_SHADER,
      toneMapped: false,
      transparent: false,
      uniforms: { uTexture: this.copyTexture },
      vertexShader: DISPERSION_COPY_VERTEX_SHADER,
    });
    this.copyScene = new THREE.Scene();
    this.copyScene.add(new THREE.Mesh(this.geometry, this.copyMaterial));
    this.lensPass = new PaperLensDistortionPass(this.geometry);
    // Paper's 50-tap GLSL program is optional, but its first-use compile must
    // not land on the click that enables Lens Distortion. Parallel compilation
    // keeps initial output responsive while warming the retained program.
    void this.lensPass.prepare(this.renderer, this.camera).catch(() => {
      // A failed speculative compile remains recoverable: Three will retry its
      // normal lazy compile if the user later enables the effect.
    });

    void this.paperGrain.ready.then(() => {
      if (!this.disposed && this.lastFrame) this.render(this.lastFrame);
    });
  }

  private resize(width: number, height: number): void {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
  }

  private updateUniforms(frame: DispersionGlFrame): void {
    const { settings } = frame;
    const progress = ((frame.progress % 1) + 1) % 1;
    const preset =
      settings.spectrum === "custom"
        ? buildCustomSpectrumPreset(
            settings.customColorA,
            settings.customColorB,
            settings.customColorC,
            settings.customColorD,
          )
        : DISPERSION_SPECTRUM_PRESETS[settings.spectrum];
    const mode = MODE_TUNING[settings.mode];
    const paperGrain = toPaperGrainParameters(settings);
    const uniforms = this.uniforms;

    const seedShift = clamp01(settings.seed / 100);
    const cycles = speedCycles(
      settings.flow,
      frame.loopSeconds ?? DEFAULT_LOOP_SECONDS,
    );
    const loopPhase = ((progress + seedShift) * cycles) % 1;
    this.setFieldResolution(frame, frame.width, frame.height);
    uniforms.iTime.value = loopPhase * LOOP_TIME_SPAN;
    uniforms.uTimeScale.value = 1;

    uniforms.uWaveSpeed.value = 0.5;
    uniforms.uWaveHeight.value =
      (settings.undulation / 21) * mode.waveHeightScale;
    uniforms.uWave1Freq.value = 3 * mode.wave1FreqScale;
    uniforms.uWave1Amp.value =
      (settings.detail / 100) * 0.10526 * mode.wave1AmpScale;
    uniforms.uWave2Freq.value = 0.4;
    uniforms.uWave2Amp.value = -(settings.refraction / 80) * 0.26667;
    uniforms.uWave3FreqX.value = -0.7;
    uniforms.uWave3FreqZ.value = -0.7;
    uniforms.uWave3Amp.value = (settings.refraction / 80) * 0.26667;
    uniforms.uNoiseAmount.value = (settings.sparkle / 100) * 0.9;
    uniforms.uEffectMode.value = settings.effectMode === "grain" ? 1 : 0;
    uniforms.uEffectArea.value = DISPERSION_EFFECT_AREA_VALUES[settings.effectArea];
    uniforms.uSparkleSize.value = clamp01(settings.sparkleSize / 100);
    uniforms.uSparkleTwinkle.value = clamp01(settings.sparkleTwinkle / 100);
    uniforms.uGrainAmount.value = paperGrain.noise ?? 0;
    uniforms.uGrainDistribution.value =
      settings.grainDistribution === "surface" ? 1 : 0;
    uniforms.uGrainScale.value = paperGrain.scale ?? 1;
    uniforms.uGrainSoftness.value = paperGrain.softness ?? 0;
    uniforms.uGrainDistortion.value = paperGrain.intensity ?? 0;
    uniforms.uGrainDrift.value = paperGrain.speed ?? 0;
    uniforms.uChannelSplit.value = (settings.chromaSplit / 100) * 0.12;
    uniforms.uFoldingOffset.value = 20;
    const patternSoft = clamp01(settings.softness / 100);
    uniforms.uStepBase.value = 0.104 + patternSoft * 0.014;
    uniforms.uPatternSoft.value = patternSoft;
    uniforms.uGlowIntensity.value =
      (settings.glow / 72) * 0.011 * (1 + 0.3 * (patternSoft - 0.44));
    uniforms.uGlowSpread.value =
      4 * Math.pow(2, (36 - settings.height) / 24) * mode.glowSpreadScale;

    uniforms.uZoom.value = mode.zoom;
    uniforms.uYShift.value =
      ((50 - settings.position) / 100) * 1.6 + mode.yShift;
    uniforms.uTiltX.value = ((settings.bend - 50) / 50) * 0.45 + mode.tilt;
    // Static view-space macro-curve; depth 0 or the Line profile keeps the
    // reference trajectory exactly.
    uniforms.uCurveForm.value = CURVE_INDEX[settings.curve];
    // World-space offsets are divided by ray depth on screen, so the gain
    // is strong and progressive to keep low depths subtle and high depths
    // cardinal.
    uniforms.uCurveAmp.value =
      Math.pow(clamp01(settings.curveDepth / 100), 1.2) * 2.4;
    uniforms.uShading.value = clamp01(settings.shading / 100);
    uniforms.uPaletteFreq.value = (settings.spread / 58) * 3;
    uniforms.uPalettePhase.value.set(
      preset.phase[0],
      preset.phase[1],
      preset.phase[2],
    );
    uniforms.uPaletteBase.value.set(
      preset.base[0],
      preset.base[1],
      preset.base[2],
    );
    uniforms.uPaletteAmp.value.set(
      preset.amp[0],
      preset.amp[1],
      preset.amp[2],
    );
    const amp2 = preset.amp2 ?? [0, 0, 0];
    uniforms.uPalette2Amp.value.set(amp2[0], amp2[1], amp2[2]);
    uniforms.uChroma.value = preset.chroma;
    uniforms.uPaletteShift.value =
      ((settings.shimmer - 52) / 100) * Math.PI * 2;
    uniforms.uSaturationX.value =
      0.55 + clamp01(settings.intensity / 88) * 0.45;
    uniforms.uColorBalance.value.set(
      settings.colorBalance.x,
      settings.colorBalance.y,
    );
    uniforms.uEdgeFade.value = frame.viewWindow
      ? 0 : Math.pow(settings.inset / 40, 1.6) * 0.25;

    const maskCount = Math.min(
      MAX_DISPERSION_MASKS,
      settings.masks.items.length,
    );
    uniforms.uMaskCount.value = maskCount;
    uniforms.uMaskEnabled.value = settings.masks.enabled ? 1 : 0;
    uniforms.uMaskPreview.value = frame.maskPreview ? 1 : 0;
    for (let index = 0; index < MAX_DISPERSION_MASKS; index += 1) {
      const mask = settings.masks.items[index];
      if (!mask) {
        uniforms.uMaskCenter.value[index].set(0.5, 0.5);
        uniforms.uMaskAxes.value[index].set(1, 0, 1, 1);
        uniforms.uMaskBlur.value[index] = 0;
        continue;
      }
      const angle = (mask.rotation * Math.PI) / 180;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      uniforms.uMaskCenter.value[index].set(
        (mask.center.x + 1) / 2,
        (1 - mask.center.y) / 2,
      );
      uniforms.uMaskAxes.value[index].set(
        cosine,
        sine,
        200 / mask.width,
        200 / mask.height,
      );
      uniforms.uMaskBlur.value[index] = mask.blur / 100;
    }

    uniforms.uOpaque.value =
      frame.includeBackground || frame.opaqueOutside || frame.previewOnBackground ? 1 : 0;
    uniforms.uRemoveBackdrop.value =
      frame.previewOnBackground && !settings.lens.enabled ? 1 : 0;
    // Backdrop removal already returns premultiplied pixels; the legacy field
    // blend would multiply their RGB by alpha a second time.
    this.material.blending = frame.previewOnBackground
      ? THREE.NoBlending
      : THREE.NormalBlending;
    writeHexSrgb(settings.background, uniforms.uBg.value);

  }

  private acquireFieldTarget(width: number, height: number): THREE.WebGLRenderTarget {
    return (this.fieldTarget = acquireDispersionRenderTarget(this.fieldTarget, width, height));
  }

  private setFieldResolution(frame: DispersionGlFrame, width: number, height: number): void {
    const view = frame.viewWindow;
    const scaleX = width / frame.width;
    const scaleY = height / frame.height;
    this.uniforms.iResolution.value.set(
      view ? view.width * scaleX : width,
      view ? view.height * scaleY : height, 1,
    );
    this.uniforms.uViewOffset.value.set(
      (view?.offsetX ?? 0) * scaleX, (view?.offsetY ?? 0) * scaleY,
    );
  }

  private acquireLensTarget(width: number, height: number): THREE.WebGLRenderTarget {
    return (this.lensTarget = acquireDispersionRenderTarget(this.lensTarget, width, height));
  }

  render(frame: DispersionGlFrame): void {
    if (this.disposed) throw new Error("Dispersion renderer was disposed.");
    if (this.renderer.getContext().isContextLost()) {
      throw new Error("Dispersion WebGL context was lost.");
    }
    const width = Math.max(1, Math.round(frame.width));
    const height = Math.max(1, Math.round(frame.height));
    const normalizedFrame = { ...frame, height, width };
    const internalScale = Math.min(
      1,
      Math.max(0.1, frame.internalScale ?? 1),
    );
    const marchWidth = Math.max(1, Math.round(width * internalScale));
    const marchHeight = Math.max(1, Math.round(height * internalScale));
    this.resize(width, height);
    this.updateUniforms(normalizedFrame);

    const lensActive = frame.settings.lens.enabled;

    if (!lensActive && marchWidth === width && marchHeight === height) {
      this.renderer.setRenderTarget(null);
      this.renderer.clear(true, false, false);
      this.renderer.render(this.scene, this.camera);
      this.lastFrame = normalizedFrame;
      return;
    }

    this.setFieldResolution(frame, marchWidth, marchHeight);
    const target = this.acquireFieldTarget(marchWidth, marchHeight);
    this.renderer.setRenderTarget(target);
    this.renderer.clear(true, false, false);
    this.renderer.render(this.scene, this.camera);

    if (lensActive) {
      const lensTarget = marchWidth === width && marchHeight === height
        ? null
        : this.acquireLensTarget(marchWidth, marchHeight);
      this.lensPass.render(this.renderer, this.camera, target.texture,
        lensTarget, frame.settings.lens, marchWidth, marchHeight,
        frame.previewOnBackground ? this.uniforms.uBg.value : undefined,
        frame.viewWindow ? [
          frame.viewWindow.offsetX / frame.viewWindow.width,
          frame.viewWindow.offsetY / frame.viewWindow.height,
          frame.width / frame.viewWindow.width,
          frame.height / frame.viewWindow.height,
        ] : undefined);
      if (!lensTarget) {
        this.lastFrame = normalizedFrame;
        return;
      }
      this.copyTexture.value = lensTarget.texture;
    } else {
      this.copyTexture.value = target.texture;
    }
    this.renderer.setRenderTarget(null);
    this.renderer.clear(true, false, false);
    this.renderer.render(this.copyScene, this.camera);
    this.lastFrame = normalizedFrame;
  }

  async snapshot(frame: DispersionGlFrame): Promise<ImageBitmap> {
    if (frame.settings.effectMode === "grain" && frame.settings.grainAmount > 0) {
      await this.paperGrain.ready;
    }
    const previousFrame = this.lastFrame;
    this.render(frame);
    this.renderer.getContext().finish();
    try {
      return await createImageBitmap(this.canvas);
    } finally {
      if (previousFrame) this.render(previousFrame);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.fieldTarget?.dispose();
    this.fieldTarget = null;
    this.lensTarget?.dispose();
    this.lensTarget = null;
    this.copyMaterial.dispose();
    this.lensPass.dispose();
    this.material.dispose();
    this.paperGrain.texture.dispose();
    this.geometry.dispose();
    this.renderer.dispose();
    this.lastFrame = null;
  }
}

export function createDispersionGlResource(
  canvas: HTMLCanvasElement,
): DispersionGlResource {
  return new DispersionGlRenderer(canvas);
}
export function disposeDispersionGlResource(
  resource: DispersionGlResource,
): void {
  resource.dispose();
}
