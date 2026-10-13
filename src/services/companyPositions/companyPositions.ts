import { getApiAccessToken } from '../apiAuth';
export interface Decision { allowed: boolean; source: string }
export interface Effective { version: string; pages: Record<string, Decision>; capabilities: Record<string, Decision> }
export interface Position { id: string; name: string; description: string; pageKeys: string[]; capabilityKeys: string[]; assignedCount: number; isDefault: boolean; updatedAt: string }
export interface Override { pageKey: string; capabilityKey: string; effect: 'inherit' | 'allow' | 'deny' }
export interface Policy { membership: { id: string; employeeId: number; name: string; positionId: string; updatedAt: string; isActive: boolean }; overrides: Override[]; effective: Effective }
export interface Catalog { positions: Position[]; pages: string[]; capabilities: Record<string, string>; availableCapabilities: string[]; authority: Effective; context: { kind: "owner" | "employee"; employeeId: number | null; positionId: string | null }; canManagePositions: boolean; canManageEmployees: boolean }
export interface Membership { id: string; ownerId: number; kind: string; isActive: boolean; companyName?: string }
export class PositionApiError extends Error {
  constructor(message: string, public status: number, public memberships?: Membership[]) { super(message); }
}
export async function positionRequest<T>(path: string, membershipId: string, method = 'GET', body?: unknown): Promise<T> {
  const token = await getApiAccessToken();
  const response = await fetch(`${import.meta.env.VITE_API_URL}/account${path}`, { method,
    headers: { Authorization: `Bearer ${token}`, ...(membershipId ? { 'X-Company-Membership-Id': membershipId } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new PositionApiError(data.error || 'Position request failed', response.status, data.memberships);
  return data;
}
