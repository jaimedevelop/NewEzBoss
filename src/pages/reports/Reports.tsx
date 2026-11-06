import { useCallback, useEffect, useState } from 'react';
import { Bug, Activity, RefreshCw, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { notifyReportsChanged, reportsRequest } from '../../services/reports/api';
type Report = {
    id: string;
    location: string;
    description: string;
    context: Record<string, unknown>;
    reporterName: string;
    reporterEmail: string;
    createdAt: string;
    readAt: string | null;
    status: 'open' | 'resolved';
};
type Event = {
    id: string;
    source: string;
    service: string;
    message: string;
    details: Record<string, unknown>;
    occurredAt: string;
    acknowledgedAt: string | null;
};
type Service = {
    name: string;
    status: string;
    checkedAt: string;
    note?: string;
};
type Data = {
    reports: Report[];
    events: Event[];
    services: Service[];
    total: number;
};
export default function Reports() {
    const { isSuperuser } = useAuthContext();
    const [data, setData] = useState<Data>();
    const [page, setPage] = useState(0);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [selected, setSelected] = useState<Report>();
    const [source, setSource] = useState('all');
    const load = useCallback(async () => { try {
        const next = await reportsRequest<Data>(`?page=${page}`, {}, true);
        setData(next);
        setError('');
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load reports.');
    } }, [page]);
    useEffect(() => { if (!isSuperuser)
        return; void load(); const timer = setInterval(() => { if (!document.hidden)
        void load(); }, 60000); return () => clearInterval(timer); }, [isSuperuser, load]);
    if (!isSuperuser)
        return <div role="alert">Superuser access is required.</div>;
    const change = async (action: () => Promise<unknown>) => { setBusy(true); try {
        await action();
        await load();
        notifyReportsChanged();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to update report.');
    }
    finally {
        setBusy(false);
    } };
    const open = (report: Report) => { setSelected(report); if (!report.readAt)
        void change(() => reportsRequest(`/${report.id}`, { method: 'PATCH', body: JSON.stringify({ read: true }) }, true)); };
    const unreadEvents = data?.events.filter(e => !e.acknowledgedAt && (source === 'all' || e.source === source)) || [];
    return <div className="space-y-6">
  <header className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900">Reports</h1><p className="mt-1 text-sm text-gray-500">Bug submissions and system monitoring</p></div><button onClick={() => void load()} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><RefreshCw size={16}/>Refresh</button></header>
  {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)]">
   <section className="min-w-0 overflow-hidden rounded-xl border bg-white shadow-sm"><div className="flex items-center justify-between border-b p-5"><h2 className="flex items-center gap-2 font-semibold"><Bug size={18} className="text-orange-600"/>Recent bug submissions</h2><span className="text-xs text-gray-500">{data?.total ?? '—'} reports</span></div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-gray-500"><tr><th className="p-4">Location / Description</th><th className="p-4">Submitted by</th><th className="p-4">Status</th></tr></thead><tbody className="divide-y">{data?.reports.map(report => <tr key={report.id} className={!report.readAt ? 'bg-orange-50/50' : ''}><td className="max-w-xs p-4"><button onClick={() => open(report)} className="text-left font-medium text-slate-900 hover:text-orange-600">{!report.readAt && <span aria-label="Unread" className="mr-2 inline-block h-2 w-2 rounded-full bg-orange-500"/>}{report.location}</button><p className="mt-1 truncate text-xs text-gray-500">{report.description}</p><p className="mt-2 text-xs text-gray-400">{new Date(report.createdAt).toLocaleString()}</p></td><td className="p-4 text-xs"><p>{report.reporterName || 'User'}</p><p className="mt-1 text-gray-500">{report.reporterEmail || 'Deleted account'}</p></td><td className="p-4"><button disabled={busy} title={report.status === 'open' ? 'Mark resolved' : 'Reopen report'} onClick={() => void change(() => reportsRequest(`/${report.id}`, { method: 'PATCH', body: JSON.stringify({ status: report.status === 'open' ? 'resolved' : 'open', read: true }) }, true))} className={`rounded-full px-2.5 py-1 text-xs ${report.status === 'open' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{report.status}</button></td></tr>)}</tbody></table></div>
    {!data && <p role="status" className="p-6 text-sm text-gray-500">{error ? 'Reports could not be loaded.' : 'Loading reports…'}</p>}{data && !data.reports.length && <p className="p-8 text-center text-sm text-gray-500">No bug reports yet.</p>}
    <div className="flex items-center justify-between border-t p-4 text-xs text-gray-500"><span>Page {page + 1}</span><div className="flex gap-3"><button aria-label="Previous page" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="disabled:opacity-30"><ChevronLeft size={18}/></button><button aria-label="Next page" disabled={!data || (page + 1) * 50 >= data.total} onClick={() => setPage(p => p + 1)} className="disabled:opacity-30"><ChevronRight size={18}/></button></div></div>
    {selected && <div className="space-y-3 border-t bg-slate-50 p-5"><div className="flex justify-between gap-3"><h3 className="font-semibold">{selected.location}</h3><button onClick={() => setSelected(undefined)} className="text-sm text-gray-500">Close</button></div><p className="whitespace-pre-wrap break-words text-sm">{selected.description}</p><details><summary className="cursor-pointer text-xs text-gray-500">Diagnostic context · {selected.id}</summary><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-900 p-4 text-xs text-slate-200">{JSON.stringify(selected.context, null, 2)}</pre></details></div>}
   </section>
   <div className="min-w-0 space-y-6"><section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-semibold"><Activity size={18} className="text-orange-600"/>Railway systems</h2><p className="mb-4 mt-1 text-xs text-gray-500">Deployment state and database connectivity · checks every 5 minutes</p><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">{data?.services.map((service, index) => <div key={`${service.name}-${index}`} className="rounded-lg border border-slate-200 p-4"><h3 className="font-medium text-slate-800">{service.name}</h3><p className={`mt-3 flex items-center gap-2 text-xs ${['Online', 'SUCCESS'].includes(service.status) ? 'text-green-600' : ['FAILED', 'CRASHED', 'Unavailable'].includes(service.status) ? 'text-red-600' : 'text-slate-500'}`}><span className="h-2 w-2 rounded-full bg-current"/>{service.status === 'SUCCESS' ? 'Running' : service.status}</p>{service.note && <p className="mt-2 text-xs text-gray-500">{service.note}</p>}<p className="mt-2 text-[10px] text-gray-400">Checked {new Date(service.checkedAt).toLocaleTimeString()}</p></div>)}</div>{data && !data.services.length && <p className="text-sm text-gray-500">Waiting for the first system check.</p>}</section>
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="flex items-center justify-between gap-2 border-b p-5"><h2 className="font-semibold">System errors</h2><button disabled={busy || !unreadEvents.length} onClick={() => void change(() => reportsRequest('/events/acknowledge', { method: 'POST', body: JSON.stringify({ ids: unreadEvents.map(e => e.id) }) }, true))} className="flex items-center gap-1 text-xs text-orange-600 disabled:text-gray-400"><Check size={14}/>Acknowledge shown</button></div><div className="border-b p-3"><label className="sr-only" htmlFor="report-log-source">Log source</label><select id="report-log-source" value={source} onChange={e => setSource(e.target.value)} className="w-full rounded-lg border p-2 text-sm">{['all', 'build', 'deploy', 'network', 'health'].map(s => <option key={s} value={s}>{s === 'all' ? 'All sources' : s[0].toUpperCase() + s.slice(1) + ' logs'}</option>)}</select></div><div className="max-h-[600px] divide-y overflow-auto">{data?.events.filter(e => source === 'all' || e.source === source).map(event => <details key={event.id} className={`p-4 ${event.acknowledgedAt ? '' : 'bg-red-50/40'}`}><summary className="cursor-pointer text-sm"><span className="mr-2 text-xs font-medium uppercase text-orange-600">{event.source}</span><span className="font-medium">{event.service}</span><p className="mt-2 break-words text-xs text-slate-600">{event.message}</p><p className="mt-2 text-[10px] text-gray-400">{new Date(event.occurredAt).toLocaleString()} · {event.acknowledgedAt ? 'Acknowledged' : 'New'}</p></summary><pre className="mt-3 overflow-auto whitespace-pre-wrap break-all text-xs text-gray-500">{JSON.stringify(event.details, null, 2)}</pre></details>)}{data && !data.events.some(e => source === 'all' || e.source === source) && <p className="p-6 text-sm text-gray-500">No recorded errors for this source.</p>}</div></section>
   </div>
  </div>
 </div>;
}
