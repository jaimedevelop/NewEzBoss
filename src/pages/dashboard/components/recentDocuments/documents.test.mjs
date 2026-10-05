import assert from 'node:assert/strict';
import test from 'node:test';

// Bundle documents.ts to a temporary ESM file with the installed esbuild,
// then set RECENT_DOCUMENTS_MODULE to that file for node --test.
const { calendarDate, periodBounds, selectDocuments, invoiceBalance, formatDate, money, address } = await import(process.env.RECENT_DOCUMENTS_MODULE);
const now = new Date('2026-10-05T16:00:00Z');
const zone = 'America/New_York';
const row = (id, values = {}) => ({ id, estimateState: 'estimate', clientState: 'sent', sentDate: '2026-10-05T12:00:00Z', ...values });

test('rolling ranges include today across calendar boundaries', () => {
  assert.deepEqual(periodBounds('Last 7 days', now, zone), ['2026-09-29', '2026-10-06']);
  assert.deepEqual(periodBounds('Last 30 days', now, zone), ['2026-09-06', '2026-10-06']);
  assert.deepEqual(periodBounds('Last 90 days', now, zone), ['2026-07-08', '2026-10-06']);
  assert.deepEqual(periodBounds('Last 7 days', new Date('2026-10-05T02:00:00Z'), zone), ['2026-09-28', '2026-10-05']);
  assert.deepEqual(periodBounds('Last 7 days', new Date('2026-11-01T16:00:00Z'), zone), ['2026-10-26', '2026-11-02']);
});

test('date-only values never shift, invalid dates stay unavailable', () => {
  assert.equal(calendarDate('2026-10-05', 'Pacific/Honolulu'), '2026-10-05');
  assert.equal(formatDate('2026-10-05', zone), 'Oct 5, 2026');
  assert.equal(formatDate('2026-02-30', zone), 'Unavailable');
  assert.equal(calendarDate('bad', zone), null);
});

test('filter estimates by exact document and client states before sorting and limiting', () => {
  const rows = [row(10, { estimateState: 'invoice' }), row(11, { estimateState: 'draft' }), row(12, { estimateState: 'change-order' }), row(13, { clientState: 'viewed' }),
    ...Array.from({ length: 7 }, (_, index) => row(index + 1, { clientState: index === 0 ? 'accepted' : index === 1 ? 'denied' : 'sent', sentDate: `2026-10-05T${String(index + 10).padStart(2, '0')}:00:00Z` }))];
  const selected = selectDocuments(rows, 'estimates', 'Last 7 days', now, zone);
  assert.deepEqual(selected.documents.map(value => value.id), [7, 6, 5, 4, 13]);
  assert.equal(rows.find(value => value.id === 1).clientState, 'accepted');
});

test('inclusive start and exclusive end use company calendar dates', () => {
  const selected = selectDocuments([row(1, { sentDate: '2026-09-29T04:00:00Z' }), row(2, { sentDate: '2026-10-06T03:59:59Z' }), row(3, { sentDate: '2026-10-06T04:00:00Z' })], 'estimates', 'Last 7 days', now, zone);
  assert.deepEqual(selected.documents.map(value => value.id), [2, 1]);
});

test('missing sent dates are reported, never replaced with creation or issuance dates', () => {
  const selected = selectDocuments([row(1, { sentDate: undefined, createdAt: now.toISOString() })], 'estimates', 'Last 7 days', now, zone);
  assert.equal(selected.unavailable, 1);
  assert.equal(selected.documents.length, 0);
  assert.equal(selectDocuments([row(2, { estimateState: 'invoice', sentDate: undefined, clientState: null, invoiceIssuedAt: now.toISOString() })], 'invoices', 'Last 7 days', now, zone).unsent, 1);
});

test('linked invoice appears once and uses the source ledger with approved payments only', () => {
  const source = row(1, { issuedInvoiceId: 2, payments: [{ amount: 20.25, status: 'approved' }, { amount: 50, status: 'pending' }, { amount: 50, status: 'rejected' }] });
  const invoice = row(2, { estimateState: 'invoice', sourceEstimateId: 1, total: '100.50', payments: [] });
  assert.deepEqual(selectDocuments([source, invoice, invoice], 'invoices', 'Last 7 days', now, zone).documents.map(value => value.id), [2]);
  assert.equal(invoiceBalance(invoice, [source, invoice]), 80.25);
  assert.equal(invoiceBalance({ ...invoice, total: 20.25 }, [source]), 0);
});

test('unknown ledger and totals never become zero, while explicit empty ledger is valid', () => {
  assert.equal(invoiceBalance({ id: 1, total: 100 }, []), null);
  assert.equal(invoiceBalance({ id: 1, payments: [] }, []), null);
  assert.equal(invoiceBalance({ id: 1, total: 100, sourceEstimateId: 2, payments: [] }, []), null);
  assert.equal(invoiceBalance({ id: 1, total: 100, payments: [{ amount: 50, status: undefined }] }, []), null);
  assert.equal(invoiceBalance({ id: 1, total: 100, payments: [] }, []), 100);
  assert.equal(money(80.25), '$80.25');
  assert.equal(address([]), 'Unavailable');
});
