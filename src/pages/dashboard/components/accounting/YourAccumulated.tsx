import { formatMoney, Period } from '../../../../services/dashboardAccounting';
import { useAccounting } from './useAccounting';
export default function YourAccumulated() {
  const state = useAccounting('accumulated');
  return <article className="rounded-xl border border-gray-200 bg-white p-6">
    <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">Your Accumulated</h3>
      <select aria-label="Your Accumulated period" value={state.period} onChange={e => state.setPeriod(e.target.value as Period)} className="rounded-lg border p-2">{['Daily', 'Weekly', 'Monthly'].map(p => <option key={p}>{p}</option>)}</select></div>
    {state.loading && <p role="status" className="mt-4">Loading period totals…</p>}
    {state.error && <div role="alert" className="mt-4"><p>{state.error}</p><button onClick={state.retry} className="mt-2 text-orange-700 underline">Retry</button></div>}
    {state.data && <><p className="mt-3 text-sm text-gray-600">Period totals: {state.data.start} through {state.data.end} (end excluded), {state.data.timezone}</p>
      <dl className="mt-5 space-y-4">{[['Revenue · gross approved receipts', state.data.revenue], ['Recorded costs', state.data.costs], ['Profit', state.data.profit]].map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-semibold tabular-nums">{formatMoney(value, state.data!.currency)}</dd></div>)}</dl>
      {state.data.receipts === 0 && <p className="mt-4 text-sm">No approved receipts recorded for this period.</p>}
      <p className="mt-4 text-sm text-gray-600">{state.data.explanation}</p></>}
  </article>;
}
