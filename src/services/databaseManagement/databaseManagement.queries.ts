// src/services/databaseManagement/databaseManagement.queries.ts
import { apiRequest } from '../accessControl/accessControl.api';
import type { DatabaseSearchResult, DatabaseTable, DatabaseTableRows } from './databaseManagement.types';

export function getTables(accessToken: string): Promise<DatabaseTable[]> {
  return apiRequest('/database-management/tables', accessToken);
}

export function getTableRows(
  accessToken: string,
  tableName: string,
  options: { limit?: number; offset?: number } = {}
): Promise<DatabaseTableRows> {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.offset !== undefined) params.set('offset', String(options.offset));
  const query = params.toString();
  return apiRequest(
    `/database-management/tables/${encodeURIComponent(tableName)}/rows${query ? `?${query}` : ''}`,
    accessToken
  );
}

export function searchDatabase(accessToken: string, query: string): Promise<DatabaseSearchResult[]> {
  return apiRequest(`/database-management/search?q=${encodeURIComponent(query)}`, accessToken);
}
