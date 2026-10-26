# Monday October 26 — morning block

Owner/product acceptance: Joaquin. Operator: Codex. Timezone: America/New_York.
Source plan: workspace `docs/NOVEMBER_2026_DAILY_DEVELOPMENT_PLAN.md`.
Actual elapsed/human hours were not timed; do not record the planned 150 minutes as worked.

## Acceptance and runnable increment

Version 1 in `matrix.json` freezes 24 workflow groups, 72 case definitions and 279
assigned client cases (three per applicable workflow/client). Each group has a
success, recovery and authorization case. These are an inventory, not executed
functional tests. Every case is currently unaccepted. API behavior needs separate
evidence for each of the 72 definitions; do not infer API acceptance from clients.
No weighted P0 percentage is claimed; subcases/weights must be expanded visibly
before using the November weighted milestones.

Run from `NewEzBoss`:

```sh
node scripts/launch-audit.mjs
node scripts/launch-audit.mjs --json > /tmp/ezboss-launch-inventory.json
npm run build
```

The first command validates assignments, case categories and coverage of top-level
feature routes. JSON output includes exact routes and API mounts plus the matrix.
This is a runnable planning/coverage increment, not a newly delivered customer feature.
The scanner covers App.tsx and the estimate/project/work-order nested route files;
it is a source inventory, not runtime route discovery or endpoint-method coverage.

## Frozen platform assignments

| Surface | Launch assignment |
|---|---|
| Desktop web | Core authoring and management, all included business workflows |
| iOS and Android | Native core authoring, inventory, collections/AI, purchasing, people/settings, projects, legacy finance, work orders/photos, SaaS entitlement visibility and push |
| Mobile web | Login, dashboard, document list/detail, customer approval and payment remain usable in browser; authoring/business management prompts to matching app screen |
| Native external-browser exceptions | Proposed: public customer link/checkout, provider onboarding, public/legal pages. Exact exceptions await Joaquin; do not reinterpret all native payments/account UI as browser-only |
| Operations | Desktop authorized admin surface; no native or mobile-web admin implementation required |

`web` means browser implementation; `native` means app UI; `handoff` is a proposed
native-to-browser round trip; `app-handoff` is confirmed mobile-web-to-app routing.
Assignments describe target behavior, not current availability. No existing working
mobile-web feature needs removal to introduce an app prompt.

A handoff only passes when it opens the same company/document/task, authenticates
without putting bearer tokens into URLs, handles cancel/expiry/offline and returns
to the origin with authoritative refreshed state. App prompts need installed-app
routing, safe install guidance and a usable browser fallback when the app is absent.
A generic store link or app home screen is insufficient. Customer guest flows stay
usable without an app install. Provider callbacks never establish payment success;
refresh server state. Test return, logout and wrong-company cases separately.

## Confirmed product scope, October 26

Joaquin confirmed paid SaaS subscriptions on day one, projects and legacy
bank/budget/calendar in scope, native core on iOS/Android, and the mobile-web scope
above. Joaquin also confirmed OS push for job assignments and estimate/customer
updates. Earlier proposed SaaS/push exclusions are rejected.

SaaS is separate from customer invoice collection and the already approved
September 18 card-fee policy in workspace `docs/RELEASE_DECISIONS.md`. Required
SaaS work: plans/prices, account/company entitlement owner, sandbox activation,
renewal, cancellation, failed payment/grace behavior, webhook reconciliation,
server entitlement enforcement and cross-client refresh. Joaquin must select
commercial terms and purchase surfaces. Verify applicable distribution/payment
requirements during implementation before selecting native purchase mechanics.
Do not assume Stripe Connect invoice payments implement SaaS billing.

Push requires APNs/FCM configuration, secure per-user/device registration and
revocation, permission-denial recovery, token rotation, event delivery/deduplication,
minimal lock-screen content and a deep link checked against current authorization.
In-app notification preferences are not proof of OS delivery. No device acceptance
or provider setup is claimed.

Keep projects and bank/budget/calendar; estimate repair and migration, reconcile
legacy records and enforce tenant access. Never hide or drop these to fit the date.
Project selection remains governed by migration readiness from prior release decisions.

## Approved-document policy decision — pending Joaquin

Current `ezboss-api/src/routes/estimates.ts` PATCH explicitly permits sent/accepted
corrections in place and contains a revision-aware reapproval TODO. The September
20 `docs/ESTIMATE_REVISIONS_HANDOFF.md` is analysis/recommendation, not completed
immutable versioning. Activity-log revision numbers are not accepted document versions.

Recommended policy: explicit staged Save Revision; first exposure creates immutable
baseline; material financial/scope/quantity/terms/schedule changes require approval
bound to that version (including decreases and same-total substitutions). Minor
noncommercial corrections preserve approval provenance and may be escalated to
reapproval. Keep prior approval and ledger; pending material changes must not become
collectible automatically. Started work requires a change order for material changes;
never replace work-order snapshots/tasks silently. Issued invoice corrections need
an explicit adjustment/reissue policy preserving payment/refund allocations and
history. Apply server rules to every mutation and both customer decision paths;
reject stale edits/decisions. This remains a release gate, not an implemented lock.

## Source evidence and gaps

- Web: `src/App.tsx` plus nested routes declare 45 route entries. Inventory includes
  public landing/auth/customer and protected dashboard, documents, inventory,
  collections/AI, purchasing, work orders, people/access, settings, projects, finance
  and database management. Route presence proves neither persistence nor permissions.
- API: sibling `ezboss-api/src/index.ts` mounts 33 routers, including identity,
  documents/customer portals, Connect/webhooks, stock, purchasing, jobs/tasks,
  people, private files, projects and finance records. See audit JSON for exact list.
- Android: canonical candidate is sibling `EzBoss-Android`, whose MainActivity has
  dashboard/list/detail screens and six placeholder destinations. Existing Auth0 and
  secure credentials code needs fresh build/device evidence. Its state file has
  unrelated pre-existing edits and was preserved. Root `app/` is a separate older
  sign-in/landing shell; do not accidentally report its build as the richer app.
- iOS: no Swift/Xcode project found in workspace inventory. PM must locate any
  external project or bootstrap the smallest project, without claiming it exists.
- Legacy finance includes Firestore imports; collections AI settings migration is
  still a named launch dependency. Reconcile source storage before declaring cutover.

## Dependency register

All owners below are Joaquin for external action/product acceptance; Codex can
implement/configure only with available authorized access. Status is unverified,
not assumed missing.

| Dependency | Next action / evidence |
|---|---|
| Staging API/web, DB, Redis, object storage | Confirm nonsecret origins and isolated fixtures; health/read/write evidence |
| Android canonical project, JDK/SDK/wrapper/device | Build `EzBoss-Android`; record artifact, JDK/SDK and install result |
| iOS source, Xcode, device | Locate/create project; record simulator build and real-device access |
| Auth0 per native client + staging audience | Confirm PKCE callbacks/logout/refresh and `/users/me` identity |
| Apple/Google accounts, signing and distribution | Inventory owner, access and provisioning; record unresolved request |
| SaaS commercial terms/provider setup | Choose plan/prices, entitlement/grace and native purchase surfaces |
| APNs/FCM | Confirm provider account access, keys/config and sandbox devices |
| Stripe/PayPal sandbox and Connect | Confirm enabled launch provider paths, controlled checkout and webhook evidence |
| Mailgun/DNS/controlled inbox | Confirm send credentials/DNS and actual controlled delivery |
| Private storage/legacy Firebase + migration backups | Confirm scoped reads, restore fixture and reconciled cutover |
| Legal/support/deletion URLs and retention | Select policy owner and versioned acceptance/owner-transfer rules |
| Devices/browser versions/test accounts | Select real iPhone/Android, Safari/Chrome and owner/employee/customer fixtures |
| Document and external-browser exceptions | Joaquin approves recorded defaults or supplies replacement before implementation |

No external requests or messages were sent during this block.

## Checks, handoff and exact afternoon target

Morning focused checks: audit coverage PASS; syntax check PASS; web production
build PASS (existing large-chunk/mixed-import and stale Browserslist warnings).
No API/native/device checks ran in this morning block. Previous October 25 type/test
counts remain historical, not fresh results. No secrets or customer links in evidence.

PM 4:30–7:00 p.m. America/New_York:

1. 10 min: inspect this matrix and resolve remaining document/handoff decisions;
   confirm `EzBoss-Android` as build target and locate iOS source.
2. 80 min: run fresh web build/type check; API type and configured TS suite plus
   separately inventory/run `.cjs` tests; reproduce Android assemble/unit tests.
   Locate or create minimal iOS shell and run simulator build. Record every failure,
   skip and toolchain blocker with exact command and log location, excluding secrets.
3. 45 min: inventory signing/Auth0/provider/device access and assign next actions;
   attempt owner login → `/users/me` → seeded estimate list/detail → logout on each
   available client. API/source mocks never count as live identity or device evidence.
4. 15 min: publish four build statuses, failure classifications, artifact/source IDs,
   accepted/attempted/planned counts and Tuesday's smallest failing target.

PM exit: web/API/Android/iOS each have a fresh success/failure/blocked status with
evidence; external dependencies have owner/action; one seeded owner/document smoke
fixture is selected for cross-client proof. If toolchain/access blocks for 20 minutes,
record it and use the remaining time for reproducible checks and fixture preparation.
SaaS/push adds dependency risk: estimate their work before retaining the original
November forecast; no unmeasured claim that the schedule still fits.

Result: runnable audit and source inventory complete; platform scope recorded;
policy approval and end-to-end behavior acceptance remain open. No commit was made
in this block; this handoff lives in the web repository, since workspace `docs/`
is outside any Git repository. Commit only the three launch files after final review.
