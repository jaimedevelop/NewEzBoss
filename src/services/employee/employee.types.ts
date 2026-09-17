export interface EmployeeMedia { id: string; url: string; thumbnailUrl?: string; fileName: string; uploadedAt: string; uploadedBy?: string; taskId?: string; mimeType?: string; }
export interface EmployeeTask { id: string; name: string; description?: string; isCompleted: boolean; completedAt?: string; completedBy?: string; media?: EmployeeMedia[]; }
export interface EmployeeWorkday {
  localDate: string; timezone?: string; clockInAt?: string; clockOutAt?: string;
  breakStartedAt?: string; breakEndedAt?: string; breakScheduledEndAt?: string;
  lunchStartedAt?: string; lunchEndedAt?: string; lunchScheduledEndAt?: string;
  plannedBreakMinutes?: number; plannedLunchMinutes?: number;
  actualBreakMinutes?: number; actualLunchMinutes?: number;
  grossElapsedMinutes?: number; netWorkedMinutes?: number;
}
export interface EmployeePortal { job: { workOrderNumber: string; serviceAddress?: string }; profile: { email?: string; firstName?: string; lastName?: string; phone?: string; onboardedAt?: string }; workday: EmployeeWorkday | null; serverNow: string; }
