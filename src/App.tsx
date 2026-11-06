/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SpaceJourneyEngine, SpaceEngineStatus } from './space/spaceJourneyEngine';
import { CosmicHud } from './components/CosmicHud';
import { cosmicAudio } from './audio/cosmicAudio';
import { FlightSpeedMode } from './space/sectorLogic';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SpaceJourneyEngine | null>(null);
  const [engineStatus, setEngineStatus] = useState<SpaceEngineStatus | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => cosmicAudio.getIsMuted());
  const [audioPulse, setAudioPulse] = useState<number>(0);
  const [webGlError, setWebGlError] = useState<string | null>(null);

  // Initialize Three.js engine once in isolated container
  useEffect(() => {
    if (!canvasMountRef.current) return;

    try {
      const engine = new SpaceJourneyEngine(
        canvasMountRef.current,
        (status) => {
          setEngineStatus(status);
          setAudioPulse(status.audioPulse);
        }
      );
      engineRef.current = engine;

      // Check query params for autostart
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('autostart') === '1') {
        cosmicAudio.init();
        if (cosmicAudio.getIsMuted()) {
          cosmicAudio.toggleMute();
        }
        setIsAudioMuted(cosmicAudio.getIsMuted());
      }

      return () => {
        engine.dispose();
        engineRef.current = null;
        cosmicAudio.dispose();
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'WebGL2 is required';
      setWebGlError(message);
    }
  }, []);

  const handleSetSpeed = useCallback((mode: FlightSpeedMode) => {
    if (engineRef.current) {
      engineRef.current.setSpeedMode(mode);
    }
  }, []);

  const handleJumpToBiome = useCallback((biomeId: string) => {
    if (engineRef.current) {
      engineRef.current.jumpToBiome(biomeId);
    }
  }, []);

  const handleToggleAudio = useCallback(() => {
    const muted = cosmicAudio.toggleMute();
    setIsAudioMuted(muted);
    return muted;
  }, []);

  const handleCaptureScreenshot = useCallback(() => {
    if (!engineRef.current) return;
    try {
      const dataUrl = engineRef.current.captureScreenshot();
      const link = document.createElement('a');
      link.download = `aetheria-deep-space-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Failed to capture screenshot', e);
    }
  }, []);

  if (webGlError) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-[#070312] text-white p-6">
        <div className="max-w-md p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-4 shadow-2xl backdrop-blur-md">
          <div className="text-xl font-medium text-amber-300">WebGL2 is required</div>
          <p className="text-sm text-white/70">
            This 3D journey through space requires WebGL2 hardware acceleration to render celestial shaders, volumetric nebulae, and starfields.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-black select-none"
      data-testid="cosmic-journey-container"
      data-speed={engineStatus?.speedMode || 'cruise'}
      data-sector={engineStatus?.sectorIndex ?? 0}
    >
      {/* 3D WebGL Canvas isolated mount container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Zero-occlusion HUD & Collapsible Bottom Dock */}
      <CosmicHud
        status={engineStatus}
        onSetSpeed={handleSetSpeed}
        onJumpToBiome={handleJumpToBiome}
        onToggleAudio={handleToggleAudio}
        onCaptureScreenshot={handleCaptureScreenshot}
        isAudioMuted={isAudioMuted}
        audioPulse={audioPulse}
      />
    </div>
  );
}
