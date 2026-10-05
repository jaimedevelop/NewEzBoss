import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
    <Link key={order.id} to={`/work-orders/${encodeURIComponent(order.id!)}`} className="block min-w-0 rounded-lg border border-gray-200 p-3 text-sm transition-colors hover:bg-gray-50 focus-visible:outline-orange-500 [overflow-wrap:anywhere]">
      <span className="font-semibold text-gray-900">{order.woNumber || 'Work order'}</span>
      <p className="mt-1">{at ? formatSchedule(at, userProfile?.timezone) : 'Unscheduled'}</p>
      <p className="capitalize text-gray-600">{order.status.replace(/-/g, ' ')}</p>
      {order.customerName && <p className="mt-1">Client: {order.customerName}</p>}
      {order.serviceAddress && <p className="text-gray-600">Location: {order.serviceAddress}</p>}
    </Link>
  );

  return (
    <section className="h-full min-w-0 rounded-xl border border-gray-100 bg-white p-5 shadow-sm" aria-label="Schedule / Work Orders">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="min-w-0 text-xl font-semibold text-gray-900">Schedule / Work Orders</h2>
        <select aria-label="Schedule period" value={period} onChange={event => setPeriod(event.target.value as Period)} className="ml-auto rounded-lg border border-gray-300 p-2 text-sm">
          {(['daily', 'weekly', 'monthly'] as const).map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
        </select>
      </div>
      <p className="mt-2 text-sm text-gray-600">{calendarPeriod(period, now, userProfile?.timezone).label}</p>
      <p className="mt-1 text-xs text-gray-500">Upcoming starts only; date-only schedules include today.</p>
      {busy ? <p role="status" className="mt-4 text-sm">Loading work orders…</p>
        : !permitted ? <p className="mt-4 text-sm text-gray-600">Work orders are unavailable for this account.</p>
        : error ? <div className="mt-4"><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 text-sm font-medium text-orange-700">Try again</button></div>
        : <div className="mt-4 space-y-3">
          <p role="status" className="text-sm text-gray-600">Scheduling data is unavailable. Work orders do not currently provide a scheduled date or start time. Unscheduled orders are excluded from this range.</p>
          {upcoming.map(({ order, at }) => entry(order, at))}
          {!visibleData?.orders.length && <p className="text-sm text-gray-600">No work orders found.</p>}
          {!!visibleData?.orders.length && !unscheduled.length && !upcoming.length && <p className="text-sm text-gray-600">No open work orders available to schedule.</p>}
          {!!unscheduled.length && <details><summary className="cursor-pointer text-sm font-medium text-gray-900">Unscheduled open work orders ({unscheduled.length})</summary><div className="mt-3 max-h-96 space-y-3 overflow-y-auto">{unscheduled.map(order => entry(order))}</div></details>}
        </div>}
    </section>
  );
}
