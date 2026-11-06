/**
 * Black Hole / Singularity Accretion Disk Shader
 * Relativistic Doppler beaming, swirl distortions, and dark event horizon
 */
import * as THREE from 'three';

export const BlackHoleDiskShader = {
  uniforms: {
    uTime: { value: 0 },
    uInnerRadius: { value: 24.0 },
    uOuterRadius: { value: 85.0 },
    uColorHot: { value: new THREE.Color('#fff2cc') },
    uColorMid: { value: new THREE.Color('#ff7b00') },
    uColorOuter: { value: new THREE.Color('#b30000') },
    uAudioPulse: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;

    void main() {
      vUv = uv;
      vLocalPosition = position;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uInnerRadius;
    uniform float uOuterRadius;
    uniform vec3 uColorHot;
    uniform vec3 uColorMid;
    uniform vec3 uColorOuter;
    uniform float uAudioPulse;

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;

    void main() {
      float dist = length(vLocalPosition.xy);
      if (dist < uInnerRadius || dist > uOuterRadius) {
        discard;
      }

      // Normalized radial position [0..1]
      float r = (dist - uInnerRadius) / (uOuterRadius - uInnerRadius);

      // Angle around disk
      float angle = atan(vLocalPosition.y, vLocalPosition.x);

      // Relativistic swirling speed: faster near event horizon (Keplerian)
      float orbitalSpeed = 4.0 / pow(r + 0.15, 0.7);
      float spiralPhase = angle * 3.0 - uTime * orbitalSpeed;

      // Doppler beaming: approaching side (e.g. cos(angle) > 0) is blue-shifted / brighter
      float doppler = 1.0 + 0.65 * sin(angle + 0.4);

      // Procedural turbulence streaks
      float streak = sin(spiralPhase * 4.0) * 0.2 + cos(spiralPhase * 11.0 + r * 15.0) * 0.15;
      float intensity = smoothstep(0.0, 0.2, r) * smoothstep(1.0, 0.7, r) * (1.0 + streak);

      intensity *= doppler;
      intensity *= (1.0 + uAudioPulse * 0.5);

      // Temperature color gradient from white-hot inner rim to deep red outer edges
      vec3 col = mix(uColorHot, uColorMid, smoothstep(0.0, 0.35, r));
      col = mix(col, uColorOuter, smoothstep(0.35, 0.9, r));

      // Extra photon ring luminescence at ISCO boundary
      float photonRing = smoothstep(0.05, 0.0, r) * 2.5;
      col += vec3(1.0, 0.95, 0.8) * photonRing;

      // Camera distance fade to prevent sudden popping when passing near or through disk
      float camDist = distance(cameraPosition, vWorldPosition);
      float camFade = smoothstep(15.0, 65.0, camDist);

      float alpha = clamp(intensity * 0.95 * camFade, 0.0, 1.0);
      gl_FragColor = vec4(col, alpha);
    }
  `
};

export const GravitationalLensShader = {
  uniforms: {
    uEventHorizonRadius: { value: 20.0 },
    uAudioPulse: { value: 0.0 }
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
    uniform float uEventHorizonRadius;
    uniform float uAudioPulse;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = 1.0 - abs(dot(vNormal, viewDir));
      fresnel = pow(fresnel, 3.5);

      // Camera distance fade
      float camDist = distance(cameraPosition, vWorldPosition);
      fresnel *= smoothstep(15.0, 60.0, camDist);

      // Glowing photon sphere corona
      vec3 ringColor = vec3(1.0, 0.75, 0.4) * (1.0 + uAudioPulse * 0.8);
      gl_FragColor = vec4(ringColor, fresnel * 0.9);
    }
  `
};
