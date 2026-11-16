# EasyBoss branch and release guidelines

## Branch names

Use `<type>/<page-or-area>/<feature-description>` in lowercase kebab-case.
Types: `feature`, `fix`, `hotfix`, `refactor`, `docs`, `test`, `chore`.
Identify the page first, then describe the requested behavior:

- `feature/estimates/add-client-filter`
- `fix/invoices/preserve-payment-history`
- `feature/database-management/release-management-tab`
- `fix/authentication/expire-reset-links`
- `chore/release-management/add-production-protection`

Use the same branch name in web and API when a task spans both repositories.
Use an area such as authentication, shared, or release-management when there is no single page.
Existing long-lived branches are exempt from this naming convention.

## Branch roles and moving between devices

`alpha` is the intended production branch (case-sensitive). Never push task work directly to it.
`BetterAuth2` holds the unfinished authentication migration. Branch authentication-dependent work
from its latest remote head; open task PRs back into BetterAuth2. Do not merge it into alpha
until the entire migration is ready. Unrelated production fixes start from alpha and target alpha.
Do not create or repoint an API alpha branch until its current Railway source branch is verified;
protect the actual current production branch during that transition too.

Before switching devices, commit and push the task branch. On the other device, fetch, switch
to the same branch, and pull with `--ff-only` before editing. Commit or stash local changes first.
A task-branch push saves work; it is not release approval. Railway staging is deferred.
Verify Railway only deploys approved production branches before relying on this separation.

## Scope and evidence

Implement only behavior required by the task prompt and the changes necessary to support it.
Avoid unrelated features, cleanup, migrations, or security systems. If a relevant flaw is found,
report it and address it within authorized scope rather than silently expanding the task.
For every requested behavior, record its acceptance criteria and verification evidence in the PR.
Run existing relevant tests and add meaningful tests where behavior or risk warrants them:

- Persistence changes: save/reload, update without dropping unrelated fields, transaction failure,
  and preservation of existing records. Use disposable local test data, never production data.
- Access changes: unauthenticated denial, unauthorized-role denial, and cross-company denial.
- Input changes: malformed input, validation, and relevant injection or unsafe-file cases.
- Migrations: test against a disposable database with representative existing data; record recovery.
- UI-only changes: inspect the affected behavior and build when dependencies are available.

Record exact commands and outcomes, including skipped or blocked tests. Passing tests do not prove
absence of all data-loss or security defects. Do not claim coverage that was not exercised.
Require the applicable build and feature-test status checks once real workflow jobs exist and have
successfully run. Do not configure nonexistent required check names or a checkbox-only test gate.

## Solo release approval

All production changes go through a PR. No second-person review is required.
Before manually merging, inspect the diff, feature-test evidence, latest commit, environment changes,
web/API compatibility, and migration/backup/recovery notes. A new commit invalidates prior manual approval.
Do not enable auto-merge for releases. Never put credentials in PRs, tests, or browser code.
For paired releases, record the exact web and API commit SHAs tested together and their deployment order.
Use backward-compatible API/database changes where possible; a code rollback does not undo a migration.

## GitHub production rules

Target `refs/heads/alpha`: require a PR with zero required approving reviews, require resolved
review threads, block deletion and non-fast-forward updates, and allow no routine bypass actors.
The owner still performs the final manual merge. Rule changes require GitHub administrative access.
Prepared JSON is in `.github/rulesets/alpha-production.json`; a local JSON file alone enables nothing.
Do not overwrite existing rulesets without first reading and reconciling their protections.
GitHub plan and repository visibility may affect ruleset availability.
