import { useEffect, useState, type FormEvent } from 'react';
import { clientsApiRequest, errorMessage } from '../../../../services/clients/clientsApi';
import type { ProjectUpdateNote } from '../../../../services/projects/projectInspections';

export default function ProjectUpdateNotes({ path, canAdd, punchList = false }: { path: string; canAdd: boolean; punchList?: boolean }) {
    const [rows, setRows] = useState<ProjectUpdateNote[] | null>(null);
    const [draft, setDraft] = useState<{ id: string; text: string; kind?: 'item' } | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        void clientsApiRequest<ProjectUpdateNote[]>(path, { signal: controller.signal }).then(notes => {
            if (!controller.signal.aborted) setRows(notes);
        }).catch(error => {
            if (!controller.signal.aborted) setLoadError(errorMessage(error, punchList ? 'Could not load the punch-list.' : 'Could not load update notes.'));
        });
        return () => controller.abort();
    }, [path, punchList, revision]);

    function startDraft(kind?: 'item') {
        setSaveError(null);
        setDraft({ id: crypto.randomUUID(), text: '', kind });
    }

    async function save(event: FormEvent) {
        event.preventDefault();
        if (!canAdd || !draft?.text.trim() || saving) return;
        setSaving(true);
        setSaveError(null);
        try {
            const note = await clientsApiRequest<ProjectUpdateNote>(path, {
                method: 'POST', body: JSON.stringify(draft),
            });
            setRows(current => [note, ...(current ?? []).filter(row => row.id !== note.id)]);
            setDraft(null);
        } catch (error) {
            setSaveError(errorMessage(error, draft.kind === 'item' ? 'Could not save the punch-list item.' : 'Could not save the update note.'));
        } finally {
            setSaving(false);
        }
    }

    async function setCompleted(item: ProjectUpdateNote, completed: boolean) {
        if (!punchList || !canAdd || saving) return;
        setSaving(true);
        setStatusError(null);
        try {
            const updated = await clientsApiRequest<ProjectUpdateNote>(`${path}/${encodeURIComponent(item.id)}`, {
                method: 'PATCH', body: JSON.stringify({ completed }),
            });
            setRows(current => current?.map(row => row.id === updated.id ? updated : row) ?? null);
        } catch (error) {
            setStatusError(errorMessage(error, 'Could not update the item.'));
        } finally {
            setSaving(false);
        }
    }

    if (loadError) return <div role="alert" className="text-sm text-red-700">
        {loadError}
        <button type="button" className="ml-3 underline" onClick={() => {
            setLoadError(null);
            setRevision(value => value + 1);
        }}>Retry</button>
    </div>;
    if (!rows) return <p role="status" className="text-sm text-gray-600">{punchList ? 'Loading punch-list…' : 'Loading update notes…'}</p>;

    const items = rows.filter(row => row.completed !== undefined);
    const openCount = items.filter(row => !row.completed).length;

    return (
        <div className="space-y-3">
            {punchList && <p className="text-sm text-gray-600">
                {items.length ? `${openCount} of ${items.length} items open` : 'No prep items yet.'}
            </p>}
            {statusError && <p role="alert" className="text-sm text-red-700">{statusError}</p>}
            {canAdd && (draft ? (
                <form onSubmit={save} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {draft.kind === 'item' ? 'What needs to be done before inspection?' : 'Update note'}
                        <textarea autoFocus required rows={3} maxLength={4000} disabled={saving} value={draft.text}
                            onChange={event => setDraft({ ...draft, text: event.target.value })}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" />
                    </label>
                    {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
                    <div className="flex flex-wrap gap-3">
                        <button type="submit" disabled={saving || !draft.text.trim()}
                            className="rounded-lg bg-orange-600 px-3 py-2 font-semibold text-white disabled:opacity-50">
                            {saving ? 'Saving…' : draft.kind === 'item' ? 'Save Item' : 'Save Note'}
                        </button>
                        <button type="button" disabled={saving} onClick={() => setDraft(null)}>Cancel</button>
                    </div>
                </form>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {punchList && <button type="button" disabled={saving}
                        className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        onClick={() => startDraft('item')}>Add Prep Item</button>}
                    <button type="button" disabled={saving} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium"
                        onClick={() => startDraft()}>Add Update Note</button>
                </div>
            ))}
            {rows.length ? (
                <ul className="divide-y divide-gray-200">
                    {rows.map(note => <li key={note.id} className="py-2">
                        <p className="whitespace-pre-wrap break-words">{note.text}</p>
                        {punchList && note.completed !== undefined ? (
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                                <span>{note.completed ? 'Ready' : 'Open'}</span>
                                {canAdd && <button type="button" disabled={saving}
                                    className="rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
                                    aria-label={`${note.completed ? 'Reopen' : 'Mark ready'}: ${note.text}`}
                                    onClick={() => void setCompleted(note, !note.completed)}>
                                    {note.completed ? 'Reopen' : 'Mark Ready'}
                                </button>}
                            </div>
                        ) : <time className="text-sm text-gray-600" dateTime={note.createdAt}>
                            {punchList && 'Update note · '}{new Date(note.createdAt).toLocaleDateString()}
                        </time>}
                    </li>)}
                </ul>
            ) : !punchList && <p className="text-sm text-gray-600">No update notes yet.</p>}
        </div>
    );
}
