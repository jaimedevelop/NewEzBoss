import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TimelineSection from '../src/pages/estimates/components/estimateDashboard/timelineTab/TimelineSection';

const base = { createdAt: '2026-09-29T12:00:00Z', sentDate: '2026-09-30T12:00:00Z', viewedDate: '2026-09-30T13:00:00Z', status: 'sent' };
function render(fields: Partial<React.ComponentProps<typeof TimelineSection>['estimate']>) {
  return renderToStaticMarkup(<TimelineSection estimate={{ ...base, ...fields }} />);
}

test('client acceptance overrides legacy status and measures time to the decision', () => {
  const html = render({ clientState: 'accepted', acceptedDate: '2026-10-01T12:00:00Z' });
  assert.match(html, />Accepted</);
  assert.match(html, /Oct 1, 2026/);
  assert.match(html, /24 hours/);
  assert.doesNotMatch(html, /Awaiting Response/);
});
test('client rejection uses deniedDate', () => {
  const html = render({ clientState: 'denied', deniedDate: '2026-10-02T12:00:00Z' });
  assert.match(html, />Rejected</);
  assert.match(html, /Oct 2, 2026/);
  assert.match(html, /48 hours/);
  assert.doesNotMatch(html, /Awaiting Response/);
});
test('legacy decisions still display and missing dates do not imply pending action', () => {
  assert.match(render({ status: 'rejected', rejectedDate: '2026-10-01T12:00:00Z' }), /Oct 1, 2026/);
  assert.match(render({ clientApprovalStatus: 'approved', clientApprovalDate: '2026-10-01T12:00:00Z' }), />Accepted</);
  assert.doesNotMatch(render({ clientState: 'accepted' }), /Pending customer action|Awaiting Response/);
});
test('clients still awaiting a decision remain pending even after viewing', () => {
  const html = render({ clientState: 'viewed' });
  assert.match(html, /Awaiting Response/);
  assert.match(html, /Pending customer action/);
  assert.match(html, />Pending</);
  assert.doesNotMatch(render({ clientState: 'on-hold', status: 'accepted' }), />Accepted</);
});

test('contractor manual decisions display their own timestamp and retain prior status changes', () => {
  const html = render({ clientState: 'accepted', acceptedDate: '2026-10-05T12:00:00Z', revisionsHistory: [
    { changeType: 'status_changed', date: '2026-10-04T12:00:00Z', changes: 'Contractor manually set status to On Hold', details: { field: 'clientState' } },
    { changeType: 'status_changed', date: '2026-10-05T12:00:00Z', changes: 'Contractor manually set status to Accepted', details: { field: 'clientState' } },
  ] });
  assert.match(html, /Contractor manually set status to Accepted/);
  assert.match(html, /Contractor manually set status to On Hold/);
  assert.match(html, /Oct 5, 2026/);
  assert.match(html, /Oct 4, 2026/);
  assert.doesNotMatch(html, /Awaiting Response/);
});

test('job completion displays its recorded timestamp and unfinished jobs remain pending', () => {
  const completed = render({ jobCompletedAt: '2026-10-20T12:00:00Z' });
  assert.match(completed, /Job Completed/);
  assert.match(completed, /Oct 20, 2026/);
  assert.doesNotMatch(completed, /Pending work order task completion/);
  assert.match(render({}), /Pending work order task completion/);
});

test('invoice timeline omits estimate decisions and expiration inherited from its source', () => {
  const html = render({ estimateState: 'invoice', clientState: 'accepted', acceptedDate: '2026-10-01T12:00:00Z', validUntil: '2026-11-01', revisionsHistory: [
    { changeType: 'status_changed', changes: 'Estimate accepted', date: '2026-10-01', details: { field: 'clientState' } },
  ] });
  assert.match(html, /milestones for this invoice/);
  assert.match(html, /Sent to Customer|Viewed by Customer|Job Completed/);
  assert.doesNotMatch(html, /Accepted|Estimate accepted|Awaiting Response|Response Time|Valid Until|days remaining/);
  assert.doesNotMatch(render({ estimateState: 'invoice' }), /Awaiting Response|Response Time/);
});
test('change order timeline keeps decision and validity information with the correct label', () => {
  const html = render({ estimateState: 'change-order', validUntil: '2026-11-01' });
  assert.match(html, /milestones for this change order/);
  assert.match(html, /Awaiting Response|Valid Until/);
});
