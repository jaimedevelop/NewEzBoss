import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarPeriod, isUpcoming, parseSchedule, formatSchedule } from './period.ts';

test('Monday–Sunday range includes Sunday and excludes next Monday', () => {
  const now = new Date('2026-10-05T16:00:00Z');
  const range = calendarPeriod('weekly', now, 'America/New_York');
  assert.equal(range.start, '2026-10-05');
  assert.equal(range.end, '2026-10-12');
  assert.equal(isUpcoming('2026-10-11', 'weekly', now, 'America/New_York'), true);
  assert.equal(isUpcoming('2026-10-12', 'weekly', now, 'America/New_York'), false);
});

test('company day and upcoming timestamps use inclusive start and exclusive end', () => {
  const now = new Date('2026-10-06T01:00:00Z');
  assert.equal(calendarPeriod('daily', now, 'America/Los_Angeles').start, '2026-10-05');
  assert.equal(isUpcoming('2026-10-05', 'daily', now, 'America/Los_Angeles'), true);
  assert.equal(isUpcoming(now.toISOString(), 'daily', now, 'America/Los_Angeles'), true);
  assert.equal(isUpcoming('2026-10-06T00:59:59Z', 'daily', now, 'America/Los_Angeles'), false);
  assert.equal(isUpcoming('2026-10-06T07:00:00Z', 'daily', now, 'America/Los_Angeles'), false);
});

test('month rollover, DST week, and invalid date-only schedules', () => {
  const range = calendarPeriod('monthly', new Date('2026-12-15T12:00:00Z'), 'UTC');
  assert.equal(range.start, '2026-12-01');
  assert.equal(range.end, '2027-01-01');
  assert.equal(calendarPeriod('weekly', new Date('2026-11-01T16:00:00Z'), 'America/New_York').start, '2026-10-26');
  assert.equal(parseSchedule('2026-02-30'), null);
  assert.equal(parseSchedule('unavailable'), null);
  assert.match(formatSchedule('2026-10-05', 'America/Los_Angeles'), /5/);
});
