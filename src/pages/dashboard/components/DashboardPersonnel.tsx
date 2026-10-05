import { useEffect, useState } from 'react';
import { getDashboardPersonnel, type Metric, type PersonnelResponse } from '../../../services/dashboardPersonnel/dashboardPersonnel';
import { calendarPeriod, type Period } from './schedule/period';
const columns: [Metric, string][] = [['attendance','Attendance'],['late','Late'],['excused','Excused'],['noCallNoShow','No Call/No Show'],['tasksCompleted','Tasks Completed'],['index','EzBoss Index']];
export default function DashboardPersonnel() {
  const [period, setPeriod] = useState<Period>('daily');
  const [data, setData] = useState<PersonnelResponse | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => { let active = true; setLoading(true); setError(''); setData(null);
    void getDashboardPersonnel(period).then(result => { if (active) setData(result); }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Unable to load personnel.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period]);
  return <section className="w-full min-w-0 rounded-xl border border-gray-100 bg-white p-5 shadow-sm" aria-label="Personnel">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Personnel</h2><select aria-label="Personnel period" value={period} onChange={e => setPeriod(e.target.value as Period)} className="rounded-lg border p-2 text-sm">{(['daily','weekly','monthly'] as const).map(p => <option key={p} value={p}>{p[0].toUpperCase()+p.slice(1)}</option>)}</select></div>
    <p className="mt-2 text-sm text-gray-600">{calendarPeriod(period, now).label}</p>
    {loading ? <p role="status" className="mt-4">Loading personnel…</p> : error ? <p role="alert" className="mt-4 text-red-700">{error}</p> : data && <>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Personnel metrics for {calendarPeriod(period, now).label}</caption><thead><tr><th scope="col" className="p-3">Worker</th>{columns.map(([key,label]) => <th key={key} scope="col" className="p-3"><span>{label} (%)</span><details className="font-normal text-xs"><summary className="cursor-pointer text-gray-600" aria-label={`About ${label}`}>About</summary><p className="min-w-32 max-w-56 py-2">{data.metricHelp[key]}</p></details></th>)}</tr></thead><tbody>{data.workers.map(worker => <tr key={worker.id} className="border-t"><th scope="row" className="max-w-64 p-3 font-medium break-words [overflow-wrap:anywhere]">{worker.name}<span className="block text-xs font-normal text-gray-500">{worker.email || worker.id}</span></th>{columns.map(([key]) => <td key={key} className="p-3" title={data.metricHelp[key]}>{worker.metrics[key] === null ? <span aria-label={`Unavailable: ${data.metricHelp[key]}`}>—</span> : `${Math.round(worker.metrics[key]!)}%`}</td>)}</tr>)}</tbody></table></div>
      {!data.workers.length && <p className="mt-3 text-sm text-gray-600">No employees or work-order workers found.</p>}
      <p className="mt-3 text-xs text-gray-600">— means unavailable, not zero. The roster includes People employees and work-order assignments across all dates. Workers are combined only by a shared employee ID; email-only invitations remain separate without a verified person ID.</p>
    </>}
  </section>;
}
