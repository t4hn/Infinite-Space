import test from 'node:test';
import assert from 'node:assert/strict';
import { QualityGovernor } from './qualityGovernor';

test('QualityGovernor initializes with requested tier or defaults to high', () => {
  const gDefault = new QualityGovernor();
  assert.equal(gDefault.getTier(), 'high');

  const gMed = new QualityGovernor('medium');
  assert.equal(gMed.getTier(), 'medium');

  const gLow = new QualityGovernor('low');
  assert.equal(gLow.getTier(), 'low');
});

test('QualityGovernor ignores everything in the first 3 seconds', () => {
  const g = new QualityGovernor('high');
  // Send 60 frames of 20 FPS (delta 0.05s) across t = 0 to 3.0s
  let t = 0;
  for (let i = 0; i < 60; i++) {
    t += 0.05;
    const change = g.update(0.05, t);
    assert.equal(change, null);
  }
  assert.equal(g.getTier(), 'high');
});

test('QualityGovernor ignores frame deltas over 0.25s and non-positive deltas', () => {
  const g = new QualityGovernor('high');
  assert.equal(g.update(0.35, 4.0), null);
  assert.equal(g.update(0.0, 4.1), null);
  assert.equal(g.update(-0.016, 4.2), null);
  assert.equal(g.getTier(), 'high');
});

test('QualityGovernor downgrades tier when window averages below 40 FPS', () => {
  const g = new QualityGovernor('high');
  let t = 3.0;
  let changed: string | null = null;

  // Run 60 frames at 30 FPS (delta 1/30s = 0.0333s) over 2.0 seconds
  for (let i = 0; i < 60; i++) {
    t += 1 / 30;
    const result = g.update(1 / 30, t);
    if (result) changed = result;
  }

  assert.equal(changed, 'medium');
  assert.equal(g.getTier(), 'medium');
});

test('QualityGovernor enforces 8-second cooldown after a change before next change', () => {
  const g = new QualityGovernor('high');
  let t = 3.0;

  // First window: 2s at 30 FPS -> triggers downgrade to medium at ~5.0s
  for (let i = 0; i < 60; i++) {
    t += 1 / 30;
    g.update(1 / 30, t);
  }
  assert.equal(g.getTier(), 'medium');

  // Next window at t = 5.0s to 7.0s: still 30 FPS, but cooldown is active (< 8s)
  let changeDuringCooldown: string | null = null;
  for (let i = 0; i < 60; i++) {
    t += 1 / 30;
    const res = g.update(1 / 30, t);
    if (res) changeDuringCooldown = res;
  }
  assert.equal(changeDuringCooldown, null);
  assert.equal(g.getTier(), 'medium');

  // Advance time past the 8-second cooldown (last change was at t=5.0s, so t >= 13.0s)
  t = 13.0;
  let changeAfterCooldown: string | null = null;
  for (let i = 0; i < 60; i++) {
    t += 1 / 30;
    const res = g.update(1 / 30, t);
    if (res) changeAfterCooldown = res;
  }
  assert.equal(changeAfterCooldown, 'low');
  assert.equal(g.getTier(), 'low');

  // Low is the floor, does not downgrade further
  t = 22.0;
  for (let i = 0; i < 60; i++) {
    t += 1 / 30;
    const res = g.update(1 / 30, t);
    assert.equal(res, null);
  }
  assert.equal(g.getTier(), 'low');
});

test('QualityGovernor upgrades tier after 3 consecutive windows averaging above 57 FPS', () => {
  const g = new QualityGovernor('low');
  let t = 3.0;

  // Window 1: 2s at 60 FPS -> consecutive = 1
  for (let i = 0; i < 120; i++) {
    t += 1 / 60;
    assert.equal(g.update(1 / 60, t), null);
  }
  assert.equal(g.getTier(), 'low');

  // Window 2: 2s at 60 FPS -> consecutive = 2
  for (let i = 0; i < 120; i++) {
    t += 1 / 60;
    assert.equal(g.update(1 / 60, t), null);
  }
  assert.equal(g.getTier(), 'low');

  // Window 3: 2s at 60 FPS -> consecutive = 3 -> upgrades to medium!
  let change: string | null = null;
  for (let i = 0; i < 120; i++) {
    t += 1 / 60;
    const res = g.update(1 / 60, t);
    if (res) change = res;
  }
  assert.equal(change, 'medium');
  assert.equal(g.getTier(), 'medium');
});

test('QualityGovernor resets upgrade streak if an intermediate window drops to <= 57 FPS', () => {
  const g = new QualityGovernor('low');
  let t = 3.0;

  // Window 1: 60 FPS -> streak 1
  for (let i = 0; i < 120; i++) {
    t += 1 / 60;
    g.update(1 / 60, t);
  }

  // Window 2: 60 FPS -> streak 2
  for (let i = 0; i < 120; i++) {
    t += 1 / 60;
    g.update(1 / 60, t);
  }

  // Window 3: 50 FPS (between 40 and 57) -> streak broken!
  for (let i = 0; i < 100; i++) {
    t += 1 / 50;
    const res = g.update(1 / 50, t);
    assert.equal(res, null);
  }
  assert.equal(g.getTier(), 'low');

  // Window 4: 60 FPS -> streak 1 again
  for (let i = 0; i < 120; i++) {
    t += 1 / 60;
    assert.equal(g.update(1 / 60, t), null);
  }
  assert.equal(g.getTier(), 'low');
});
