import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, estimatesApiRequest } from '../../../../services/estimates/estimatesApi';
import type { WorkOrder } from '../../../../services/workOrders/workOrders.types';

export default function ProjectWorkOrders({ projectId }: { projectId: string }) {
    const [rows, setRows] = useState<WorkOrder[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setRows(null);
        setError(null);
        void estimatesApiRequest<WorkOrder[]>(`/work-orders?${new URLSearchParams({ projectId })}`, { signal: controller.signal })
            .then(data => { if (!controller.signal.aborted) setRows(data); })
            .catch(error => {
                if (controller.signal.aborted) return;
                setError(error instanceof ApiError && error.status === 403
                    ? 'You do not have access to work orders in this company.' : 'Work orders could not be loaded.');
            });
        return () => controller.abort();
    }, [projectId, revision]);

    return (
        <section className="space-y-3">
            <h2 className="text-xl font-bold">Work Orders</h2>
            {error ? (
                <>
                    <p role="alert">{error}</p>
                    <button className="text-orange-700 underline" onClick={() => setRevision(value => value + 1)}>Retry</button>
                </>
            ) : rows === null ? <p role="status">Loading work orders…</p>
                : rows.length === 0 ? <p>No linked work orders.</p> : (
                    <ul className="divide-y divide-gray-200">
                        {rows.map(order => order.id && (
                            <li key={order.id} className="py-3">
                                <Link className="font-semibold text-orange-700 hover:underline" to={`/work-orders/${encodeURIComponent(order.id)}`}>{order.woNumber}</Link>
                                <p className="text-sm text-gray-600">{order.customerName} · {order.status}</p>
                            </li>
                        ))}
                    </ul>
                )}
        </section>
    );
}
