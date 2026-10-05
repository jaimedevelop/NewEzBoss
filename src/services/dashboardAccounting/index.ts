import { getApiAccessToken } from '../apiAuth';
export type Period = 'Daily' | 'Weekly' | 'Monthly';
export interface AccountingData {
  start: string; end: string; timezone: string; currency: string; explanation: string;
  clients?: { identity: string; name: string; dated: string; undated: string; documents: number[] }[];
  revenue?: string; receipts?: number; costs?: string | null; profit?: string | null;
}
export async function getAccounting(kind: string, period: Period, signal: AbortSignal): Promise<AccountingData> {
  const token = await getApiAccessToken();
  const query = new URLSearchParams({ period, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  const response = await fetch(`${import.meta.env.VITE_API_URL}/dashboard-accounting/${kind}?${query}`, {
    signal, headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(response.status === 403 ? 'You do not have access to accounting documents.' : 'Accounting data is unavailable. Try again later.');
  return response.json();
}
export function formatMoney(value: string | null | undefined, currency: string) {
  if (value == null) return '—';
  // Format decimal text without passing the full amount through binary floating point.
  if (!/^-?\d+\.\d{1,2}$/.test(value)) return '—';
  const [whole, fraction] = value.split('.');
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return formatter.formatToParts(BigInt(whole)).map(part => part.type === 'fraction' ? fraction.padEnd(2, '0') : part.value).join('');
}
