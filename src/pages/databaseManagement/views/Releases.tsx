import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { getReleases, type ReleaseOverview } from '../../../services/databaseManagement/releases';

const outcomeColors = { blocked: 'bg-gray-100 text-gray-800', failed: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800', passed: 'bg-green-100 text-green-800' };
export default function Releases() {
  const { getAccessToken } = useAuthContext();
  const [data, setData] = useState<ReleaseOverview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError(''); setData(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');
      setData(await getReleases(token));
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load releases'); }
    finally { setLoading(false); }
  }, [getAccessToken]);
  useEffect(() => { void load(); }, [load]);
  return <section className="space-y-6">
    <div className="flex items-center justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">Releases</h1>
        <p className="text-sm text-gray-600">Read-only release review · Production branch: alpha</p></div>
      <button onClick={load} disabled={loading} className="border rounded-lg px-4 py-2 disabled:opacity-50">Refresh</button>
    </div>
    <p className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">GitHub protections remain authoritative. Approval, merge, evidence capture, and deployment controls are not enabled.</p>
    {loading && <p role="status">Loading GitHub snapshot…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {data && <>
      <p className="text-sm text-gray-500">Snapshot: {new Date(data.fetchedAt).toLocaleString()}. Refresh before reviewing; branch heads and checks can change.</p>
      <h2 className="text-xl font-semibold">Overview</h2>
      <div className="grid gap-4 lg:grid-cols-2">{data.repositories.map(repo => <article key={repo.repository} className="border rounded-lg p-4 space-y-2">
        <a className="text-blue-700 underline" href={repo.url} target="_blank" rel="noreferrer">{repo.repository}</a>
        <p>GitHub: {repo.connection}</p><p>Target: {repo.branch}</p>
        <p className="break-all text-sm">Branch head: {repo.branchHeadSha || 'Unknown'}</p>
        <p>Verified deployment SHA: {repo.deployment.sha || 'Unknown'}</p>
        <p className="text-sm text-gray-600">Deployment: {repo.deployment.status}. A branch head does not prove deployment.</p>
      </article>)}</div>
      <h2 className="text-xl font-semibold">Changes &amp; review</h2>
      {data.repositories.map(repo => <div key={repo.repository} className="space-y-4">
        <h3 className="font-semibold">{repo.repository} → {repo.branch}</h3>
        {repo.connection !== 'connected' ? <p role="status">Changes unknown: GitHub could not be read.</p> : repo.changes.length === 0 && <p>No open pull requests targeting alpha. Task branches without a PR are not included.</p>}
        {repo.truncated && <p>Showing the first 20 open PRs. View GitHub for the complete list.</p>}
        {Array.from(new Set(repo.changes.map(change => change.area))).map(area => <section key={area} className="space-y-3">
          <h4 className="font-medium">{area}</h4>
          {repo.changes.filter(change => change.area === area).map(change => <article key={change.number} className="border rounded-lg p-4 space-y-3">
            <h5 className="font-semibold">#{change.number} {change.title} {change.draft && '(Draft)'}</h5>
            <p className="text-sm">Requested behavior: confirm against the PR description and acceptance criteria in GitHub.</p>
            <p className="text-sm break-all">{change.sourceBranch} → {change.baseBranch}<br />Head: {change.headSha}<br />Base: {change.baseSha}<br />Check snapshot SHA: {change.testedSha}</p>
            <p className="text-sm">Paired web/API dependency: {change.dependency}</p>
            <div className="flex flex-wrap gap-2">{change.checks.map((check, index) => <span key={index} className={`rounded px-2 py-1 text-sm ${outcomeColors[check.outcome]}`}>{check.name}: {check.outcome}</span>)}</div>
            {(!change.checksComplete || !change.checks.length) && <p className="text-sm text-amber-800">Blocked: check evidence is missing, incomplete, or unavailable.</p>}
            <p className="text-sm">Review: blocked. Feature acceptance, local manual results, data preservation, security, migration, and recovery evidence are not recorded. Reported checks alone do not establish required-check coverage or approval.</p>
            <div className="flex gap-4 text-sm"><a className="text-blue-700 underline" href={change.diffUrl} target="_blank" rel="noreferrer">View diff</a>
              <a className="text-blue-700 underline" href={change.url} target="_blank" rel="noreferrer">Review in GitHub</a></div>
          </article>)}
        </section>)}
      </div>)}
      <section className="border rounded-lg p-4 space-y-2"><h2 className="text-xl font-semibold">Approve</h2>
        <p className="text-sm">Application approval is unavailable. Use the PR links to review the exact repository, alpha target, current SHAs, checks, and dependencies in GitHub before confirming a merge there. No snapshot shown here authorizes a release.</p>
      </section>
      <section className="border rounded-lg p-4 space-y-2"><h2 className="text-xl font-semibold">History</h2>
        <p className="text-sm">{data.historyStatus} Deployment results and recovery references are unknown.</p>
      </section>
    </>}
  </section>;
}
