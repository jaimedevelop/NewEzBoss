import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, ClipboardList, Loader2, X } from 'lucide-react';
import {
  getClientWorkOrderProgress,
  getPublicWorkOrderProgress,
  type ClientWorkOrderProgress,
} from '../../../services/workOrders/clientWorkOrder';

interface ClientWorkOrderTimelineProps {
  estimateId: string;
  publicToken?: string;
  plain?: boolean;
}

const REFRESH_INTERVAL_MS = 30_000;

const ClientWorkOrderTimeline: React.FC<ClientWorkOrderTimelineProps> = ({
  estimateId,
  publicToken,
  plain = false,
}) => {
  const [workOrder, setWorkOrder] = useState<ClientWorkOrderProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedImage, setExpandedImage] = useState<{ url: string; alt: string; description: string } | null>(null);

  useEffect(() => {
    let active = true;

    const loadProgress = async () => {
      const progress = publicToken
        ? await getPublicWorkOrderProgress(publicToken)
        : await getClientWorkOrderProgress(estimateId);
      if (active) {
        setWorkOrder(progress);
        setLoading(false);
      }
    };

    void loadProgress();
    const intervalId = window.setInterval(() => void loadProgress(), REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [estimateId, publicToken]);

  const groups = useMemo(() => {
    const tasks = workOrder?.tasks ?? [];
    return tasks.reduce((result, task) => {
      const id = task.laborItemId || 'general';
      const current = result.get(id) || {
        id,
        name: task.laborItemName || 'Job progress',
        tasks: [],
      };
      current.tasks.push(task);
      result.set(id, current);
      return result;
    }, new Map<string, { id: string; name: string; tasks: ClientWorkOrderProgress['tasks'] }>());
  }, [workOrder]);

  const tasks = workOrder?.tasks ?? [];
  const completedTaskCount = tasks.filter((task) => task.isCompleted).length;
  const progressPercent = tasks.length ? Math.round((completedTaskCount / tasks.length) * 100) : 0;

  const content = loading ? (
    <div className="flex items-center justify-center py-12 text-sm text-gray-500">
      <Loader2 className="mr-2 h-5 w-5 animate-spin text-orange-600" />
      Loading job progress…
    </div>
  ) : !workOrder ? (
    <div className="py-10 text-center">
      <ClipboardList className="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p className="text-sm font-medium text-gray-700">Job progress will appear here</p>
      <p className="mt-1 text-sm text-gray-500">Your contractor has not created a work order yet.</p>
    </div>
  ) : tasks.length === 0 ? (
    <div className="py-10 text-center">
      <ClipboardList className="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p className="text-sm font-medium text-gray-700">Job plan is being prepared</p>
      <p className="mt-1 text-sm text-gray-500">Your contractor has not added any job steps yet.</p>
    </div>
  ) : (
    <>
      <div className="mb-6 rounded-xl border border-orange-100 bg-orange-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{completedTaskCount} of {tasks.length} steps complete</p>
            <p className="mt-0.5 text-xs text-gray-600">Updates automatically as your contractor completes each step.</p>
          </div>
          <span className="text-lg font-bold text-orange-700">{progressPercent}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-orange-100">
          <div className="h-full rounded-full bg-orange-600 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="relative space-y-7 before:absolute before:bottom-3 before:left-4 before:top-3 before:w-0.5 before:bg-gray-200">
        {Array.from(groups.values()).map((group) => (
          <section key={group.id} className="relative">
            <h3 className="mb-3 pl-12 text-xs font-semibold uppercase tracking-wide text-gray-500">{group.name}</h3>
            <div className="space-y-3">
              {group.tasks.map((task) => (
                <div key={task.id} className="relative flex gap-4">
                  <div className={`relative z-10 flex h-8 w-8 flex-none items-center justify-center rounded-full ${task.isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {task.isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className={`text-sm font-medium ${task.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{task.name}</p>
                      {task.isCompleted && task.completedAt && (
                        <p className="text-xs font-medium text-green-700">
                          Completed {new Date(task.completedAt).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                    {task.description && <p className="mt-0.5 text-sm text-gray-500">{task.description}</p>}
                  </div>
                  {(task.media?.length ?? 0) > 0 && (
                    <div className="flex flex-none items-center gap-1 pt-0.5" aria-label={`Photos for ${task.name}`}>
                      {task.media!.slice(0, 5).map((image) => (
                        <button key={image.id} type="button" className="h-10 w-10 overflow-hidden rounded-md border border-gray-200 bg-gray-50 transition hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1" onClick={() => setExpandedImage({ url: image.url, alt: image.description || image.fileName || `Photo for ${task.name}`, description: image.description || '' })} aria-label={`Expand ${image.description || image.fileName || 'photo'}`}>
                          <img src={image.thumbnailUrl || image.url} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );

  if (plain) return <>{content}{expandedImage && <ImageDialog image={expandedImage} onClose={() => setExpandedImage(null)} />}</>;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-orange-600" />
          <h2 className="text-lg font-semibold text-gray-900">Job Progress</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">Follow each step as your contractor completes it.</p>
      </div>
      <div className="p-6">{content}</div>
      {expandedImage && <ImageDialog image={expandedImage} onClose={() => setExpandedImage(null)} />}
    </div>
  );
};

const ImageDialog: React.FC<{ image: { url: string; alt: string; description: string }; onClose: () => void }> = ({ image, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Expanded work order photo" onClick={onClose}>
    <div className="relative w-full max-w-4xl rounded-lg bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <img src={image.url} alt={image.alt} className="mx-auto max-h-[70vh] max-w-full rounded-lg object-contain" />
      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="client-photo-description">Description</label>
        <textarea
          id="client-photo-description"
          value={image.description}
          readOnly
          rows={3}
          placeholder="No description provided."
          className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-700"
        />
      </div>
      <button type="button" onClick={onClose} className="absolute -right-3 -top-3 rounded-full bg-white p-2 text-gray-700 shadow hover:bg-gray-100" aria-label="Close photo"><X className="h-5 w-5" /></button>
    </div>
  </div>
);

export default ClientWorkOrderTimeline;
