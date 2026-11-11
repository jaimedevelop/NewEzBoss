import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { claimJobDetails, claimJobTitle, type ClaimJobSummary } from './claimsApi';
import { errorMessage, estimatesApiRequest } from '../../../../../services/estimates/estimatesApi';

const fields = [
  { key: 'name', label: 'Name', maxLength: 200, placeholder: 'e.g. Recurring roof leak' },
  { key: 'location', label: 'Location', maxLength: 500, placeholder: 'e.g. North wall above the kitchen window' },
  { key: 'issueDescription', label: 'Issue description', maxLength: 5000, placeholder: 'What went wrong on this visit?' },
  { key: 'notes', label: 'Notes (optional)', maxLength: 5000, placeholder: 'How did you fix it? What should you check next time?' },
] as const;
type ClaimDetails = Record<typeof fields[number]['key'], string>;
type Claim = ClaimDetails & { id: string; createdAt: string };
type ClaimsResponse = { archived: boolean; jobId: number; claims: Claim[]; job?: ClaimJobSummary & { documentId: number | null } };
const emptyDetails: ClaimDetails = { name: '', location: '', issueDescription: '', notes: '' };

export default function ClaimsTab({ path, canCreate, workspace = false, startAdding = false, onSaved }: {
  path: string;
  canCreate: boolean;
  workspace?: boolean;
  startAdding?: boolean;
  onSaved?: (jobId: number) => void;
}) {
  const [data, setData] = useState<ClaimsResponse | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(() => startAdding ? crypto.randomUUID() : null);
  const [details, setDetails] = useState(emptyDetails);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const inFlight = useRef(false);
  const addButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    estimatesApiRequest<ClaimsResponse>(path, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(error => {
        if (!controller.signal.aborted) setLoadError(errorMessage(error, 'Could not load claims.'));
      });
    return () => controller.abort();
  }, [path, reload]);

  function closeForm() {
    setDraftId(null);
    setDetails(emptyDetails);
    setSaveError('');
    addButton.current?.focus();
  }

  async function saveClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !draftId || !canCreate || data?.archived !== false) return;
    if (![details.name, details.location, details.issueDescription].every(value => value.trim())) {
      setSaveError('Enter a name, location, and issue description.');
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setSaveError('');
    try {
      const claim = await estimatesApiRequest<Claim>(path, {
        method: 'POST', body: JSON.stringify({ ...details, id: draftId }),
      });
      setData(current => current && ({ ...current, claims: [claim, ...current.claims.filter(item => item.id !== claim.id)] }));
      closeForm();
      onSaved?.(data.jobId);
    } catch (error) {
      setSaveError(errorMessage(error, 'Could not save the claim. Try again.'));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-6" aria-labelledby="claims-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="claims-heading" className="text-lg font-semibold text-gray-900">{workspace && data?.job ? claimJobTitle(data.job) : 'Claims'}</h2>
          {workspace && data?.job && <p className="mt-1 text-sm text-gray-700">{claimJobDetails(data.job)}</p>}
          <p className="text-sm text-gray-600">Keep a record of each return visit and repair at this job site.</p>
          {workspace && data?.job?.documentId && <Link className="mt-2 inline-block text-sm text-orange-700 underline" to={`/estimates/${data.job.documentId}?tab=claims`}>Open document Claims tab</Link>}
          {!workspace && !startAdding && !!data?.claims.length && <Link className="mt-2 inline-block text-sm text-orange-700 underline" to={`/claims?job=${data.jobId}`}>View all claims for this job</Link>}
        </div>
        {canCreate && data?.archived === false && (
          <button type="button" ref={addButton} aria-label="Add claim" title="Add claim" aria-expanded={Boolean(draftId)}
            disabled={Boolean(draftId)} onClick={() => { if (!draftId) setDraftId(crypto.randomUUID()); }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white hover:bg-orange-700">
            <Plus aria-hidden="true" size={22} />
          </button>
        )}
      </div>

      {draftId && canCreate && data?.archived === false && (
        <form onSubmit={saveClaim} className="mt-4 rounded-lg border border-gray-200 p-4">
          <h3 className="mb-3 font-semibold">Add claim</h3>
          <fieldset disabled={saving} className="min-w-0 space-y-3">
            {fields.map(({ key, label, maxLength, placeholder }) => {
              const Control = key === 'name' || key === 'location' ? 'input' : 'textarea';
              return (
                <label key={key} className="block text-sm font-medium">
                  {label}
                  <Control className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-base font-normal"
                    value={details[key]} onChange={event => setDetails({ ...details, [key]: event.target.value })}
                    maxLength={maxLength} placeholder={placeholder} required={key !== 'notes'} autoFocus={key === 'name'} />
                </label>
              );
            })}
            {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white">
                {saving ? 'Saving…' : 'Save claim'}
              </button>
              <button type="button" onClick={closeForm} className="rounded-lg px-4 py-2 text-gray-700">Cancel</button>
            </div>
          </fieldset>
        </form>
      )}

      {loadError ? (
        <div className="mt-4">
          <p role="alert" className="text-sm text-red-700">{loadError}</p>
          <button type="button" className="mt-2 text-sm font-medium text-orange-700" onClick={() => {
            setLoadError('');
            setReload(value => value + 1);
          }}>Retry</button>
        </div>
      ) : !data ? <p role="status" className="mt-4 text-sm text-gray-600">Loading claims…</p>
        : data.claims.length === 0 ? <p className="mt-4 text-sm text-gray-600">No claims yet.</p>
          : <ul className="mt-4 space-y-3">
            {data.claims.map(claim => (
              <li key={claim.id} className="break-words rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900">{claim.name}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Logged <time dateTime={claim.createdAt}>{new Date(claim.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</time>
                </p>
                <dl className="mt-3 space-y-3 text-sm">
                  {fields.filter(field => field.key !== 'name' && claim[field.key]).map(({ key, label }) => (
                    <div key={key}>
                      <dt className="font-medium text-gray-900">{key === 'notes' ? 'Notes' : label}</dt>
                      <dd className="whitespace-pre-wrap text-gray-700">{claim[key]}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>}
    </section>
  );
}
