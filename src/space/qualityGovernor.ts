/**
 * Pure, unit-testable Adaptive Quality Governor
 * Monitors frame timings and adjusts graphics quality tiers
 * to prevent thermal throttling and ensure smooth playback.
 */

export type QualityTier = 'high' | 'medium' | 'low';

export class QualityGovernor {
  private tier: QualityTier;
  private windowDuration: number = 0;
  private windowFrames: number = 0;
  private consecutiveHighWindows: number = 0;
  private lastChangeTime: number = -Infinity;

  constructor(startingTier: QualityTier = 'high') {
    this.tier = startingTier;
  }

  public getTier(): QualityTier {
    return this.tier;
  }

  /**
   * Updates the governor with the latest frame delta and current timestamp.
   * Returns the new tier if a change occurred, otherwise null.
   */
  public update(frameDeltaSeconds: number, nowSeconds: number): QualityTier | null {
    // Ignore everything in the first 3 seconds
    if (nowSeconds < 3.0) {
      return null;
    }

    // Ignore frame deltas over 0.25s (tab switches or hitches) or non-positive deltas
    if (frameDeltaSeconds > 0.25 || frameDeltaSeconds <= 0) {
      return null;
    }

    this.windowDuration += frameDeltaSeconds;
    this.windowFrames += 1;

    // Measure average FPS over consecutive 2-second windows (epsilon handles float rounding)
    if (this.windowDuration >= 2.0 - 0.0001) {
      const avgFps = this.windowFrames / this.windowDuration;
      let changedTier: QualityTier | null = null;
      const canChange = nowSeconds - this.lastChangeTime >= 8.0;

      if (avgFps < 40) {
        this.consecutiveHighWindows = 0;
        if (canChange && this.tier !== 'low') {
          this.tier = this.tier === 'high' ? 'medium' : 'low';
          this.lastChangeTime = nowSeconds;
          changedTier = this.tier;
        }
      } else if (avgFps > 57) {
        this.consecutiveHighWindows += 1;
        if (this.consecutiveHighWindows >= 3 && canChange && this.tier !== 'high') {
          this.tier = this.tier === 'low' ? 'medium' : 'high';
          this.lastChangeTime = nowSeconds;
          this.consecutiveHighWindows = 0;
          changedTier = this.tier;
        }
      } else {
        // Between 40 and 57 FPS: streak broken
        this.consecutiveHighWindows = 0;
      }

      this.windowDuration = 0;
      this.windowFrames = 0;

      return changedTier;
    }

    return null;
  }
}
