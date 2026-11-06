import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSectorIndex,
  getSectorProgress,
  getBiomeForSector,
  kelvinToRgb,
  getWarpFactor,
  calculateAudioReaction,
  SECTOR_LENGTH,
  BIOMES
} from './sectorLogic';

test('sector coordinates calculation returns accurate sector index along travel path', () => {
  assert.equal(getSectorIndex(0), 0);
  assert.equal(getSectorIndex(-500), 0);
  assert.equal(getSectorIndex(-1600), 1);
  assert.equal(getSectorIndex(-3200), 2);
  assert.equal(getSectorIndex(-4800), 3);
});

test('sector progress smoothly ranges from 0 to 1', () => {
  assert.equal(getSectorProgress(0), 0);
  assert.equal(getSectorProgress(-800), 0.5);
  assert.equal(Math.round(getSectorProgress(-1200) * 100) / 100, 0.75);
  assert.equal(getSectorProgress(-1600), 0);
});

test('biome distribution is deterministic and wraps endlessly', () => {
  const biome0 = getBiomeForSector(0);
  const biome1 = getBiomeForSector(1);
  const biomeWrap = getBiomeForSector(BIOMES.length);

  assert.equal(biome0.id, BIOMES[0].id);
  assert.equal(biome1.id, BIOMES[1].id);
  assert.equal(biomeWrap.id, BIOMES[0].id);
  assert.ok(biome0.name.length > 0);
});

test('kelvin to RGB produces authentic stellar spectral values', () => {
  // Cool red star (Class M ~ 2800K) -> High red, dominant over blue
  const redStar = kelvinToRgb(2800);
  assert.ok(redStar.r > 0.9);
  assert.ok(redStar.r > redStar.b * 2);

  // Solar yellow star (Class G ~ 5800K) -> Balanced red and green, medium blue
  const sunStar = kelvinToRgb(5800);
  assert.ok(sunStar.r > 0.9);
  assert.ok(sunStar.g > 0.8);
  assert.ok(sunStar.b > 0.7);

  // Hot blue star (Class O ~ 25000K) -> High blue
  const blueStar = kelvinToRgb(25000);
  assert.ok(blueStar.b > 0.95);
});

test('flight speed modes map to proportional warp velocities', () => {
  assert.equal(getWarpFactor('pause'), 0);
  assert.ok(getWarpFactor('cruise') > 0);
  assert.ok(getWarpFactor('warp') > getWarpFactor('cruise'));
  assert.ok(getWarpFactor('hyperspace') > getWarpFactor('warp'));
});

test('audio reaction correctly boosts ambient intensity within safe bounds', () => {
  const zeroAudio = calculateAudioReaction(0, 0, 1.0);
  assert.equal(zeroAudio.pulsedIntensity, 1.0);
  assert.equal(zeroAudio.bloomMultiplier, 1.0);

  const bassBeat = calculateAudioReaction(1.0, 0.5, 1.0);
  assert.ok(bassBeat.pulsedIntensity > 1.0);
  assert.ok(bassBeat.bloomMultiplier > 1.5);
  assert.ok(bassBeat.chromaticDispersion > 0);
});
