/**
 * Core Three.js Space Journey Engine
 * Manages WebGL context, camera kinematics, audio-reactive lighting,
 * and software-WebGL safety guards.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { StarfieldManager } from './starfield';
import { SectorManager } from './sectorManager';
import { SpaceTextureGenerator } from './proceduralTextures';
import { createNebulaMesh } from './shaders/nebulaShader';
import { CelestialFactory } from './celestialBodies';
import { cosmicAudio } from '../audio/cosmicAudio';
import {
  FlightSpeedMode,
  FLIGHT_SPEED_VALUES,
  calculateAudioReaction,
  CosmicBiome,
  getSectorIndex,
  getSectorProgress,
  SECTOR_LENGTH
} from './sectorLogic';

export interface SpaceEngineStatus {
  sectorIndex: number;
  sectorProgress: number;
  currentBiome: CosmicBiome;
  speedMode: FlightSpeedMode;
  speedUnits: number;
  distanceTraveledLy: number;
  audioPulse: number;
}

export class SpaceJourneyEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // Scene Components
  private starfield: StarfieldManager;
  private sectorManager: SectorManager;

  // Lighting
  private ambientLight: THREE.AmbientLight;
  private keyDirectionalLight: THREE.DirectionalLight;
  private hemisphereLight: THREE.HemisphereLight;

  // State
  private cameraZ: number = 0;
  private speedMode: FlightSpeedMode = 'cruise';
  private targetSpeed: number = FLIGHT_SPEED_VALUES.cruise;
  private currentSpeed: number = FLIGHT_SPEED_VALUES.cruise;

  // Mouse / Pointer Steering
  private targetCameraRot: THREE.Vector2 = new THREE.Vector2(0, 0);
  private currentCameraRot: THREE.Vector2 = new THREE.Vector2(0, 0);

  // Timing & Software WebGL
  private lastTimeMs: number = 0;
  private startTimeMs: number = 0;
  private isSoftwareGl: boolean = false;
  private isRunning: boolean = true;
  private animationFrameId: number = 0;
  private timeoutId: number = 0;

  // Status Callback
  private onStatusUpdate?: (status: SpaceEngineStatus) => void;

  constructor(container: HTMLElement, onStatusUpdate?: (status: SpaceEngineStatus) => void) {
    this.container = container;
    this.onStatusUpdate = onStatusUpdate;

    // 1. Verify WebGL2 support
    const testCanvas = document.createElement('canvas');
    const testGl = testCanvas.getContext('webgl2');
    if (!testGl) {
      throw new Error('WebGL2 is required');
    }

    // Detect Software WebGL
    this.isSoftwareGl = (() => {
      const ext = testGl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : testGl.RENDERER;
      const gpu = String(testGl.getParameter(param));
      testGl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Initialize Three.js Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance'
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      65,
      this.container.clientWidth / this.container.clientHeight,
      0.5,
      3500
    );
    this.camera.position.set(0, 0, 0);

    // Initial clear color and Fog
    this.renderer.setClearColor(0x0a0518, 1);
    this.scene.fog = new THREE.FogExp2('#0a0518', 0.00035);

    // Mandatory Studio Environment Reflection
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // fallback
    }

    // 4. Lighting Rig (Warm star key + Cool cosmic fill + Reactive ambient)
    this.ambientLight = new THREE.AmbientLight('#7c4dff', 0.95);
    this.scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight('#60a5fa', '#0f172a', 0.8);
    this.scene.add(this.hemisphereLight);

    this.keyDirectionalLight = new THREE.DirectionalLight('#fff7ed', 2.2);
    this.keyDirectionalLight.position.set(120, 80, -350);
    this.scene.add(this.keyDirectionalLight);
    this.scene.add(this.keyDirectionalLight.target);

    // 5. Starfield & Sector Manager
    this.starfield = new StarfieldManager();
    this.scene.add(this.starfield.getObject());

    this.sectorManager = new SectorManager(this.scene);

    // 6. Pre-warm shaders (including custom nebula and black hole shaders)
    if (!this.isSoftwareGl) {
      const compileScene = new THREE.Scene();
      const throwawayNebula = createNebulaMesh(300, '#3b82f6', '#ec4899', '#ffffff');
      const throwawayBlackHole = CelestialFactory.createBlackHole();
      compileScene.add(throwawayNebula);
      compileScene.add(throwawayBlackHole.group);
      this.renderer.compile(compileScene, this.camera);
      throwawayNebula.geometry.dispose();
      (throwawayNebula.material as THREE.Material).dispose();
      throwawayBlackHole.dispose();
      this.renderer.compile(this.scene, this.camera);
    }

    // 7. Event Listeners
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pointermove', this.handlePointerMove);

    this.startTimeMs = performance.now();
    this.lastTimeMs = this.startTimeMs;

    // Start loop
    this.startLoop();
  }

  private handleResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private handlePointerMove = (e: MouseEvent) => {
    // Map mouse position to -1..1 range
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -(e.clientY / window.innerHeight) * 2 + 1;

    // Subtle look tilt target (radians)
    this.targetCameraRot.x = ny * 0.22;
    this.targetCameraRot.y = -nx * 0.32;
  };

  public setSpeedMode(mode: FlightSpeedMode) {
    this.speedMode = mode;
    this.targetSpeed = FLIGHT_SPEED_VALUES[mode];
  }

  public jumpToBiome(biomeId: string) {
    const targetZ = this.sectorManager.jumpToBiome(biomeId, this.cameraZ);
    this.cameraZ = targetZ;
    this.camera.position.z = this.cameraZ;
    cosmicAudio.triggerShimmerChime(520);
  }

  public captureScreenshot(): string {
    // Force a render pass right before capture to ensure buffer integrity
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  private startLoop() {
    let lastStatusTime = 0;

    const tick = () => {
      if (!this.isRunning) return;

      const now = performance.now();
      const rawDelta = (now - this.lastTimeMs) / 1000;
      this.lastTimeMs = now;
      const delta = Math.min(rawDelta > 0 ? rawDelta : 0.016, 0.08);
      const time = (now - this.startTimeMs) / 1000;

      // Exponential smooth damping for speed transition
      this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, this.targetSpeed, 4.0, delta);

      // Travel forward along negative Z
      this.cameraZ -= this.currentSpeed * delta;
      this.camera.position.z = this.cameraZ;

      // Organic camera zero-gravity drift
      const driftX = Math.sin(time * 0.35) * 4.5 + Math.cos(time * 0.18) * 2.0;
      const driftY = Math.cos(time * 0.28) * 3.5 + Math.sin(time * 0.12) * 1.5;
      this.camera.position.x = driftX;
      this.camera.position.y = driftY;

      // Smooth camera look damping
      this.currentCameraRot.x = THREE.MathUtils.damp(this.currentCameraRot.x, this.targetCameraRot.x, 3.5, delta);
      this.currentCameraRot.y = THREE.MathUtils.damp(this.currentCameraRot.y, this.targetCameraRot.y, 3.5, delta);

      // Camera roll based on yaw
      const rollZ = -this.currentCameraRot.y * 0.35 + Math.sin(time * 0.2) * 0.02;
      this.camera.rotation.set(this.currentCameraRot.x, this.currentCameraRot.y, rollZ, 'YXZ');

      // Key light travels ahead of camera to illuminate upcoming celestial bodies
      this.keyDirectionalLight.position.set(driftX + 120, driftY + 80, this.cameraZ - 350);

      // Audio analysis
      const reactive = cosmicAudio.getReactiveMetrics();
      const reaction = calculateAudioReaction(reactive.bass, reactive.treble, 1.0);

      // Update Starfield
      this.starfield.update(this.cameraZ, this.currentSpeed, delta, reactive.pulse);

      // Update Sector Manager & Biomes
      const { currentBiome, sectorIndex } = this.sectorManager.update(
        this.cameraZ,
        time,
        delta,
        reactive.pulse
      );

      // Smooth Lighting & Fog transitions matching current biome
      const targetLighting = this.sectorManager.getTargetLighting();
      const fog = this.scene.fog as THREE.FogExp2;
      if (fog) {
        fog.color.lerp(targetLighting.fogColor, delta * 1.5);
        this.renderer.setClearColor(fog.color);
      }

      this.ambientLight.color.lerp(targetLighting.ambientColor, delta * 1.5);
      // Reactive ambient lighting pulsing in sync with procedural audio
      this.ambientLight.intensity = targetLighting.ambientIntensity * reaction.pulsedIntensity;

      // Render scene
      this.renderer.render(this.scene, this.camera);

      // Periodic status dispatch for HUD (throttled to 10Hz to prevent React thrashing)
      if (time - lastStatusTime > 0.1 && this.onStatusUpdate) {
        lastStatusTime = time;
        const distLy = Math.abs(this.cameraZ) / 38; // 1 Light Year = ~38 scene units
        this.onStatusUpdate({
          sectorIndex,
          sectorProgress: getSectorProgress(this.cameraZ, SECTOR_LENGTH),
          currentBiome,
          speedMode: this.speedMode,
          speedUnits: Math.round(this.currentSpeed),
          distanceTraveledLy: Math.round(distLy * 10) / 10,
          audioPulse: reactive.pulse
        });
      }

      // Safe scheduling: afterDraw on software WebGL, requestAnimationFrame on GPU
      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.animationFrameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.animationFrameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.timeoutId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.timeoutId = window.setTimeout(cb, 80);
      }
    };
    this.timeoutId = window.setTimeout(poll, 5);
  }

  public dispose() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointerMove);

    this.starfield.dispose();
    this.sectorManager.dispose();
    SpaceTextureGenerator.disposeAll();
    this.renderer.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
