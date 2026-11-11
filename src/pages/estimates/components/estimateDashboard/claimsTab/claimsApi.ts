import { estimatesApiRequest } from '../../../../../services/estimates/estimatesApi';

export type ClaimJobSummary = {
  jobId: number;
  customerName: string;
  siteAddress: string;
  projectName: string;
  estimateNumber: string;
  invoiceNumber: string;
};
export type ClaimJobListRow = ClaimJobSummary & { claimCount?: number; lastClaimAt?: string; documentId?: number };
export type ClaimJobsPage = { jobs: ClaimJobListRow[]; hasMore: boolean };

export function listClaimJobs(picking: boolean, search: string, offset: number, signal: AbortSignal) {
  const params = new URLSearchParams({ search, offset: String(offset) });
  return estimatesApiRequest<ClaimJobsPage>(`/claims/${picking ? 'estimates' : 'jobs'}?${params}`, { signal });
}

export function claimJobTitle(job: ClaimJobSummary) {
  return job.projectName || job.customerName || job.estimateNumber || 'Job';
}

export function claimJobDetails(job: ClaimJobSummary) {
  return [job.projectName ? job.customerName : '', job.siteAddress, job.estimateNumber, job.invoiceNumber].filter(Boolean).join(' · ');
}
