# Dashboard integration and evidence audit

Dashboard.tsx mounts DashboardSchedule in the right-third grid cell with min-width: 0, stacking on small screens, and DashboardPersonnel across the full row below the main grid. The TodaysSchedule import/render has been replaced; neither new component imports its examples. TodaysSchedule.tsx remains untouched.

ezboss-api/src/index.ts registers ezboss-api/src/routes/dashboardPersonnel.ts at /dashboard-personnel. The router authenticates independently and requires read:employees and read:work-orders. No new permission or migration is needed to read the roster.

Calendar periods use browser local time, Monday–Sunday weeks, and an exclusive next-period boundary. Personnel roster membership spans all dates; all period metrics remain unavailable under the present schema.

Audited workOrders.types.ts, workOrders.queries.ts, WorkOrders.tsx, WorkersTab.tsx, workerAttendance.ts, employeeTasks.ts and migrations 042/043/045: no canonical work-order schedule exists. Project startDate and payment schedule dueDate are different concepts. Work-order identifiers, client, address and status are available; no work-order title exists.

Required product/schema decisions:
- Define persisted work-order date-only versus timed starts and timezone semantics. Then adapt workOrderSchedule; filtering already handles today-inclusive dates and starts >= now.
- Define worker expected shifts/workdays, shift start/timezone, eligibility cutoffs and attendance rules. worker_workdays is inserted on clock-in and cannot prove expected attendance or absence.
- Persist explicit excused/no-call/no-show decisions or adopt an authoritative documented classification rule.
- Persist dated worker task assignments/history (and period eligibility rules). assignedTaskIds is a mutable current snapshot; completedBy identifies the first completion assignment, but completedAt alone cannot supply the period assignment denominator.
- Add a verified person identity for email-only invites if cross-work-order deduplication is wanted. Employee primary keys deduplicate reliably; matching names or unverified emails do not.

All unsupported metrics and the dependent provisional index are null, displayed as — with accessible denominator help. percentage and provisionalIndex helpers are tested but deliberately not called on unsupported observations. No historical records or attendance workflows were added.

Tests: from workspace root, ezboss-api/node_modules/.bin/tsx --test ezboss-api/tests/dashboardPersonnel.test.ts NewEzBoss/src/pages/dashboard/components/schedule/schedule.test.ts
