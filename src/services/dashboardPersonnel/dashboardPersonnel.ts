import { estimatesApiRequest } from '../estimates/estimatesApi';
import type { Period } from '../../pages/dashboard/components/schedule/period';
export type Metric = 'attendance' | 'late' | 'excused' | 'noCallNoShow' | 'tasksCompleted' | 'index';
export interface PersonnelResponse {
  workers: { id: string; name: string; email?: string | null; metrics: Record<Metric, number | null> }[];
  metricHelp: Record<Metric, string>;
}
export const getDashboardPersonnel = (period: Period) => estimatesApiRequest<PersonnelResponse>(`/dashboard-personnel?period=${period}`);
