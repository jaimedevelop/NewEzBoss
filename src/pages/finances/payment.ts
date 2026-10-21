const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatPayment(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const numeric = trimmed.replace(/[$,\s]/g, '');
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(numeric)) return value;
  const amount = Number(numeric);
  return Number.isFinite(amount) ? dollars.format(amount) : value;
}

export function paymentInput(value: string): string {
  return formatPayment(value) !== value || /^-?\$[\d,.]+$/.test(value) ? value.replace(/[$,\s]/g, '') : value;
}
