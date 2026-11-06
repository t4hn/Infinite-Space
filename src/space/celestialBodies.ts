/**
 * Composite Procedural Celestial Bodies (3-12 Part Groups)
 * Every celestial hero subject is assembled as a multi-part THREE.Group
 * with contrasting physical materials, roughness/metalness variations, and dynamic animations.
 */
import * as THREE from 'three';
import { SpaceTextureGenerator } from './proceduralTextures';
import { BlackHoleDiskShader, GravitationalLensShader } from './shaders/blackHoleShader';
import { AtmosphereGlowShader, PulsarJetShader } from './shaders/atmosphereShader';

export interface CelestialAnimationTarget {
  group: THREE.Group;
  update: (time: number, delta: number, audioPulse: number) => void;
  dispose: () => void;
}

export class CelestialFactory {
  /**
   * 1. Composite Gas Giant (8 Distinct Parts)
   */
  public static createGasGiant(seed: number = 1): CelestialAnimationTarget {
    const group = new THREE.Group();
    const texturesToDispose: THREE.Texture[] = [];
    const materialsToDispose: THREE.Material[] = [];
    const geometriesToDispose: THREE.BufferGeometry[] = [];

    // Part 1: Core Planetary Sphere with Storm Bands
    const gasGiantTexture = SpaceTextureGenerator.createGasGiantTexture({
      base: '#9c4221',
      bands: ['#d97706', '#b45309', '#f59e0b', '#78350f', '#fde68a', '#92400e'],
      storm: '#b91c1c'
    });
    texturesToDispose.push(gasGiantTexture);

    const planetGeo = new THREE.SphereGeometry(32, 64, 48);
    geometriesToDispose.push(planetGeo);
    const planetMat = new THREE.MeshStandardMaterial({
      map: gasGiantTexture,
      roughness: 0.75,
      metalness: 0.05
    });
    materialsToDispose.push(planetMat);
    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    group.add(planetMesh);

    // Part 2: Inner Main Ring Disk
    const ringTex = SpaceTextureGenerator.createRingTexture('#fcd34d', '#78350f');
    texturesToDispose.push(ringTex);
    const ringGeo = new THREE.RingGeometry(44, 76, 80);
    geometriesToDispose.push(ringGeo);

    // Reproject UVs radially so the 1D gradient maps across the ring radius
    const pos = ringGeo.attributes.position;
    const uvs = ringGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.sqrt(x * x + y * y);
      const u = (r - 44) / (76 - 44);
      uvs.setXY(i, u, 0.5);
    }
    uvs.needsUpdate = true;

    const ringMat = new THREE.MeshStandardMaterial({
      map: ringTex,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0.15
    });
    materialsToDispose.push(ringMat);
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2 + 0.35;
    ringMesh.rotation.y = 0.15;
    group.add(ringMesh);

    // Part 3: Outer Faint Dust Ring
    const outerRingGeo = new THREE.RingGeometry(78, 88, 64);
    geometriesToDispose.push(outerRingGeo);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: '#d97706',
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    materialsToDispose.push(outerRingMat);
    const outerRingMesh = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRingMesh.rotation.x = ringMesh.rotation.x;
    outerRingMesh.rotation.y = ringMesh.rotation.y;
    group.add(outerRingMesh);

    // Part 4: North Aurora Ring
    const auroraGeo = new THREE.TorusGeometry(14, 0.8, 16, 64);
    geometriesToDispose.push(auroraGeo);
    const auroraMat = new THREE.MeshBasicMaterial({
      color: '#34d399',
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    materialsToDispose.push(auroraMat);
    const northAurora = new THREE.Mesh(auroraGeo, auroraMat);
    northAurora.position.y = 29.5;
    northAurora.rotation.x = Math.PI / 2;
    group.add(northAurora);

    // Part 5: South Aurora Ring
    const southAurora = new THREE.Mesh(auroraGeo, auroraMat.clone());
    materialsToDispose.push(southAurora.material as THREE.Material);
    southAurora.position.y = -29.5;
    southAurora.rotation.x = Math.PI / 2;
    group.add(southAurora);

    // Part 6: Major Moon (Icy Moonlet)
    const moonGeo = new THREE.SphereGeometry(3.2, 24, 24);
    geometriesToDispose.push(moonGeo);
    const moonMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.85,
      metalness: 0.1
    });
    materialsToDispose.push(moonMat);
    const moon = new THREE.Mesh(moonGeo, moonMat);
    group.add(moon);

    // Part 7: Outer Shepherd Moonlet
    const moon2Geo = new THREE.SphereGeometry(1.6, 16, 16);
    geometriesToDispose.push(moon2Geo);
    const moon2Mat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.95,
      metalness: 0.2
    });
    materialsToDispose.push(moon2Mat);
    const moon2 = new THREE.Mesh(moon2Geo, moon2Mat);
    group.add(moon2);

    // Part 8: Atmospheric Haze Limb
    const hazeGeo = new THREE.SphereGeometry(33.2, 48, 32);
    geometriesToDispose.push(hazeGeo);
    const hazeMat = new THREE.ShaderMaterial({
      vertexShader: AtmosphereGlowShader.vertexShader,
      fragmentShader: AtmosphereGlowShader.fragmentShader,
      uniforms: {
        uAtmosphereColor: { value: new THREE.Color('#f59e0b') },
        uGlowPower: { value: 3.8 },
        uGlowIntensity: { value: 1.1 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    materialsToDispose.push(hazeMat);
    const hazeMesh = new THREE.Mesh(hazeGeo, hazeMat);
    group.add(hazeMesh);

    return {
      group,
      update: (time: number, delta: number, audioPulse: number) => {
        planetMesh.rotation.y += delta * 0.08;
        ringMesh.rotation.z += delta * 0.02;

        // Orbiting moons
        const moonAngle = time * 0.25;
        moon.position.set(Math.cos(moonAngle) * 95, Math.sin(moonAngle) * 18, Math.sin(moonAngle) * 95);

        const moon2Angle = -time * 0.4 + 1.2;
        moon2.position.set(Math.cos(moon2Angle) * 115, -Math.sin(moon2Angle) * 24, Math.sin(moon2Angle) * 115);

        // Aurora pulse
        auroraMat.opacity = 0.45 + Math.sin(time * 3) * 0.2 + audioPulse * 0.35;
      },
      dispose: () => {
        texturesToDispose.forEach(t => t.dispose());
        geometriesToDispose.forEach(g => g.dispose());
        materialsToDispose.forEach(m => m.dispose());
      }
    };
  }

  /**
   * 2. Composite Terrestrial Oasis World (6 Distinct Parts)
   */
  public static createTerrestrialWorld(): CelestialAnimationTarget {
    const group = new THREE.Group();
    const texturesToDispose: THREE.Texture[] = [];
    const materialsToDispose: THREE.Material[] = [];
    const geometriesToDispose: THREE.BufferGeometry[] = [];

    // Part 1: Continental / Ocean Crust
    const terrTex = SpaceTextureGenerator.createTerrestrialTexture();
    texturesToDispose.push(terrTex);
    const crustGeo = new THREE.SphereGeometry(22, 64, 48);
    geometriesToDispose.push(crustGeo);
    const crustMat = new THREE.MeshStandardMaterial({
      map: terrTex,
      roughness: 0.55,
      metalness: 0.15
    });
    materialsToDispose.push(crustMat);
    const crustMesh = new THREE.Mesh(crustGeo, crustMat);
    group.add(crustMesh);

    // Part 2: Swirling Cloud Layer
    const cloudTex = SpaceTextureGenerator.createCloudTexture();
    texturesToDispose.push(cloudTex);
    const cloudGeo = new THREE.SphereGeometry(22.45, 48, 36);
    geometriesToDispose.push(cloudGeo);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.NormalBlending,
      roughness: 0.9,
      metalness: 0.0
    });
    materialsToDispose.push(cloudMat);
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    group.add(cloudMesh);

    // Part 3: Cyan Atmospheric Limb Glow
    const atmosGeo = new THREE.SphereGeometry(23.8, 48, 32);
    geometriesToDispose.push(atmosGeo);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: AtmosphereGlowShader.vertexShader,
      fragmentShader: AtmosphereGlowShader.fragmentShader,
      uniforms: {
        uAtmosphereColor: { value: new THREE.Color('#38bdf8') },
        uGlowPower: { value: 3.2 },
        uGlowIntensity: { value: 1.6 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    materialsToDispose.push(atmosMat);
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    group.add(atmosMesh);

    // Part 4: Cratered Lunar Satellite
    const moonGeo = new THREE.SphereGeometry(4.2, 24, 24);
    geometriesToDispose.push(moonGeo);
    const moonMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.92,
      metalness: 0.05
    });
    materialsToDispose.push(moonMat);
    const moon = new THREE.Mesh(moonGeo, moonMat);
    group.add(moon);

    // Part 5: Orbital Station / Dyson Monolith Beacon orbiting the world
    const stationGroup = new THREE.Group();
    const coreGeo = new THREE.CylinderGeometry(0.5, 0.5, 3.2, 8);
    geometriesToDispose.push(coreGeo);
    const coreMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.9, roughness: 0.1 });
    materialsToDispose.push(coreMat);
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    stationGroup.add(coreMesh);

    const solarGeo = new THREE.BoxGeometry(4.8, 0.1, 1.2);
    geometriesToDispose.push(solarGeo);
    const solarMat = new THREE.MeshStandardMaterial({ color: '#0284c7', metalness: 0.95, roughness: 0.1 });
    materialsToDispose.push(solarMat);
    const solarMesh = new THREE.Mesh(solarGeo, solarMat);
    stationGroup.add(solarMesh);
    group.add(stationGroup);

    // Part 6: Polar Magnetic Rings
    const polarGeo = new THREE.TorusGeometry(8, 0.4, 12, 48);
    geometriesToDispose.push(polarGeo);
    const polarMat = new THREE.MeshBasicMaterial({
      color: '#06b6d4',
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    materialsToDispose.push(polarMat);
    const polarRing = new THREE.Mesh(polarGeo, polarMat);
    polarRing.rotation.x = Math.PI / 2;
    polarRing.position.y = 21.0;
    group.add(polarRing);

    return {
      group,
      update: (time: number, delta: number, audioPulse: number) => {
        crustMesh.rotation.y += delta * 0.06;
        cloudMesh.rotation.y += delta * 0.085; // Clouds drift faster than surface

        const moonAngle = time * 0.2;
        moon.position.set(Math.sin(moonAngle) * 72, Math.cos(moonAngle) * 14, Math.cos(moonAngle) * 72);

        const stAngle = time * 0.5;
        stationGroup.position.set(Math.cos(stAngle) * 32, Math.sin(stAngle) * 12, Math.sin(stAngle) * 32);
        stationGroup.rotation.y += delta * 0.8;

        polarMat.opacity = 0.35 + audioPulse * 0.4;
      },
      dispose: () => {
        texturesToDispose.forEach(t => t.dispose());
        geometriesToDispose.forEach(g => g.dispose());
        materialsToDispose.forEach(m => m.dispose());
      }
    };
  }

  /**
   * 3. Composite Supermassive Black Hole (7 Distinct Parts)
   */
  public static createBlackHole(): CelestialAnimationTarget {
    const group = new THREE.Group();
    const materialsToDispose: THREE.Material[] = [];
    const geometriesToDispose: THREE.BufferGeometry[] = [];

    // Part 1: Event Horizon (Absolute pitch black light absorber)
    const horizonGeo = new THREE.SphereGeometry(18, 48, 36);
    geometriesToDispose.push(horizonGeo);
    const horizonMat = new THREE.MeshBasicMaterial({ color: '#000000' });
    materialsToDispose.push(horizonMat);
    const horizon = new THREE.Mesh(horizonGeo, horizonMat);
    group.add(horizon);

    // Part 2: Relativistic Doppler Accretion Disk (Horizontal)
    const diskGeo = new THREE.PlaneGeometry(160, 160);
    geometriesToDispose.push(diskGeo);
    const diskMat = new THREE.ShaderMaterial({
      vertexShader: BlackHoleDiskShader.vertexShader,
      fragmentShader: BlackHoleDiskShader.fragmentShader,
      uniforms: THREE.UniformsUtils.clone(BlackHoleDiskShader.uniforms),
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    materialsToDispose.push(diskMat);
    const accretionDisk = new THREE.Mesh(diskGeo, diskMat);
    accretionDisk.rotation.x = -Math.PI / 2 + 0.25;
    group.add(accretionDisk);

    // Part 3: Gravitationally Lensed Vertical Accretion Arc (Secondary warping)
    const lensedDiskMat = new THREE.ShaderMaterial({
      vertexShader: BlackHoleDiskShader.vertexShader,
      fragmentShader: BlackHoleDiskShader.fragmentShader,
      uniforms: THREE.UniformsUtils.clone(BlackHoleDiskShader.uniforms),
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    materialsToDispose.push(lensedDiskMat);
    const lensedDisk = new THREE.Mesh(diskGeo, lensedDiskMat);
    lensedDisk.rotation.y = Math.PI / 2;
    lensedDisk.scale.set(0.85, 0.85, 0.85);
    group.add(lensedDisk);

    // Part 4: Photon Sphere Corona (Einstein Ring)
    const photonSphereGeo = new THREE.SphereGeometry(21.5, 48, 36);
    geometriesToDispose.push(photonSphereGeo);
    const photonMat = new THREE.ShaderMaterial({
      vertexShader: GravitationalLensShader.vertexShader,
      fragmentShader: GravitationalLensShader.fragmentShader,
      uniforms: THREE.UniformsUtils.clone(GravitationalLensShader.uniforms),
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });
    materialsToDispose.push(photonMat);
    const photonSphere = new THREE.Mesh(photonSphereGeo, photonMat);
    group.add(photonSphere);

    // Part 5 & 6: Relativistic North & South Energy Jets
    const jetGeo = new THREE.CylinderGeometry(0.8, 12, 140, 24, 1, true);
    geometriesToDispose.push(jetGeo);
    const jetMat = new THREE.ShaderMaterial({
      vertexShader: PulsarJetShader.vertexShader,
      fragmentShader: PulsarJetShader.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uJetColor: { value: new THREE.Color('#ff3d00') },
        uAudioPulse: { value: 0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    materialsToDispose.push(jetMat);

    const northJet = new THREE.Mesh(jetGeo, jetMat);
    northJet.position.y = 70;
    group.add(northJet);

    const southJet = new THREE.Mesh(jetGeo, jetMat);
    southJet.position.y = -70;
    southJet.rotation.x = Math.PI;
    group.add(southJet);

    // Part 7: Magnetic Plasma Churn Halo
    const haloGeo = new THREE.TorusGeometry(32, 1.2, 16, 64);
    geometriesToDispose.push(haloGeo);
    const haloMat = new THREE.MeshBasicMaterial({
      color: '#ff9100',
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    materialsToDispose.push(haloMat);
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.rotation.x = accretionDisk.rotation.x;
    group.add(haloMesh);

    return {
      group,
      update: (time: number, delta: number, audioPulse: number) => {
        diskMat.uniforms.uTime.value = time;
        diskMat.uniforms.uAudioPulse.value = audioPulse;

        lensedDiskMat.uniforms.uTime.value = time * 0.9;
        lensedDiskMat.uniforms.uAudioPulse.value = audioPulse;

        jetMat.uniforms.uTime.value = time;
        jetMat.uniforms.uAudioPulse.value = audioPulse;

        photonMat.uniforms.uAudioPulse.value = audioPulse;

        haloMesh.rotation.z += delta * 0.4;
      },
      dispose: () => {
        geometriesToDispose.forEach(g => g.dispose());
        materialsToDispose.forEach(m => m.dispose());
      }
    };
  }

  /**
   * 4. Composite Ancient Anomaly / Precursor Monolith (8 Distinct Parts)
   */
  public static createAncientAnomaly(): CelestialAnimationTarget {
    const group = new THREE.Group();
    const materialsToDispose: THREE.Material[] = [];
    const geometriesToDispose: THREE.BufferGeometry[] = [];

    // Part 1: Obsidian Monolith Core
    const coreGeo = new THREE.OctahedronGeometry(14, 0);
    geometriesToDispose.push(coreGeo);
    const coreMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      metalness: 0.95,
      roughness: 0.12,
      wireframe: false
    });
    materialsToDispose.push(coreMat);
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // Part 2: Inner Rotating Armature Ring
    const innerRingGeo = new THREE.TorusGeometry(20, 0.8, 16, 64);
    geometriesToDispose.push(innerRingGeo);
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: '#9333ea',
      metalness: 0.9,
      roughness: 0.2
    });
    materialsToDispose.push(ringMat1);
    const innerRing = new THREE.Mesh(innerRingGeo, ringMat1);
    group.add(innerRing);

    // Part 3: Middle Counter-Rotating Gyroscope Ring
    const midRingGeo = new THREE.TorusGeometry(26, 0.9, 16, 64);
    geometriesToDispose.push(midRingGeo);
    const ringMat2 = new THREE.MeshStandardMaterial({
      color: '#06b6d4',
      metalness: 0.92,
      roughness: 0.18
    });
    materialsToDispose.push(ringMat2);
    const midRing = new THREE.Mesh(midRingGeo, ringMat2);
    group.add(midRing);

    // Part 4: Outer Sensor Torus
    const outerRingGeo = new THREE.TorusGeometry(32, 0.7, 16, 64);
    geometriesToDispose.push(outerRingGeo);
    const ringMat3 = new THREE.MeshStandardMaterial({
      color: '#d946ef',
      metalness: 0.85,
      roughness: 0.25
    });
    materialsToDispose.push(ringMat3);
    const outerRing = new THREE.Mesh(outerRingGeo, ringMat3);
    group.add(outerRing);

    // Part 5: Quad Energy Conduits / Resonator Blades
    const bladeGroup = new THREE.Group();
    const bladeGeo = new THREE.BoxGeometry(2, 42, 4);
    geometriesToDispose.push(bladeGeo);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      metalness: 0.88,
      roughness: 0.15
    });
    materialsToDispose.push(bladeMat);

    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.rotation.z = (i * Math.PI) / 2;
      bladeGroup.add(blade);
    }
    group.add(bladeGroup);

    // Part 6: Core Energy Containment Sphere (Luminous wireframe)
    const energyGeo = new THREE.IcosahedronGeometry(11, 2);
    geometriesToDispose.push(energyGeo);
    const energyMat = new THREE.MeshBasicMaterial({
      color: '#a855f7',
      wireframe: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    materialsToDispose.push(energyMat);
    const energySphere = new THREE.Mesh(energyGeo, energyMat);
    group.add(energySphere);

    // Part 7: Telemetry Field Glow
    const glowGeo = new THREE.SphereGeometry(15, 32, 24);
    geometriesToDispose.push(glowGeo);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: AtmosphereGlowShader.vertexShader,
      fragmentShader: AtmosphereGlowShader.fragmentShader,
      uniforms: {
        uAtmosphereColor: { value: new THREE.Color('#c084fc') },
        uGlowPower: { value: 2.6 },
        uGlowIntensity: { value: 1.8 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    materialsToDispose.push(glowMat);
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    group.add(glowMesh);

    return {
      group,
      update: (time: number, delta: number, audioPulse: number) => {
        coreMesh.rotation.x += delta * 0.15;
        coreMesh.rotation.y += delta * 0.22;

        innerRing.rotation.x = time * 0.4;
        innerRing.rotation.y = time * 0.3;

        midRing.rotation.y = -time * 0.35;
        midRing.rotation.z = time * 0.25;

        outerRing.rotation.z = time * 0.2;
        outerRing.rotation.x = -time * 0.18;

        bladeGroup.rotation.z += delta * 0.12;

        energySphere.rotation.x -= delta * 0.3;
        energySphere.rotation.y -= delta * 0.4;

        // Reactive pulse
        const s = 1.0 + audioPulse * 0.18;
        energySphere.scale.set(s, s, s);
        energyMat.opacity = 0.6 + audioPulse * 0.4;
      },
      dispose: () => {
        geometriesToDispose.forEach(g => g.dispose());
        materialsToDispose.forEach(m => m.dispose());
      }
    };
  }

  /**
   * 5. Composite Pulsar Magnetar (6 Distinct Parts)
   */
  public static createPulsar(): CelestialAnimationTarget {
    const group = new THREE.Group();
    const materialsToDispose: THREE.Material[] = [];
    const geometriesToDispose: THREE.BufferGeometry[] = [];

    // Part 1: Ultra-dense Core
    const coreGeo = new THREE.SphereGeometry(10, 32, 32);
    geometriesToDispose.push(coreGeo);
    const coreMat = new THREE.MeshBasicMaterial({
      color: '#ffffff'
    });
    materialsToDispose.push(coreMat);
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // Part 2: Plasma Equator Corona
    const coronaGeo = new THREE.TorusGeometry(16, 2.5, 16, 64);
    geometriesToDispose.push(coronaGeo);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: '#00e676',
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    materialsToDispose.push(coronaMat);
    const corona = new THREE.Mesh(coronaGeo, coronaMat);
    corona.rotation.x = Math.PI / 2;
    group.add(corona);

    // Part 3 & 4: North & South Polar Beams
    const beamGeo = new THREE.CylinderGeometry(1.2, 14, 180, 24, 1, true);
    geometriesToDispose.push(beamGeo);
    const beamMat = new THREE.ShaderMaterial({
      vertexShader: PulsarJetShader.vertexShader,
      fragmentShader: PulsarJetShader.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uJetColor: { value: new THREE.Color('#00e676') },
        uAudioPulse: { value: 0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    materialsToDispose.push(beamMat);

    const northBeam = new THREE.Mesh(beamGeo, beamMat);
    northBeam.position.y = 90;
    group.add(northBeam);

    const southBeam = new THREE.Mesh(beamGeo, beamMat);
    southBeam.position.y = -90;
    southBeam.rotation.x = Math.PI;
    group.add(southBeam);

    // Part 5: Helical Magnetic Loop 1
    const loopGeo = new THREE.TorusGeometry(26, 0.6, 12, 64);
    geometriesToDispose.push(loopGeo);
    const loopMat = new THREE.MeshBasicMaterial({
      color: '#00b0ff',
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    materialsToDispose.push(loopMat);
    const loop1 = new THREE.Mesh(loopGeo, loopMat);
    loop1.rotation.y = Math.PI / 4;
    group.add(loop1);

    // Part 6: Helical Magnetic Loop 2
    const loop2 = new THREE.Mesh(loopGeo, loopMat);
    loop2.rotation.y = -Math.PI / 4;
    group.add(loop2);

    return {
      group,
      update: (time: number, delta: number, audioPulse: number) => {
        // Fast pulsar spin (Magnetar rotation)
        group.rotation.y += delta * 2.5;
        group.rotation.z = Math.sin(time * 1.5) * 0.2; // Precession wobble

        beamMat.uniforms.uTime.value = time;
        beamMat.uniforms.uAudioPulse.value = audioPulse;

        coronaMat.opacity = 0.5 + audioPulse * 0.45;
      },
      dispose: () => {
        geometriesToDispose.forEach(g => g.dispose());
        materialsToDispose.forEach(m => m.dispose());
      }
    };
  }

  /**
   * 6. High-Performance Instanced Asteroid Field (300+ Rocks)
   */
  public static createAsteroidField(count: number = 320, spread: number = 400): CelestialAnimationTarget {
    const group = new THREE.Group();
    const asteroidGeo = new THREE.DodecahedronGeometry(2.5, 1);
    
    // Displace vertices slightly with pseudo noise so asteroids look organic
    const pos = asteroidGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const dist = Math.sqrt(vx * vx + vy * vy + vz * vz);
      const displacement = 1.0 + (Math.sin(vx * 3) + Math.cos(vy * 3) + Math.sin(vz * 3)) * 0.12;
      pos.setXYZ(i, (vx / dist) * 2.5 * displacement, (vy / dist) * 2.5 * displacement, (vz / dist) * 2.5 * displacement);
    }
    asteroidGeo.computeVertexNormals();

    const asteroidTex = SpaceTextureGenerator.createAsteroidTexture();
    const asteroidMat = new THREE.MeshStandardMaterial({
      map: asteroidTex,
      roughness: 0.88,
      metalness: 0.18
    });

    const instancedMesh = new THREE.InstancedMesh(asteroidGeo, asteroidMat, count);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();
    const speeds: Array<{ rotSpeed: THREE.Vector3; basePos: THREE.Vector3 }> = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 60 + Math.random() * (spread - 60);
      const y = (Math.random() - 0.5) * 80;
      const x = Math.cos(angle) * radius;
      const z = (Math.random() - 0.5) * 600;

      const scale = 0.6 + Math.random() * 2.2;
      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.scale.set(scale, scale * (0.8 + Math.random() * 0.4), scale);
      dummy.updateMatrix();

      instancedMesh.setMatrixAt(i, dummy.matrix);

      speeds.push({
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8
        ),
        basePos: new THREE.Vector3(x, y, z)
      });
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.computeBoundingSphere();
    group.add(instancedMesh);

    return {
      group,
      update: (time: number, delta: number) => {
        // Slowly tumble individual asteroids
        for (let i = 0; i < Math.min(count, 120); i++) {
          instancedMesh.getMatrixAt(i, dummy.matrix);
          dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
          dummy.rotation.x += speeds[i].rotSpeed.x * delta;
          dummy.rotation.y += speeds[i].rotSpeed.y * delta;
          dummy.rotation.z += speeds[i].rotSpeed.z * delta;
          dummy.updateMatrix();
          instancedMesh.setMatrixAt(i, dummy.matrix);
        }
        instancedMesh.instanceMatrix.needsUpdate = true;
      },
      dispose: () => {
        asteroidGeo.dispose();
        asteroidMat.dispose();
        asteroidTex.dispose();
      }
    };
  }
}
