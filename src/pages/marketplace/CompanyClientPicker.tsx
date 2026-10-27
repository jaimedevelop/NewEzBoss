import { useEffect, useState } from 'react';
import { getClients, type Client } from '../../services/clients';
import { fieldClass, secondaryClass } from './shared';

export default function CompanyClientPicker({ value, onChange, disabled }: { value: string; onChange: (id: string) => void; disabled: boolean }) {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    let current = true;
    setLoading(true); setError('');
    const timer = window.setTimeout(() => {
      void getClients('', { searchTerm: search.trim() }, 50, 0).then(result => {
        if (!current) return;
        if (!result.success || !result.data) { setError(typeof result.error === 'string' ? result.error : 'Unable to load company clients.'); setClients([]); return; }
        setClients(result.data.clients); setHasMore(result.data.hasMore);
      }).catch(() => { if (current) setError('Unable to load company clients.'); }).finally(() => { if (current) setLoading(false); });
    }, 250);
    return () => { current = false; window.clearTimeout(timer); };
  }, [search, retry]);
  function selectClient(client: Client) {
    if (!client.id) return;
    onChange(client.id);
    setSelected(client);
  }
  return <fieldset disabled={disabled} className="space-y-3 disabled:opacity-60"><legend className="text-sm font-semibold text-slate-800">Choose an existing company client</legend><label className="block text-sm text-slate-700">Search clients by name or email<input type="search" maxLength={160} value={search} onChange={event => setSearch(event.target.value)} className={fieldClass} placeholder="Search your company's clients" /></label>{selected && value === selected.id && <p role="status" className="rounded-lg bg-orange-50 p-3 text-sm text-orange-900">Selected: <strong>{selected.name}</strong>{selected.email && ` (${selected.email})`}<button type="button" className="ml-3 font-semibold underline" onClick={() => { onChange(''); setSelected(null); }}>Clear selection</button></p>}{loading ? <p role="status" className="text-sm text-slate-500">Loading clients…</p> : error ? <div role="alert"><p className="text-sm text-red-700">{error}</p><button type="button" className={`${secondaryClass} mt-2`} onClick={() => setRetry(item => item + 1)}>Retry client search</button></div> : clients.length ? <><ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">{clients.map(client => <li key={client.id}><button type="button" aria-pressed={value === client.id} onClick={() => selectClient(client)} disabled={!client.id} className={`w-full px-3 py-3 text-left text-sm ${value === client.id ? 'bg-orange-50 text-orange-900' : 'text-slate-700 hover:bg-slate-50'}`}><span className="block font-semibold">{client.name}</span>{client.email && <span className="mt-0.5 block break-all text-xs text-slate-500">{client.email}</span>}{client.companyName && <span className="mt-0.5 block text-xs text-slate-500">{client.companyName}</span>}</button></li>)}</ul>{hasMore && <p className="text-xs text-slate-500">More clients are available. Narrow your search to find the right person.</p>}</> : <p className="text-sm text-slate-500">No company clients match this search.</p>}</fieldset>;
}
