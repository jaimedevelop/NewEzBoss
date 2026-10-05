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
    <Link key={`${order.id}-${at || "unscheduled"}`} to={`/work-orders/${encodeURIComponent(order.id!)}`} className="block min-w-0 rounded-lg border border-gray-200 p-3 text-sm transition-colors hover:bg-gray-50 focus-visible:outline-orange-500 [overflow-wrap:anywhere]">
      <span className="font-semibold text-gray-900">{order.woNumber || 'Work order'}</span>
      <p className="mt-1">{at ? formatSchedule(at, userProfile?.timezone) : 'Unscheduled'}</p>
      <p className="capitalize text-gray-600">{order.status.replace(/-/g, ' ')}</p>
      {order.customerName && <p className="mt-1">Client: {order.customerName}</p>}
      {order.serviceAddress && <p className="text-gray-600">Location: {order.serviceAddress}</p>}
    </Link>
  );

  return (
    <section className="flex max-h-[40rem] min-w-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm xl:absolute xl:inset-0 xl:max-h-none" aria-label="Schedule">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-orange-500 bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 sm:px-6">
        <h2 className="min-w-0 text-base font-semibold text-white">Schedule</h2>
        <div className="ml-auto w-36" role="group" aria-label="Schedule period">
          <Dropdown color="orange" value={period} onChange={value => { if (value) setPeriod(value as Period); }} options={(['daily', 'weekly', 'monthly'] as const).map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6" tabIndex={0} role="region" aria-label="Schedule items">
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
          {!!unscheduled.length && <details><summary className="cursor-pointer text-sm font-medium text-gray-900">Unscheduled open work orders ({unscheduled.length})</summary><div className="mt-3 space-y-3">{unscheduled.map(order => entry(order))}</div></details>}
        </div>}
      </div>
    </section>
  );
}
