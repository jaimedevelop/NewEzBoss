import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Wrench } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import VariableHeader from '../../mainComponents/ui/VariableHeader';
import { errorMessage } from '../../services/estimates/estimatesApi';
import ClaimsTab from '../estimates/components/estimateDashboard/claimsTab/ClaimsTab';
import { claimJobDetails, claimJobTitle, listClaimJobs, type ClaimJobListRow } from '../estimates/components/estimateDashboard/claimsTab/claimsApi';

export default function Claims() {
  const { canPerform, membershipId } = useAuthContext();
  const [params, setParams] = useSearchParams();
  return <ClaimsWorkspace key={membershipId} jobId={params.get('job')} canCreate={canPerform('write:estimates')}
    openJob={id => setParams(id ? { job: String(id) } : {})} />;
}

function ClaimsWorkspace({ jobId, canCreate, openJob }: {
  jobId: string | null; canCreate: boolean; openJob: (jobId: number | null) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [estimate, setEstimate] = useState<ClaimJobListRow | null>(null);
  const [search, setSearch] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<ClaimJobListRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const query = picking ? pickerSearch : search;

  useEffect(() => {
    if (jobId || estimate) return;
    const controller = new AbortController();
    setError('');
    setLoading(true);
    const timer = window.setTimeout(() => {
      void listClaimJobs(picking, query, offset, controller.signal).then(page => {
        if (controller.signal.aborted) return;
        setRows(page.jobs);
        setHasMore(page.hasMore);
      }).catch(error => {
        if (!controller.signal.aborted) setError(errorMessage(error, 'Could not load jobs.'));
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    }, query ? 250 : 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [picking, query, offset, jobId, estimate, retry]);

  function showPicker(next: boolean) {
    setPicking(next);
    setOffset(0);
    setPickerSearch('');
    setLoading(true);
  }

  return (
    <div className="space-y-8">
      <VariableHeader
        title="Claims"
        subtitle="Find a job’s callback and repair history."
        Icon={Wrench}
        className="max-lg:pt-16 sm:max-lg:-mt-6"
        rightAction={canCreate && !picking && !jobId ? {
          label: 'New Claim',
          onClick: () => showPicker(true),
          Icon: Plus,
        } : undefined}
      />
      <div className="space-y-4 sm:space-y-6">
        {jobId ? <>
          <button className="text-sm font-medium text-orange-700" onClick={() => openJob(null)}>Back to claims</button>
          <ClaimsTab key={jobId} path={`/claims/jobs/${encodeURIComponent(jobId)}`} canCreate={canCreate} workspace />
        </> : estimate && canCreate ? <>
          <button className="text-sm font-medium text-orange-700" onClick={() => setEstimate(null)}>Choose a different job</button>
          <p className="break-words font-semibold">{claimJobTitle(estimate)} <span className="font-normal text-gray-600">{claimJobDetails(estimate)}</span></p>
          <ClaimsTab key={estimate.documentId} path={`/estimates/${estimate.documentId}/claims`} canCreate={canCreate} startAdding
            onSaved={id => { setEstimate(null); showPicker(false); openJob(id); }} />
        </> : <>
          {picking && <button className="text-sm font-medium text-orange-700" onClick={() => showPicker(false)}>Back to claims</button>}
          <label className="block text-sm font-semibold text-gray-900">
            {picking ? 'Find an estimate for this job' : 'Search claims'}
            <input type="search" value={query} placeholder="Client, address, project, or document number"
              onChange={event => {
                if (picking) setPickerSearch(event.target.value); else setSearch(event.target.value);
                setOffset(0);
                setLoading(true);
              }}
              className="mt-1 block w-full rounded-lg border border-gray-300 p-3 text-base font-normal" />
          </label>
          {error ? <div role="alert" className="text-sm text-red-700">{error} <button onClick={() => setRetry(value => value + 1)} className="underline">Retry</button></div>
            : loading ? <p role="status" className="text-sm text-gray-600">Loading jobs…</p>
              : rows.length === 0 ? <p className="text-sm text-gray-600">{picking ? 'No active estimates match.' : query ? 'No matching claim histories.' : 'No claims yet.'}</p>
                : <ul className="space-y-3">
                  {rows.map(row => <li key={row.jobId}>
                    <button className="w-full break-words rounded-lg border border-gray-200 bg-white p-4 text-left hover:border-orange-500"
                      onClick={() => picking ? setEstimate(row) : openJob(row.jobId)}>
                      <span className="block font-semibold">{claimJobTitle(row)}</span>
                      <span className="block text-sm text-gray-600">{claimJobDetails(row)}</span>
                      {row.lastClaimAt && <span className="mt-1 block text-sm text-gray-600">
                        {row.claimCount} {row.claimCount === 1 ? 'callback' : 'callbacks'} · Last logged {new Date(row.lastClaimAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </span>}
                    </button>
                  </li>)}
                </ul>}
          {!loading && !error && (offset > 0 || hasMore) && <div className="flex gap-4 text-sm font-medium text-orange-700">
            {offset > 0 && <button onClick={() => { setLoading(true); setOffset(offset - 25); }}>Previous jobs</button>}
            {hasMore && <button onClick={() => { setLoading(true); setOffset(offset + 25); }}>Next jobs</button>}
          </div>}
        </>}
      </div>
    </div>
  );
}
