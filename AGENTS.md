# Agent instructions

## Cloud work: branch, commit, and push

Read `docs/branch-and-release-guidelines.md` before changing this repository.
For work performed in the cloud environment, complete authorized edits, run applicable
verification, then commit and push the task changes to their feature/task branch before
ending the turn. A separate request to commit or push is not needed. An explicit user
instruction not to commit or push overrides this default.

Use `<type>/<page-or-area>/<feature-description>` in lowercase kebab-case, identifying
its page or shared area before describing the change. Examples:
`feature/estimates/add-client-filter`, `fix/authentication/expire-reset-links`,
`chore/release-management/cloud-feature-branch-push`.
Use the same task branch name across web and API for a coordinated change.

Before editing, inspect status, current branch, and remote tracking state. Fetch the
remote when available. Reuse the existing task branch for the same task; otherwise create
a correctly named task branch from the appropriate base. Authentication-dependent work
starts from the latest remote `BetterAuth2`; unrelated production work starts from `alpha`.
If the intended base is absent or cannot be verified, do not silently substitute another
branch: report the blocker before creating a branch that depends on it.

Never commit directly to, push to, merge into, force-push, delete, or otherwise move
`alpha` or `BetterAuth2` as part of this automatic workflow. Both remain protected from
routine agent writes. Do not auto-merge PRs or trigger releases. Such actions require a
separate explicit user instruction. GitHub protections are not assumed active merely
because a ruleset JSON exists in this repository.

Stage only files belonging to the authorized task. Preserve unrelated user changes and
never include secrets, environment files, or generated sensitive data. Run relevant tests
for requested behavior and data-preservation/security risks; report failures or blocked
checks accurately. Do not claim a change is release-ready when verification is incomplete.

Commit with a descriptive message and push using an explicit task-branch destination
(for example, `git push -u origin HEAD:refs/heads/<task-branch>`). Never force-push to
resolve divergence; fetch and reconcile without discarding work. Verify the remote branch
head matches the local commit after pushing. If credentials, permissions, or network access
block the push, preserve the local work and report the exact blocker; do not claim it was pushed.
In the final response, state the repository, branch, commit, verification outcome, and push status.

This workflow saves work to GitHub; it does not guarantee Railway will not deploy it.
Do not change deployment settings or assume branch isolation without verifying the configured
production source. Railway staging remains deferred.
