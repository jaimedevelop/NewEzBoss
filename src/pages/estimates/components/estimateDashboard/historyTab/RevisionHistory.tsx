import { useMemo, useState } from 'react';
import { Calendar, History } from 'lucide-react';
import { formatCurrency, type EstimateWithId, type Revision } from '../../../../../services/estimates';

interface RevisionHistoryProps {
  estimate: EstimateWithId;
  plain?: boolean;
}

const dayFormat = new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

export default function RevisionHistory({ estimate, plain = false }: RevisionHistoryProps) {
  const days = useMemo(() => {
    const groups = new Map<string, Revision[]>();
    const events = [...(estimate.revisionsHistory ?? [])].sort((a, b) =>
      (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0) || a.revisionNumber - b.revisionNumber,
    );
    for (const event of events) {
      const date = new Date(event.date);
      const day = Number.isNaN(date.getTime()) ? 'Unknown date' : dayFormat.format(date);
      const entries = groups.get(day) ?? [];
      entries.push(event);
      groups.set(day, entries);
    }
    return groups;
  }, [estimate.revisionsHistory]);
  const [selectedDay, setSelectedDay] = useState<string>();
  const day = selectedDay && days.has(selectedDay) ? selectedDay : days.keys().next().value;
  const events = day ? days.get(day) ?? [] : [];
  const padding = plain ? '' : 'p-4 sm:p-6';

  return (
    <section className={plain ? undefined : 'rounded-lg border border-gray-200 bg-white'}>
      <div className={`flex items-center gap-2 ${padding}`}>
        <History className="h-5 w-5 text-purple-600" />
        <h2 className="text-lg font-semibold text-gray-900">Revision History</h2>
        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
          v{estimate.currentRevision ?? 0}
        </span>
      </div>
      {days.size === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No revision history yet</p>
      ) : (
        <>
          <div aria-label="History dates" className={`flex overflow-x-auto border-y border-gray-200 bg-gray-50 ${plain ? 'mt-4' : ''}`}>
            {[...days].map(([date, revisions]) => (
              <button
                key={date}
                type="button"
                aria-pressed={day === date}
                onClick={() => setSelectedDay(date)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium
                  ${day === date ? 'border-purple-600 bg-white text-purple-700' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
              >
                <Calendar className="h-4 w-4" />
                {date}
                <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700">{revisions.length}</span>
              </button>
            ))}
          </div>
          <div className={`space-y-3 ${plain ? 'mt-4' : padding}`}>
            <h3 className="text-sm font-medium text-gray-700">Changes on {day}</h3>
            {events.map((event, index) => {
              const timestamp = new Date(event.date);
              return (
                <article key={`${event.revisionNumber}-${index}`} className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm">
                  <div>
                    <p className="break-words font-medium text-gray-900">{event.changes}</p>
                    <p className="text-xs text-gray-600">
                      {event.modifiedByName || 'Unknown'} · {Number.isNaN(timestamp.getTime()) ? event.date : timeFormat.format(timestamp)}
                    </p>
                  </div>
                  {event.previousTotal !== event.newTotal && (
                    <p className="text-xs text-gray-700">Total {formatCurrency(event.previousTotal)} → {formatCurrency(event.newTotal)}</p>
                  )}
                  {event.details?.historyChanges?.map((change, changeIndex) => {
                    const removed = change.kind === 'removed';
                    return (
                      <div key={changeIndex} className={`break-words rounded border-l-2 px-3 py-2
                        ${removed ? 'border-red-500 bg-red-50 text-red-900' : 'border-green-500 bg-green-50 text-green-900'}`}>
                        <span className="mr-2 text-xs font-semibold">{removed ? 'Removed' : 'Added'}</span>
                        <span className={removed ? 'line-through' : undefined}>{change.label}</span>
                        {change.quantity !== undefined && change.unitPrice !== undefined && change.total !== undefined && (
                          <span className={`mt-1 block text-xs ${removed ? 'line-through' : ''}`}>
                            {change.quantity} × {formatCurrency(change.unitPrice)} = {formatCurrency(change.total)}
                          </span>
                        )}
                        {change.notes && <span className="mt-1 block text-xs">{change.notes}</span>}
                      </div>
                    );
                  })}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
