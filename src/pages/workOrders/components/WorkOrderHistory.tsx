import { useEffect, useState } from 'react';
import { estimatesApiRequest } from '../../../services/estimates/estimatesApi';

type Event = { id: string; action: string; entityId: string; actor: { displayName: string; kind: string }; createdAt: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null };
type History = { events: Event[]; nextCursor: string | null };
export default function WorkOrderHistory({ workOrderId }: { workOrderId: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true); setEvents([]); setCursor(null); setError('');
    estimatesApiRequest<History>(`/work-orders/${encodeURIComponent(workOrderId)}/history`)
      .then(data => { if (active) { setEvents(data.events); setCursor(data.nextCursor); } })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Unable to load history'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [workOrderId, reload]);
  const more = async () => {
    setBusy(true); setError('');
    try {
      const data = await estimatesApiRequest<History>(`/work-orders/${encodeURIComponent(workOrderId)}/history?before=${cursor}`);
      setEvents(old => [...old, ...data.events]); setCursor(data.nextCursor);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load history'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4 p-4 sm:p-6">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Work order history</h2><button className="secondary" disabled={busy} onClick={() => setReload(n => n + 1)}>Refresh history</button></div>
    <p className="text-sm text-gray-600">History begins when activity recording is enabled. Times record when actions were saved; photo upload time does not establish when a photo was taken.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {busy && <p role="status">Loading history…</p>}
    {!busy && !error && !events.length && <p>No recorded activity yet.</p>}
    <ol className="space-y-3">{events.map(event => <li key={event.id} className="rounded-lg border p-3">
      <p className="font-semibold">{event.action.replace(/[._]/g, ' ')} · {String(event.after?.name || event.before?.name || event.after?.fileName || event.before?.fileName || event.after?.displayName || event.before?.displayName || event.entityId)}</p>
      <p className="text-sm">{event.actor.displayName} · {new Date(event.createdAt).toLocaleString()}</p>
      <details className="mt-2 text-sm"><summary className="cursor-pointer">Record details</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify({ actor: event.actor, before: event.before, after: event.after }, null, 2)}</pre></details>
    </li>)}</ol>
    {cursor && <button className="secondary" disabled={busy} onClick={() => void more()}>Load earlier activity</button>}
  </section>;
}
