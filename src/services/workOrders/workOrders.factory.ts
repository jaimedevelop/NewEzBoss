import { createWorkOrderFromEstimateCommand } from './workOrders.mutations';
export interface WorkOrderCreation { id: string; woNumber: string; alreadyExists: boolean; }
export async function createWorkOrderFromEstimate(estimate: { id?: string | number }, _legacyCreatedBy?: string): Promise<{ success: boolean; data?: WorkOrderCreation; error?: unknown }> {
  if (!estimate.id) return { success: false, error: new Error('Estimate ID is required') };
  const result = await createWorkOrderFromEstimateCommand(estimate.id);
  return result.success && result.data ? { success: true, data: { id: result.data.id, woNumber: result.data.woNumber, alreadyExists: Boolean(result.data.alreadyExists) } } : { success: false, error: result.error };
}
