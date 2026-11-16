# Database Management: Releases tab (future plan)

Status: design only. No endpoints, tables, credentials, Railway integration, or deployment actions are enabled.
Keep the current database browser as a Tables tab; add a platform-administrator-only Releases tab.
Company administrators must not gain platform release privileges.

## Layout and flow

1. Overview: web/API repository, production branch alpha, verified deployment SHA, and connection status.
   Show unknown when deployment state cannot be verified; branch head is not proof of deployment.
2. Changes: task branches and PRs grouped by page/area, requested behavior, source/base branch,
   latest SHA, diff link, real check results, and paired web/API release dependency.
3. Review: feature acceptance evidence, local manual results, data-preservation/security checks,
   migration and recovery notes. Keep blocked, failed, pending, and passed distinct.
4. Approve: show exact target repository/branch and tested SHAs; require fresh administrative
   authentication and explicit release confirmation. Initially link to GitHub for the final merge.
5. History: who approved which SHAs, when, result, deployment status, and recovery reference.

## Authorization and integration boundaries

Reuse the server-side platform-administrator permission boundary already used by database management.
A hidden tab or client-side role check is insufficient. Require recent reauthentication for mutations;
never store admin passwords. Reject expired approval, changed head/base SHA, failed or missing required
checks, unauthorized repositories/branches, and duplicate submissions. Use CSRF protections appropriate
to session authentication and rate limits. An app approval never bypasses GitHub protections.
Keep GitHub credentials server-side, least-privileged, with no permission to bypass rulesets.
Start read-only; adding merge/deploy capabilities requires a separate implementation request.
Do not couple release controls to arbitrary SQL execution or expose auth tables through the table browser.

## Proposed persistence

Use dedicated migrations when implementation is requested:
- release_candidates: ID, environment, state, creator, timestamps.
- release_components: candidate ID, allowlisted repository, PR number, base/head/tested SHAs.
- release_verifications: component, feature criterion, check type, outcome, evidence reference, tested SHA.
- release_approvals: candidate, actor, approval time/expiry, approved SHA set, invalidation reason.
- release_events: append-only actor/action/target/result/time audit records; redact secrets.

Use foreign keys and transactions; record attempts and verified results separately. Protect audit history
from ordinary edits and define retention. Verify signed webhooks and deduplicate event deliveries if added.
Do not store tokens, passwords, raw sensitive logs, or customer test data as evidence.

## Implementation acceptance criteria

Test direct API access by unauthenticated, company-admin, and platform-admin users; stale approval,
head changes during approval, failed/missing checks, CSRF, retries, audit persistence, and secret redaction.
Use disposable fixtures and confirm existing table-browser authorization is preserved.
Railway staging and automated deployment controls remain out of scope until explicitly requested.
