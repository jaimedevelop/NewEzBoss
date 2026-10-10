import { Link } from 'react-router-dom';
import { formatMoney, Period } from '../../../../services/dashboardAccounting';
import { useAccounting } from './useAccounting';
export default function PendingAccounts() {
  const state = useAccounting('pending');
  return <article className="rounded-xl border border-gray-200 bg-white p-4 text-sm font-light leading-relaxed sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xs font-light uppercase tracking-wider text-black">Pending Accounts</h3>
      <select aria-label="Pending Accounts period" value={state.period} onChange={e => state.setPeriod(e.target.value as Period)} className="rounded-lg border border-gray-200 bg-white p-2 text-xs font-normal text-gray-700 focus:border-orange-500 focus:outline-orange-500">{['Daily', 'Weekly', 'Monthly'].map(p => <option key={p}>{p}</option>)}</select></div>
    {state.loading && <p role="status" className="mt-4">Loading balances…</p>}
    {state.error && <div role="alert" className="mt-4"><p>{state.error}</p><button onClick={state.retry} className="mt-2 text-orange-700 underline">Retry</button></div>}
    {state.data && <><p className="mt-3 text-sm text-gray-600">{state.data.start} through {state.data.end} (end excluded), {state.data.timezone}</p>
      <p className="mt-2 text-sm text-gray-600">{state.data.explanation}</p>
      {!state.data.clients?.length && <p className="mt-5">No collectible balances due in this period or awaiting allocation.</p>}
      <ul className="mt-4 divide-y">{state.data.clients?.map(client => <li key={client.identity} className="py-3">
        <p className="font-normal text-gray-900">{client.name || 'Client name unavailable'}</p>
        {client.dated !== '0.00' && <p>Due this period: {formatMoney(client.dated, state.data!.currency)}</p>}
        {client.undated !== '0.00' && <p>Undated / unallocated: {formatMoney(client.undated, state.data!.currency)}</p>}
        <div className="mt-2 flex flex-wrap gap-3">{client.documents.map(id => <Link className="text-sm text-orange-700 underline" key={id} to={`/estimates/${id}`}>Open document #{id}</Link>)}</div>
      </li>)}</ul></>}
  </article>;
}
