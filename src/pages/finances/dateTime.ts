// Show calendar dates only, including records that already contain a time.
export function dateInput(value: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value)) return value.slice(0, 10);
  const calendar = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(value);
  if (calendar) {
    const [, month, day, year, hour = '0', minute = '0', second = '0'] = calendar;
    const date = new Date(+year, +month - 1, +day, +hour, +minute, +second);
    if (date.getFullYear() !== +year || date.getMonth() !== +month - 1 || date.getDate() !== +day || +hour > 23 || +minute > 59 || +second > 59) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (number: number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
