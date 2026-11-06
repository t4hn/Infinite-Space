/**
 * Minimalist Cosmic HUD & Unified Bottom Control Dock
 * Compliant with Three.js Skill:
 * - Unified collapsible dock at bottom-center (< 15% footprint)
 * - Zero side clutter
 * - No animated pulsating dots (@keyframes pulse)
 * - Solid/rgba surfaces (no backdrop-filter over WebGL)
 * - Hotkey 'H' for Zen / Cinema Mode
 */
import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  FastForward,
  Pause,
  Compass,
  Camera,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { SpaceEngineStatus } from '../space/spaceJourneyEngine';
import { FlightSpeedMode, BIOMES } from '../space/sectorLogic';

interface CosmicHudProps {
  status: SpaceEngineStatus | null;
  onSetSpeed: (mode: FlightSpeedMode) => void;
  onJumpToBiome: (biomeId: string) => void;
  onToggleAudio: () => boolean;
  onCaptureScreenshot: () => void;
  isAudioMuted: boolean;
  audioPulse: number;
}

export const CosmicHud: React.FC<CosmicHudProps> = ({
  status,
  onSetSpeed,
  onJumpToBiome,
  onToggleAudio,
  onCaptureScreenshot,
  isAudioMuted,
  audioPulse
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'flight' | 'destinations' | 'lore'>('flight');
  const [showScreenshotFlash, setShowScreenshotFlash] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setIsDockCollapsed(prev => !prev);
      } else if (e.key === 'm' || e.key === 'M') {
        onToggleAudio();
      } else if (e.key === '1') {
        onSetSpeed('pause');
      } else if (e.key === '2') {
        onSetSpeed('cruise');
      } else if (e.key === '3') {
        onSetSpeed('warp');
      } else if (e.key === '4') {
        onSetSpeed('hyperspace');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleAudio, onSetSpeed]);

  const handleAudioButtonClick = () => {
    onToggleAudio();
  };

  const handleScreenshot = () => {
    setShowScreenshotFlash(true);
    setTimeout(() => setShowScreenshotFlash(false), 200);
    onCaptureScreenshot();
  };

  const currentBiome = status?.currentBiome || BIOMES[0];
  const sectorIndex = status?.sectorIndex ?? 0;
  const speedMode = status?.speedMode ?? 'cruise';
  const distanceLy = status?.distanceTraveledLy ?? 0;
  const sectorProgress = Math.round((status?.sectorProgress ?? 0) * 100);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-mono text-xs">
      {/* Screenshot Flash FX */}
      {showScreenshotFlash && (
        <div className="absolute inset-0 bg-white pointer-events-none z-50 transition-opacity duration-200" />
      )}

      {/* Top Header Telemetry (Minimal & elegant) */}
      <div className="absolute top-5 left-5 right-5 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-1 bg-black/60 border border-white/10 rounded-lg p-3 max-w-sm pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-white/60 tracking-widest text-[10px]">AETHERIA DEEP SPACE</span>
            <span className="text-white/30">•</span>
            <span className="text-cyan-300 font-semibold uppercase">SEC-{sectorIndex.toString().padStart(3, '0')}</span>
          </div>
          <div className="text-sm font-sans font-medium text-white tracking-wide">
            {currentBiome.name}
          </div>
          <div className="text-[11px] text-white/50 font-sans line-clamp-2 mt-0.5">
            {currentBiome.description}
          </div>

          {/* Sector progress line */}
          <div className="w-full bg-white/10 h-0.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-cyan-400 h-full transition-all duration-300"
              style={{ width: `${sectorProgress}%` }}
            />
          </div>
        </div>

        {/* Top-Right Telemetry readouts */}
        <div className="hidden sm:flex items-center gap-4 bg-black/60 border border-white/10 rounded-lg px-3.5 py-2 pointer-events-auto text-white/70">
          <div className="text-right">
            <div className="text-[10px] text-white/40 tracking-wider">DISTANCE</div>
            <div className="font-semibold text-white tracking-wider">{distanceLy.toFixed(1)} LY</div>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="text-right">
            <div className="text-[10px] text-white/40 tracking-wider">VELOCITY</div>
            <div className="font-semibold text-cyan-300 tracking-wider">{status?.speedUnits ?? 38}c</div>
          </div>
          <div className="h-6 w-px bg-white/10" />
          {/* Audio reactive pulse meter */}
          <div className="flex flex-col items-center">
            <div className="text-[10px] text-white/40 tracking-wider mb-1">RESONANCE</div>
            <div className="flex items-end gap-0.5 h-4 w-10">
              {[0.4, 0.7, 1.0, 0.6, 0.8].map((mult, idx) => (
                <div
                  key={idx}
                  className="w-1.5 bg-indigo-400 rounded-t-sm transition-all duration-75"
                  style={{
                    height: `${Math.max(2, (audioPulse * mult * 16))}px`,
                    opacity: isAudioMuted ? 0.2 : 0.9
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* Unified Bottom Dock (Collapsible, <= 15% viewport height footprint) */}
      <div
        className={`absolute bottom-5 left-1/2 -translate-x-1/2 w-[94vw] max-w-3xl pointer-events-auto transition-transform duration-300 ease-out ${
          isDockCollapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse / Expand Toggle Tab */}
        <div className="flex justify-center mb-1">
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="bg-black/90 hover:bg-neutral-900 border border-white/15 text-white/70 hover:text-white px-3 py-1 rounded-t-lg flex items-center gap-1.5 text-[10px] tracking-wider uppercase transition-colors shadow-lg"
            title="Toggle Controls Visibility (Hotkey: H)"
          >
            {isDockCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>{isDockCollapsed ? 'Show Controls (H)' : 'Cinema Mode (H)'}</span>
          </button>
        </div>

        {/* Main Dock Container */}
        <div className="bg-neutral-950/90 border border-white/15 rounded-2xl p-3 shadow-2xl flex flex-col gap-2.5">
          {/* Top Bar inside Dock: Navigation Tabs & Global Tools */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('flight')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-sans transition-colors ${
                  activeTab === 'flight'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Flight Control</span>
              </button>

              <button
                onClick={() => setActiveTab('destinations')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-sans transition-colors ${
                  activeTab === 'destinations'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Landmarks</span>
              </button>

              <button
                onClick={() => setActiveTab('lore')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-sans transition-colors ${
                  activeTab === 'lore'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>Phenomena</span>
              </button>
            </div>

            {/* Quick Actions (Audio, Screenshot) */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleAudioButtonClick}
                className={`p-2 rounded-lg border transition-colors flex items-center gap-1.5 ${
                  isAudioMuted
                    ? 'border-white/10 text-white/40 hover:text-white hover:bg-white/5'
                    : 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300'
                }`}
                title="Toggle Procedural Audio (Hotkey: M)"
                aria-label="Toggle procedural audio"
              >
                {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline text-[10px]">{isAudioMuted ? 'Muted' : 'Sound On'}</span>
              </button>

              <button
                onClick={handleScreenshot}
                className="p-2 rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
                title="Capture High-Res Space Snapshot"
                aria-label="Capture high-resolution screenshot"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px]">Capture</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Flight Speed Controls */}
          {activeTab === 'flight' && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-[10px] uppercase tracking-wider">Velocity Mode:</span>
                <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => onSetSpeed('pause')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-sans flex items-center gap-1 transition-colors ${
                      speedMode === 'pause'
                        ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40 font-medium'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    <Pause className="w-3 h-3" />
                    <span>Pause (1)</span>
                  </button>

                  <button
                    onClick={() => onSetSpeed('cruise')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-sans transition-colors ${
                      speedMode === 'cruise'
                        ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 font-medium'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Cruise 38c (2)
                  </button>

                  <button
                    onClick={() => onSetSpeed('warp')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-sans transition-colors ${
                      speedMode === 'warp'
                        ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 font-medium'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Warp 95c (3)
                  </button>

                  <button
                    onClick={() => onSetSpeed('hyperspace')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-sans transition-colors ${
                      speedMode === 'hyperspace'
                        ? 'bg-fuchsia-500/30 text-fuchsia-200 border border-fuchsia-500/40 font-medium'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Hyper 240c (4)
                  </button>
                </div>
              </div>

              <div className="text-white/40 text-[10px] hidden md:block">
                Mouse movement steers the camera gently in zero-gravity
              </div>
            </div>
          )}

          {/* Tab 2: Landmarks / Biome Warp */}
          {activeTab === 'destinations' && (
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-1">
              {BIOMES.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onJumpToBiome(b.id)}
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-sans text-left transition-all ${
                    currentBiome.id === b.id
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 font-medium'
                      : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}

          {/* Tab 3: Celestial Phenomena Information */}
          {activeTab === 'lore' && (
            <div className="flex flex-col gap-1.5 py-1 text-white/80 font-sans">
              <div className="flex items-center gap-2">
                <span className="text-cyan-300 font-semibold">{currentBiome.name}</span>
                <span className="text-white/30">•</span>
                <span className="text-white/50 text-[11px] uppercase tracking-wider">
                  Type: {currentBiome.primaryBodyType.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed font-sans">
                {currentBiome.description} The surrounding volumetric gas emissions and ambient starfield
                dynamically synchronize in color and luminescence with the generated procedural audio frequencies.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
