import { apiRequest } from '../accessControl/accessControl.api';
export interface ReleaseChange {
  number: number; title: string; draft: boolean; area: string; sourceBranch: string; baseBranch: string;
  headSha: string; baseSha: string; testedSha: string; url: string; diffUrl: string;
  checks: { name: string; outcome: 'blocked' | 'failed' | 'pending' | 'passed' }[];
  checksComplete: boolean; review: 'blocked'; dependency: string;
}
export interface ReleaseOverview {
  mode: 'read-only'; fetchedAt: string; historyStatus: string;
  repositories: { repository: string; branch: string; url: string; branchHeadSha: string | null;
    connection: string; deployment: { status: string; sha: string | null }; changes: ReleaseChange[]; truncated: boolean }[];
}
export function getReleases(token: string): Promise<ReleaseOverview> {
  return apiRequest('/database-management/releases', token);
}
