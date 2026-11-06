/**
 * Volumetric-looking Nebula Shader
 * Robust 3D procedural noise with positive coordinate offsets,
 * smooth depth blending, and audio-reactive core radiance.
 */
import * as THREE from 'three';

export const NebulaShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color('#e040fb') },
    uColor2: { value: new THREE.Color('#00e5ff') },
    uColorCore: { value: new THREE.Color('#ffffff') },
    uAudioPulse: { value: 0.0 },
    uDensity: { value: 0.85 },
    uNoiseScale: { value: 0.004 },
    uRadius: { value: 300.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vLocalPosition = position;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColorCore;
    uniform float uAudioPulse;
    uniform float uDensity;
    uniform float uNoiseScale;
    uniform float uRadius;

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;
    varying vec3 vNormal;

    // Periodic pseudo-noise functions that avoid negative mod issues
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    float noise3D(vec3 x) {
      vec3 p = floor(x);
      vec3 w = fract(x);
      vec3 u = w * w * (3.0 - 2.0 * w);

      float a = hash(p);
      float b = hash(p + vec3(1.0, 0.0, 0.0));
      float c = hash(p + vec3(0.0, 1.0, 0.0));
      float d = hash(p + vec3(1.0, 1.0, 0.0));
      float e = hash(p + vec3(0.0, 0.0, 1.0));
      float f = hash(p + vec3(1.0, 0.0, 1.0));
      float g = hash(p + vec3(0.0, 1.0, 1.0));
      float h = hash(p + vec3(1.0, 1.0, 1.0));

      return mix(
        mix(mix(a, b, u.x), mix(c, d, u.x), u.y),
        mix(mix(e, f, u.x), mix(g, h, u.x), u.y),
        u.z
      );
    }

    float fbm(vec3 p) {
      float f = 0.0;
      float amp = 0.52;
      for (int i = 0; i < 3; i++) {
        f += noise3D(p) * amp;
        p *= 2.08;
        amp *= 0.48;
      }
      return f;
    }

    void main() {
      // Offset position into safe positive range
      vec3 p = (vWorldPosition + vec3(8000.0)) * uNoiseScale;
      float t = uTime * 0.035;
      p.z += t;

      float n1 = fbm(p);
      float n2 = fbm(p * 1.6 + vec3(3.7, -t * 0.4, 1.9));

      // Billowy density with smooth edge falloff
      float density = smoothstep(0.26, 0.72, n1 + n2 * 0.3) * uDensity;

      // 1. Soft radial falloff from center to shell boundary (so density is not driven only by rim angle)
      float normDist = length(vLocalPosition) / max(uRadius, 1.0);
      float radialFalloff = 1.0 - smoothstep(0.4, 0.98, normDist);
      density *= radialFalloff;

      // 2. View-dependent edge softening - eliminates polygon silhouette completely
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float rim = clamp(dot(vNormal, viewDir), 0.0, 1.0);
      float edgeFade = smoothstep(0.04, 0.50, rim);
      density *= edgeFade;

      // 3. Camera-distance fade: smoothly dissolves as camera approaches the nebula shell
      float camDist = distance(cameraPosition, vWorldPosition);
      density *= smoothstep(20.0, 160.0, camDist);

      if (density < 0.008) discard;

      // Rich chromatic coloration without blinding washout
      vec3 col = mix(uColor1, uColor2, smoothstep(0.25, 0.75, n2));

      // Delicate luminous core glow
      float core = smoothstep(0.6, 0.92, n1);
      col = mix(col, uColorCore, core * 0.45);
      col *= (1.0 + uAudioPulse * 0.4);

      gl_FragColor = vec4(col, density * (0.6 + uAudioPulse * 0.25));
    }
  `
};

export function createNebulaMesh(
  radius: number,
  color1: string,
  color2: string,
  coreColor: string = '#ffffff'
): THREE.Mesh {
  const geometry = new THREE.IcosahedronGeometry(radius, 3);
  const material = new THREE.ShaderMaterial({
    vertexShader: NebulaShaderMaterial.vertexShader,
    fragmentShader: NebulaShaderMaterial.fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color(color1) },
      uColor2: { value: new THREE.Color(color2) },
      uColorCore: { value: new THREE.Color(coreColor) },
      uAudioPulse: { value: 0.0 },
      uDensity: { value: 0.52 },
      uNoiseScale: { value: 1.0 / (radius * 0.5) },
      uRadius: { value: radius }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}
