/**
 * Atmospheric Limb / Fresnel Glow & Pulsar Jet Shaders
 */
import * as THREE from 'three';

export const AtmosphereGlowShader = {
  uniforms: {
    uAtmosphereColor: { value: new THREE.Color('#48cae4') },
    uGlowPower: { value: 3.2 },
    uGlowIntensity: { value: 1.4 }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform vec3 uAtmosphereColor;
    uniform float uGlowPower;
    uniform float uGlowIntensity;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = 1.0 - max(0.0, dot(vNormal, viewDir));
      fresnel = pow(fresnel, uGlowPower) * uGlowIntensity;

      gl_FragColor = vec4(uAtmosphereColor, clamp(fresnel, 0.0, 1.0));
    }
  `
};

export const PulsarJetShader = {
  uniforms: {
    uTime: { value: 0 },
    uJetColor: { value: new THREE.Color('#00e676') },
    uAudioPulse: { value: 0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uJetColor;
    uniform float uAudioPulse;
    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      // Cylinder UV: x goes around circumference, y goes from base to tip
      float along = vUv.y;
      float speed = uTime * 6.0;
      float pulseRipples = sin(along * 30.0 - speed) * 0.3 + 0.7;

      // Narrow core beam
      float core = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 3.0);
      float tipFade = smoothstep(1.0, 0.6, along);

      float alpha = core * pulseRipples * tipFade * (0.8 + uAudioPulse * 0.5);
      vec3 col = mix(uJetColor, vec3(1.0), core * 0.7);

      gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
    }
  `
};
