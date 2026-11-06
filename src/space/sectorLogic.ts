/**
 * Sector & Cosmic Journey Logic
 * Pure deterministic functions for procedural universe generation and kinematics.
 */

export interface CosmicBiome {
  id: string;
  name: string;
  description: string;
  fogColor: string;
  fogDensity: number;
  nebulaPrimaryColor: string;
  nebulaSecondaryColor: string;
  ambientLightColor: string;
  ambientIntensity: number;
  primaryBodyType: 'gas_giant' | 'asteroid_field' | 'singularity' | 'pulsar' | 'terrestrial_planet' | 'space_anomaly' | 'deep_nebula' | 'cosmic_void';
  starDensity: number;
  ambientAudioMood: 'ethereal' | 'intense' | 'mysterious' | 'tranquil';
}

export const BIOMES: CosmicBiome[] = [
  {
    id: 'orion_cradle',
    name: 'Orion Stellar Cradle',
    description: 'A brilliant emission nebula dense with glowing ionized gas and newborn protostars.',
    fogColor: '#0a0518',
    fogDensity: 0.00035,
    nebulaPrimaryColor: '#e040fb',
    nebulaSecondaryColor: '#00e5ff',
    ambientLightColor: '#7c4dff',
    ambientIntensity: 0.85,
    primaryBodyType: 'deep_nebula',
    starDensity: 1.4,
    ambientAudioMood: 'ethereal'
  },
  {
    id: 'saturnian_rings',
    name: 'Titanis Ring System',
    description: 'A colossal striped gas giant surrounded by luminous rings and icy moonlets.',
    fogColor: '#060a15',
    fogDensity: 0.00028,
    nebulaPrimaryColor: '#ffab40',
    nebulaSecondaryColor: '#448aff',
    ambientLightColor: '#ffd180',
    ambientIntensity: 0.9,
    primaryBodyType: 'gas_giant',
    starDensity: 1.0,
    ambientAudioMood: 'tranquil'
  },
  {
    id: 'asteroid_shoals',
    name: 'Perseus Asteroid Belt',
    description: 'A dense river of tumbling carbonaceous asteroids bathed in distant starlight.',
    fogColor: '#08080c',
    fogDensity: 0.0003,
    nebulaPrimaryColor: '#ff7043',
    nebulaSecondaryColor: '#26a69a',
    ambientLightColor: '#80cbc4',
    ambientIntensity: 0.7,
    primaryBodyType: 'asteroid_field',
    starDensity: 0.9,
    ambientAudioMood: 'mysterious'
  },
  {
    id: 'singularity_rift',
    name: 'Gargantua Singularity',
    description: 'A supermassive rotating black hole flanked by a blinding relativistic accretion disk.',
    fogColor: '#030206',
    fogDensity: 0.00045,
    nebulaPrimaryColor: '#ff3d00',
    nebulaSecondaryColor: '#7c4dff',
    ambientLightColor: '#ff9100',
    ambientIntensity: 1.1,
    primaryBodyType: 'singularity',
    starDensity: 1.2,
    ambientAudioMood: 'intense'
  },
  {
    id: 'pulsar_beacon',
    name: 'Vela Pulsar Array',
    description: 'A rapidly spinning magnetar firing twin relativistic radiation beams across the cosmos.',
    fogColor: '#050c18',
    fogDensity: 0.00032,
    nebulaPrimaryColor: '#00e676',
    nebulaSecondaryColor: '#00b0ff',
    ambientLightColor: '#69f0ae',
    ambientIntensity: 1.0,
    primaryBodyType: 'pulsar',
    starDensity: 1.1,
    ambientAudioMood: 'intense'
  },
  {
    id: 'ancient_anomaly',
    name: 'Monolith Enclave',
    description: 'A colossal Dyson artifact and ancient precursor beacon resonating with unknown energy.',
    fogColor: '#080410',
    fogDensity: 0.00025,
    nebulaPrimaryColor: '#d500f9',
    nebulaSecondaryColor: '#651fff',
    ambientLightColor: '#e040fb',
    ambientIntensity: 0.8,
    primaryBodyType: 'space_anomaly',
    starDensity: 1.0,
    ambientAudioMood: 'mysterious'
  },
  {
    id: 'terrestrial_oasis',
    name: 'Kepler-452 Exoplanet',
    description: 'A temperate blue-green world with swirling cloud continents and bioluminescent oceans.',
    fogColor: '#040d16',
    fogDensity: 0.00026,
    nebulaPrimaryColor: '#00b4d8',
    nebulaSecondaryColor: '#90e0ef',
    ambientLightColor: '#48cae4',
    ambientIntensity: 0.95,
    primaryBodyType: 'terrestrial_planet',
    starDensity: 1.0,
    ambientAudioMood: 'tranquil'
  },
  {
    id: 'bootes_void',
    name: 'Great Bootes Expanse',
    description: 'An immense, quiet void of deep space speckled only with distant, ancient galaxies.',
    fogColor: '#020204',
    fogDensity: 0.00015,
    nebulaPrimaryColor: '#303f9f',
    nebulaSecondaryColor: '#1a237e',
    ambientLightColor: '#7986cb',
    ambientIntensity: 0.5,
    primaryBodyType: 'cosmic_void',
    starDensity: 0.6,
    ambientAudioMood: 'mysterious'
  }
];

export const SECTOR_LENGTH = 1600; // Units along Z per sector

/**
 * Deterministic pseudo-random number generator [0, 1) based on Mulberry32
 */
export function mulberry32(seed: number): () => number {
  let s = Math.floor(seed);
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns current continuous sector index from camera Z coordinate.
 * Note: Camera travels in negative Z direction (into the screen).
 */
export function getSectorIndex(cameraZ: number, sectorLength: number = SECTOR_LENGTH): number {
  return Math.floor(Math.abs(cameraZ) / sectorLength);
}

/**
 * Returns progress within the current sector [0, 1).
 */
export function getSectorProgress(cameraZ: number, sectorLength: number = SECTOR_LENGTH): number {
  const absZ = Math.abs(cameraZ);
  return (absZ % sectorLength) / sectorLength;
}

/**
 * Deterministically determines which biome a given sector index belongs to.
 */
export function getBiomeForSector(sectorIndex: number): CosmicBiome {
  const index = Math.abs(sectorIndex) % BIOMES.length;
  return BIOMES[index];
}

/**
 * Astronomical blackbody temperature to normalized RGB [0..1]
 * Approximate Planckian locus from 1000K to 30000K
 */
export function kelvinToRgb(kelvin: number): { r: number; g: number; b: number } {
  const temp = Math.max(1000, Math.min(30000, kelvin)) / 100;
  let r = 0;
  let g = 0;
  let b = 0;

  // Red
  if (temp <= 66) {
    r = 255;
  } else {
    r = temp - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    r = Math.max(0, Math.min(255, r));
  }

  // Green
  if (temp <= 66) {
    g = temp;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    g = Math.max(0, Math.min(255, g));
  } else {
    g = temp - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
    g = Math.max(0, Math.min(255, g));
  }

  // Blue
  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = temp - 10;
    b = 138.5177312231 * Math.log(b) - 305.0447927307;
    b = Math.max(0, Math.min(255, b));
  }

  return {
    r: r / 255,
    g: g / 255,
    b: b / 255
  };
}

export type FlightSpeedMode = 'pause' | 'cruise' | 'warp' | 'hyperspace';

export const FLIGHT_SPEED_VALUES: Record<FlightSpeedMode, number> = {
  pause: 0,
  cruise: 38,
  warp: 95,
  hyperspace: 240
};

export function getWarpFactor(mode: FlightSpeedMode): number {
  return FLIGHT_SPEED_VALUES[mode];
}

/**
 * Calculates smooth audio-reactive modulation values.
 */
export function calculateAudioReaction(
  rawBass: number,
  rawTreble: number,
  baseIntensity: number
): {
  pulsedIntensity: number;
  bloomMultiplier: number;
  chromaticDispersion: number;
} {
  const bassClamped = Math.max(0, Math.min(1, rawBass));
  const trebleClamped = Math.max(0, Math.min(1, rawTreble));

  const pulsedIntensity = baseIntensity * (1 + bassClamped * 0.45);
  const bloomMultiplier = 1 + bassClamped * 0.6 + trebleClamped * 0.3;
  const chromaticDispersion = trebleClamped * 0.008;

  return {
    pulsedIntensity,
    bloomMultiplier,
    chromaticDispersion
  };
}
