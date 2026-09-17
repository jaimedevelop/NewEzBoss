import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, ClipboardList, Loader2 } from 'lucide-react';
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
                    <p className={`text-sm font-medium ${task.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{task.name}</p>
                    {task.description && <p className="mt-0.5 text-sm text-gray-500">{task.description}</p>}
                    {task.isCompleted && task.completedAt && (
                      <p className="mt-1 text-xs font-medium text-green-700">
                        Completed {new Date(task.completedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );

  if (plain) return content;

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
    </div>
  );
};

export default ClientWorkOrderTimeline;
