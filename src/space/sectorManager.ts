/**
 * Infinite Procedural Sector Manager
 * Spawns, updates, and recycles celestial sectors, volumetric nebulae,
 * and hero celestial bodies seamlessly as the journey progresses.
 */
import * as THREE from 'three';
import {
  getSectorIndex,
  getBiomeForSector,
  SECTOR_LENGTH,
  CosmicBiome,
  BIOMES
} from './sectorLogic';
import { CelestialFactory, CelestialAnimationTarget } from './celestialBodies';
import { createNebulaMesh } from './shaders/nebulaShader';

export interface SectorInstance {
  index: number;
  biome: CosmicBiome;
  group: THREE.Group;
  centerZ: number;
  nebulae: THREE.Mesh[];
  heroBody?: CelestialAnimationTarget;
  disposed: boolean;
}

export class SectorManager {
  private scene: THREE.Scene;
  private activeSectors: Map<number, SectorInstance> = new Map();
  private currentSectorIndex: number = 0;
  private targetFogColor: THREE.Color = new THREE.Color('#0a0518');
  private targetAmbientColor: THREE.Color = new THREE.Color('#7c4dff');
  private targetAmbientIntensity: number = 0.85;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public update(
    cameraZ: number,
    time: number,
    delta: number,
    audioPulse: number
  ): { currentBiome: CosmicBiome; sectorIndex: number } {
    const sectorIndex = getSectorIndex(cameraZ, SECTOR_LENGTH);
    this.currentSectorIndex = sectorIndex;

    // Ensure sectors are loaded: current - 1, current, current + 1, current + 2
    const neededIndices = [sectorIndex - 1, sectorIndex, sectorIndex + 1, sectorIndex + 2];

    for (const idx of neededIndices) {
      if (idx >= 0 && !this.activeSectors.has(idx)) {
        this.spawnSector(idx);
      }
    }

    // Remove distant sectors that have passed far behind the camera
    for (const [idx, sector] of this.activeSectors.entries()) {
      if (idx < sectorIndex - 1 || idx > sectorIndex + 3) {
        this.destroySector(idx);
      } else {
        // Animate hero body and nebulae
        if (sector.heroBody) {
          sector.heroBody.update(time, delta, audioPulse);
        }

        sector.nebulae.forEach((nebula) => {
          const mat = nebula.material as THREE.ShaderMaterial;
          if (mat.uniforms) {
            mat.uniforms.uTime.value = time;
            mat.uniforms.uAudioPulse.value = audioPulse;
          }
          nebula.rotation.y += delta * 0.02;
        });
      }
    }

    const currentBiome = getBiomeForSector(sectorIndex);
    this.targetFogColor.set(currentBiome.fogColor);
    this.targetAmbientColor.set(currentBiome.ambientLightColor);
    this.targetAmbientIntensity = currentBiome.ambientIntensity;

    return { currentBiome, sectorIndex };
  }

  private spawnSector(index: number) {
    const biome = getBiomeForSector(index);
    // Sector origin along negative Z
    const sectorOriginZ = -index * SECTOR_LENGTH;

    const group = new THREE.Group();
    group.position.set(0, 0, sectorOriginZ);

    const nebulae: THREE.Mesh[] = [];

    // 1. Volumetric Nebula formations distributed along cosmic flanks
    const numNebulae = biome.primaryBodyType === 'cosmic_void' ? 2 : 4;
    for (let n = 0; n < numNebulae; n++) {
      const radius = 260 + Math.random() * 120;
      const nebMesh = createNebulaMesh(
        radius,
        biome.nebulaPrimaryColor,
        biome.nebulaSecondaryColor,
        '#ffffff'
      );

      // Flank left and right of flight path
      const side = (n % 2 === 0) ? 1 : -1;
      const offsetX = side * (190 + Math.random() * 160);
      const offsetY = (Math.random() - 0.5) * 160;
      // Staggered along sector depth
      const nebZ = -(n * 380 + 200 + Math.random() * 120);

      nebMesh.position.set(offsetX, offsetY, nebZ);
      nebMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

      group.add(nebMesh);
      nebulae.push(nebMesh);
    }

    // 2. Hero Celestial Body placed majestically in clear sight
    let heroBody: CelestialAnimationTarget | undefined;
    const bodyZ = -460; // Visible immediately ahead from sector entry

    switch (biome.primaryBodyType) {
      case 'gas_giant': {
        heroBody = CelestialFactory.createGasGiant(index);
        heroBody.group.position.set(70, -8, bodyZ);
        break;
      }
      case 'terrestrial_planet': {
        heroBody = CelestialFactory.createTerrestrialWorld();
        heroBody.group.position.set(-85, 20, bodyZ);
        break;
      }
      case 'singularity': {
        heroBody = CelestialFactory.createBlackHole();
        heroBody.group.position.set(0, 0, bodyZ);
        break;
      }
      case 'pulsar': {
        heroBody = CelestialFactory.createPulsar();
        heroBody.group.position.set(75, 25, bodyZ);
        break;
      }
      case 'space_anomaly': {
        heroBody = CelestialFactory.createAncientAnomaly();
        heroBody.group.position.set(-55, -15, bodyZ);
        break;
      }
      case 'asteroid_field': {
        heroBody = CelestialFactory.createAsteroidField(360, 380);
        heroBody.group.position.set(0, 0, bodyZ);
        break;
      }
      case 'deep_nebula': {
        // Glorious glowing protostar system inside deep nebula
        heroBody = CelestialFactory.createGasGiant(index);
        heroBody.group.position.set(95, -15, bodyZ);
        break;
      }
      case 'cosmic_void':
      default:
        break;
    }

    if (heroBody) {
      group.add(heroBody.group);
    }

    this.scene.add(group);

    this.activeSectors.set(index, {
      index,
      biome,
      group,
      centerZ: sectorOriginZ - (SECTOR_LENGTH / 2),
      nebulae,
      heroBody,
      disposed: false
    });
  }

  private destroySector(index: number) {
    const sector = this.activeSectors.get(index);
    if (!sector || sector.disposed) return;

    sector.disposed = true;
    this.scene.remove(sector.group);

    // Dispose hero body
    if (sector.heroBody) {
      sector.heroBody.dispose();
    }

    // Dispose nebulae
    sector.nebulae.forEach((nebula) => {
      nebula.geometry.dispose();
      (nebula.material as THREE.Material).dispose();
    });

    this.activeSectors.delete(index);
  }

  public jumpToBiome(targetBiomeId: string, currentCameraZ: number): number {
    const biomeIndex = BIOMES.findIndex(b => b.id === targetBiomeId);
    if (biomeIndex === -1) return currentCameraZ;

    // Find the next sector ahead with this biome
    const curSector = getSectorIndex(currentCameraZ, SECTOR_LENGTH);
    let targetSector = curSector + 1;
    while ((targetSector % BIOMES.length) !== biomeIndex) {
      targetSector++;
    }

    return -targetSector * SECTOR_LENGTH - 200;
  }

  public getTargetLighting() {
    return {
      fogColor: this.targetFogColor,
      ambientColor: this.targetAmbientColor,
      ambientIntensity: this.targetAmbientIntensity
    };
  }

  public dispose() {
    for (const index of Array.from(this.activeSectors.keys())) {
      this.destroySector(index);
    }
    this.activeSectors.clear();
  }
}
