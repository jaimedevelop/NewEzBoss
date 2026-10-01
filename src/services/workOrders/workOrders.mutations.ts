import type { DatabaseResult } from '../../firebase/database';
import { estimatesApiRequest } from '../estimates/estimatesApi';
import type { WorkOrder, WorkOrderStatus, WorkOrderTask, WorkOrderMedia, WorkOrderWorker, WorkerDeliveryResult } from './workOrders.types';
export interface CreatedWorkOrder { id: string; woNumber: string; alreadyExists?: boolean; }
const failure = (error: unknown): DatabaseResult => ({ success: false, error });
export const createWorkOrderFromEstimateCommand = async (estimateId: string | number): Promise<DatabaseResult<CreatedWorkOrder>> => {
  try { return { success: true, data: await estimatesApiRequest<CreatedWorkOrder>('/work-orders/from-estimate', { method: 'POST', body: JSON.stringify({ estimateId }) }) }; } catch (error) { return failure(error); }
};
export const updateWorkOrder = async (woId: string, updates: Partial<WorkOrder>): Promise<DatabaseResult<WorkOrder>> => {
  const { version, ...body } = updates;
  if (!version) return failure(new Error('Refresh the work order before saving changes.'));
  try { return { success: true, data: await estimatesApiRequest<WorkOrder>(`/work-orders/${encodeURIComponent(woId)}`, { method: 'PATCH', body: JSON.stringify({ ...body, version }) }) }; } catch (error) { return failure(error); }
};
export const syncWorkOrderFromEstimate = async (woId: string): Promise<DatabaseResult<WorkOrder>> => {
  try { return { success: true, data: await estimatesApiRequest<WorkOrder>(`/work-orders/${encodeURIComponent(woId)}/sync-estimate`, { method: 'POST' }) }; } catch (error) { return failure(error); }
};
export const recordWorkOrderOpened = async (woId: string): Promise<DatabaseResult<WorkOrder>> => {
  try { return { success: true, data: await estimatesApiRequest<WorkOrder>(`/work-orders/${encodeURIComponent(woId)}/opened`, { method: 'POST' }) }; } catch (error) { return failure(error); }
};
export const acknowledgeEstimateUpdate = async (woId: string, estimateUpdatedAt: string): Promise<DatabaseResult<WorkOrder>> => {
  try { return { success: true, data: await estimatesApiRequest<WorkOrder>(`/work-orders/${encodeURIComponent(woId)}/estimate-update-seen`, { method: 'POST', body: JSON.stringify({ estimateUpdatedAt }) }) }; } catch (error) { return failure(error); }
};
export const linkPurchaseOrder = async (woId: string, poId: string): Promise<DatabaseResult<WorkOrder>> => {
  try { return { success: true, data: await estimatesApiRequest<WorkOrder>(`/work-orders/${encodeURIComponent(woId)}/purchase-orders`, { method: 'POST', body: JSON.stringify({ poId }) }) }; } catch (error) { return failure(error); }
};
export const updateWOTaskStatus = (woId: string, tasks: WorkOrderTask[], version?: number) => updateWorkOrder(woId, { tasks, version });
export const updateWOMedia = (woId: string, media: WorkOrderMedia[], version?: number) => updateWorkOrder(woId, { media, version });
export const uploadWorkOrderTaskPhoto = async (woId: string, taskId: string, file: File): Promise<DatabaseResult<WorkOrder>> => {
  const data = new FormData();
  data.append('file', file);
  try {
    return {
      success: true,
      data: await estimatesApiRequest<WorkOrder>(`/work-orders/${encodeURIComponent(woId)}/tasks/${encodeURIComponent(taskId)}/photos`, {
        method: 'POST', body: data,
      }),
    };
  } catch (error) { return failure(error); }
};
export const updateWOStatus = (woId: string, status: WorkOrderStatus, version?: number) => updateWorkOrder(woId, { status, version });
/** Server-authenticated contractor approval; callers must not send signer identity. */
export const approveWorkOrder = async (woId: string, version: number): Promise<DatabaseResult<WorkOrder>> => {
  try { return { success: true, data: await estimatesApiRequest<WorkOrder>(`/work-orders/${encodeURIComponent(woId)}/approval`, { method: 'POST', body: JSON.stringify({ version }) }) }; } catch (error) { return failure(error); }
};
export const requestWorkOrderRevisions = async (woId: string, version: number, reason: string, taskIds: string[]): Promise<DatabaseResult<WorkOrder>> => {
  try { return { success: true, data: await estimatesApiRequest<WorkOrder>(`/work-orders/${encodeURIComponent(woId)}/request-revisions`, { method: 'POST', body: JSON.stringify({ version, reason, taskIds }) }) }; } catch (error) { return failure(error); }
};
/** Completes an already approved work order. Eligibility is enforced by the server. */
export const completeWorkOrder = async (woId: string, version: number): Promise<DatabaseResult<WorkOrder>> => {
  try { return { success: true, data: await estimatesApiRequest<WorkOrder>(`/work-orders/${encodeURIComponent(woId)}/complete`, { method: 'POST', body: JSON.stringify({ version }) }) }; } catch (error) { return failure(error); }
};
export const addWorkOrderWorkers = async (woId: string, employeeIds: string[], inviteEmail?: string): Promise<DatabaseResult<{ workers: WorkOrderWorker[]; deliveryResults: WorkerDeliveryResult[] }>> => {
  try { return { success: true, data: await estimatesApiRequest(`/work-orders/${encodeURIComponent(woId)}/workers`, { method: 'POST', body: JSON.stringify({ employeeIds: employeeIds.map(Number), inviteEmail }) }) }; } catch (error) { return failure(error); }
};
export const resendWorkerInvitation = async (woId: string, workerId: string): Promise<DatabaseResult<{ deliveryResult: WorkerDeliveryResult }>> => {
  try { return { success: true, data: await estimatesApiRequest(`/work-orders/${encodeURIComponent(woId)}/workers/${encodeURIComponent(workerId)}/invitation/resend`, { method: 'POST' }) }; } catch (error) { return failure(error); }
};
export const revokeWorkerInvitation = async (woId: string, workerId: string): Promise<DatabaseResult<{ revoked: boolean }>> => {
  try { return { success: true, data: await estimatesApiRequest(`/work-orders/${encodeURIComponent(woId)}/workers/${encodeURIComponent(workerId)}/invitation/revoke`, { method: 'POST' }) }; } catch (error) { return failure(error); }
};
export const removeRevokedWorkOrderWorker = async (woId: string, workerId: string): Promise<DatabaseResult<{ removed: boolean }>> => {
  try { return { success: true, data: await estimatesApiRequest(`/work-orders/${encodeURIComponent(woId)}/workers/${encodeURIComponent(workerId)}`, { method: 'DELETE' }) }; } catch (error) { return failure(error); }
};
export const assignWorkerTasks = async (woId: string, workerId: string, taskIds?: string[], operation?: { addTaskId?: string; removeTaskId?: string }): Promise<DatabaseResult<WorkOrderWorker>> => {
  const body = operation ?? { taskIds };
  try { return { success: true, data: await estimatesApiRequest(`/work-orders/${encodeURIComponent(woId)}/workers/${encodeURIComponent(workerId)}/tasks`, { method: 'PATCH', body: JSON.stringify(body) }) }; } catch (error) { return failure(error); }
};
