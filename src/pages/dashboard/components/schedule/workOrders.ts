import type { WorkOrder } from '../../../../services/workOrders/workOrders.types';
import { isUpcoming, parseSchedule, type Period } from './period';
// Use explicit appointments only; creation timestamps and attendance are unrelated.
const appointmentStarts = (order: WorkOrder): string[] => (order.appointments ?? [])
  .filter(a => a.status === 'scheduled')
  .map(a => a.startTime ? a.startAt || '' : a.scheduledDate)
  .filter(at => !!parseSchedule(at));
export const workOrderSchedule = (order?: WorkOrder): string | null => order ? appointmentStarts(order).sort()[0] ?? null : null;
export function selectSchedule(orders: WorkOrder[], period: Period, now: Date, schedule: (order: WorkOrder) => string | null = workOrderSchedule, timezone?: string) {
  const eligible = orders.filter(order => order.id && !['completed', 'cancelled'].includes(order.status));
  const upcoming = eligible.flatMap(order => {
    const starts = schedule === workOrderSchedule ? appointmentStarts(order) : [schedule(order)].filter((at): at is string => !!at);
    return starts.filter(at => isUpcoming(at, period, now, timezone)).map(at => ({ order, at }));
  }).sort((a,b) => parseSchedule(a.at)!.getTime() - parseSchedule(b.at)!.getTime() || a.order.woNumber.localeCompare(b.order.woNumber));
  return { upcoming, unscheduled: eligible.filter(order => !schedule(order) || !parseSchedule(schedule(order)!)) };
}
