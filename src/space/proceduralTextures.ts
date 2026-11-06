/**
 * Procedural Space Texture Generators
 * 100% in-code generated CanvasTextures with zero external asset dependencies.
 */
import * as THREE from 'three';

export class SpaceTextureGenerator {
  private static cachedTextures: Map<string, THREE.Texture> = new Map();

  /**
   * Gas Giant texture with turbulent chromatic bands and swirling storms
   */
  public static createGasGiantTexture(palette: { base: string; bands: string[]; storm: string }): THREE.CanvasTexture {
    const key = `gas_giant_${palette.base}_${palette.bands.join('_')}`;
    if (this.cachedTextures.has(key)) {
      return this.cachedTextures.get(key) as THREE.CanvasTexture;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base background
    ctx.fillStyle = palette.base;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Latitudinal bands with turbulent sine warps
    const numBands = 36;
    for (let i = 0; i < numBands; i++) {
      const y = (i / numBands) * canvas.height;
      const height = (canvas.height / numBands) * (0.8 + Math.sin(i * 1.5) * 0.4);
      const color = palette.bands[i % palette.bands.length];

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, y);

      for (let x = 0; x <= canvas.width; x += 16) {
        const warp1 = Math.sin((x / canvas.width) * Math.PI * 8 + i) * 6;
        const warp2 = Math.cos((x / canvas.width) * Math.PI * 14 - i * 0.5) * 4;
        ctx.lineTo(x, y + warp1 + warp2);
      }

      ctx.lineTo(canvas.width, y + height);
      ctx.lineTo(0, y + height);
      ctx.closePath();
      ctx.fill();
    }

    // Great atmospheric oval storm
    const stormX = canvas.width * 0.62;
    const stormY = canvas.height * 0.58;
    const stormRadX = 64;
    const stormRadY = 36;

    const grad = ctx.createRadialGradient(stormX, stormY, 4, stormX, stormY, stormRadX);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, palette.storm);
    grad.addColorStop(0.8, palette.base);
    grad.addColorStop(1, 'transparent');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(stormX, stormY, stormRadX, stormRadY, 0.1, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    this.cachedTextures.set(key, texture);
    return texture;
  }

  /**
   * Concentric planetary ring texture with Cassini divisions and fine dust gaps
   */
  public static createRingTexture(primaryColor: string, secondaryColor: string): THREE.CanvasTexture {
    const key = `ring_${primaryColor}_${secondaryColor}`;
    if (this.cachedTextures.has(key)) {
      return this.cachedTextures.get(key) as THREE.CanvasTexture;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;

    // Create radial ring gradient along 1D strip (mapped to UV across ring radius)
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0.0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.08, 'rgba(0,0,0,0)');
    grad.addColorStop(0.12, primaryColor);
    grad.addColorStop(0.35, secondaryColor);
    grad.addColorStop(0.52, 'rgba(0,0,0,0.05)'); // Cassini Division gap
    grad.addColorStop(0.58, 'rgba(0,0,0,0.05)');
    grad.addColorStop(0.62, primaryColor);
    grad.addColorStop(0.85, secondaryColor);
    grad.addColorStop(0.96, 'rgba(255,255,255,0.4)'); // Bright outer shepherd ring
    grad.addColorStop(1.0, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, 1);

    // Micro-banding noise
    for (let x = 40; x < canvas.width - 20; x++) {
      if (Math.random() > 0.6) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.4})`;
        ctx.fillRect(x, 0, 1, 1);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    this.cachedTextures.set(key, texture);
    return texture;
  }

  /**
   * Terrestrial planet texture (Continents, oceans, mountain ridges)
   */
  public static createTerrestrialTexture(): THREE.CanvasTexture {
    const key = 'terrestrial_planet';
    if (this.cachedTextures.has(key)) {
      return this.cachedTextures.get(key) as THREE.CanvasTexture;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Ocean deep blue
    ctx.fillStyle = '#082548';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Continent blobs
    const continentColors = ['#1b4332', '#2d6a4f', '#40916c', '#74c69d', '#b7e4c7', '#d8f3dc'];
    for (let c = 0; c < 14; c++) {
      const cx = (c / 14) * canvas.width + (Math.random() - 0.5) * 80;
      const cy = canvas.height * 0.25 + Math.random() * (canvas.height * 0.5);
      const rad = 60 + Math.random() * 90;

      for (let layer = 0; layer < continentColors.length; layer++) {
        ctx.fillStyle = continentColors[layer];
        ctx.beginPath();
        for (let angle = 0; angle <= Math.PI * 2; angle += 0.2) {
          const r = (rad * (1 - layer * 0.12)) * (0.8 + Math.sin(angle * 5 + c) * 0.25);
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * (r * 0.7);
          if (angle === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // Polar ice caps
    const iceGradTop = ctx.createLinearGradient(0, 0, 0, 60);
    iceGradTop.addColorStop(0, '#ffffff');
    iceGradTop.addColorStop(0.7, '#e0f2fe');
    iceGradTop.addColorStop(1, 'transparent');
    ctx.fillStyle = iceGradTop;
    ctx.fillRect(0, 0, canvas.width, 60);

    const iceGradBot = ctx.createLinearGradient(0, canvas.height - 60, 0, canvas.height);
    iceGradBot.addColorStop(0, 'transparent');
    iceGradBot.addColorStop(0.3, '#e0f2fe');
    iceGradBot.addColorStop(1, '#ffffff');
    ctx.fillStyle = iceGradBot;
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    this.cachedTextures.set(key, texture);
    return texture;
  }

  /**
   * Terrestrial cloud layer texture with transparent oceans
   */
  public static createCloudTexture(): THREE.CanvasTexture {
    const key = 'cloud_layer';
    if (this.cachedTextures.has(key)) {
      return this.cachedTextures.get(key) as THREE.CanvasTexture;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 48; i++) {
      const cx = Math.random() * canvas.width;
      const cy = Math.random() * canvas.height;
      const rx = 40 + Math.random() * 120;
      const ry = 15 + Math.random() * 35;

      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rx);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, Math.random() * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    this.cachedTextures.set(key, texture);
    return texture;
  }

  /**
   * Asteroid bump and roughness procedural texture
   */
  public static createAsteroidTexture(): THREE.CanvasTexture {
    const key = 'asteroid_surface';
    if (this.cachedTextures.has(key)) {
      return this.cachedTextures.get(key) as THREE.CanvasTexture;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#4a4a50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Craters and pits
    for (let i = 0; i < 40; i++) {
      const cx = Math.random() * canvas.width;
      const cy = Math.random() * canvas.height;
      const rad = 4 + Math.random() * 18;

      const grad = ctx.createRadialGradient(cx - rad * 0.2, cy - rad * 0.2, 1, cx, cy, rad);
      grad.addColorStop(0, '#1a1a20');
      grad.addColorStop(0.7, '#2f2f35');
      grad.addColorStop(0.9, '#8e8e98'); // Raised crater rim
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cachedTextures.set(key, texture);
    return texture;
  }

  /**
   * Star flare particle glow sprite with solid core and radiant diffraction halo
   */
  public static createStarGlowTexture(): THREE.CanvasTexture {
    const key = 'star_glow_flare';
    if (this.cachedTextures.has(key)) {
      return this.cachedTextures.get(key) as THREE.CanvasTexture;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const cx = 64;
    const cy = 64;

    // Soft outer celestial halo
    const outerGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 60);
    outerGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    outerGrad.addColorStop(0.15, 'rgba(210, 235, 255, 0.95)');
    outerGrad.addColorStop(0.35, 'rgba(120, 180, 255, 0.55)');
    outerGrad.addColorStop(0.65, 'rgba(70, 120, 255, 0.18)');
    outerGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = outerGrad;
    ctx.fillRect(0, 0, 128, 128);

    // Brilliant white pinpoint core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();

    // 4-point subtle diffraction spikes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 45, cy);
    ctx.lineTo(cx + 45, cy);
    ctx.moveTo(cx, cy - 45);
    ctx.lineTo(cx, cy + 45);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    this.cachedTextures.set(key, texture);
    return texture;
  }
}
