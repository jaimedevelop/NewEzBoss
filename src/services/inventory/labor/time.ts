// src/services/inventory/labor/time.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../firebase/config';

// Collection name
const COLLECTION_NAME = 'timeBasedLabor';

// Types
export interface TimeBasedLabor {
  id?: string;
  roleName: string;
  description: string;
  hourlyRate: number;
  category: string;
  skillLevel: 'entry' | 'intermediate' | 'advanced' | 'expert';
  isActive: boolean;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export interface TimeFilters {
  category?: string;
  skillLevel?: 'entry' | 'intermediate' | 'advanced' | 'expert';
  isActive?: boolean;
}

export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  id?: string;
}

/**
 * Create a new time-based labor role
 */
export const createTimeRole = async (
  roleData: Omit<TimeBasedLabor, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DatabaseResult> => {
  try {
    const roleRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...roleData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      id: roleRef.id,
      data: { id: roleRef.id, ...roleData }
    };
  } catch (error) {
    console.error('Error creating time-based labor role:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create role'
    };
  }
};

/**
 * Get all time-based labor roles with optional filters
 */
export const getTimeRoles = async (
  filters: TimeFilters = {}
): Promise<DatabaseResult<TimeBasedLabor[]>> => {
  try {
    let q = collection(db, COLLECTION_NAME);

    // Build query with filters
    const constraints = [];

    if (filters.category) {
      constraints.push(where('category', '==', filters.category));
    }

    if (filters.skillLevel) {
      constraints.push(where('skillLevel', '==', filters.skillLevel));
    }

    if (filters.isActive !== undefined) {
      constraints.push(where('isActive', '==', filters.isActive));
    }

    // Order by role name
    constraints.push(orderBy('roleName', 'asc'));

    if (constraints.length > 0) {
      q = query(collection(db, COLLECTION_NAME), ...constraints);
    } else {
      q = query(collection(db, COLLECTION_NAME), orderBy('roleName', 'asc'));
    }

    const querySnapshot = await getDocs(q);
    const roles: TimeBasedLabor[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TimeBasedLabor[];

    return {
      success: true,
      data: roles
    };
  } catch (error) {
    console.error('Error getting time-based labor roles:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get roles',
      data: []
    };
  }
};

/**
 * Get a single time-based labor role by ID
 */
export const getTimeRole = async (
  roleId: string
): Promise<DatabaseResult<TimeBasedLabor>> => {
  try {
    const roleRef = doc(db, COLLECTION_NAME, roleId);
    const roleSnap = await getDoc(roleRef);

    if (roleSnap.exists()) {
      return {
        success: true,
        data: { id: roleSnap.id, ...roleSnap.data() } as TimeBasedLabor
      };
    } else {
      return {
        success: false,
        error: 'Role not found'
      };
    }
  } catch (error) {
    console.error('Error getting role:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get role'
    };
  }
};

/**
 * Update an existing time-based labor role
 */
export const updateTimeRole = async (
  roleId: string,
  roleData: Partial<TimeBasedLabor>
): Promise<DatabaseResult> => {
  try {
    const roleRef = doc(db, COLLECTION_NAME, roleId);
    
    // Remove id and timestamps from update data if present
    const { id, createdAt, ...updateData } = roleData as any;

    await updateDoc(roleRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      id: roleId
    };
  } catch (error) {
    console.error('Error updating role:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update role'
    };
  }
};

/**
 * Delete a time-based labor role
 */
export const deleteTimeRole = async (roleId: string): Promise<DatabaseResult> => {
  try {
    const roleRef = doc(db, COLLECTION_NAME, roleId);
    await deleteDoc(roleRef);

    return {
      success: true,
      id: roleId
    };
  } catch (error) {
    console.error('Error deleting role:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete role'
    };
  }
};

/**
 * Get all active roles (helper function)
 */
export const getActiveTimeRoles = async (): Promise<DatabaseResult<TimeBasedLabor[]>> => {
  return getTimeRoles({ isActive: true });
};

/**
 * Get roles by category
 */
export const getTimeRolesByCategory = async (
  category: string
): Promise<DatabaseResult<TimeBasedLabor[]>> => {
  return getTimeRoles({ category });
};

/**
 * Get roles by skill level
 */
export const getTimeRolesBySkillLevel = async (
  skillLevel: 'entry' | 'intermediate' | 'advanced' | 'expert'
): Promise<DatabaseResult<TimeBasedLabor[]>> => {
  return getTimeRoles({ skillLevel });
};

/**
 * Toggle role active status
 */
export const toggleTimeRoleActive = async (
  roleId: string,
  isActive: boolean
): Promise<DatabaseResult> => {
  return updateTimeRole(roleId, { isActive });
};

/**
 * Search roles by name (client-side filtering)
 */
export const searchTimeRoles = async (
  searchTerm: string
): Promise<DatabaseResult<TimeBasedLabor[]>> => {
  try {
    const result = await getTimeRoles();
    
    if (!result.success || !result.data) {
      return result;
    }

    const searchLower = searchTerm.toLowerCase();
    const filteredRoles = result.data.filter(role =>
      role.roleName.toLowerCase().includes(searchLower) ||
      role.description.toLowerCase().includes(searchLower) ||
      role.category.toLowerCase().includes(searchLower)
    );

    return {
      success: true,
      data: filteredRoles
    };
  } catch (error) {
    console.error('Error searching roles:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search roles',
      data: []
    };
  }
};