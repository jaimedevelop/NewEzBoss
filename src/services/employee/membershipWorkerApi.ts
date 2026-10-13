import { estimatesApiRequest as request } from '../estimates/estimatesApi';
import type { EmployeeJobClient } from './employeeApi';
import type { EmployeeTask, EmployeeWorkday } from './employee.types';
export interface AssignedJob {
  workOrderNumber: string;
  serviceAddress?: string;
  id: string;
  assignmentId: string;
  tasks: EmployeeTask[];
  appointments: { id: string; scheduledDate?: string; startAt?: string; endAt?: string; startTime?: string; endTime?: string; timezone?: string; status?: string; shifts: { scheduledDate?: string; startTime?: string; endTime?: string }[] }[];
}
const base = '/employee/work-orders';
export const getAssignedJobs = () => request<{ jobs: AssignedJob[]; serverNow: string }>(base);
export const getAssignedJob = (id: string) => request<{ job: AssignedJob; serverNow: string }>(`${base}/${encodeURIComponent(id)}`);
export const getOwnWorkdays = (id: string) => request<{ workdays: EmployeeWorkday[] }>(`${base}/${encodeURIComponent(id)}/workdays`);
export function membershipWorkerClient(id: string): EmployeeJobClient {
  const path = `${base}/${encodeURIComponent(id)}`;
  return {
    getTasks: () => request(`${path}/tasks`),
    completeTask: task => request(`${path}/tasks/${encodeURIComponent(task)}/complete`, { method: 'POST', body: '{}' }),
    uploadPhoto: (task, file, key) => { const data = new FormData(); data.append('file', file); return request(`${path}/tasks/${encodeURIComponent(task)}/photos`, { method: 'POST', body: data, headers: { 'Idempotency-Key': key } }); },
    attendance: async action => {
      const result = await request<{ workday: EmployeeWorkday; serverNow: string }>(`${path}/attendance/${action}`, { method: 'POST', body: '{}' });
      return { ...result, workday: normalizeWorkday(result.workday) };
    },
  };
}
// The membership API reports milliseconds; legacy components use minutes and due dates.
export function normalizeWorkday(day: EmployeeWorkday & { grossElapsedMs?: number; breakDurationMs?: number; lunchDurationMs?: number; netWorkedMs?: number }): EmployeeWorkday {
  const due = (start?: string, minutes = 0) => start ? new Date(new Date(start).getTime() + minutes * 60000).toISOString() : undefined;
  return { ...day, grossElapsedMinutes: (day.grossElapsedMs ?? 0) / 60000, actualBreakMinutes: (day.breakDurationMs ?? 0) / 60000, actualLunchMinutes: (day.lunchDurationMs ?? 0) / 60000, netWorkedMinutes: (day.netWorkedMs ?? 0) / 60000, breakScheduledEndAt: due(day.breakStartedAt, day.plannedBreakMinutes), lunchScheduledEndAt: due(day.lunchStartedAt, day.plannedLunchMinutes) };
}
