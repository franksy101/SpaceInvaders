import { Filter, GlProgram, GpuProgram } from "pixi.js";

// Custom CRT filter: scanlines, vignette, chromatic aberration and barrel curvature.
const vertex = /* glsl */ `in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void ) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void ) {
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main() {
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}
`;

const fragment = /* glsl */ `precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform float uTime;
uniform float uScanline;
uniform float uAberration;
uniform float uCurvature;
uniform float uVignette;
uniform float uNoise;

vec2 curve(vec2 uv) {
  uv = uv * 2.0 - 1.0;
  vec2 offset = abs(uv.yx) / vec2(max(uCurvature, 0.001) * 3.5, max(uCurvature, 0.001) * 3.0);
  uv = uv + uv * offset * offset;
  uv = uv * 0.5 + 0.5;
  return uv;
}

float rand(vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vTextureCoord;
  vec2 cuv = curve(uv);

  if (cuv.x < 0.0 || cuv.x > 1.0 || cuv.y < 0.0 || cuv.y > 1.0) {
    finalColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float ab = uAberration / max(uInputSize.x, 1.0);
  float r = texture(uTexture, cuv + vec2(ab, 0.0)).r;
  float g = texture(uTexture, cuv).g;
  float b = texture(uTexture, cuv - vec2(ab, 0.0)).b;
  vec3 col = vec3(r, g, b);

  float scan = sin(cuv.y * uInputSize.y * 1.5 + uTime * 2.0) * 0.5 + 0.5;
  col *= mix(1.0, 0.75 + 0.25 * scan, uScanline);

  vec2 vUv = cuv - 0.5;
  float vig = smoothstep(0.85, 0.2, length(vUv));
  col *= mix(1.0, vig, uVignette);

  float n = rand(cuv + fract(uTime)) - 0.5;
  col += n * uNoise;

  col = pow(col, vec3(0.95));

  finalColor = vec4(col, 1.0);
}
`;

// WGSL fallback for WebGPU so Pixi does not fail if it picks WebGPU.
const wgsl = /* wgsl */ `struct GlobalFilterUniforms {
  uInputSize: vec4<f32>,
  uInputPixel: vec4<f32>,
  uInputClamp: vec4<f32>,
  uOutputFrame: vec4<f32>,
  uGlobalFrame: vec4<f32>,
  uOutputTexture: vec4<f32>,
};

struct CrtUniforms {
  uTime: f32,
  uScanline: f32,
  uAberration: f32,
  uCurvature: f32,
  uVignette: f32,
  uNoise: f32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> cru: CrtUniforms;

struct VSOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

fn filterVertexPosition(aPosition: vec2<f32>) -> vec4<f32> {
  var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;
  position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord(aPosition: vec2<f32>) -> vec2<f32> {
  return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

@vertex
fn mainVertex(@location(0) aPosition: vec2<f32>) -> VSOutput {
  var o: VSOutput;
  o.position = filterVertexPosition(aPosition);
  o.uv = filterTextureCoord(aPosition);
  return o;
}

fn curve(uvIn: vec2<f32>) -> vec2<f32> {
  var uv = uvIn * 2.0 - 1.0;
  let c = max(cru.uCurvature, 0.001);
  let offset = abs(vec2(uv.y, uv.x)) / vec2(c * 3.5, c * 3.0);
  uv = uv + uv * offset * offset;
  return uv * 0.5 + 0.5;
}

fn rand(co: vec2<f32>) -> f32 {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn mainFragment(in: VSOutput) -> @location(0) vec4<f32> {
  let cuv = curve(in.uv);
  if (cuv.x < 0.0 || cuv.x > 1.0 || cuv.y < 0.0 || cuv.y > 1.0) {
    return vec4(0.0, 0.0, 0.0, 1.0);
  }
  let ab = cru.uAberration / max(gfu.uInputSize.x, 1.0);
  let r = textureSample(uTexture, uSampler, cuv + vec2(ab, 0.0)).r;
  let g = textureSample(uTexture, uSampler, cuv).g;
  let b = textureSample(uTexture, uSampler, cuv - vec2(ab, 0.0)).b;
  var col = vec3(r, g, b);
  let scan = sin(cuv.y * gfu.uInputSize.y * 1.5 + cru.uTime * 2.0) * 0.5 + 0.5;
  col = col * mix(1.0, 0.75 + 0.25 * scan, cru.uScanline);
  let vUv = cuv - 0.5;
  let vig = smoothstep(0.85, 0.2, length(vUv));
  col = col * mix(1.0, vig, cru.uVignette);
  let n = rand(cuv + fract(cru.uTime)) - 0.5;
  col = col + vec3(n * cru.uNoise);
  col = pow(col, vec3(0.95));
  return vec4(col, 1.0);
}
`;

export interface CRTFilterOptions {
  scanline?: number;
  aberration?: number;
  curvature?: number;
  vignette?: number;
  noise?: number;
}

export class CRTFilter extends Filter {
  private elapsed = 0;

  constructor(opts: CRTFilterOptions = {}) {
    const glProgram = GlProgram.from({
      vertex,
      fragment,
      name: "crt-filter",
    });

    const gpuProgram = GpuProgram.from({
      vertex: { source: wgsl, entryPoint: "mainVertex" },
      fragment: { source: wgsl, entryPoint: "mainFragment" },
      name: "crt-filter",
    });

    super({
      glProgram,
      gpuProgram,
      resources: {
        crtUniforms: {
          uTime: { value: 0, type: "f32" },
          uScanline: { value: opts.scanline ?? 0.7, type: "f32" },
          uAberration: { value: opts.aberration ?? 2.4, type: "f32" },
          uCurvature: { value: opts.curvature ?? 6.0, type: "f32" },
          uVignette: { value: opts.vignette ?? 0.9, type: "f32" },
          uNoise: { value: opts.noise ?? 0.04, type: "f32" },
        },
      },
    });
  }

  update(deltaSec: number): void {
    this.elapsed += deltaSec;
    this.resources.crtUniforms.uniforms.uTime = this.elapsed;
  }

  set scanline(v: number) {
    this.resources.crtUniforms.uniforms.uScanline = v;
  }
  set aberration(v: number) {
    this.resources.crtUniforms.uniforms.uAberration = v;
  }
  set noise(v: number) {
    this.resources.crtUniforms.uniforms.uNoise = v;
  }
}
