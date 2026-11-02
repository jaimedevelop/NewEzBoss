import test from 'node:test';import assert from 'node:assert/strict';
import {calendarDay,calendarMonthRange,financeDate,paymentIsOverdue} from '../src/services/finances/financeApi';
test('date-only payments stay on their calendar day and become overdue after that day in company zone',()=>{
 const now=new Date('2026-11-02T17:00:00Z');
 assert.equal(paymentIsOverdue('2026-11-02',now,'America/New_York'),false);
 assert.equal(paymentIsOverdue('2026-11-01',now,'America/New_York'),true);
 assert.equal(calendarDay(new Date('2026-11-02T02:00:00Z'),'America/New_York'),'2026-11-01');
 assert.equal(paymentIsOverdue('2026-11-01',new Date('2026-11-02T02:00:00Z'),'America/New_York'),false);
 assert.equal(paymentIsOverdue('2026-11-01T04:30:00Z',new Date('2026-11-01T06:30:00Z'),'America/New_York'),true);
 assert.equal(financeDate('2026-11-02').getDate(),2);
 assert.deepEqual(calendarMonthRange(2026,10),{from:'2026-10-31',to:'2026-12-01'});
});
