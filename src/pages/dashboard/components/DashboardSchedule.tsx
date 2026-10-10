import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dropdown } from '../../../mainComponents/forms/Dropdown';
import { useAuthContext } from '../../../contexts/AuthContext';
import { getWorkOrders } from '../../../services/workOrders/workOrders.queries';
import type { WorkOrder } from '../../../services/workOrders/workOrders.types';
import { calendarPeriod, formatSchedule, type Period } from './schedule/period';
import { selectSchedule } from './schedule/workOrders';

export default function DashboardSchedule() {
  const { currentUser, userProfile, isLoading, isAuthenticated, canAccessPage } = useAuthContext();
  const identity = currentUser?.uid;
  const permitted = isAuthenticated && canAccessPage('work-orders');
  const [period, setPeriod] = useState<Period>('daily');
  const [data, setData] = useState<{ identity: string; orders: WorkOrder[] } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    if (isLoading || !permitted || !identity) return () => { active = false; };
    setLoading(true);
    void getWorkOrders().then(result => {
      if (!active) return;
      if (result.success && Array.isArray(result.data)) setData({ identity, orders: result.data });
      else setError(result.error || 'Work-order data is unavailable. Please try again.');
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setError('Unable to load work orders. Please try again.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [identity, isLoading, permitted, retry]);

  // Hide previous-account data immediately, before the fetching effect runs.
  const visibleData = data?.identity === identity ? data : null;
  const busy = isLoading || (permitted && (loading || (!visibleData && !error)));
  const { upcoming, unscheduled } = selectSchedule(visibleData?.orders ?? [], period, now, undefined, userProfile?.timezone);
  const entry = (order: WorkOrder, at?: string) => (
    <Link key={`${order.id}-${at || "unscheduled"}`} to={`/work-orders/${encodeURIComponent(order.id!)}`} className="block min-w-0 rounded-lg border border-gray-200 p-4 text-sm font-light leading-relaxed transition-colors hover:bg-orange-50 focus-visible:outline-orange-500 [overflow-wrap:anywhere]">
      <span className="text-xs font-normal uppercase tracking-wider text-orange-700">{order.woNumber || 'Work order'}</span>
      <p className="mt-1">{at ? formatSchedule(at, userProfile?.timezone) : 'Unscheduled'}</p>
      <p className="text-[10px] font-normal uppercase tracking-wider text-gray-500">{order.status.replace(/-/g, ' ')}</p>
      {order.customerName && <p className="mt-1">Client: {order.customerName}</p>}
      {order.serviceAddress && <p className="text-gray-600">Location: {order.serviceAddress}</p>}
    </Link>
  );

  return (
    <section className="flex max-h-[40rem] min-w-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm xl:absolute xl:inset-0 xl:max-h-none" aria-label="Schedule">
      <div className="relative flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-gray-200 bg-white pl-7 pr-4 py-2 sm:pl-8 sm:pr-6"><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-[linear-gradient(to_right,#f97316_0px,#f97316_10px,#ffffff_10px,#ffffff_12px,#f97316_12px,#f97316_14px,#ffffff_14px)] rounded-tl-xl" />
        <h2 className="min-w-0 text-sm font-light uppercase tracking-wider text-black">Schedule</h2>
        <div className="ml-auto w-36" role="group" aria-label="Schedule period">
          <Dropdown color="orange" value={period} onChange={value => { if (value) setPeriod(value as Period); }} options={(['daily', 'weekly', 'monthly'] as const).map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm font-light leading-relaxed sm:p-6" tabIndex={0} role="region" aria-label="Schedule items">
      <p className="mt-2 text-sm text-gray-600">{calendarPeriod(period, now, userProfile?.timezone).label}</p>
      <p className="mt-1 text-xs text-gray-500">Upcoming starts only; date-only schedules include today.</p>
      {busy ? <p role="status" className="mt-4 text-sm">Loading work orders…</p>
        : !permitted ? <p className="mt-4 text-sm text-gray-600">Work orders are unavailable for this account.</p>
        : error ? <div className="mt-4"><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 text-sm font-medium text-orange-700">Try again</button></div>
        : <div className="mt-4 space-y-3">
          {!!unscheduled.length && <p role="status" className="text-sm text-gray-600">Some open work orders have no active appointment. Add appointments in Work Orders to include them in this range.</p>}
          {upcoming.map(({ order, at }) => entry(order, at))}
          {!visibleData?.orders.length && <p className="text-sm text-gray-600">No work orders found.</p>}
          {!!visibleData?.orders.length && !unscheduled.length && !upcoming.length && <p className="text-sm text-gray-600">No upcoming appointments in this range.</p>}
          {!!unscheduled.length && <details><summary className="cursor-pointer text-xs font-normal uppercase tracking-wider text-gray-900">Unscheduled open work orders ({unscheduled.length})</summary><div className="mt-3 space-y-3">{unscheduled.map(order => entry(order))}</div></details>}
        </div>}
      </div>
    </section>
  );
}
