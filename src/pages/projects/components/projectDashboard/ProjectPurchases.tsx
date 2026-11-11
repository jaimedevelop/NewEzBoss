import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../../../services/estimates/estimatesApi';
import { fromApi, purchasingRequest } from '../../../../services/purchasing/purchasing.api';
import type { PurchaseOrderWithId } from '../../../../services/purchasing/purchasing.types';

const pageSize = 25;

export default function ProjectPurchases({ projectId }: { projectId: string }) {
    const [result, setResult] = useState<{ rows: PurchaseOrderWithId[]; total: number } | null>(null);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        const query = new URLSearchParams({ projectId, limit: String(pageSize), offset: String((page - 1) * pageSize) });
        setResult(null);
        setError('');
        void purchasingRequest<{ purchaseOrders: unknown[]; pagination: { total: number } }>(
            `/purchase-orders?${query}`, { signal: controller.signal },
        ).then(data => {
            if (!controller.signal.aborted) setResult({ rows: data.purchaseOrders.map(fromApi), total: data.pagination.total });
        }).catch(error => {
            if (!controller.signal.aborted) setError(error instanceof ApiError && error.status === 403
                ? 'You do not have access to purchasing in this company.' : 'Purchase orders could not be loaded.');
        });
        return () => controller.abort();
    }, [projectId, page, revision]);

    return (
        <section className="space-y-3">
            <h2 className="text-xl font-bold">Purchase Orders</h2>
            {error ? (
                <>
                    <p role="alert">{error}</p>
                    <button className="text-orange-700 underline" onClick={() => setRevision(value => value + 1)}>Retry</button>
                </>
            ) : result === null ? <p role="status">Loading purchase orders…</p> : (
                <>
                    {!result.rows.length && <p>No linked purchase orders on this page.</p>}
                    <ul className="divide-y divide-gray-200">
                        {result.rows.map(order => (
                            <li key={order.id} className="space-y-2 py-3">
                                <Link className="font-semibold text-orange-700 hover:underline"
                                    to={`/purchasing?${new URLSearchParams({ poId: order.id })}`}>{order.poNumber}</Link>
                                <p className="text-sm text-gray-600">{order.supplier} · {order.status.replace('-', ' ')}</p>
                                <details className="text-sm">
                                    <summary className="cursor-pointer">Ordered and received quantities</summary>
                                    <ul className="space-y-1 py-2">
                                        {order.items.map(item => <li key={item.id}>{item.productName} · {item.quantityReceived} of {item.quantityOrdered} received</li>)}
                                    </ul>
                                </details>
                            </li>
                        ))}
                    </ul>
                    {(page > 1 || result.total > pageSize) && (
                        <nav aria-label="Purchase order pages" className="flex items-center gap-4">
                            <button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
                            <span>Page {page}</span>
                            <button disabled={page * pageSize >= result.total} onClick={() => setPage(page + 1)}>Next</button>
                        </nav>
                    )}
                </>
            )}
        </section>
    );
}
