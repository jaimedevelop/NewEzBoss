import type { WorkOrder } from '../../../../services/workOrders/workOrders.types';
import { isUpcoming, parseSchedule, type Period } from './period';
// Audited: WorkOrder and work_orders have no scheduling field. Never substitute
// createdAt, project.startDate, payment due dates, or observed clock-ins.
export const workOrderSchedule = (): string | null => null;
export function selectSchedule(orders: WorkOrder[], period: Period, now: Date, schedule: (order: WorkOrder) => string | null = workOrderSchedule, timezone?: string) {
  const eligible = orders.filter(order => order.id && !['completed', 'cancelled'].includes(order.status));
  const upcoming = eligible.flatMap(order => {
    const at = schedule(order);
    return at && isUpcoming(at, period, now, timezone) ? [{ order, at }] : [];
  }).sort((a,b) => parseSchedule(a.at)!.getTime() - parseSchedule(b.at)!.getTime() || a.order.woNumber.localeCompare(b.order.woNumber));
  return { upcoming, unscheduled: eligible.filter(order => !schedule(order) || !parseSchedule(schedule(order)!)) };
}
