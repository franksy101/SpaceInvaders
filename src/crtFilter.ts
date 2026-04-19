import { Filter, GlProgram } from "pixi.js";

// Custom CRT filter: scanlines, vignette, chromatic aberration and barrel curvature.
const vertex = /* glsl */ `
in vec2 aPosition;
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

const fragment = /* glsl */ `
precision highp float;
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
  vec2 offset = abs(uv.yx) / vec2(uCurvature * 3.5, uCurvature * 3.0);
  uv = uv + uv * offset * offset;
  uv = uv * 0.5 + 0.5;
  return uv;
}

float rand(vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
  vec2 uv = curve(vTextureCoord);

  // Clip outside the curved screen -> bezel
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    finalColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Chromatic aberration: sample R and B shifted along x.
  float ab = uAberration / uInputSize.x;
  float r = texture(uTexture, uv + vec2(ab, 0.0)).r;
  float g = texture(uTexture, uv).g;
  float b = texture(uTexture, uv - vec2(ab, 0.0)).b;
  vec3 col = vec3(r, g, b);

  // Scanlines
  float scan = sin(uv.y * uInputSize.y * 1.5 + uTime * 2.0) * 0.5 + 0.5;
  col *= mix(1.0, 0.75 + 0.25 * scan, uScanline);

  // Vignette
  vec2 vUv = uv - 0.5;
  float vig = smoothstep(0.85, 0.2, length(vUv));
  col *= mix(1.0, vig, uVignette);

  // Noise grain
  float n = rand(uv + fract(uTime)) - 0.5;
  col += n * uNoise;

  // Subtle brightness boost (CRT phosphor glow feel)
  col = pow(col, vec3(0.95));

  finalColor = vec4(col, 1.0);
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

    super({
      glProgram,
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
