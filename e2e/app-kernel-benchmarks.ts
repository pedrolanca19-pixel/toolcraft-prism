import type { ToolcraftKernelBenchmarkHarnessRegistry } from "./kernel-benchmark-contract";

const benchmarkSize = 256;

function semanticOutput(workload: Readonly<Record<string, number>>): string {
  const samples = Math.max(
    2,
    Math.min(50, Math.round(workload["lens-samples"] ?? 35)),
  );
  return `paper-lens:samples:${samples}:pixels:${benchmarkSize ** 2}`;
}

export const appKernelBenchmarks = {
  "dispersion.preview-frame": {
    "canvas-2d": {
      iterations: 4,
      run: async ({ page, workload }) => {
        await page.evaluate(
          ({ samples, size }) => {
            const source = document.createElement("canvas");
            source.width = size;
            source.height = size;
            const sourceContext = source.getContext("2d");
            if (!sourceContext) {
              throw new Error("Canvas 2D source is unavailable for Lens.");
            }
            const gradient = sourceContext.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, "#ff2f74");
            gradient.addColorStop(0.5, "#5ee7ff");
            gradient.addColorStop(1, "#ffe75e");
            sourceContext.fillStyle = gradient;
            sourceContext.fillRect(0, 0, size, size);

            const output = document.createElement("canvas");
            output.width = size;
            output.height = size;
            const context = output.getContext("2d");
            if (!context) {
              throw new Error("Canvas 2D output is unavailable for Lens.");
            }
            context.globalCompositeOperation = "lighter";
            context.globalAlpha = 1 / samples;
            for (let index = 0; index < samples; index += 1) {
              const normalized = samples <= 1 ? 0 : index / (samples - 1) - 0.5;
              context.drawImage(source, normalized * 8, 0, size, size);
            }
            context.getImageData(0, 0, size, size);
          },
          {
            samples: Math.max(
              2,
              Math.min(50, Math.round(workload["lens-samples"] ?? 35)),
            ),
            size: benchmarkSize,
          },
        );
        return semanticOutput(workload);
      },
    },
    webgl: {
      iterations: 4,
      run: async ({ page, workload }) => {
        await page.evaluate(
          ({ samples, size }) => {
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const gl = canvas.getContext("webgl2", {
              alpha: true,
              antialias: false,
              depth: false,
              preserveDrawingBuffer: false,
            });
            if (!gl) throw new Error("WebGL2 is unavailable for Lens.");

            const compile = (type: number, source: string): WebGLShader => {
              const shader = gl.createShader(type);
              if (!shader) throw new Error("Unable to allocate Lens shader.");
              gl.shaderSource(shader, source);
              gl.compileShader(shader);
              if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                throw new Error(gl.getShaderInfoLog(shader) ?? "Lens shader failed.");
              }
              return shader;
            };
            const vertex = compile(
              gl.VERTEX_SHADER,
              `#version 300 es
              in vec2 a_position;
              out vec2 v_uv;
              void main() {
                v_uv = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
              }`,
            );
            const fragment = compile(
              gl.FRAGMENT_SHADER,
              `#version 300 es
              precision highp float;
              uniform sampler2D u_source;
              uniform int u_count;
              in vec2 v_uv;
              out vec4 outColor;
              void main() {
                vec4 sum = vec4(0.0);
                for (int index = 0; index < 50; index++) {
                  if (index >= u_count) break;
                  float denominator = max(float(u_count - 1), 1.0);
                  float offset = (float(index) / denominator - 0.5) * 0.03;
                  sum += texture(u_source, v_uv + vec2(offset, 0.0));
                }
                outColor = sum / float(max(u_count, 1));
              }`,
            );
            const program = gl.createProgram();
            if (!program) throw new Error("Unable to allocate Lens program.");
            gl.attachShader(program, vertex);
            gl.attachShader(program, fragment);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
              throw new Error(gl.getProgramInfoLog(program) ?? "Lens program failed.");
            }

            const positionBuffer = gl.createBuffer();
            const texture = gl.createTexture();
            if (!positionBuffer || !texture) {
              throw new Error("Unable to allocate Lens benchmark resources.");
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(
              gl.ARRAY_BUFFER,
              new Float32Array([-1, -1, 3, -1, -1, 3]),
              gl.STATIC_DRAW,
            );
            gl.useProgram(program);
            const position = gl.getAttribLocation(program, "a_position");
            gl.enableVertexAttribArray(position);
            gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

            const pixels = new Uint8Array(size * size * 4);
            for (let index = 0; index < pixels.length; index += 4) {
              const pixel = index / 4;
              pixels[index] = pixel % 256;
              pixels[index + 1] = Math.floor(pixel / size) % 256;
              pixels[index + 2] = (pixel * 17) % 256;
              pixels[index + 3] = 255;
            }
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              size,
              size,
              0,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              pixels,
            );
            gl.uniform1i(gl.getUniformLocation(program, "u_source"), 0);
            gl.uniform1i(gl.getUniformLocation(program, "u_count"), samples);
            gl.viewport(0, 0, size, size);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            const output = new Uint8Array(size * size * 4);
            gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, output);

            gl.deleteTexture(texture);
            gl.deleteBuffer(positionBuffer);
            gl.deleteProgram(program);
            gl.deleteShader(vertex);
            gl.deleteShader(fragment);
          },
          {
            samples: Math.max(
              2,
              Math.min(50, Math.round(workload["lens-samples"] ?? 35)),
            ),
            size: benchmarkSize,
          },
        );
        return semanticOutput(workload);
      },
    },
  },
} satisfies ToolcraftKernelBenchmarkHarnessRegistry;
