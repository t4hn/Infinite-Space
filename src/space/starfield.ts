/**
 * Multi-Layered Deep Space Starfield & Warp Streak System
 * Features authentic stellar spectral classes, pin-point distant diamond dust,
 * parallax cluster stars, and dynamic warp streaks.
 */
import * as THREE from 'three';
import { kelvinToRgb } from './sectorLogic';
import { SpaceTextureGenerator } from './proceduralTextures';

export class StarfieldManager {
  private group: THREE.Group;
  private pinStars: THREE.Points;        // Distant sharp diamond stars (non-attenuated)
  private clusterStars: THREE.Points;    // Mid-depth glowing stars (size attenuated)
  private streakStars: THREE.LineSegments; // High-velocity warp streaks
  private distantGalaxies: THREE.Group;

  private pinCount: number = 3500;
  private clusterCount: number = 1800;
  private streakCount: number = 600;

  private streakPositions: Float32Array;
  private galaxyData: Array<{
    group: THREE.Group;
    x: number;
    y: number;
    baseZOffset: number;
  }> = [];
  private currentDensity: number = 1.0;

  constructor() {
    this.group = new THREE.Group();

    const spectralTemps = [
      32000, 24000, 16000, // Class O/B (Deep Blue, Azure, Cyan)
      9600, 7500,          // Class A/F (White, Silver)
      5800, 5200,          // Class G (Sun Yellow, Gold)
      4200, 3100           // Class K/M (Amber, Deep Crimson)
    ];

    const boundary = 2800;

    // 1. Distant Pinpoint Stars (Always razor-sharp, fills entire cosmos)
    const pinGeo = new THREE.BufferGeometry();
    const pinPos = new Float32Array(this.pinCount * 3);
    const pinCols = new Float32Array(this.pinCount * 3);

    for (let i = 0; i < this.pinCount; i++) {
      const x = (Math.random() - 0.5) * 1800;
      const y = (Math.random() - 0.5) * 1200;
      // Match initial Z range to wrap boundary [-2700, 100]
      const z = 100 - Math.random() * boundary;

      pinPos[i * 3] = x;
      pinPos[i * 3 + 1] = y;
      pinPos[i * 3 + 2] = z;

      const temp = spectralTemps[Math.floor(Math.random() * spectralTemps.length)];
      const rgb = kelvinToRgb(temp);
      pinCols[i * 3] = rgb.r * 1.2;
      pinCols[i * 3 + 1] = rgb.g * 1.2;
      pinCols[i * 3 + 2] = rgb.b * 1.2;
    }

    pinGeo.setAttribute('position', new THREE.BufferAttribute(pinPos, 3));
    pinGeo.setAttribute('color', new THREE.BufferAttribute(pinCols, 3));

    const pinMat = new THREE.PointsMaterial({
      size: 2.2,
      sizeAttenuation: false, // Guarantees crisp diamond stars at all distances
      vertexColors: true,
      transparent: true,
      opacity: 0.95
    });

    this.pinStars = new THREE.Points(pinGeo, pinMat);
    this.pinStars.frustumCulled = false;
    this.group.add(this.pinStars);

    // 2. Mid-Depth Glowing Cluster Stars (Size attenuated, glowing star sprite)
    const starSprite = SpaceTextureGenerator.createStarGlowTexture();
    const clusterGeo = new THREE.BufferGeometry();
    const clusterPos = new Float32Array(this.clusterCount * 3);
    const clusterCols = new Float32Array(this.clusterCount * 3);

    for (let i = 0; i < this.clusterCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 25 + Math.pow(Math.random(), 0.7) * 450;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * (radius * 0.7);
      // Match initial Z range to wrap boundary [-2720, 80]
      const z = 80 - Math.random() * boundary;

      clusterPos[i * 3] = x;
      clusterPos[i * 3 + 1] = y;
      clusterPos[i * 3 + 2] = z;

      const temp = spectralTemps[Math.floor(Math.random() * spectralTemps.length)];
      const rgb = kelvinToRgb(temp);
      clusterCols[i * 3] = rgb.r;
      clusterCols[i * 3 + 1] = rgb.g;
      clusterCols[i * 3 + 2] = rgb.b;
    }

    clusterGeo.setAttribute('position', new THREE.BufferAttribute(clusterPos, 3));
    clusterGeo.setAttribute('color', new THREE.BufferAttribute(clusterCols, 3));

    const clusterMat = new THREE.PointsMaterial({
      size: 14,
      sizeAttenuation: true,
      map: starSprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.clusterStars = new THREE.Points(clusterGeo, clusterMat);
    this.clusterStars.frustumCulled = false;
    this.group.add(this.clusterStars);

    // 3. High-Velocity Warp Streaks
    this.streakPositions = new Float32Array(this.streakCount * 6);
    const streakColors = new Float32Array(this.streakCount * 6);
    const streakRange = 900;

    for (let i = 0; i < this.streakCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 15 + Math.pow(Math.random(), 0.8) * 200;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = 50 - Math.random() * streakRange;

      this.streakPositions[i * 6] = x;
      this.streakPositions[i * 6 + 1] = y;
      this.streakPositions[i * 6 + 2] = z;

      this.streakPositions[i * 6 + 3] = x;
      this.streakPositions[i * 6 + 4] = y;
      this.streakPositions[i * 6 + 5] = z + 12;

      // Cyan-blue speedline tint
      streakColors[i * 6] = 0.4;
      streakColors[i * 6 + 1] = 0.9;
      streakColors[i * 6 + 2] = 1.0;
      streakColors[i * 6 + 3] = 0.1;
      streakColors[i * 6 + 4] = 0.3;
      streakColors[i * 6 + 5] = 0.8;
    }

    const streakGeo = new THREE.BufferGeometry();
    streakGeo.setAttribute('position', new THREE.BufferAttribute(this.streakPositions, 3));
    streakGeo.setAttribute('color', new THREE.BufferAttribute(streakColors, 3));

    const streakMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.streakStars = new THREE.LineSegments(streakGeo, streakMat);
    this.streakStars.frustumCulled = false;
    this.group.add(this.streakStars);

    // 4. Distant Spiral Galaxies
    this.distantGalaxies = new THREE.Group();
    this.createDistantGalaxies();
    this.group.add(this.distantGalaxies);
  }

  private createDistantGalaxies() {
    for (let g = 0; g < 6; g++) {
      const galaxyGroup = new THREE.Group();
      const galaxyStarsCount = 700;
      const galaxyGeo = new THREE.BufferGeometry();
      const pos = new Float32Array(galaxyStarsCount * 3);
      const cols = new Float32Array(galaxyStarsCount * 3);

      const arms = 2 + (g % 3);
      const galaxyRadius = 120 + (g % 3) * 50;
      const coreHue = g % 2 === 0 ? new THREE.Color('#ffbe0b') : new THREE.Color('#38bdf8');
      const armHue = g % 2 === 0 ? new THREE.Color('#f43f5e') : new THREE.Color('#a855f7');

      for (let i = 0; i < galaxyStarsCount; i++) {
        const r = Math.pow(Math.random(), 1.4) * galaxyRadius;
        const armAngle = ((i % arms) * ((2 * Math.PI) / arms));
        const spiralAngle = r * 0.04;
        const randomX = (Math.random() - 0.5) * (r * 0.28);
        const randomY = (Math.random() - 0.5) * 12;
        const randomZ = (Math.random() - 0.5) * (r * 0.28);

        pos[i * 3] = Math.cos(armAngle + spiralAngle) * r + randomX;
        pos[i * 3 + 1] = randomY;
        pos[i * 3 + 2] = Math.sin(armAngle + spiralAngle) * r + randomZ;

        const mixedColor = coreHue.clone().lerp(armHue, r / galaxyRadius);
        cols[i * 3] = mixedColor.r;
        cols[i * 3 + 1] = mixedColor.g;
        cols[i * 3 + 2] = mixedColor.b;
      }

      galaxyGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      galaxyGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

      const galaxyMat = new THREE.PointsMaterial({
        size: 3.5,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const galaxyPoints = new THREE.Points(galaxyGeo, galaxyMat);
      galaxyPoints.frustumCulled = false;
      galaxyGroup.add(galaxyPoints);

      const angle = (g / 6) * Math.PI * 2 + 0.4;
      const dist = 750 + (g * 140);
      const x = Math.cos(angle) * dist;
      const y = Math.sin(g * 2.3) * 220;
      const baseZOffset = -g * 600;

      galaxyGroup.position.set(x, y, baseZOffset);
      galaxyGroup.rotation.x = Math.random() * Math.PI;
      galaxyGroup.rotation.y = Math.random() * Math.PI;

      this.distantGalaxies.add(galaxyGroup);
      this.galaxyData.push({
        group: galaxyGroup,
        x,
        y,
        baseZOffset
      });
    }
  }

  public getObject(): THREE.Group {
    return this.group;
  }

  public update(
    cameraZ: number,
    warpSpeed: number,
    delta: number,
    audioPulse: number,
    targetDensity: number = 1.0
  ) {
    // 0. Smoothly lerp star density over time so transitions never jump
    const lerpSpeed = Math.min(1.0, delta * 2.5);
    this.currentDensity = THREE.MathUtils.lerp(this.currentDensity, targetDensity, lerpSpeed);

    // Apply starDensity to pin and cluster stars with geometry.setDrawRange(0, floor(total * density / 1.4))
    const pinDrawCount = Math.floor(this.pinCount * (this.currentDensity / 1.4));
    this.pinStars.geometry.setDrawRange(0, Math.max(100, Math.min(this.pinCount, pinDrawCount)));

    const clusterDrawCount = Math.floor(this.clusterCount * (this.currentDensity / 1.4));
    this.clusterStars.geometry.setDrawRange(0, Math.max(100, Math.min(this.clusterCount, clusterDrawCount)));

    const boundary = 2800;
    const pinLead = 100;

    // 1. Recycle Pinpoint Stars with modulo wrapping
    const pinPos = this.pinStars.geometry.attributes.position.array as Float32Array;
    const pinTargetZ = cameraZ + pinLead;
    for (let i = 0; i < this.pinCount; i++) {
      const z = pinPos[i * 3 + 2];
      const offset = ((z - pinTargetZ) % boundary + boundary) % boundary - boundary;
      pinPos[i * 3 + 2] = pinTargetZ + offset;
    }
    this.pinStars.geometry.attributes.position.needsUpdate = true;

    // 2. Recycle Cluster Stars & Audio Twinkle
    const clusterLead = 80;
    const clusterTargetZ = cameraZ + clusterLead;
    const clusterPos = this.clusterStars.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.clusterCount; i++) {
      const z = clusterPos[i * 3 + 2];
      const offset = ((z - clusterTargetZ) % boundary + boundary) % boundary - boundary;
      clusterPos[i * 3 + 2] = clusterTargetZ + offset;
    }
    this.clusterStars.geometry.attributes.position.needsUpdate = true;

    const clusterMat = this.clusterStars.material as THREE.PointsMaterial;
    clusterMat.size = 14 + audioPulse * 8;

    // 3. Warp Streaks with modulo wrapping: expand length and opacity with speed
    const streakPositions = this.streakPositions;
    const streakRange = 900;
    const streakLead = 50;
    const streakTargetZ = cameraZ + streakLead;
    const streakLength = Math.max(8.0, warpSpeed * 0.85);

    for (let i = 0; i < this.streakCount; i++) {
      const z = streakPositions[i * 6 + 2];
      const offset = ((z - streakTargetZ) % streakRange + streakRange) % streakRange - streakRange;
      const newZ = streakTargetZ + offset;
      streakPositions[i * 6 + 2] = newZ;
      streakPositions[i * 6 + 5] = newZ + streakLength;
    }
    this.streakStars.geometry.attributes.position.needsUpdate = true;

    const streakMat = this.streakStars.material as THREE.LineBasicMaterial;
    streakMat.opacity = Math.min(0.95, 0.3 + (warpSpeed / 100) * 0.65);

    // 4. Recycle Distant Galaxies ahead of camera in a repeating 3600-unit window
    const galaxyWindow = 3600;
    for (const gData of this.galaxyData) {
      const offset = ((gData.baseZOffset - cameraZ) % galaxyWindow + galaxyWindow) % galaxyWindow - galaxyWindow;
      gData.group.position.set(gData.x, gData.y, cameraZ + offset);
    }

    // Slowly rotate distant galaxies
    this.distantGalaxies.children.forEach((g, idx) => {
      g.rotation.y += delta * (0.015 + idx * 0.005);
    });
  }

  public dispose() {
    this.pinStars.geometry.dispose();
    (this.pinStars.material as THREE.Material).dispose();

    this.clusterStars.geometry.dispose();
    (this.clusterStars.material as THREE.Material).dispose();

    this.streakStars.geometry.dispose();
    (this.streakStars.material as THREE.Material).dispose();

    this.distantGalaxies.traverse((obj) => {
      if (obj instanceof THREE.Points) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }
}
