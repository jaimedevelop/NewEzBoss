export type Period = 'daily' | 'weekly' | 'monthly';
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseSchedule(value: string): Date | null {
  const dateOnly = dateOnlyPattern.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00` : value);
  if (!Number.isFinite(date.getTime())) return null;
  if (dateOnly && (date.getFullYear() !== Number(value.slice(0, 4)) || date.getMonth() + 1 !== Number(value.slice(5, 7)) || date.getDate() !== Number(value.slice(8, 10)))) return null;
  return date;
}

function calendarDate(date: Date, timezone?: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}

export function calendarPeriod(period: Period, now: Date, timezone?: string) {
  // UTC is only calendar arithmetic here, never the interpretation of a date-only schedule.
  const startDate = new Date(`${calendarDate(now, timezone)}T00:00:00Z`);
  if (period === 'weekly') startDate.setUTCDate(startDate.getUTCDate() - (startDate.getUTCDay() + 6) % 7);
  if (period === 'monthly') startDate.setUTCDate(1);
  const endDate = new Date(startDate);
  if (period === 'monthly') endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  else endDate.setUTCDate(endDate.getUTCDate() + (period === 'weekly' ? 7 : 1));
  const last = new Date(endDate);
  last.setUTCDate(last.getUTCDate() - 1);
  const format = (date: Date) => date.toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
  return { start: startDate.toISOString().slice(0, 10), end: endDate.toISOString().slice(0, 10), label: `${format(startDate)} – ${format(last)} (${timezone || 'local time'}${period === 'weekly' ? '; Monday–Sunday' : ''})` };
}

export function isUpcoming(value: string, period: Period, now: Date, timezone?: string): boolean {
  const date = parseSchedule(value);
  if (!date) return false;
  const dateOnly = dateOnlyPattern.test(value);
  const day = dateOnly ? value : calendarDate(date, timezone);
  const { start, end } = calendarPeriod(period, now, timezone);
  return day >= start && day < end && (dateOnly ? day >= calendarDate(now, timezone) : date >= now);
}

export function formatSchedule(value: string, timezone?: string): string {
  const date = parseSchedule(value);
  if (!date) return 'Schedule unavailable';
  if (dateOnlyPattern.test(value)) return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });
  return date.toLocaleString(undefined, { timeZone: timezone });
}
