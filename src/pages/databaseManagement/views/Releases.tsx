import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, GitBranch, GitPullRequest, RefreshCw } from 'lucide-react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { getReleases, type ReleaseChange, type ReleaseOverview } from '../../../services/databaseManagement/releases';

const repositories = [
  { id: 'jaimedevelop/NewEzBoss', label: 'Web Frontend · NewEzBoss' },
  { id: 'jaimedevelop/ezboss-api', label: 'Backend · ezboss-api' },
] as const;

const stages = [
  { id: 'alpha', label: 'Alpha', accent: 'border-t-[#4b286d] bg-[#f6f1fa]', ink: 'text-[#4b286d]' },
  { id: 'beta', label: 'Beta', accent: 'border-t-[#be352b] bg-[#fdf1ef]', ink: 'text-[#982a22]' },
  { id: 'production', label: 'Production', accent: 'border-t-[#ed5909] bg-[#fff3eb]', ink: 'text-[#9b3600]' },
] as const;

type Repository = typeof repositories[number]['id'];
type Stage = typeof stages[number]['id'];

const outcomeColors = { blocked: 'bg-gray-100 text-gray-800', failed: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800', passed: 'bg-green-100 text-green-800' };
const fileStatusLabels: Record<string, string> = { A: 'Added', D: 'Deleted', M: 'Modified', T: 'Type changed' };

function PullRequest({ change, destination }: { change: ReleaseChange; destination: string }) {
  return <details className="rounded-lg border border-gray-200 bg-white px-4 py-3">
    <summary className="cursor-pointer">
      <span className="break-words font-medium">#{change.number} {change.title}</span>
      <span className="mt-1 block break-all text-sm text-gray-600">
        {change.draft ? 'Draft' : 'Open PR'} · {change.sourceBranch} → {change.baseBranch}{destination && ` · ${destination}`}
      </span>
    </summary>
    <div className="mt-3 space-y-2 text-sm">
      <p>Area: {change.area} · Paired web/API dependency: {change.dependency}</p>
      <p className="break-all">Head: {change.headSha}<br />Base: {change.baseSha}<br />Check snapshot SHA: {change.testedSha}</p>
      <div className="flex flex-wrap gap-2">{change.checks.map((check, index) =>
        <span key={index} className={`rounded px-2 py-1 ${outcomeColors[check.outcome]}`}>{check.name}: {check.outcome}</span>)}</div>
      {(!change.checksComplete || !change.checks.length) && <p className="text-amber-800">Check evidence is missing or incomplete.</p>}
      <p>Review blocked pending feature acceptance, manual testing, data preservation, security, migration, and recovery evidence.</p>
      <div className="flex flex-wrap gap-4">
        <a className="text-blue-700 underline" href={change.diffUrl} target="_blank" rel="noreferrer">View diff</a>
        <a className="text-blue-700 underline" href={change.url} target="_blank" rel="noreferrer">Review in GitHub</a>
      </div>
    </div>
  </details>;
}

export default function Releases() {
  const [repository, setRepository] = useState<Repository>(repositories[0].id);
  const [selections, setSelections] = useState<Partial<Record<Repository, Partial<Record<Stage, string>>>>>({});
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

  const repo = data?.repositories.find(item => item.repository === repository);
  const local = data?.localBranches?.find(item => item.repository === repository);
  const isWeb = repository === repositories[0].id;
  const production = isWeb ? 'alpha' : 'main';
  const branches = new Map((local?.refs ?? local?.changes)?.map(branch => [branch.name, branch.sha]));
  for (const branch of repo?.branches ?? []) branches.set(branch.name, branch.sha);
  if (repo?.branchHeadSha) branches.set(repo.branch, repo.branchHeadSha);

  const branchOptions = [...new Set([production, ...branches.keys()])].sort((a, b) => a.localeCompare(b));
  const pipeline = stages.map(stage => {
    const planned = !isWeb && stage.id !== 'production';
    const defaultBranch = stage.id === 'production' ? production
      : stage.id === 'beta' && branches.has('beta') ? 'beta' : '';
    const saved = selections[repository]?.[stage.id];
    const branch = planned ? '' : saved ?? defaultBranch;
    return { ...stage, planned, branch };
  });

  return <section className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="grid min-w-0 gap-1 text-sm font-medium">
        <label htmlFor="release-repository">Repository</label>
        <select id="release-repository" className="min-h-11 max-w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
          value={repository} onChange={event => setRepository(event.target.value as Repository)}>
          {repositories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      <button type="button" onClick={load} disabled={loading}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm font-medium disabled:opacity-50">
        <RefreshCw size={16} aria-hidden="true" /> Refresh
      </button>
    </div>
    <header>
      <h1 className="text-2xl font-semibold">Releases</h1>
      <p className="mt-1 text-sm text-gray-600">Read-only preview · Branch choices apply to this view only.</p>
    </header>
    {loading && <p role="status">Loading GitHub snapshot…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {data && <section className="space-y-3" aria-labelledby="release-pipeline-heading">
      <h2 id="release-pipeline-heading" className="text-lg font-semibold">Release pipeline</h2>
      <ol className="grid gap-7 lg:grid-cols-3">
        {pipeline.map((stage, index) => {
          const incoming = repo?.changes.filter(change => change.baseBranch === stage.branch) ?? [];
          const sha = branches.get(stage.branch);
          return <li key={stage.id} className={`relative min-w-0 rounded-xl border border-t-4 p-4 ${stage.accent}`}>
            {index < pipeline.length - 1 && <>
              <ArrowRight aria-hidden="true" className="absolute -right-6 top-5 hidden text-gray-500 lg:block" size={18} />
              <ArrowDown aria-hidden="true" className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-gray-500 lg:hidden" size={18} />
            </>}
            <div className="flex flex-wrap items-center justify-between gap-1">
              <h3 className={`text-base font-semibold ${stage.ink}`}>{stage.label}</h3>
              <span className="text-xs font-medium text-gray-700">
                {stage.planned ? 'Planned' : stage.branch ? 'Branch preview' : 'Unassigned'}
              </span>
            </div>
            {stage.planned ? <p className="mt-3 text-sm text-gray-700">Environment setup pending.</p> : <>
              <label className="mt-3 grid gap-1 text-sm font-medium">
                <span className="flex items-center gap-1.5"><GitBranch size={15} aria-hidden="true" /> Active branch preview</span>
                <select aria-label={`${stage.label} active branch preview`}
                  className="min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-2 font-mono text-sm"
                  value={stage.branch} onChange={event => {
                    const branch = event.target.value;
                    setSelections(previous => ({
                      ...previous, [repository]: { ...previous[repository], [stage.id]: branch },
                    }));
                  }}>
                  <option value="">Select a branch</option>
                  {stage.branch && !branchOptions.includes(stage.branch) &&
                    <option value={stage.branch}>{stage.branch} (outside snapshot)</option>}
                  {branchOptions.map(branch => <option key={branch} value={branch}>{branch}</option>)}
                </select>
              </label>
              <div className="mt-3 space-y-2 border-t border-gray-300/70 pt-3 text-sm" aria-live="polite">
                {stage.branch ? <>
                  <p className="break-all text-xs text-gray-700">Branch head: {sha ? <code title={sha}>{sha.slice(0, 12)}</code> : 'Unverified'}</p>
                  <p className="font-medium">Incoming pull requests</p>
                  {repo?.connection !== 'connected' ? <p className="text-gray-700">Pull request data unavailable.</p>
                    : incoming.length ? <ul className="space-y-2">{incoming.map(change =>
                      <li key={change.number} className="flex items-start gap-2">
                        <GitPullRequest size={15} aria-hidden="true" className={`mt-0.5 shrink-0 ${stage.ink}`} />
                        <a href={change.url} target="_blank" rel="noreferrer" className="min-w-0 break-words underline decoration-gray-400 underline-offset-2">
                          #{change.number} {change.title}{change.draft ? ' (Draft)' : ''}
                        </a>
                      </li>)}</ul> : <p className="text-gray-700">No open PRs targeting this branch in the snapshot.</p>}
                </> : <p className="text-gray-700">Choose a branch to see incoming pull requests.</p>}
              </div>
            </>}
          </li>;
        })}
      </ol>
      <p className="text-sm text-gray-600">
        Production preview defaults to <code>{production}</code>. Verified deployment SHA: {repo?.deployment.sha ?? 'Unknown'}.
        {' '}Snapshot {new Date(data.fetchedAt).toLocaleString()}.
      </p>
      {repo?.branchInventoryAvailable !== true && <p className="text-sm text-amber-800">GitHub branch inventory is unavailable. Choices use known defaults and any available local refs.</p>}
      {repo?.branchesTruncated && <p className="text-sm text-gray-600">Showing up to 100 GitHub branches plus available local refs.</p>}
    </section>}
    {data && <section className="space-y-3" aria-labelledby="release-work-heading">
      <h2 id="release-work-heading" className="text-lg font-semibold">Feature work</h2>
      <p className="text-sm text-gray-600">Open pull requests with their GitHub targets and review evidence.</p>
      {repo && <a href={repo.url} target="_blank" rel="noreferrer" className="inline-block text-sm text-blue-700 underline">Open repository in GitHub</a>}
      {repo?.connection !== 'connected' ? <p role="status">GitHub pull requests are unavailable.</p>
        : !repo.changes.length && <p>No open pull requests in the snapshot.</p>}
      {repo?.truncated && <p className="text-sm text-gray-600">Showing up to 20 open PRs. View GitHub for the complete list.</p>}
      {repo?.changes.map(change => <PullRequest key={change.number} change={change}
        destination={pipeline.filter(stage => stage.branch === change.baseBranch).map(stage => stage.label).join(' / ')} />)}
    </section>}
    {local && <section className="min-w-0 space-y-3" aria-labelledby="release-branches-heading">
      <h2 id="release-branches-heading" className="text-lg font-semibold">Pushed branches</h2>
      <p className="text-sm text-gray-600">Local Git fetch snapshot, including branches without a PR. File changes are measured from the common ancestor with the comparison branch.</p>
      {local.availability !== 'available' ? <p>Local Git branch data is unavailable.</p>
        : !local.changes.length && <p>No task branches have been fetched.</p>}
      {local.truncated && <p className="text-sm">Showing the 30 most recently updated branches.</p>}
      {local.changes.map(branch => <details key={branch.name} className="rounded border px-3 py-2">
        <summary className="cursor-pointer break-all font-medium">{branch.name} · {branch.fileCount === null
          ? 'File changes unavailable' : `${branch.fileCount} changed ${branch.fileCount === 1 ? 'file' : 'files'}`}</summary>
        <p className="mt-2 break-all text-sm text-gray-600">
          Head: {branch.sha.slice(0, 12)}{branch.base && ` · Compared with ${branch.base}`}
        </p>
        {branch.fileCount === 0 && <p className="text-sm">No net file changes.</p>}
        {!!branch.files.length && <ul className="mt-2 space-y-1 text-sm">
          {branch.files.map(file => <li key={file.path} className="flex gap-2">
            <span className="shrink-0 text-gray-600">{fileStatusLabels[file.status] ?? file.status}</span>
            <code className="min-w-0 break-all">{file.path}</code>
          </li>)}
        </ul>}
        {(branch.fileCount ?? 0) > branch.files.length && <p className="mt-2 text-sm">Showing the first {branch.files.length} files.</p>}
      </details>)}
    </section>}
    {data && <section className="space-y-2 border-t border-gray-200 pt-4 text-sm text-gray-600">
      <h2 className="font-semibold text-gray-900">Release history</h2>
      <p>{data.historyStatus} Deployment results and recovery references are unknown.</p>
    </section>}
  </section>;
}
