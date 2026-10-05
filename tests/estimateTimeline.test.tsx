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
