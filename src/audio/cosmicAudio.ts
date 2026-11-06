/**
 * Procedural Cosmic Web Audio Synthesizer
 * Generates an evolving, ethereal deep space soundscape and exposes
 * real-time frequency analysis to drive reactive lighting and shaders.
 */

export interface AudioReactiveMetrics {
  bass: number;       // [0, 1] low drone energy
  mid: number;        // [0, 1] harmonic pad energy
  treble: number;     // [0, 1] celestial shimmers
  overall: number;    // [0, 1] total energy
  pulse: number;      // smoothed heartbeat/pulsar pulse
}

class CosmicAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;

  // Sound generator nodes
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private subDroneOsc: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;

  private isRunning: boolean = false;
  private isMuted: boolean = false;
  private volume: number = 0.6;
  private chimeTimer: number | null = null;

  private smoothedBass: number = 0;
  private smoothedMid: number = 0;
  private smoothedTreble: number = 0;
  private pulsePhase: number = 0;

  // Lydian / Ethereal chime pitches (Hz)
  private chimeScale: number[] = [220, 277.18, 329.63, 415.30, 493.88, 554.37, 659.25, 830.61];

  public init() {
    if (this.ctx) return;
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return;

    this.ctx = new AudioCtxClass();

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.85;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.setupDroneSynthesizer();
    this.setupCosmicWind();
    this.startChimeSequence();

    this.isRunning = true;
  }

  private setupDroneSynthesizer() {
    if (!this.ctx || !this.masterGain) return;

    // Resonant low-pass filter
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(180, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(4.0, this.ctx.currentTime);

    const droneGain = this.ctx.createGain();
    droneGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    droneGain.connect(this.masterGain);
    this.filterNode.connect(droneGain);

    // Deep Sub-Bass Drone (55 Hz - A1)
    this.subDroneOsc = this.ctx.createOscillator();
    this.subDroneOsc.type = 'sine';
    this.subDroneOsc.frequency.setValueAtTime(55, this.ctx.currentTime);
    this.subDroneOsc.connect(this.filterNode);
    this.subDroneOsc.start();

    // Detuned harmonics for rich phasing cosmic drone (110 Hz and 110.8 Hz)
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'triangle';
    this.droneOsc1.frequency.setValueAtTime(110.0, this.ctx.currentTime);
    this.droneOsc1.connect(this.filterNode);
    this.droneOsc1.start();

    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'sine';
    this.droneOsc2.frequency.setValueAtTime(164.81, this.ctx.currentTime); // E3 perfect fifth
    this.droneOsc2.connect(this.filterNode);
    this.droneOsc2.start();

    // Slow LFO to pulse the filter frequency gently (0.12 Hz ~ 8.3s cycle)
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);

    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.setValueAtTime(60, this.ctx.currentTime);

    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filterNode.frequency);
    this.lfo.start();
  }

  private setupCosmicWind() {
    if (!this.ctx || !this.masterGain) return;

    // Generate 4-second pink noise buffer
    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
      b6 = white * 0.115926;
    }

    const windSource = this.ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    windFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    windSource.connect(windFilter);
    windFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);

    windSource.start();
    this.noiseNode = windSource;
  }

  private startChimeSequence() {
    const playNextChime = () => {
      if (this.isRunning && !this.isMuted && this.ctx && this.masterGain) {
        this.triggerShimmerChime();
      }
      // Trigger subtle ethereal bell every 3.5 to 7.5 seconds
      const delay = 3500 + Math.random() * 4000;
      this.chimeTimer = window.setTimeout(playNextChime, delay);
    };
    this.chimeTimer = window.setTimeout(playNextChime, 2500);
  }

  public triggerShimmerChime(customPitch?: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const pitch = customPitch || this.chimeScale[Math.floor(Math.random() * this.chimeScale.length)];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, now);
      // Subtle pitch bend upward mimicking crystalline resonance
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.008, now + 1.2);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 4.0);
    } catch {
      // safe fallback if audio context state changing
    }
  }

  public getReactiveMetrics(): AudioReactiveMetrics {
    // Generate simulated fallback pulse if audio context not running yet
    this.pulsePhase += 0.035;
    const simulatedPulse = (Math.sin(this.pulsePhase) * 0.5 + 0.5) * 0.35;

    if (!this.analyser || !this.dataArray || !this.isRunning || this.isMuted) {
      return {
        bass: simulatedPulse,
        mid: simulatedPulse * 0.6,
        treble: simulatedPulse * 0.4,
        overall: simulatedPulse,
        pulse: simulatedPulse
      };
    }

    this.analyser.getByteFrequencyData(this.dataArray);
    const binCount = this.analyser.frequencyBinCount;

    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;

    const bassEnd = Math.floor(binCount * 0.15);
    const midEnd = Math.floor(binCount * 0.55);

    for (let i = 0; i < bassEnd; i++) bassSum += this.dataArray[i];
    for (let i = bassEnd; i < midEnd; i++) midSum += this.dataArray[i];
    for (let i = midEnd; i < binCount; i++) trebleSum += this.dataArray[i];

    const rawBass = (bassSum / (bassEnd || 1)) / 255;
    const rawMid = (midSum / ((midEnd - bassEnd) || 1)) / 255;
    const rawTreble = (trebleSum / ((binCount - midEnd) || 1)) / 255;

    // Smooth values for visual elegance
    this.smoothedBass += (rawBass - this.smoothedBass) * 0.2;
    this.smoothedMid += (rawMid - this.smoothedMid) * 0.15;
    this.smoothedTreble += (rawTreble - this.smoothedTreble) * 0.18;

    const overall = (this.smoothedBass * 0.5 + this.smoothedMid * 0.3 + this.smoothedTreble * 0.2);

    return {
      bass: this.smoothedBass,
      mid: this.smoothedMid,
      treble: this.smoothedTreble,
      overall,
      pulse: Math.max(this.smoothedBass, simulatedPulse * 0.3)
    };
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const target = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    if (!this.isRunning && !this.isMuted) {
      this.init();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    } else if (!this.ctx) {
      this.init();
    }
  }

  public dispose() {
    if (this.chimeTimer) {
      clearTimeout(this.chimeTimer);
      this.chimeTimer = null;
    }
    try {
      this.droneOsc1?.stop();
      this.droneOsc2?.stop();
      this.subDroneOsc?.stop();
      this.lfo?.stop();
      this.noiseNode?.stop();
      this.ctx?.close();
    } catch {
      // ignore
    }
    this.ctx = null;
    this.isRunning = false;
  }
}

export const cosmicAudio = new CosmicAudioEngine();
