// src/services/inventory/tools/tool.queries.ts

import { 
  collection, 
  doc,
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { 
  ToolItem, 
  ToolFilters, 
  ToolResponse, 
  PaginatedToolResponse 
} from './tool.types';

const TOOL_COLLECTION = 'tool_items';

/**
 * Get a single tool item by ID
 */
export const getToolItem = async (
  toolId: string
): Promise<ToolResponse<ToolItem>> => {
  try {
    const toolRef = doc(db, TOOL_COLLECTION, toolId);
    const toolDoc = await getDoc(toolRef);
    
    if (!toolDoc.exists()) {
      return { success: false, error: 'Tool not found' };
    }
    
    return {
      success: true,
      data: { id: toolDoc.id, ...toolDoc.data() } as ToolItem
    };
  } catch (error) {
    console.error('Error getting tool:', error);
    return { success: false, error: 'Failed to fetch tool' };
  }
};

/**
 * Get all tools with optional filters and pagination
 */
export const getTools = async (
  userId: string,
  filters?: ToolFilters,
  pageSize: number = 999,
  lastDoc?: any
): Promise<ToolResponse<PaginatedToolResponse>> => {
  try {
    const toolRef = collection(db, TOOL_COLLECTION);
    let q = query(
      toolRef,
      where('userId', '==', userId),
      orderBy(filters?.sortBy || 'name', filters?.sortOrder || 'asc'),
      limit(pageSize + 1)
    );
    
    // Apply filters
    if (filters?.tradeId) {
      q = query(q, where('tradeId', '==', filters.tradeId));
    }
    
    if (filters?.sectionId) {
      q = query(q, where('sectionId', '==', filters.sectionId));
    }
    
    if (filters?.categoryId) {
      q = query(q, where('categoryId', '==', filters.categoryId));
    }
    
    if (filters?.subcategoryId) {
      q = query(q, where('subcategoryId', '==', filters.subcategoryId));
    }
    
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    // Apply pagination
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    const snapshot = await getDocs(q);
    let tools = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ToolItem[];
    
    // Apply search filter (client-side)
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      tools = tools.filter(tool =>
        tool.name.toLowerCase().includes(searchLower) ||
        tool.description?.toLowerCase().includes(searchLower) ||
        tool.notes?.toLowerCase().includes(searchLower) ||
        tool.brand?.toLowerCase().includes(searchLower) ||
        tool.tradeName?.toLowerCase().includes(searchLower) ||
        tool.sectionName?.toLowerCase().includes(searchLower) ||
        tool.categoryName?.toLowerCase().includes(searchLower) ||
        tool.subcategoryName?.toLowerCase().includes(searchLower)
      );
    }
    
    // Check if there are more results
    const hasMore = tools.length > pageSize;
    if (hasMore) {
      tools = tools.slice(0, pageSize);
    }
    
    return {
      success: true,
      data: {
        tools,
        hasMore,
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      }
    };
  } catch (error) {
    console.error('Error getting tools:', error);
    return { success: false, error: 'Failed to fetch tools' };
  }
};

/**
 * Get tools by trade
 */
export const getToolsByTrade = async (
  userId: string,
  tradeId: string
): Promise<ToolResponse<ToolItem[]>> => {
  try {
    const toolRef = collection(db, TOOL_COLLECTION);
    const q = query(
      toolRef,
      where('userId', '==', userId),
      where('tradeId', '==', tradeId),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const tools = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ToolItem[];
    
    return { success: true, data: tools };
  } catch (error) {
    console.error('Error getting tools by trade:', error);
    return { success: false, error: 'Failed to fetch tools' };
  }
};

/**
 * Get available tools only
 */
export const getAvailableTools = async (
  userId: string
): Promise<ToolResponse<ToolItem[]>> => {
  try {
    const toolRef = collection(db, TOOL_COLLECTION);
    const q = query(
      toolRef,
      where('userId', '==', userId),
      where('status', '==', 'available'),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const tools = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ToolItem[];
    
    return { success: true, data: tools };
  } catch (error) {
    console.error('Error getting available tools:', error);
    return { success: false, error: 'Failed to fetch available tools' };
  }
};