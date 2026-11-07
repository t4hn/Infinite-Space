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
  BIOMES,
  mulberry32,
  calculateJumpTargetZ
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

test('biome distribution is deterministic and paced', () => {
  const biome0 = getBiomeForSector(0);
  const biome1 = getBiomeForSector(1);

  assert.equal(biome0.id, 'orion_cradle');
  assert.notEqual(biome0.id, biome1.id);
  assert.ok(biome0.name.length > 0);
  assert.ok(biome1.name.length > 0);
});

test('over the first 200 sectors: sector 0 is orion_cradle', () => {
  assert.equal(getBiomeForSector(0).id, 'orion_cradle');
});

test('over the first 200 sectors: every aligned block of 8 sectors contains each biome exactly once', () => {
  const numBlocks = Math.floor(200 / BIOMES.length); // 25 full blocks of 8
  for (let block = 0; block < numBlocks; block++) {
    const blockBiomes = [];
    for (let s = 0; s < BIOMES.length; s++) {
      blockBiomes.push(getBiomeForSector(block * BIOMES.length + s));
    }
    const idSet = new Set(blockBiomes.map(b => b.id));
    assert.equal(idSet.size, BIOMES.length, `Block ${block} should have ${BIOMES.length} unique biomes`);
    for (const b of BIOMES) {
      assert.ok(idSet.has(b.id), `Block ${block} should contain biome ${b.id}`);
    }
  }
});

test('over the first 200 sectors: calling getBiomeForSector twice for the same index returns the same biome', () => {
  for (let s = 0; s < 200; s++) {
    const firstCall = getBiomeForSector(s);
    const secondCall = getBiomeForSector(s);
    assert.strictEqual(firstCall, secondCall, `Sector ${s} must return identical biome reference`);
  }
});

test('over the first 200 sectors: no two adjacent sectors have the same biome', () => {
  for (let s = 0; s < 199; s++) {
    const curr = getBiomeForSector(s);
    const next = getBiomeForSector(s + 1);
    assert.notEqual(curr.id, next.id, `Adjacent sectors ${s} and ${s + 1} must not have the same biome (${curr.id})`);
  }
});

test('over the first 200 sectors: there are never 3 intense sectors in a row', () => {
  for (let s = 0; s < 198; s++) {
    const b0 = getBiomeForSector(s);
    const b1 = getBiomeForSector(s + 1);
    const b2 = getBiomeForSector(s + 2);

    const allIntense = b0.intensity === 'intense' && b1.intensity === 'intense' && b2.intensity === 'intense';
    assert.equal(
      allIntense,
      false,
      `Sectors ${s}, ${s + 1}, ${s + 2} cannot all be intense (${b0.id}, ${b1.id}, ${b2.id})`
    );
  }
});

test('over the first 200 sectors: calculateJumpTargetZ lands on requested biome for every biome id from several starting positions', () => {
  const startPositions = [0, -500, -1600, -3200, -12800, -50000];
  for (const startZ of startPositions) {
    for (const targetBiome of BIOMES) {
      const targetZ = calculateJumpTargetZ(targetBiome.id, startZ);
      assert.ok(targetZ < startZ, `Jump target Z (${targetZ}) must be ahead of start Z (${startZ})`);
      const targetSector = getSectorIndex(targetZ);
      const resultingBiome = getBiomeForSector(targetSector);
      assert.equal(
        resultingBiome.id,
        targetBiome.id,
        `Jumped from ${startZ} to ${targetZ} (sector ${targetSector}), expected ${targetBiome.id} but got ${resultingBiome.id}`
      );
    }
  }
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

test('mulberry32 generates deterministic pseudorandom numbers within [0, 1)', () => {
  const seed = 42;
  const rngA = mulberry32(seed);
  const rngB = mulberry32(seed);

  const seqA = [rngA(), rngA(), rngA(), rngA(), rngA()];
  const seqB = [rngB(), rngB(), rngB(), rngB(), rngB()];

  // Same seed produces exactly identical sequences
  assert.deepEqual(seqA, seqB);

  // Each value is strictly in [0, 1)
  for (const val of seqA) {
    assert.ok(val >= 0 && val < 1);
  }

  // Different seed produces different sequence
  const rngC = mulberry32(999);
  const seqC = [rngC(), rngC(), rngC(), rngC(), rngC()];
  assert.notDeepEqual(seqA, seqC);
});

test('calculateJumpTargetZ computes correct forward sector for target biome', () => {
  const currentZ = -1000;
  const targetBiome = BIOMES[2].id;

  const targetZ = calculateJumpTargetZ(targetBiome, currentZ);

  // Jump is forward along travel path (more negative Z)
  assert.ok(targetZ < currentZ);

  // Target sector index resolves to the requested biome
  const targetSector = getSectorIndex(targetZ);
  const resultingBiome = getBiomeForSector(targetSector);
  assert.equal(resultingBiome.id, targetBiome);

  // Invalid biome returns the current camera position without moving
  const unchangedZ = calculateJumpTargetZ('non_existent_biome', currentZ);
  assert.equal(unchangedZ, currentZ);
});

