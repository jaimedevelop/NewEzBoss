import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarPeriod, isUpcoming, parseSchedule } from './period';
import { selectSchedule, workOrderSchedule } from './workOrders';
import type { WorkOrder } from '../../../../services/workOrders/workOrders.types';
const now = new Date(2026,9,5,12);
test('date-only today is upcoming; past timed starts excluded; now included', () => {
 assert(isUpcoming('2026-10-05','daily',now));
 assert(!isUpcoming(new Date(2026,9,5,11).toISOString(),'daily',now));
 assert(isUpcoming(now.toISOString(),'daily',now));
 assert(!isUpcoming('2026-10-04','weekly',now));
 assert(!isUpcoming('2026-10-06','daily',now));
 assert.equal(parseSchedule('2026-02-30'),null);
});
test('calendar boundaries use Monday weeks and exclusive next-period start', () => {
 const week=calendarPeriod('weekly',now); assert.equal(week.start,'2026-10-05'); assert.equal(week.end,'2026-10-12');
 assert(isUpcoming('2026-10-10','weekly',now)); assert(!isUpcoming('2026-10-12','weekly',now));
 assert(isUpcoming('2026-10-31','monthly',now)); assert(!isUpcoming('2026-11-01','monthly',now));
 assert.equal(calendarPeriod('monthly',new Date(2026,11,31)).end,'2027-01-01');
 const dst=calendarPeriod('weekly',new Date(2026,2,8,12)); assert.equal(dst.end,'2026-03-09');
});
test('real work orders are unscheduled; selection excludes closed orders and sorts explicit starts', () => {
 const orders = ['pending','completed','cancelled','in-progress'].map((status,i)=>({id:String(i),woNumber:`WO-${i}`,status,createdAt:now.toISOString()} as WorkOrder));
 assert.equal(workOrderSchedule(),null);
 assert.deepEqual(selectSchedule(orders,'weekly',now).unscheduled.map(o=>o.id),['0','3']);
 const result=selectSchedule(orders,'weekly',now,o=>o.id==='0'?'2026-10-07':'2026-10-06');
 assert.deepEqual(result.upcoming.map(r=>r.order.id),['3','0']);
 assert.equal(result.unscheduled.length,0);
});
