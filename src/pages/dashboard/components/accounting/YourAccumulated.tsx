import { formatMoney, Period } from '../../../../services/dashboardAccounting';
import { useAccounting } from './useAccounting';
export default function YourAccumulated() {
  const state = useAccounting('accumulated');
  return <article className="rounded-xl border border-gray-200 bg-white p-4 text-sm font-light leading-relaxed sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xs font-light uppercase tracking-wider text-black">Financial Summary</h3>
      <select aria-label="Financial Summary period" value={state.period} onChange={e => state.setPeriod(e.target.value as Period)} className="rounded-lg border border-gray-200 bg-white p-2 text-xs font-normal text-gray-700 focus:border-orange-500 focus:outline-orange-500">{['Daily', 'Weekly', 'Monthly'].map(p => <option key={p}>{p}</option>)}</select></div>
    {state.loading && <p role="status" className="mt-4">Loading period totals…</p>}
    {state.error && <div role="alert" className="mt-4"><p>{state.error}</p><button onClick={state.retry} className="mt-2 text-orange-700 underline">Retry</button></div>}
    {state.data && <><p className="mt-3 text-sm text-gray-600">Period totals: {state.data.start} through {state.data.end} (end excluded), {state.data.timezone}</p>
      <dl className="mt-5 divide-y divide-gray-100">{[['Revenue · gross approved receipts', state.data.revenue], ['Recorded costs', state.data.costs], ['Profit', state.data.profit]].map(([label, value]) => <div key={label} className="flex items-baseline justify-between gap-3 py-3"><dt className="text-[10px] font-normal uppercase tracking-wider text-gray-500">{label}</dt><dd className="font-normal tabular-nums text-gray-900">{formatMoney(value, state.data!.currency)}</dd></div>)}</dl>
      {state.data.receipts === 0 && <p className="mt-4 text-sm">No approved receipts recorded for this period.</p>}
      <p className="mt-4 text-sm text-gray-600">{state.data.explanation}</p></>}
  </article>;
}
