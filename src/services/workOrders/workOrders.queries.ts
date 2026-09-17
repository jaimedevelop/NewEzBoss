import { estimatesApiRequest } from '../estimates/estimatesApi';
import type { WorkOrder, WorkOrderResponse, WorkOrderWorker, WorkerWorkday } from './workOrders.types';

const fail = <T>(error: unknown): WorkOrderResponse<T> => ({ success: false, error: error instanceof Error ? error.message : 'Work order request failed' });
export const getWorkOrderById = async (woId: string): Promise<WorkOrderResponse<WorkOrder>> => {
  try { return { success: true, data: await estimatesApiRequest<WorkOrder>(`/work-orders/${encodeURIComponent(woId)}`) }; } catch (error) { return fail(error); }
};
// Owner identity is derived by the API. Parameter remains for legacy callers.
export const getWorkOrders = async (_userId?: string): Promise<WorkOrderResponse<WorkOrder[]>> => {
  try { return { success: true, data: await estimatesApiRequest<WorkOrder[]>('/work-orders') }; } catch (error) { return fail(error); }
};
export const getWorkOrdersByEstimate = async (estimateId: string | number): Promise<WorkOrderResponse<WorkOrder[]>> => {
  try { return { success: true, data: await estimatesApiRequest<WorkOrder[]>(`/work-orders?estimateId=${encodeURIComponent(String(estimateId))}`) }; } catch (error) { return fail(error); }
};
export const getWorkOrderWorkers = async (woId: string): Promise<WorkOrderResponse<WorkOrderWorker[]>> => {
  try { return { success: true, data: await estimatesApiRequest<WorkOrderWorker[]>(`/work-orders/${encodeURIComponent(woId)}/workers`) }; } catch (error) { return fail(error); }
};
export const getWorkerWorkdays = async (woId: string, workerId: string): Promise<WorkOrderResponse<WorkerWorkday[]>> => {
  try { const data = await estimatesApiRequest<{ workdays: WorkerWorkday[] }>(`/work-orders/${encodeURIComponent(woId)}/workers/${encodeURIComponent(workerId)}/workdays`); return { success: true, data: data.workdays }; } catch (error) { return fail(error); }
};
