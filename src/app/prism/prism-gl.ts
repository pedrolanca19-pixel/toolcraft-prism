import {
  getPrismMotion,
  hexToRgb,
  resolvePrismStops,
  type PrismSettings,
} from "./prism-settings";
import {
  PRISM_BLUR_SHADER,
  PRISM_COMPOSITE_SHADER,
  PRISM_SCENE_SHADER,
  PRISM_VERTEX_SHADER,
} from "./prism-shaders";
import { PRISM_ENTRIES, PRISM_KEYS, type PrismKey } from "./prism-table";

export type PrismGlFrame = Readonly<{
  /** Include the backdrop tint and vignette overlay (runtime Background is on). */
  includeBackdrop: boolean;
  /** Loop progress in [0, 1). */
  progress: number;
  settings: PrismSettings;
  /** Backing size in physical pixels. */
  height: number;
  width: number;
}>;

/** A rectangle of the full frame in physical pixels; the origin is the bottom-left corner. */
export type PrismGlTile = Readonly<{ height: number; width: number; x: number; y: number }>;

export type PrismGl = Readonly<{
  dispose(): void;
  render(frame: PrismGlFrame): void;
  /**
   * Renders the frame at its exact size in tiles that fit the browser's WebGL drawing-buffer
   * limit (an 8K frame is larger than most browsers allow in one canvas). `onTile` runs while
   * the tile is on the canvas.
   */
  renderTiled(frame: PrismGlFrame, maxTileSize: number, onTile: (tile: PrismGlTile) => void): void;
}>;

type Target = Readonly<{
  fb: WebGLFramebuffer;
  height: number;
  tex: WebGLTexture;
  width: number;
}>;

type Program = Readonly<{
  loc(name: string): WebGLUniformLocation | null;
  prog: WebGLProgram;
}>;

type Context = WebGL2RenderingContext;

const RESOLVED_KEYS = new Set<PrismKey>(["palette", "customColors", "c0", "c1", "c2", "c3"]);

function compile(gl: Context, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Prism Field could not create a shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown error";
    gl.deleteShader(shader);
    throw new Error(`Prism Field shader failed to compile: ${log}`);
  }
  return shader;
}

function createProgram(gl: Context, fragment: string): Program {
  const prog = gl.createProgram();
  if (!prog) throw new Error("Prism Field could not create a program.");
  const vertexShader = compile(gl, gl.VERTEX_SHADER, PRISM_VERTEX_SHADER);
  const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(prog, vertexShader);
  gl.attachShader(prog, fragmentShader);
  gl.linkProgram(prog);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog) ?? "unknown error";
    gl.deleteProgram(prog);
    throw new Error(`Prism Field program failed to link: ${log}`);
  }
  const cache = new Map<string, WebGLUniformLocation | null>();
  return {
    loc(name) {
      if (!cache.has(name)) cache.set(name, gl.getUniformLocation(prog, name));
      return cache.get(name) ?? null;
    },
    prog,
  };
}

function createTarget(gl: Context, width: number, height: number): Target {
  const w = Math.max(2, Math.floor(width));
  const h = Math.max(2, Math.floor(height));
  const tex = gl.createTexture();
  const fb = gl.createFramebuffer();
  if (!tex || !fb) throw new Error("Prism Field could not allocate a render target.");
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { fb, height: h, tex, width: w };
}

function freeTarget(gl: Context, target: Target): void {
  gl.deleteTexture(target.tex);
  gl.deleteFramebuffer(target.fb);
}

type TargetSet = Readonly<{
  height: number;
  levels: readonly Readonly<{ a: Target; b: Target }>[];
  scene: Target;
  width: number;
}>;

const BLOOM_DIVISORS = [4, 8, 16] as const;

export function createPrismGl(canvas: HTMLCanvasElement | OffscreenCanvas): PrismGl {
  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
    stencil: false,
  });
  if (!context) throw new Error("WebGL2 is not available.");
  const gl = context as Context;

  const scene = createProgram(gl, PRISM_SCENE_SHADER);
  const blur = createProgram(gl, PRISM_BLUR_SHADER);
  const composite = createProgram(gl, PRISM_COMPOSITE_SHADER);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  let targets: TargetSet | null = null;

  function allocate(width: number, height: number): TargetSet {
    if (targets) {
      freeTarget(gl, targets.scene);
      for (const level of targets.levels) {
        freeTarget(gl, level.a);
        freeTarget(gl, level.b);
      }
    }
    targets = {
      height,
      levels: BLOOM_DIVISORS.map((divisor) => ({
        a: createTarget(gl, width / divisor, height / divisor),
        b: createTarget(gl, width / divisor, height / divisor),
      })),
      scene: createTarget(gl, width, height),
      width,
    };
    return targets;
  }

  function bind(unit: number, tex: WebGLTexture): void {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
  }

  function draw(framebuffer: WebGLFramebuffer | null, width: number, height: number): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, width, height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function setShared(program: Program, frame: PrismGlFrame, width: number, height: number): void {
    const { settings } = frame;
    const motion = getPrismMotion(settings, frame.progress);
    const stops = resolvePrismStops(settings);
    gl.useProgram(program.prog);
    gl.uniform2f(program.loc("u_res"), width, height);
    gl.uniform2f(program.loc("u_drift"), motion.drift[0], motion.drift[1]);
    gl.uniform2f(program.loc("u_ev"), motion.evolve[0], motion.evolve[1]);
    gl.uniform1f(program.loc("u_foldT"), motion.foldPhase);
    gl.uniform1f(program.loc("u_hueT"), motion.hueCycles);
    gl.uniform1f(program.loc("u_frameSeed"), 0);
    gl.uniform1i(program.loc("u_palMode"), stops ? 1 : 0);
    gl.uniform1i(program.loc("u_hasBackdrop"), frame.includeBackdrop ? 1 : 0);
    (stops ?? [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]).forEach((stop, index) => {
      gl.uniform3f(program.loc(`u_stop${index}`), stop[0], stop[1], stop[2]);
    });
    for (const key of PRISM_KEYS) {
      if (RESOLVED_KEYS.has(key)) continue;
      const entry = PRISM_ENTRIES[key];
      const location = program.loc(`u_${key}`);
      if (location === null) continue;
      const value = settings[key];
      switch (entry.kind) {
        case "slider":
        case "int":
          gl.uniform1f(location, value as number);
          break;
        case "color": {
          const rgb = hexToRgb(value as string);
          gl.uniform3f(location, rgb[0], rgb[1], rgb[2]);
          break;
        }
        case "bool":
          gl.uniform1i(location, value === true ? 1 : 0);
          break;
        case "select":
          gl.uniform1i(
            location,
            Math.max(0, entry.options.findIndex((option) => option.value === value)),
          );
          break;
      }
    }
  }

  return {
    dispose() {
      if (targets) {
        freeTarget(gl, targets.scene);
        for (const level of targets.levels) {
          freeTarget(gl, level.a);
          freeTarget(gl, level.b);
        }
        targets = null;
      }
      gl.deleteProgram(scene.prog);
      gl.deleteProgram(blur.prog);
      gl.deleteProgram(composite.prog);
      gl.deleteVertexArray(vao);
    },
    render(frame) {
      let width = Math.max(2, Math.round(frame.width));
      let height = Math.max(2, Math.round(frame.height));
      resizeCanvas(width, height);
      if (gl.drawingBufferWidth !== width || gl.drawingBufferHeight !== height) {
        // The browser clamps the drawing buffer; render at the size it actually grants.
        width = gl.drawingBufferWidth;
        height = gl.drawingBufferHeight;
      }
      const set = prepare(frame, width, height);
      present(frame, set, width, height, { height, width, x: 0, y: 0 });
    },
    renderTiled(frame, maxTileSize, onTile) {
      const width = Math.max(2, Math.round(frame.width));
      const height = Math.max(2, Math.round(frame.height));
      const set = prepare(frame, width, height);
      for (let y = 0; y < height; y += maxTileSize) {
        for (let x = 0; x < width; x += maxTileSize) {
          const tile = {
            height: Math.min(maxTileSize, height - y),
            width: Math.min(maxTileSize, width - x),
            x,
            y,
          };
          resizeCanvas(tile.width, tile.height);
          present(frame, set, width, height, tile);
          onTile(tile);
        }
      }
    },
  };

  function resizeCanvas(width: number, height: number): void {
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }

  /** Runs the scene and bloom-blur passes into the retained textures. */
  function prepare(frame: PrismGlFrame, width: number, height: number): TargetSet {
    const set =
      targets && targets.width === width && targets.height === height
        ? targets
        : allocate(width, height);

    gl.disable(gl.BLEND);
    setShared(scene, frame, width, height);
    draw(set.scene.fb, width, height);

    let source = set.scene;
    set.levels.forEach((level, index) => {
      setShared(blur, frame, level.a.width, level.a.height);
      gl.uniform1i(blur.loc("u_src"), 0);
      gl.uniform1i(blur.loc("u_first"), index === 0 ? 1 : 0);
      bind(0, source.tex);
      gl.uniform2f(blur.loc("u_dir"), frame.settings.bloomRadius / level.a.width, 0);
      draw(level.a.fb, level.a.width, level.a.height);
      gl.uniform1i(blur.loc("u_first"), 0);
      bind(0, level.a.tex);
      gl.uniform2f(blur.loc("u_dir"), 0, frame.settings.bloomRadius / level.a.height);
      draw(level.b.fb, level.b.width, level.b.height);
      source = level.b;
    });
    return set;
  }

  /** Composites one tile of the prepared frame onto the canvas. */
  function present(
    frame: PrismGlFrame,
    set: TargetSet,
    width: number,
    height: number,
    tile: PrismGlTile,
  ): void {
    setShared(composite, frame, width, height);
    gl.uniform2f(composite.loc("u_tile"), tile.x, tile.y);
    ["u_scene", "u_b0", "u_b1", "u_b2"].forEach((name, index) => {
      gl.uniform1i(composite.loc(name), index);
    });
    bind(0, set.scene.tex);
    set.levels.forEach((level, index) => bind(index + 1, level.b.tex));
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    draw(null, tile.width, tile.height);
  }
}

export type PrismGlResult = Readonly<{ gl: PrismGl } | { message: string }>;

/** Same as createPrismGl, but reports a failure as a message instead of throwing. */
export function tryCreatePrismGl(canvas: HTMLCanvasElement | OffscreenCanvas): PrismGlResult {
  try {
    return { gl: createPrismGl(canvas) };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "WebGL2 initialization failed." };
  }
}
