/**
 * Sector & Cosmic Journey Logic
 * Pure deterministic functions for procedural universe generation and kinematics.
 */

export interface CosmicBiome {
  id: string;
  name: string;
  description: string;
  fogColor: string;
  nebulaPrimaryColor: string;
  nebulaSecondaryColor: string;
  ambientLightColor: string;
  ambientIntensity: number;
  primaryBodyType: 'gas_giant' | 'asteroid_field' | 'singularity' | 'pulsar' | 'terrestrial_planet' | 'space_anomaly' | 'deep_nebula' | 'cosmic_void';
  intensity: 'calm' | 'intense';
  starDensity: number;
}

export const BIOMES: CosmicBiome[] = [
  {
    id: 'orion_cradle',
    name: 'Orion Stellar Cradle',
    description: 'A brilliant emission nebula dense with glowing ionized gas and newborn protostars.',
    fogColor: '#0a0518',
    nebulaPrimaryColor: '#e040fb',
    nebulaSecondaryColor: '#00e5ff',
    ambientLightColor: '#7c4dff',
    ambientIntensity: 0.85,
    primaryBodyType: 'deep_nebula',
    intensity: 'calm',
    starDensity: 1.4
  },
  {
    id: 'saturnian_rings',
    name: 'Titanis Ring System',
    description: 'A colossal striped gas giant surrounded by luminous rings and icy moonlets.',
    fogColor: '#060a15',
    nebulaPrimaryColor: '#ffab40',
    nebulaSecondaryColor: '#448aff',
    ambientLightColor: '#ffd180',
    ambientIntensity: 0.9,
    primaryBodyType: 'gas_giant',
    intensity: 'calm',
    starDensity: 1.0
  },
  {
    id: 'asteroid_shoals',
    name: 'Perseus Asteroid Belt',
    description: 'A dense river of tumbling carbonaceous asteroids bathed in distant starlight.',
    fogColor: '#08080c',
    nebulaPrimaryColor: '#ff7043',
    nebulaSecondaryColor: '#26a69a',
    ambientLightColor: '#80cbc4',
    ambientIntensity: 0.7,
    primaryBodyType: 'asteroid_field',
    intensity: 'intense',
    starDensity: 0.9
  },
  {
    id: 'singularity_rift',
    name: 'Gargantua Singularity',
    description: 'A supermassive rotating black hole flanked by a blinding relativistic accretion disk.',
    fogColor: '#030206',
    nebulaPrimaryColor: '#ff3d00',
    nebulaSecondaryColor: '#7c4dff',
    ambientLightColor: '#ff9100',
    ambientIntensity: 1.1,
    primaryBodyType: 'singularity',
    intensity: 'intense',
    starDensity: 1.2
  },
  {
    id: 'pulsar_beacon',
    name: 'Vela Pulsar Array',
    description: 'A rapidly spinning magnetar firing twin relativistic radiation beams across the cosmos.',
    fogColor: '#050c18',
    nebulaPrimaryColor: '#00e676',
    nebulaSecondaryColor: '#00b0ff',
    ambientLightColor: '#69f0ae',
    ambientIntensity: 1.0,
    primaryBodyType: 'pulsar',
    intensity: 'intense',
    starDensity: 1.1
  },
  {
    id: 'ancient_anomaly',
    name: 'Monolith Enclave',
    description: 'A colossal Dyson artifact and ancient precursor beacon resonating with unknown energy.',
    fogColor: '#080410',
    nebulaPrimaryColor: '#d500f9',
    nebulaSecondaryColor: '#651fff',
    ambientLightColor: '#e040fb',
    ambientIntensity: 0.8,
    primaryBodyType: 'space_anomaly',
    intensity: 'intense',
    starDensity: 1.0
  },
  {
    id: 'terrestrial_oasis',
    name: 'Kepler-452 Exoplanet',
    description: 'A temperate blue-green world with swirling cloud continents and bioluminescent oceans.',
    fogColor: '#040d16',
    nebulaPrimaryColor: '#00b4d8',
    nebulaSecondaryColor: '#90e0ef',
    ambientLightColor: '#48cae4',
    ambientIntensity: 0.95,
    primaryBodyType: 'terrestrial_planet',
    intensity: 'calm',
    starDensity: 1.0
  },
  {
    id: 'bootes_void',
    name: 'Great Bootes Expanse',
    description: 'An immense, quiet void of deep space speckled only with distant, ancient galaxies.',
    fogColor: '#020204',
    nebulaPrimaryColor: '#303f9f',
    nebulaSecondaryColor: '#1a237e',
    ambientLightColor: '#7986cb',
    ambientIntensity: 0.5,
    primaryBodyType: 'cosmic_void',
    intensity: 'calm',
    starDensity: 0.8
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

const cycleMemo = new Map<number, CosmicBiome[]>();

function shuffleBiomes(array: readonly CosmicBiome[], rng: () => number): CosmicBiome[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

function getCycleBiomes(cycleIndex: number): CosmicBiome[] {
  if (cycleMemo.has(cycleIndex)) {
    return cycleMemo.get(cycleIndex)!;
  }

  // Sequentially build cycles from 0 up to cycleIndex so each cycle can check previous cycle boundary
  for (let c = 0; c <= cycleIndex; c++) {
    if (cycleMemo.has(c)) continue;

    let prev1: CosmicBiome | null = null;
    let prev2: CosmicBiome | null = null;
    if (c > 0) {
      const prevCycle = cycleMemo.get(c - 1)!;
      prev1 = prevCycle[prevCycle.length - 1];
      prev2 = prevCycle[prevCycle.length - 2];
    }

    let attempt = 0;
    while (true) {
      const rng = mulberry32(c * 1000 + attempt);
      let candidate: CosmicBiome[];

      if (c === 0) {
        // Sector 0 is always Orion Stellar Cradle, as a calm opening
        const orion = BIOMES.find(b => b.id === 'orion_cradle')!;
        const others = BIOMES.filter(b => b.id !== 'orion_cradle');
        candidate = [orion, ...shuffleBiomes(others, rng)];
      } else {
        candidate = shuffleBiomes(BIOMES, rng);
      }

      attempt++;

      // Constraint 1: the same biome is never adjacent across cycle boundaries
      if (prev1 && candidate[0].id === prev1.id) {
        continue;
      }

      // Constraint 2: there are never more than 2 intense sectors in a row, including across boundaries
      const seq: CosmicBiome[] = prev1 && prev2
        ? [prev2, prev1, ...candidate]
        : (prev1 ? [prev1, ...candidate] : candidate);

      let valid = true;
      for (let s = 2; s < seq.length; s++) {
        if (
          seq[s].intensity === 'intense' &&
          seq[s - 1].intensity === 'intense' &&
          seq[s - 2].intensity === 'intense'
        ) {
          valid = false;
          break;
        }
      }

      if (valid) {
        cycleMemo.set(c, candidate);
        break;
      }
    }
  }

  return cycleMemo.get(cycleIndex)!;
}

/**
 * Deterministically determines which biome a given sector index belongs to.
 */
export function getBiomeForSector(sectorIndex: number): CosmicBiome {
  const absIndex = Math.abs(sectorIndex);
  const cycleIndex = Math.floor(absIndex / BIOMES.length);
  const inCycleIndex = absIndex % BIOMES.length;
  const cycle = getCycleBiomes(cycleIndex);
  return cycle[inCycleIndex];
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

/**
 * Calculates deterministic target Z coordinate when jumping to a celestial biome.
 */
export function calculateJumpTargetZ(
  targetBiomeId: string,
  currentCameraZ: number,
  sectorLength: number = SECTOR_LENGTH
): number {
  const biomeExists = BIOMES.some(b => b.id === targetBiomeId);
  if (!biomeExists) return currentCameraZ;

  const curSector = getSectorIndex(currentCameraZ, sectorLength);
  const maxSearch = curSector + 2 * BIOMES.length;

  for (let s = curSector + 1; s <= maxSearch; s++) {
    const biome = getBiomeForSector(s);
    if (biome.id === targetBiomeId) {
      return -s * sectorLength - 200;
    }
  }

  return currentCameraZ;
}

