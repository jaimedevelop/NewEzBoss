import { purchasingRequest } from './purchasing.api';
export interface ProcurementRequirement { productId: number; name: string; required: number; shortage: number; orderQuantity: number; unitCost: number; priceMissing: boolean; ownOutstandingOrder: number; excessCommitment: number; }
export interface ProcurementPreview { stockedRequirements: ProcurementRequirement[]; orderRequirements: ProcurementRequirement[]; unresolved: unknown[]; unsupportedProcurement: unknown[]; poNeeded: boolean; }
export const getProcurementPreview = (estimateId: string) => purchasingRequest<ProcurementPreview>(`/estimates/${encodeURIComponent(estimateId)}/procurement-preview`);
