/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { SpaceJourneyEngine, SpaceEngineStatus, EngineDebugStats } from './space/spaceJourneyEngine';
import { CosmicHud } from './components/CosmicHud';
import { cosmicAudio } from './audio/cosmicAudio';
import type { FlightSpeedMode } from './space/sectorLogic';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SpaceJourneyEngine | null>(null);
  const [engineStatus, setEngineStatus] = useState<SpaceEngineStatus | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => cosmicAudio.getIsMuted());
  const [audioPulse, setAudioPulse] = useState<number>(0);
  const [webGlError, setWebGlError] = useState<string | null>(null);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [showExitZenPill, setShowExitZenPill] = useState<boolean>(false);
  const [isEngineReady, setIsEngineReady] = useState<boolean>(false);
  const [isDebugVisible, setIsDebugVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('debug');
  });
  const [debugStats, setDebugStats] = useState<EngineDebugStats | null>(null);
  const exitZenTimerRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Dynamically lazy-load Three.js and the 3D engine once in isolated container
  useEffect(() => {
    if (!canvasMountRef.current) return;
    let cancelled = false;
    let engineInstance: SpaceJourneyEngine | null = null;

    import('./space/spaceJourneyEngine')
      .then(({ SpaceJourneyEngine }) => {
        if (cancelled || !canvasMountRef.current) return;

        try {
          const engine = new SpaceJourneyEngine(
            canvasMountRef.current,
            (status) => {
              if (cancelled) return;
              setEngineStatus(status);
              setAudioPulse(status.audioPulse);
            }
          );
          engineInstance = engine;
          engineRef.current = engine;
          setIsEngineReady(true);

          // Check query params for autostart
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('autostart') === '1') {
            cosmicAudio.init();
            if (cosmicAudio.getIsMuted()) {
              cosmicAudio.toggleMute();
            }
            setIsAudioMuted(cosmicAudio.getIsMuted());
          }
        } catch (err: unknown) {
          if (!cancelled) {
            const message = err instanceof Error ? err.message : 'WebGL2 is required';
            setWebGlError(message);
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to initialize engine';
          setWebGlError(message);
        }
      });

    return () => {
      cancelled = true;
      if (engineInstance) {
        engineInstance.dispose();
      } else if (engineRef.current) {
        engineRef.current.dispose();
      }
      engineRef.current = null;
      cosmicAudio.dispose();
    };
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

  const handleToggleZen = useCallback(() => {
    setIsZenMode((prev) => {
      const next = !prev;
      if (!next) {
        setShowExitZenPill(false);
        if (exitZenTimerRef.current !== null) {
          clearTimeout(exitZenTimerRef.current);
          exitZenTimerRef.current = null;
        }
      }
      return next;
    });
  }, []);

  const handleSceneInteraction = useCallback(() => {
    if (!isZenMode) return;
    setShowExitZenPill(true);
    if (exitZenTimerRef.current !== null) {
      clearTimeout(exitZenTimerRef.current);
    }
    exitZenTimerRef.current = window.setTimeout(() => {
      setShowExitZenPill(false);
      exitZenTimerRef.current = null;
    }, 3000);
  }, [isZenMode]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isZenMode) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };
  }, [isZenMode]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isZenMode || !pointerStartRef.current) return;
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    const dt = performance.now() - pointerStartRef.current.time;
    pointerStartRef.current = null;
    if (dx < 12 && dy < 12 && dt < 600) {
      handleSceneInteraction();
    }
  }, [isZenMode, handleSceneInteraction]);

  useEffect(() => {
    return () => {
      if (exitZenTimerRef.current !== null) {
        clearTimeout(exitZenTimerRef.current);
      }
    };
  }, []);

  // Hotkey 'F' toggles debug overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        setIsDebugVisible((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Poll engine every 500ms only while debug overlay is visible
  useEffect(() => {
    if (!isDebugVisible) {
      setDebugStats(null);
      return;
    }
    const poll = () => {
      if (engineRef.current) {
        setDebugStats(engineRef.current.getDebugStats());
      }
    };
    poll();
    const interval = window.setInterval(poll, 500);
    return () => window.clearInterval(interval);
  }, [isDebugVisible]);

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
      onClick={handleSceneInteraction}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      data-testid="cosmic-journey-container"
      data-speed={engineStatus?.speedMode || 'cruise'}
      data-sector={engineStatus?.sectorIndex ?? 0}
      data-zen={isZenMode}
    >
      {/* 3D WebGL Canvas isolated mount container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Centred engine initialising message (fading out once ready) */}
      <div
        className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-700 z-40 ${
          isEngineReady ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="font-mono text-xs uppercase tracking-widest text-white/60 bg-black/60 px-4 py-2 rounded-full border border-white/10 shadow-lg">
          Initialising engine…
        </div>
      </div>

      {/* Telemetry Debug Overlay (top-left, visible via ?debug or F key) */}
      {isDebugVisible && debugStats && (
        <div
          className="fixed top-3 left-3 z-50 pointer-events-none select-none font-mono text-[11px] leading-tight bg-black/85 text-emerald-400 p-2.5 rounded border border-white/15 shadow-xl space-y-1"
          data-testid="debug-stats-overlay"
        >
          <div className="text-[10px] uppercase font-bold text-white/60 tracking-wider">AETHERIA TELEMETRY</div>
          <div>FPS: {debugStats.fps}</div>
          <div>TIER: {debugStats.tier.toUpperCase()}</div>
          <div>DPR: {debugStats.pixelRatio.toFixed(2)}</div>
          <div>CALLS: {debugStats.drawCalls}</div>
          <div>TRIS: {debugStats.triangles.toLocaleString()}</div>
          <div>GEOM: {debugStats.geometries}</div>
          <div>TEX: {debugStats.textures}</div>
        </div>
      )}

      {/* Zero-occlusion HUD & Collapsible Bottom Dock */}
      <CosmicHud
        status={engineStatus}
        onSetSpeed={handleSetSpeed}
        onJumpToBiome={handleJumpToBiome}
        onToggleAudio={handleToggleAudio}
        onCaptureScreenshot={handleCaptureScreenshot}
        isAudioMuted={isAudioMuted}
        audioPulse={audioPulse}
        isZenMode={isZenMode}
        onToggleZen={handleToggleZen}
        showExitZenPill={showExitZenPill}
      />
    </div>
  );
}
