import * as THREE from 'three';

/**
 * Shared camera-distance fade helper.
 * Calculates smooth 0..1 opacity multiplier based on distance from object to camera.
 * Smoothly ramps from 0.0 at nearDist to 1.0 at farDist.
 */
export function calculateCameraDistanceFade(
  objectPos: THREE.Vector3,
  cameraPos: THREE.Vector3,
  nearDist: number = 20,
  farDist: number = 80
): number {
  const dist = objectPos.distanceTo(cameraPos);
  return THREE.MathUtils.smoothstep(dist, nearDist, farDist);
}
