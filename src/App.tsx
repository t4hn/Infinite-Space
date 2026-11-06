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
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [audioPulse, setAudioPulse] = useState<number>(0);

  // Initialize Three.js engine once in isolated container
  useEffect(() => {
    if (!canvasMountRef.current) return;

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
      setIsAudioMuted(false);
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
      cosmicAudio.dispose();
    };
  }, []);

  // Audio start on first user interaction
  const handleUserFirstInteraction = useCallback(() => {
    if (cosmicAudio.getIsMuted()) return;
    cosmicAudio.resume();
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

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-black select-none"
      onClick={handleUserFirstInteraction}
      onKeyDown={handleUserFirstInteraction}
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
