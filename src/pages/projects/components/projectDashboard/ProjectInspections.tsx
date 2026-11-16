import { useEffect, useId, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { errorMessage } from '../../../../services/clients/clientsApi';
import {
    addProjectInspection, getProjectInspections, projectNotesPath, updateRequiredItems, type ProjectInspection,
} from '../../../../services/projects/projectInspections';
import ProjectUpdateNotes from './ProjectUpdateNotes';

const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-700 disabled:opacity-50';
const field = 'mt-1 block w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-gray-900';
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

export default function ProjectInspections({ projectId, canAdd }: { projectId: string; canAdd: boolean }) {
    const requiredItemsId = useId();
    const [rows, setRows] = useState<ProjectInspection[] | null>(null);
    const [draft, setDraft] = useState<ProjectInspection | null>(null);
    const [openNotes, setOpenNotes] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        void getProjectInspections(projectId, controller.signal).then(result => {
            if (!controller.signal.aborted) setRows(result);
        }).catch(error => {
            if (!controller.signal.aborted) setLoadError(errorMessage(error, 'Could not load inspections.'));
        });
        return () => controller.abort();
    }, [projectId, revision]);

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canAdd || !draft || saving || !draft.location.trim()) return;
        setSaving(true);
        setSaveError(null);
        try {
            const inspection = rows?.some(row => row.id === draft.id)
                ? await updateRequiredItems(projectId, draft.id, draft.requiredItems)
                : await addProjectInspection(projectId, draft);
            setRows(current => [...(current ?? []).filter(row => row.id !== inspection.id), inspection]
                .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.id.localeCompare(b.id)));
            setDraft(null);
        } catch (error) {
            setSaveError(errorMessage(error, 'Could not save the inspection.'));
        } finally {
            setSaving(false);
        }
    }

    const editingExisting = rows?.some(row => row.id === draft?.id) ?? false;
    const draftForm = canAdd && draft && (
        <form onSubmit={save} className="space-y-4">
            {!editingExisting && <div className="grid gap-4 sm:grid-cols-2">
                <label className="min-w-0 text-sm font-medium text-gray-700">
                    Location
                    <input autoFocus required maxLength={250} className={field} value={draft.location} disabled={saving}
                        onChange={event => setDraft({ ...draft, location: event.target.value })} />
                </label>
                <label className="min-w-0 text-sm font-medium text-gray-700">
                    Date
                    <input type="date" required max="9999-12-31" className={field} value={draft.scheduledDate} disabled={saving}
                        onChange={event => setDraft({ ...draft, scheduledDate: event.target.value })} />
                </label>
            </div>}
            <div>
                <label htmlFor={requiredItemsId} className="block text-sm font-medium text-gray-700">Required Items</label>
                <textarea id={requiredItemsId} autoFocus={editingExisting} rows={3} maxLength={4000} className={field}
                    value={draft.requiredItems} disabled={saving}
                    onChange={event => setDraft({ ...draft, requiredItems: event.target.value })} />
            </div>
            {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
            <div className="flex flex-wrap gap-3">
                <button type="submit" className={primaryButton} disabled={saving || !draft.location.trim() || !draft.scheduledDate}>
                    {saving ? 'Saving…' : editingExisting ? 'Save Required Items' : 'Save Inspection'}
                </button>
                <button type="button" className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700"
                    disabled={saving} onClick={() => setDraft(null)}>Cancel</button>
            </div>
        </form>
    );

    return (
        <section className="space-y-4" aria-labelledby="project-inspections-heading">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 id="project-inspections-heading" className="text-xl font-bold text-gray-900">Inspections</h2>
                {canAdd && rows && !draft && (
                    <button type="button" className={primaryButton} onClick={() => {
                        setSaveError(null);
                        setDraft({ id: crypto.randomUUID(), location: '', scheduledDate: '', requiredItems: '' });
                    }}>
                        <Plus size={18} aria-hidden="true" /> Add Upcoming Inspection
                    </button>
                )}
            </div>
            {draftForm && !editingExisting && (
                <div className="rounded-lg border border-gray-200 p-4">{draftForm}</div>
            )}
            {loadError ? (
                <div role="alert" className="text-sm text-red-700">
                    {loadError}
                    <button type="button" className="ml-3 underline" onClick={() => {
                        setLoadError(null);
                        setRevision(value => value + 1);
                    }}>Retry</button>
                </div>
            ) : rows === null ? (
                <p role="status" className="text-gray-600">Loading inspections…</p>
            ) : rows.length === 0 ? (
                <p className="text-gray-600">No inspections scheduled.</p>
            ) : (
                <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
                    {rows.map(row => (
                        <li key={row.id} className="min-w-0 space-y-3 px-4 py-3">
                            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                                <span className="break-words font-medium text-gray-900">{row.location}</span>
                                <time dateTime={row.scheduledDate} className="shrink-0 text-sm text-gray-600">
                                    {dateFormat.format(new Date(row.scheduledDate))}
                                </time>
                            </div>
                            {draft?.id === row.id ? draftForm : row.requiredItems && <div>
                                <h3 className="text-sm font-semibold text-gray-900">Required Items</h3>
                                <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{row.requiredItems}</p>
                            </div>}
                            <div className="flex flex-wrap gap-3">
                                {canAdd && !draft && <button type="button" className="text-sm font-medium text-orange-700"
                                    onClick={() => {
                                        setSaveError(null);
                                        setDraft({ ...row, requiredItems: row.requiredItems ?? '' });
                                    }}>{row.requiredItems ? 'Edit Required Items' : 'Add Required Items'}</button>}
                                <button type="button" className="text-sm font-medium text-orange-700"
                                    aria-expanded={openNotes === row.id}
                                    onClick={() => setOpenNotes(openNotes === row.id ? null : row.id)}>
                                    {openNotes === row.id ? 'Hide Update Notes' : 'Update Notes'}
                                </button>
                            </div>
                            {openNotes === row.id && <ProjectUpdateNotes path={projectNotesPath(projectId, row.id)} canAdd={canAdd} />}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
