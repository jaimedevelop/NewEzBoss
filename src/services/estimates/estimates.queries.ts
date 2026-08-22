// src/services/estimates/estimates.queries.ts

import { estimatesApiRequest, estimatesPublicApiRequest, ApiError } from './estimatesApi';
import { apiRowToEstimate, apiDetailRowToEstimate, type ApiEstimateRow } from './estimates.mapper';
import type { EstimateWithId } from './estimates.types';

/**
 * Get all estimates
 * @returns Array of estimates with IDs
 */
export const getAllEstimates = async (): Promise<EstimateWithId[]> => {
  try {
    const rows = await estimatesApiRequest<ApiEstimateRow[]>('/estimates');
    return rows.map(apiRowToEstimate);
  } catch (error) {
    console.error('Error getting estimates:', error);
    throw error;
  }
};

/**
 * Get a single estimate by ID
 * @param estimateId - The estimate ID
 * @returns The estimate data or null if not found
 */
export const getEstimate = async (estimateId: string): Promise<EstimateWithId | null> => {
  try {
    const row = await estimatesApiRequest<ApiEstimateRow>(`/estimates/${estimateId}`);
    return apiDetailRowToEstimate(row);
  } catch (error) {
    if (error instanceof ApiError) {
      return null;
    }
    console.error('Error getting estimate by ID:', error);
    throw error;
  }
};

/**
 * Alias for getEstimate for backward compatibility
 */
export const getEstimateById = getEstimate;

/**
 * Get estimates by status
 * @param status - The status to filter by
 * @returns Array of estimates with the specified status
 */
export const getEstimatesByStatus = async (status: string): Promise<EstimateWithId[]> => {
  try {
    const rows = await estimatesApiRequest<ApiEstimateRow[]>(
      `/estimates?status=${encodeURIComponent(status)}`
    );
    return rows.map(apiRowToEstimate);
  } catch (error) {
    console.error('Error getting estimates by status:', error);
    throw error;
  }
};

/**
 * Get estimates for a specific project
 * @param projectId - The project ID
 * @returns Array of estimates for the project
 */
export const getEstimatesByProject = async (projectId: string): Promise<EstimateWithId[]> => {
  try {
    const rows = await estimatesApiRequest<ApiEstimateRow[]>(
      `/estimates?projectId=${encodeURIComponent(projectId)}`
    );
    return rows.map(apiRowToEstimate);
  } catch (error) {
    console.error('Error getting estimates by project:', error);
    throw error;
  }
};

/**
 * Get estimates created within a date range
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of estimates within the date range
 */
export const getEstimatesByDateRange = async (
  startDate: string,
  endDate: string
): Promise<EstimateWithId[]> => {
  try {
    const rows = await estimatesApiRequest<ApiEstimateRow[]>(
      `/estimates?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    );
    return rows.map(apiRowToEstimate);
  } catch (error) {
    console.error('Error getting estimates by date range:', error);
    throw error;
  }
};

/**
 * Search estimates by customer name
 * @param customerName - The customer name to search for
 * @returns Array of estimates matching the customer name
 */
export const searchEstimatesByCustomer = async (customerName: string): Promise<EstimateWithId[]> => {
  try {
    const rows = await estimatesApiRequest<ApiEstimateRow[]>(
      `/estimates?customerName=${encodeURIComponent(customerName)}`
    );
    return rows.map(apiRowToEstimate);
  } catch (error) {
    console.error('Error searching estimates by customer:', error);
    throw error;
  }
};

/**
 * Get estimate by secure token (for client view)
 * @param token - The email token
 * @returns The estimate data or null if not found
 */
export const getEstimateByToken = async (
  token: string
): Promise<EstimateWithId | null> => {
  try {
    const row = await estimatesPublicApiRequest<ApiEstimateRow>(
      `/estimates/public/by-token/${encodeURIComponent(token)}`
    );
    return apiDetailRowToEstimate(row);
  } catch (error) {
    console.error('Error fetching estimate by token:', error);
    return null;
  }
};

/**
 * Get all change orders for a parent estimate
 * @param parentEstimateId - The parent estimate ID
 * @returns Array of change orders for the parent
 */
export const getChangeOrdersByParent = async (
  parentEstimateId: string
): Promise<EstimateWithId[]> => {
  try {
    const rows = await estimatesApiRequest<ApiEstimateRow[]>(
      `/estimates/${parentEstimateId}/change-orders`
    );
    return rows.map(apiRowToEstimate);
  } catch (error) {
    console.error('Error getting change orders by parent:', error);
    throw error;
  }
};

/**
 * Get parent estimate for a change order
 * @param changeOrderId - The change order ID
 * @returns The parent estimate or null if not found
 */
export const getParentEstimate = async (
  changeOrderId: string
): Promise<EstimateWithId | null> => {
  try {
    const row = await estimatesApiRequest<ApiEstimateRow>(`/estimates/${changeOrderId}/parent`);
    return apiDetailRowToEstimate(row);
  } catch (error) {
    if (error instanceof ApiError) {
      return null;
    }
    console.error('Error getting parent estimate:', error);
    throw error;
  }
};
