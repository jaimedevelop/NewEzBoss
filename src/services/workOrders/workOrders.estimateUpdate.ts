import { WorkOrder } from './workOrders.types';

export function isEstimateUpdateUnseen(wo: Pick<WorkOrder, 'estimateUpdatedAt' | 'estimateUpdateSeenAt'>): boolean {
    if (!wo.estimateUpdatedAt) return false;
    const updatedAt = Date.parse(wo.estimateUpdatedAt);
    if (!Number.isFinite(updatedAt)) return false;
    const seenAt = wo.estimateUpdateSeenAt ? Date.parse(wo.estimateUpdateSeenAt) : NaN;
    if (Number.isFinite(seenAt) && seenAt >= updatedAt) return false;
    return true;
}
