// PostgreSQL NUMERIC company settings can arrive as strings in API responses.
export function normalizeDefaultTaxRate(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'string') return 0;
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : 0;
}
