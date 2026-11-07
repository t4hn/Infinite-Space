import test from 'node:test';
import assert from 'node:assert/strict';
import { QualityGovernor } from './qualityGovernor';

test('stays on high at a steady 60 FPS', () => {
  const g = new QualityGovernor('high');
  let t = 0;
  // 6 seconds at 60 FPS (360 frames)
  for (let i = 0; i < 360; i++) {
    t += 1 / 60;
    const change = g.update(1 / 60, t);
    assert.equal(change, null);
  }
  assert.equal(g.getTier(), 'high');
});

test('ignores the first 3 seconds of slow frames', () => {
  const g = new QualityGovernor('high');
  let t = 0;
  // 75 frames at 25 FPS (delta 0.04s) covering t = 0 to 3.0s
  for (let i = 0; i < 75; i++) {
    t += 0.04;
    const change = g.update(0.04, t);
    assert.equal(change, null);
  }
  assert.equal(g.getTier(), 'high');
});

test('drops one tier after a 2-second window at 25 FPS', () => {
  const g = new QualityGovernor('high');
  let t = 3.0; // Warm-up period already passed
  let changed: string | null = null;

  // 50 frames at 25 FPS (delta 0.04s) = 2.0s window
  for (let i = 0; i < 50; i++) {
    t += 0.04;
    const result = g.update(0.04, t);
    if (result) changed = result;
  }

  assert.equal(changed, 'medium');
  assert.equal(g.getTier(), 'medium');
});

test('never changes twice within 8 seconds', () => {
  const g = new QualityGovernor('high');
  let t = 3.0;

  // First change at t = 5.0s (downgrade to medium)
  for (let i = 0; i < 50; i++) {
    t += 0.04;
    g.update(0.04, t);
  }
  assert.equal(g.getTier(), 'medium');

  // Next 7 seconds at 25 FPS (from t = 5.0s to 12.0s) -> strictly within 8s cooldown
  let changeDuringCooldown: string | null = null;
  for (let i = 0; i < 175; i++) {
    t += 0.04;
    const res = g.update(0.04, t);
    if (res) changeDuringCooldown = res;
  }
  assert.equal(changeDuringCooldown, null);
  assert.equal(g.getTier(), 'medium');

  // Once 8s cooldown elapses (t >= 13.0s), a fresh 2s window at 25 FPS triggers the next change
  t = 13.0;
  let changeAfterCooldown: string | null = null;
  for (let i = 0; i < 50; i++) {
    t += 0.04;
    const res = g.update(0.04, t);
    if (res) changeAfterCooldown = res;
  }
  assert.equal(changeAfterCooldown, 'low');
  assert.equal(g.getTier(), 'low');
});

test('upgrades one tier after 6 seconds at 60 FPS', () => {
  const g = new QualityGovernor('medium');
  let t = 3.0; // Warm-up passed

  // Window 1: 2s (120 frames at 60 FPS) -> streak 1
  for (let i = 0; i < 120; i++) {
    t += 1 / 60;
    assert.equal(g.update(1 / 60, t), null);
  }
  assert.equal(g.getTier(), 'medium');

  // Window 2: 2s (120 frames at 60 FPS) -> streak 2
  for (let i = 0; i < 120; i++) {
    t += 1 / 60;
    assert.equal(g.update(1 / 60, t), null);
  }
  assert.equal(g.getTier(), 'medium');

  // Window 3: 2s (120 frames at 60 FPS) -> streak 3 -> upgrades to high!
  let change: string | null = null;
  for (let i = 0; i < 120; i++) {
    t += 1 / 60;
    const res = g.update(1 / 60, t);
    if (res) change = res;
  }
  assert.equal(change, 'high');
  assert.equal(g.getTier(), 'high');
});

test('ignores single frames with a delta above 0.25s', () => {
  const g = new QualityGovernor('high');
  // Single hitches
  assert.equal(g.update(0.35, 4.0), null);
  assert.equal(g.update(0.50, 4.5), null);
  assert.equal(g.update(-0.016, 5.0), null);
  assert.equal(g.update(0.0, 5.5), null);
  assert.equal(g.getTier(), 'high');
});

test('never goes below low or above high', () => {
  // Floor test: starting at low, slow frames cannot downgrade below low
  const gLow = new QualityGovernor('low');
  let t = 3.0;
  for (let i = 0; i < 50; i++) {
    t += 0.04;
    const res = gLow.update(0.04, t);
    assert.equal(res, null);
  }
  assert.equal(gLow.getTier(), 'low');

  // Ceiling test: starting at high, 6s of 60 FPS cannot upgrade above high
  const gHigh = new QualityGovernor('high');
  t = 3.0;
  for (let i = 0; i < 360; i++) {
    t += 1 / 60;
    const res = gHigh.update(1 / 60, t);
    assert.equal(res, null);
  }
  assert.equal(gHigh.getTier(), 'high');
});
