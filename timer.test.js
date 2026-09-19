import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createTimer, formatClock, isFinished, pauseTimer, resetTimer, startTimer, timeLeft } from './timer.js';

const MIN = 60_000;

describe('timer', () => {
  it('starts idle', () => {
    const t = createTimer(25 * MIN);
    assert.equal(t.running, false);
    assert.equal(timeLeft(t, 0), 25 * MIN);
  });
  it('counts down from an absolute end time', () => {
    const t = startTimer(createTimer(25 * MIN), 1000);
    assert.equal(timeLeft(t, 1000 + 5 * MIN), 20 * MIN);
    assert.equal(isFinished(t, 1000 + 25 * MIN), true);
    assert.equal(isFinished(t, 1000 + 25 * MIN - 1), false);
  });
  it('pauses and resumes without drifting', () => {
    let t = startTimer(createTimer(10 * MIN), 0);
    t = pauseTimer(t, 4 * MIN);
    assert.equal(t.remainingMs, 6 * MIN);
    assert.equal(timeLeft(t, 99 * MIN), 6 * MIN, 'paused time does not advance');
    t = startTimer(t, 50 * MIN);
    assert.equal(timeLeft(t, 52 * MIN), 4 * MIN);
  });
  it('is idempotent for repeated start and pause', () => {
    const t = startTimer(createTimer(MIN), 0);
    assert.equal(startTimer(t, 500), t);
    const p = pauseTimer(t, 100);
    assert.equal(pauseTimer(p, 200), p);
  });
  it('never goes below zero', () => {
    assert.equal(timeLeft(startTimer(createTimer(MIN), 0), 10 * MIN), 0);
  });
  it('resets to a new duration', () => {
    const t = resetTimer(startTimer(createTimer(MIN), 0), 50 * MIN);
    assert.deepEqual(t, { durationMs: 50 * MIN, remainingMs: 50 * MIN, endsAt: null, running: false });
  });
});

describe('formatClock', () => {
  it('formats minutes and seconds', () => {
    assert.equal(formatClock(25 * MIN), '25:00');
    assert.equal(formatClock(65_000), '01:05');
    assert.equal(formatClock(0), '00:00');
  });
  it('rounds up so the display never hits 00:00 early', () => {
    assert.equal(formatClock(100), '00:01');
    assert.equal(formatClock(-5), '00:00');
  });
});
