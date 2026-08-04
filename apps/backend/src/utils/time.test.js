const test = require('node:test');
const assert = require('node:assert/strict');

const { toUnix, addMinutes, diffSec } = require('./time');

test('toUnix converts an ISO string to whole UNIX seconds', () => {
  assert.equal(toUnix('2025-01-01T00:00:00.000Z'), 1735689600);
  assert.equal(toUnix('1970-01-01T00:00:00.000Z'), 0);
});

test('toUnix accepts a Date and a millisecond timestamp', () => {
  assert.equal(toUnix(new Date('2025-01-01T00:00:00.000Z')), 1735689600);
  assert.equal(toUnix(1735689600000), 1735689600);
});

test('toUnix floors sub-second precision rather than rounding up', () => {
  assert.equal(toUnix('2025-01-01T00:00:00.999Z'), 1735689600);
});

test('toUnix returns NaN for an unparseable date', () => {
  assert.ok(Number.isNaN(toUnix('not-a-date')));
});

test('addMinutes returns a new Date offset by the given minutes', () => {
  const out = addMinutes('2025-01-01T00:00:00.000Z', 90);
  assert.ok(out instanceof Date);
  assert.equal(out.toISOString(), '2025-01-01T01:30:00.000Z');
});

test('addMinutes accepts negative offsets and crosses date boundaries', () => {
  assert.equal(
    addMinutes('2025-01-01T00:00:00.000Z', -30).toISOString(),
    '2024-12-31T23:30:00.000Z',
  );
});

test('addMinutes does not mutate the Date it was given', () => {
  const original = new Date('2025-01-01T00:00:00.000Z');
  addMinutes(original, 60);
  assert.equal(original.toISOString(), '2025-01-01T00:00:00.000Z');
});

test('addMinutes handles zero and fractional minutes', () => {
  assert.equal(addMinutes('2025-01-01T00:00:00.000Z', 0).toISOString(), '2025-01-01T00:00:00.000Z');
  assert.equal(addMinutes('2025-01-01T00:00:00.000Z', 0.5).toISOString(), '2025-01-01T00:00:30.000Z');
});

test('diffSec returns a - b in whole seconds', () => {
  assert.equal(diffSec('2025-01-01T00:01:40.000Z', '2025-01-01T00:00:00.000Z'), 100);
  assert.equal(diffSec('2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'), 0);
});

test('diffSec goes negative when a precedes b', () => {
  assert.equal(diffSec('2025-01-01T00:00:00.000Z', '2025-01-01T00:01:40.000Z'), -100);
});

test('diffSec floors toward negative infinity, matching Math.floor', () => {
  // 0.5s apart → floors to 0; -0.5s apart → floors to -1.
  assert.equal(diffSec('2025-01-01T00:00:00.500Z', '2025-01-01T00:00:00.000Z'), 0);
  assert.equal(diffSec('2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.500Z'), -1);
});

test('diffSec returns NaN when either side is unparseable', () => {
  assert.ok(Number.isNaN(diffSec('nope', '2025-01-01T00:00:00.000Z')));
  assert.ok(Number.isNaN(diffSec('2025-01-01T00:00:00.000Z', 'nope')));
});

test('toUnix and diffSec agree on elapsed time', () => {
  const a = '2025-06-01T12:00:00.000Z';
  const b = '2025-06-01T10:30:00.000Z';
  assert.equal(diffSec(a, b), toUnix(a) - toUnix(b));
});
